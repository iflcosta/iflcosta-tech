// /api/leads.js
// Vercel Edge Function — captação de leads (feature 003-lead-capture)
// Spec: /.specs/003-lead-capture/spec.md
// Plan: /.specs/003-lead-capture/plan.md §3

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '3');
const RATE_LIMIT_WINDOW_S = parseInt(process.env.RATE_LIMIT_WINDOW || '3600');
const MIN_FILL_TIME_MS = 3000;

const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || '5511919691542';

export default async function handler(req) {
  // 1. Método
  if (req.method !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' });
  }

  // 2. Parse JSON
  const body = await req.json().catch(() => null);
  if (!body) return json(400, { ok: false, error: 'invalid_json' });

  // 3. Honeypot (campo `website` deve vir vazio)
  if (body.website && body.website.length > 0) {
    return json(200, { ok: true, redirect: null }); // fake success
  }

  // 4. Timing check (form_open → submit < 3s = bot)
  const elapsed = Date.now() - (body._t || 0);
  if (elapsed < MIN_FILL_TIME_MS) {
    return json(200, { ok: true, redirect: null }); // fake success
  }

  // 5. Validação de campos
  const validation = validateLead(body);
  if (!validation.ok) {
    return json(400, {
      ok: false,
      error: 'validation_failed',
      message: validation.message,
      field: validation.field
    });
  }

  // 6. Consent obrigatório
  if (body.consent !== true) {
    return json(400, {
      ok: false,
      error: 'consent_missing',
      message: 'É preciso aceitar a Política de Privacidade pra continuar.'
    });
  }

  // 7. Rate limit por IP hash
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || req.headers.get('x-real-ip')
          || '';
  const ipHash = await sha256(ip + (process.env.IP_SALT || ''));
  const rateOk = await checkRateLimit(ipHash);
  if (!rateOk) {
    return json(429, {
      ok: false,
      error: 'rate_limited',
      message: 'Muitas tentativas. Tenta de novo em alguns minutos.'
    });
  }

  // 8. Normalização + insert
  const telefone = body.telefone.replace(/\D/g, ''); // só dígitos

  const insertPayload = {
    nome: body.nome.trim(),
    telefone,
    email: body.email?.trim() || null,
    servico: body.servico,
    mensagem: body.mensagem?.trim() || null,
    cidade: body.cidade?.trim() || null,
    urgencia: body.urgencia || null,
    origem: body.origem,
    cta_location: body.cta_location || null,
    user_agent: (req.headers.get('user-agent') || '').slice(0, 500),
    referrer: body.referrer?.slice(0, 500) || null,
    consent_at: new Date().toISOString(),
    ip_hash: ipHash
  };

  const { data, error } = await supabase
    .from('leads')
    .insert(insertPayload)
    .select('id')
    .single();

  // Dedupe (mesmo telefone no mesmo dia) → sucesso silencioso
  if (error && error.code === '23505') {
    return json(200, {
      ok: true,
      redirect: buildWhatsAppUrl(body),
      deduped: true
    });
  }

  if (error) {
    console.error('lead insert failed', error);
    return json(500, {
      ok: false,
      error: 'server_error',
      message: 'Algo deu errado do meu lado. Manda direto no WhatsApp: ' + formatPhone(WHATSAPP_NUMBER)
    });
  }

  // Sucesso
  return json(200, {
    ok: true,
    redirect: buildWhatsAppUrl(body)
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function validateLead(b) {
  if (typeof b.nome !== 'string' || b.nome.trim().length < 2 || b.nome.length > 80)
    return { ok: false, field: 'nome', message: 'Nome precisa ter entre 2 e 80 caracteres.' };

  const tel = (b.telefone || '').replace(/\D/g, '');
  if (!/^[0-9]{10,11}$/.test(tel))
    return { ok: false, field: 'telefone', message: 'Telefone precisa ter 10 ou 11 dígitos. Coloca o DDD junto.' };

  if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email))
    return { ok: false, field: 'email', message: 'Email parece inválido.' };

  const SERVICOS = ['celular_tablet', 'notebook_pc', 'custom_pc', 'suporte_ti', 'outro'];
  if (!SERVICOS.includes(b.servico))
    return { ok: false, field: 'servico', message: 'Escolhe um serviço.' };

  if (b.mensagem && b.mensagem.length > 1500)
    return { ok: false, field: 'mensagem', message: 'Mensagem ficou muito longa (máx 1500).' };

  if (!['modal', 'page'].includes(b.origem))
    return { ok: false, field: 'origem', message: 'Origem inválida.' };

  return { ok: true };
}

function buildWhatsAppUrl(b) {
  const SERVICO_NAMES = {
    celular_tablet: 'Conserto de celular/tablet',
    notebook_pc: 'Manutenção de notebook/PC',
    custom_pc: 'Montagem de Custom PC',
    suporte_ti: 'Suporte TI / Redes',
    outro: 'Suporte técnico'
  };
  const lines = [
    `Oi Iago, sou ${b.nome.trim().split(' ')[0]}.`,
    `Preciso de: ${SERVICO_NAMES[b.servico]}.`
  ];
  if (b.cidade) lines.push(`Cidade: ${b.cidade}.`);
  if (b.urgencia) lines.push(`Urgência: ${b.urgencia.replace('_', ' ')}.`);
  if (b.mensagem) lines.push(`\nDetalhes: ${b.mensagem.trim().slice(0, 400)}`);
  lines.push('\nVim pelo site.');
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
}

async function sha256(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Rate limit usando Supabase como backing store
async function checkRateLimit(ipHash) {
  if (!ipHash) return true; // sem IP → não bloqueia (edge case)
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_S * 1000).toISOString();
  const { count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gt('created_at', windowStart);
  return (count || 0) < RATE_LIMIT_MAX;
}

// Formata 5511919691542 → (11) 91969-1542 pra mensagem de erro
function formatPhone(intl) {
  const d = (intl || '').replace(/\D/g, '');
  // remove DDI 55
  const local = d.startsWith('55') ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return intl;
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
