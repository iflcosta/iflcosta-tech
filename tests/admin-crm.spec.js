// Integration / E2E tests for Admin CRM - Leads, Conversion, Customers, and Details (Feature 005)
import { test, expect } from '@playwright/test';

// Seed mock data
const mockLeads = [
  {
    id: 'lead-uuid-1',
    created_at: '2026-05-20T10:00:00.000Z',
    nome: 'Maria da Silva',
    telefone: '11999998888',
    email: 'maria@email.com',
    servico: 'Manutenção de iPhone',
    urgency: 'hoje',
    origem: 'Formulário de Contato',
    status: 'novo',
    mensagem: 'Meu iPhone 12 molhou e não liga mais. Preciso de ajuda urgente.',
    cidade: 'São Paulo',
    estado: 'SP',
    notes: 'Cliente indicou pressa extrema.'
  },
  {
    id: 'lead-uuid-2',
    created_at: '2026-05-19T14:30:00.000Z',
    nome: 'Carlos Souza',
    telefone: '21988887777',
    email: 'carlos@souza.net',
    servico: 'Limpeza de Notebook',
    urgency: 'essa_semana',
    origem: 'Landing Page',
    status: 'contatado',
    mensagem: 'Meu Dell esquenta muito e desliga sozinho após alguns minutos jogando.',
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
    notes: 'Orçamento prévio informado via WhatsApp.'
  }
];

const mockCustomer = {
  id: 'customer-uuid-1',
  created_at: '2026-05-20T10:05:00.000Z',
  updated_at: '2026-05-20T10:05:00.000Z',
  nome: 'Maria da Silva',
  telefone: '11999998888',
  email: 'maria@email.com',
  cpf: '12345678901',
  endereco: {
    logradouro: 'Av. Paulista',
    numero: '1000',
    complemento: 'Apto 42',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    uf: 'SP',
    cep: '01310100'
  },
  tags: ['lead-convertido', 'premium'],
  observacoes: 'Cliente indicou pressa extrema. Prefere contato à tarde.',
  origem_lead_id: 'lead-uuid-1',
  deleted_at: null
};

test.beforeEach(async ({ context, page }) => {
  // Clear any existing storage
  await context.clearCookies();
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch (e) {
      /* noop */
    }
  });

  // Mock API Responses using Playwright Network Interception
  
  // 1. Leads GET API
  await page.route('**/api/admin/crm/leads*', async (route) => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get('search');
    let data = [...mockLeads];
    
    if (search) {
      data = data.filter(lead => 
        lead.nome.toLowerCase().includes(search.toLowerCase()) ||
        lead.mensagem.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, data, count: data.length })
    });
  });

  // 2. Leads POST API
  await page.route('**/api/admin/crm/leads', async (route) => {
    if (route.request().method() === 'POST') {
      const payload = JSON.parse(route.request().postData());
      const lead = mockLeads.find(l => l.id === payload.id);
      if (lead) {
        if (payload.status) lead.status = payload.status;
        if (payload.notes !== undefined) lead.notes = payload.notes;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: lead })
      });
    } else {
      await route.fallback();
    }
  });

  // 3. Customers GET/POST/DELETE API
  await page.route('**/api/admin/crm/customers*', async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    const id = url.searchParams.get('id');

    if (method === 'GET') {
      if (id === 'customer-uuid-1') {
        // Detailed customer query (includes leads)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            data: {
              ...mockCustomer,
              leads: [
                {
                  id: 'lead-uuid-1',
                  created_at: '2026-05-20T10:00:00.000Z',
                  servico: 'Manutenção de iPhone',
                  status: 'convertido',
                  mensagem: 'Meu iPhone 12 molhou e não liga.'
                }
              ]
            }
          })
        });
      } else {
        // List customers
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, data: [mockCustomer], count: 1 })
        });
      }
    } else if (method === 'POST') {
      const payload = JSON.parse(route.request().postData());
      const updated = { ...mockCustomer, ...payload, id: payload.id || 'customer-uuid-1' };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: updated })
      });
    } else if (method === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, message: 'Cliente excluído logicamente.' })
      });
    } else {
      await route.fallback();
    }
  });

  // 4. Convert API
  await page.route('**/api/admin/crm/convert', async (route) => {
    if (route.request().method() === 'POST') {
      const payload = JSON.parse(route.request().postData());
      // Update matching lead
      const lead = mockLeads.find(l => l.id === payload.leadId);
      if (lead) {
        lead.status = 'convertido';
        lead.customer_id = 'customer-uuid-1';
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          message: 'Lead convertido em novo cliente com sucesso!',
          customerId: 'customer-uuid-1',
          customer: { ...mockCustomer, nome: payload.nome, telefone: payload.telefone }
        })
      });
    } else {
      await route.fallback();
    }
  });
});

