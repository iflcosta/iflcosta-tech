// /api/admin/crm/convert.js
// Vercel Edge Function — Conversão Atômica de Lead para Cliente (Feature 005)

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  // 1. Validação de Autenticação
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const cookieHeader = req.headers.get('Cookie') || '';
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, ...val] = cookie.trim().split('=');
    if (key) acc[key] = val.join('=');
    return acc;
  }, {});

  const accessToken = cookies['sb-access-token'];
  if (!accessToken) {
    return json(401, { ok: false, error: 'unauthorized', message: 'Sessão ausente.' });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return json(401, { ok: false, error: 'unauthorized', message: 'Sessão inválida.' });
  }

  const actor = authData.user.id;

  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.leadId) {
      return json(400, { ok: false, error: 'invalid_payload', message: 'ID do lead é obrigatório para a conversão.' });
    }

    const { leadId, nome, telefone, email, cpf, endereco, tags, observacoes } = body;

    // 1. Capturar o lead de origem para verificar integridade
    const { data: lead, error: leadFetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadFetchError || !lead) {
      return json(404, { ok: false, error: 'lead_not_found', message: 'Lead de origem não encontrado.' });
    }

    if (lead.status === 'convertido' && lead.customer_id) {
      return json(400, { 
        ok: false, 
        error: 'already_converted', 
        message: 'Este lead já foi convertido anteriormente.', 
        customerId: lead.customer_id 
      });
    }

    // 2. Normalização do Telefone
    const finalPhone = (telefone || lead.telefone).replace(/\D/g, '');
    if (!/^[0-9]{10,15}$/.test(finalPhone)) {
      return json(400, { ok: false, error: 'invalid_phone', message: 'Telefone do cliente inválido.' });
    }

    // 3. Verificar se já existe um cliente com este telefone (Deduplicador inteligente)
    const { data: existingCustomer, error: customerSearchError } = await supabase
      .from('customers')
      .select('*')
      .eq('telefone', finalPhone)
      .is('deleted_at', null)
      .maybeSingle();

    if (customerSearchError) {
      console.error('Erro ao buscar cliente existente por telefone:', customerSearchError);
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao validar duplicidade de cliente.' });
    }

    let customerId;
    let customerData;

    // 4. Caso o cliente já exista, nós reaproveitamos e enriquecemos os dados
    if (existingCustomer) {
      customerId = existingCustomer.id;
      
      // Enriquecimento básico se campos novos forem informados
      const enrichPayload = {};
      if (!existingCustomer.email && email) enrichPayload.email = email.trim();
      if (!existingCustomer.cpf && cpf) enrichPayload.cpf = cpf.replace(/\D/g, '');
      if (!existingCustomer.endereco && endereco) enrichPayload.endereco = endereco;
      if (observacoes) {
        enrichPayload.observacoes = existingCustomer.observacoes 
          ? `${existingCustomer.observacoes}\n\n[Nota de Conversão ${new Date().toLocaleDateString('pt-BR')}]: ${observacoes.trim()}`
          : observacoes.trim();
      }
      
      // Combina tags
      if (Array.isArray(tags) && tags.length > 0) {
        const combinedTags = Array.from(new Set([...(existingCustomer.tags || []), ...tags]));
        enrichPayload.tags = combinedTags;
      }

      if (Object.keys(enrichPayload).length > 0) {
        const { data: updatedCust, error: enrichError } = await supabase
          .from('customers')
          .update(enrichPayload)
          .eq('id', customerId)
          .select('*')
          .single();

        if (enrichError) {
          console.error('Erro ao enriquecer cliente existente:', enrichError);
        } else {
          customerData = updatedCust;
        }
      } else {
        customerData = existingCustomer;
      }
    } else {
      // 5. Se o cliente não existir, criamos um novo
      const newCustomerPayload = {
        nome: (nome || lead.nome).trim(),
        telefone: finalPhone,
        email: (email !== undefined ? email : lead.email)?.trim() || null,
        cpf: cpf?.replace(/\D/g, '') || null,
        endereco: endereco || null,
        tags: Array.isArray(tags) ? tags : ['lead-convertido'],
        observacoes: observacoes?.trim() || null,
        origem_lead_id: leadId
      };

      const { data: createdCust, error: insertError } = await supabase
        .from('customers')
        .insert(newCustomerPayload)
        .select('*')
        .single();

      if (insertError) {
        console.error('Erro ao criar cliente para conversão:', insertError);
        if (insertError.code === '23505') {
          return json(409, { ok: false, error: 'duplicate_entry', message: 'CPF ou telefone duplicado ao tentar salvar cliente.' });
        }
        return json(500, { ok: false, error: 'database_error', message: 'Erro ao cadastrar novo cliente para conversão.' });
      }

      customerId = createdCust.id;
      customerData = createdCust;
    }

    // 6. Atualizar a tabela de `leads` marcando-a como 'convertido' e vinculando o customer_id
    const { data: updatedLead, error: leadUpdateError } = await supabase
      .from('leads')
      .update({
        status: 'convertido',
        customer_id: customerId
      })
      .eq('id', leadId)
      .select('*')
      .single();

    if (leadUpdateError) {
      console.error('Erro ao atualizar status do lead para convertido:', leadUpdateError);
      
      // Rollback manual do cliente recém-criado para consistência de dados se não existia previamente
      if (!existingCustomer) {
        await supabase.from('customers').delete().eq('id', customerId);
      }
      return json(500, { ok: false, error: 'database_error', message: 'Erro ao vincular cliente ao lead.' });
    }

    // 7. Gravar auditoria da conversão
    await supabase.from('audit_log').insert({
      actor: actor,
      action: 'lead_converted',
      entity: 'leads',
      entity_id: leadId,
      before: lead,
      after: updatedLead
    });

    return json(200, { 
      ok: true, 
      message: existingCustomer ? 'Lead vinculado a um cliente já existente com sucesso!' : 'Lead convertido em novo cliente com sucesso!',
      customerId, 
      customer: customerData 
    });
  } catch (err) {
    console.error('Erro no handler de conversão de lead:', err);
    return json(500, { ok: false, error: 'server_error', message: 'Erro interno de servidor.' });
  }
}

// Helper JSON response
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