test.describe('Admin CRM E2E Flows', () => {
  
  test('Fluxo completo: Consultar Leads, Alterar Status, Salvar Notas, Converter em Cliente e Excluir', async ({ page }) => {
    // 1. Acesso à página de Leads
    await page.goto('/admin/leads');
    await expect(page).toHaveTitle(/Leads — Iago Lopes/);

    // No desktop (largura > 1024px), verifica se a tabela com as linhas do lead está visível
    const isDesktop = await page.evaluate(() => window.innerWidth >= 1024);

    if (isDesktop) {
      await expect(page.locator('#leads-table-container')).toBeVisible();
      await expect(page.locator('tbody tr')).toHaveCount(2);
      await expect(page.locator('td', { hasText: 'Maria da Silva' })).toBeVisible();
    } else {
      await expect(page.locator('#leads-grid-container')).toBeVisible();
      await expect(page.locator('.lead-card')).toHaveCount(2);
      await expect(page.locator('h3', { hasText: 'Maria da Silva' })).toBeVisible();
    }

    // 2. Filtro de Busca
    await page.locator('#lead-search').fill('iPhone');
    // Espera debounce
    await page.waitForTimeout(500);

    // Após filtro "iPhone", Maria deve continuar sendo exibida e Carlos (Dell Notebook) deve sumir
    if (isDesktop) {
      await expect(page.locator('td', { hasText: 'Maria da Silva' })).toBeVisible();
      await expect(page.locator('td', { hasText: 'Carlos Souza' })).not.toBeVisible();
    } else {
      await expect(page.locator('h3', { hasText: 'Maria da Silva' })).toBeVisible();
      await expect(page.locator('h3', { hasText: 'Carlos Souza' })).not.toBeVisible();
    }

    // Limpa busca
    await page.locator('#lead-search').fill('');
    await page.waitForTimeout(500);

    // 3. Abrir Gaveta Lateral de Detalhes
    const clickTarget = isDesktop 
      ? page.locator('tbody tr', { hasText: 'Maria da Silva' }).first()
      : page.locator('.lead-card', { hasText: 'Maria da Silva' }).first();
      
    await clickTarget.click();

    // Drawer deve abrir
    await expect(page.locator('#lead-drawer')).toHaveClass(/is-open/);
    await expect(page.locator('#drawer-lead-name')).toHaveText('Maria da Silva');
    await expect(page.locator('#drawer-lead-phone')).toHaveText('(11) 99999-8888');

    // 4. Alterar Status na Gaveta
    await page.locator('#drawer-status-select').selectOption('contatado');
    await page.waitForTimeout(100);
    // Verificamos que o status mudou na lista também (renderização de badges)
    if (isDesktop) {
      await expect(page.locator('tbody tr', { hasText: 'Maria da Silva' }).locator('.badge--info')).toBeVisible();
    }

    // 5. Escrever notas e checar salvamento
    await page.locator('#drawer-lead-notes').fill('Nova observação do técnico Iago.');
    await page.waitForTimeout(1600); // Aguarda auto-save de 1.5s
    await expect(page.locator('#notes-status')).toHaveText('Notas salvas com sucesso!');

    // 6. Abrir Modal de Conversão
    await page.locator('#convert-lead-btn').click();
    await expect(page.locator('#conversion-backdrop')).toHaveClass(/open/);

    // Checar se dados foram pré-carregados
    await expect(page.locator('#conv-nome')).toHaveValue('Maria da Silva');
    await expect(page.locator('#conv-telefone')).toHaveValue('11999998888');

    // Preencher endereço
    await page.locator('#conv-logradouro').fill('Av. Paulista');
    await page.locator('#conv-numero').fill('1000');
    await page.locator('#conv-cidade').fill('São Paulo');
    await page.locator('#conv-uf').fill('SP');
    await page.locator('#conv-cep').fill('01310100');

    // Confirmar conversão (Playwright mock interceptará e redirecionará para a ficha de detalhes)
    await page.locator('#submit-conversion-btn').click();
    
    // Deve redirecionar para a Ficha do Cliente
    await page.waitForURL('**/admin/clientes/detalhes?id=customer-uuid-1');
    await expect(page.locator('#header-client-name')).toHaveText('Maria da Silva');

    // 7. Visualizar Ficha do Cliente & Notas Técnicas
    await expect(page.locator('#edit-email')).toHaveValue('maria@email.com');
    await expect(page.locator('#edit-cpf')).toHaveValue('12345678901');
    await expect(page.locator('#edit-logradouro')).toHaveValue('Av. Paulista');

    // Escrever nas observações livres
    await page.locator('#client-observacoes').fill('Notas adicionais gravadas na ficha cadastral.');
    await page.waitForTimeout(2100); // Aguarda auto-salvamento de 2.0s
    await expect(page.locator('#notes-save-status')).toHaveText('Observações salvas!');

    // 8. Visualizar Histórico de Leads na Ficha
    await expect(page.locator('#leads-count-badge')).toHaveText('1');
    await expect(page.locator('#leads-history-container')).toContainText('Manutenção de iPhone');

    // 9. Danger Zone - Exclusão Lógica
    await page.locator('#delete-customer-btn').click();
    await expect(page.locator('#delete-modal-backdrop')).toHaveClass(/open/);
    await expect(page.locator('#delete-client-name-bold')).toHaveText('Maria da Silva');

    // Confirmar exclusão
    await page.locator('#confirm-delete-btn').click();

    // Deve retornar para o Dashboard de Clientes
    await page.waitForURL('**/admin/clientes');
    await expect(page.locator('.page-title')).toHaveText('Fichas de Clientes');
  });

  test('Regressão: modal de conversão abre na frente do drawer e reabre o drawer ao cancelar', async ({ page }) => {
    await page.goto('/admin/leads');

    const isDesktop = await page.evaluate(() => window.innerWidth >= 1024);
    const clickTarget = isDesktop
      ? page.locator('tbody tr', { hasText: 'Maria da Silva' }).first()
      : page.locator('.lead-card', { hasText: 'Maria da Silva' }).first();
    await clickTarget.click();

    // Drawer aberto
    await expect(page.locator('#lead-drawer')).toHaveClass(/is-open/);

    // Abre o modal de conversão
    await page.locator('#convert-lead-btn').click();

    // Bug corrigido: o drawer fecha visualmente para o modal não abrir atrás
    await expect(page.locator('#lead-drawer')).not.toHaveClass(/is-open/);
    await expect(page.locator('#conversion-backdrop')).toHaveClass(/is-open/);

    // Cancelar a conversão deve reabrir o drawer (lead ainda ativo)
    await page.locator('#cancel-conversion-btn').click();
    await expect(page.locator('#conversion-backdrop')).not.toHaveClass(/is-open/);
    await expect(page.locator('#lead-drawer')).toHaveClass(/is-open/);
  });

  test('Regressão: Confirmar Conversão funciona após o drawer ter sido fechado', async ({ page }) => {
    await page.goto('/admin/leads');

    const isDesktop = await page.evaluate(() => window.innerWidth >= 1024);
    const clickTarget = isDesktop
      ? page.locator('tbody tr', { hasText: 'Maria da Silva' }).first()
      : page.locator('.lead-card', { hasText: 'Maria da Silva' }).first();
    await clickTarget.click();
    await expect(page.locator('#lead-drawer')).toHaveClass(/is-open/);

    // Abre conversão (drawer fecha) e confirma direto — activeLead não pode ser perdido
    await page.locator('#convert-lead-btn').click();
    await expect(page.locator('#conversion-backdrop')).toHaveClass(/is-open/);

    await page.locator('#conv-cidade').fill('São Paulo');
    await page.locator('#submit-conversion-btn').click();

    // A conversão conclui e redireciona para a ficha do cliente
    await page.waitForURL('**/admin/clientes/detalhes?id=customer-uuid-1');
    await expect(page.locator('#header-client-name')).toHaveText('Maria da Silva');
  });

});
