# Tasks: IA Admin — Painel de Gestão de Automação

**Feature:** `012-ia-admin`
**Plan:** `.specs/012-ia-admin/plan.md`
**Branch:** `feat/012-ia-admin`
**Criado:** 2026-05-24

---

## FASE 1 — Fundação

### T001 — Migration Supabase `ia.*` schema
**Esforço:** M | **Critério:** migration aplicada, todas as tabelas existem, RLS ativo em todas.

- [ ] Criar arquivo `supabase/migrations/2026_05_24_ia_schema.sql` com DDL completo do plan.md §1.1
- [ ] Revisar constraints, defaults e indexes
- [ ] Aplicar via SQL editor do Supabase (projeto `togrnwxazuweuihlaljo`)
- [ ] Verificar com `list_tables` que schema `ia` tem todas as 9 tabelas
- [ ] Confirmar RLS ativo em todas as tabelas

**Dependência:** nenhuma.

---

### T002 — Auth: ampliar middleware para `/ia/admin/*`
**Esforço:** S | **Critério:** acessar ia.iflcosta.tech/admin sem login redireciona para /admin/login (hardware); com login ativo, passa direto.

- [ ] Editar `middleware.js`: adicionar `/ia/admin/:path*` ao array `matcher`
- [ ] Adicionar whitelist: `/ia/admin/login` → pass-through (para o caso de login separado futuro)
- [ ] Testar: cookie válido → acesso liberado; sem cookie → redirect `/admin/login?next=...`
- [ ] Confirmar que hostname routing da IA ainda funciona (não interferir com bloco de roteamento)

**Dependência:** T001 (não bloqueante, pode fazer em paralelo).

---

### T003 — Scaffold HTML do admin IA
**Esforço:** S | **Critério:** páginas existem, carregam CSS/JS correto, menu de navegação funcional.

- [ ] Criar `ia/admin/index.html` (dashboard placeholder)
- [ ] Criar `ia/admin/tenants/index.html` (lista placeholder)
- [ ] Criar `ia/admin/conversations/index.html` (monitor placeholder)
- [ ] Criar `ia/admin/leads/index.html` (leads placeholder)
- [ ] Criar `ia/admin/style.css` com overrides mínimos (sidebar, nav, layout admin)
- [ ] Importar em todos: `tokens.css` → `base.css` → `components.css` → `layout.css` → `ia/admin/style.css`
- [ ] Nav lateral com links: Dashboard / Tenants / Conversas / Leads; badge "Aguardando" em Conversas
- [ ] Anti-FOUC script em todas as páginas
- [ ] Validar mobile 390px: nav em bottom bar ou hamburger

**Dependência:** T002.

---

## FASE 2 — Tenants e Agentes

### T004 — API Edge: CRUD de Tenants
**Esforço:** M | **Critério:** endpoints criam, listam, editam e desativam tenants; erros retornam JSON com `error`.

- [ ] Criar `api/ia/admin/tenants.js` — GET (lista com ?status= ?segment=) + POST (criar)
- [ ] Criar `api/ia/admin/tenants/[id].js` — GET + PATCH + "DELETE" (soft: status=inactive)
- [ ] Validação: `name` required, `segment` em ['imobiliaria','clinica','pet','outro'], `plan` em ['trial','basico','pro']
- [ ] Ao criar tenant: criar automaticamente registro em `ia.agents` com defaults + `ia.wa_config` vazio
- [ ] Auth check: validar `sb-access-token` cookie em todos os endpoints

**Dependência:** T001.

---

### T005 — API Edge: Configuração de Agente
**Esforço:** M | **Critério:** salvar prompt cria versão; restaurar versão funciona; FAQ CRUD completo.

- [ ] Criar `api/ia/admin/agents/[tenant_id].js` — GET + PATCH (salva versão antes de atualizar)
- [ ] Criar `api/ia/admin/agents/[tenant_id]/versions.js` — GET (lista) + POST (restaurar: copia versão para agent atual + salva como nova versão)
- [ ] Criar `api/ia/admin/knowledge/[agent_id].js` — GET + POST
- [ ] Criar `api/ia/admin/knowledge/[id].js` — PATCH + DELETE
- [ ] Criar `api/ia/config/[instance_name].js` — GET **público** com `x-config-token` header → retorna `wa_config` + `agent` (sem PII do tenant). Usado pelo n8n.

**Dependência:** T004.

---

### T006 — API Edge: Instâncias WA + Config Anti-Ban
**Esforço:** M | **Critério:** criar instância gera `wa_config` com defaults; atualizar config persiste; verificar status faz ping na Evolution.

- [ ] Criar `api/ia/admin/wa-instances/[tenant_id].js` — GET + POST (criar instância + wa_config defaults)
- [ ] Criar `api/ia/admin/wa-instances/[id].js` — PATCH (atualizar) + DELETE
- [ ] Criar `api/ia/admin/wa-instances/[id]/config.js` — GET + PATCH (config anti-ban)
- [ ] Criar `api/ia/admin/wa-instances/[id]/status.js` — GET: faz fetch na Evolution API (`EVOLUTION_API_URL` + `EVOLUTION_API_KEY` env vars), retorna status atualizado + salva em `wa_instances.status` + `last_seen_at`
- [ ] Criar `api/ia/admin/wa-instances/[id]/qr.js` — GET: proxy para endpoint QR da Evolution API
- [ ] Lógica de warmup: ao criar instância, setar `warmup_phase=1`, `warmup_started_at=now()`

**Dependência:** T004.

---

### T007 — UI: Lista de Tenants + Criar Tenant
**Esforço:** M | **Critério:** criar tenant via form, listar, filtrar por status. Mobile first.

- [ ] `ia/admin/tenants/index.html`: tabela/cards com nome, segmento badge, plano, status badge, instância WA ícone, link para detalhe
- [ ] Filtro de status (pills: Todos / Ativos / Trial / Inativos)
- [ ] Botão "+ Novo tenant" → form inline ou modal
- [ ] Form novo tenant: nome, biz_name, segmento (select), telefone, email, plano (select), notas
- [ ] Submissão: POST `/api/ia/admin/tenants` → redirect para `/ia/admin/tenants/:id`
- [ ] Loading state, error state
- [ ] Empty state com CTA para criar primeiro tenant

**Dependência:** T004.

---

### T008 — UI: Detalhe do Tenant (3 tabs)
**Esforço:** L | **Critério:** editar agente, FAQ e instância WA em uma única página com tabs. Todas as seções salvam independentemente.

**Tab 1 — Agente:**
- [ ] Header com nome do tenant, segmento, status badge, link "← Voltar"
- [ ] Textarea system prompt (monospace, min-height 200px), variáveis disponíveis abaixo
- [ ] Seletor de modelo (select), slider temperatura (0.0–1.0 com label), campo max_tokens
- [ ] Config de horário: grid dias da semana × hora início/fim; checkbox "24/7" desabilita campos
- [ ] Textarea mensagem fora de horário
- [ ] Botão "Salvar agente" com indicador de versão e timestamp
- [ ] Link "Histórico de versões" → modal com lista de versões (data, primeiras 100 chars do prompt), botão "Restaurar esta versão"

**Tab 2 — FAQ:**
- [ ] Lista de Q/A com toggle ativo (switch), botão editar, botão deletar
- [ ] Botão "+ Adicionar" → expande form inline (question + answer textarea + tags input)
- [ ] Feedback visual ao salvar/deletar
- [ ] Empty state

**Tab 3 — Instância WA:**
- [ ] Status badge com cor (verde/amarelo/vermelho/azul) + label
- [ ] Barra de progresso de warmup: "Fase 3/5 — dia 12/30 — máx 100 msgs/dia"
- [ ] Botões: "Verificar status", "Ver QR Code" (modal com imagem QR)
- [ ] Form config anti-ban: delay min/max (sliders ou inputs número em ms), toggle typing, duration, max msgs/min, max msgs/dia (ou "automático por fase"), blackout (time inputs), opt-out keywords (tags input)
- [ ] Botão "Salvar configuração"
- [ ] Seção "Registrar nova instância" (colapsável)

**Dependência:** T005, T006.

---

## FASE 3 — Conversas

### T009 — API Edge: Webhook Recebedor
**Esforço:** M | **Critério:** mensagens chegam do n8n, persistem idempotente, conversa atualizada.

- [ ] Criar `api/ia/webhook/whatsapp.js` — POST público com validação `x-webhook-token`
- [ ] Env var: `WHATSAPP_WEBHOOK_TOKEN` (adicionar no Vercel)
- [ ] Handlers por `event`:
  - `message_received`: upsert `ia.conversations` (por `contact_phone` + `tenant_id`) + insert `ia.messages` (role=user, idempotência via `evolution_id`)
  - `message_sent`: insert `ia.messages` (role=assistant, evolution_id do bot)
  - `instance_status`: update `ia.wa_instances.status` + `last_seen_at`
- [ ] Se conversa não existe: criar com `status='bot'`
- [ ] Se `content` contém opt-out keyword (busca em `ia.wa_config`): setar `conversations.opted_out=true`
- [ ] Retornar `200 OK` imediatamente (idempotente — reprocessar é seguro)

**Dependência:** T001.

---

### T010 — API Edge: Conversas (Monitor)
**Esforço:** M | **Critério:** listar com filtros, ver mensagens, reply manual, mudar status.

- [ ] Criar `api/ia/admin/conversations.js` — GET (lista: ?tenant=&status=&page=, paginação 20/página)
- [ ] Criar `api/ia/admin/conversations/[id].js` — GET (conversa + mensagens)
- [ ] Criar `api/ia/admin/conversations/[id]/reply.js` — POST: valida body.content, faz POST para `N8N_REPLY_WEBHOOK_URL` com `{ instance_name, contact_phone, content, manual: true }`; salva mensagem com `role='human_agent'`
- [ ] Criar `api/ia/admin/conversations/[id]/status.js` — PATCH: aceita `{ status: 'bot'|'needs_human'|'closed' }`
- [ ] Env var: `N8N_REPLY_WEBHOOK_URL` (adicionar no Vercel)

**Dependência:** T009.

---

### T011 — UI: Monitor de Conversas
**Esforço:** L | **Critério:** ver todas as conversas, filtrar, abrir histórico, responder manualmente. Mobile com painel slide-in.

- [ ] `ia/admin/conversations/index.html`
- [ ] Filtros: pills "Todas" / "Aguardando humano" (com count badge) / "Bot ativo" / "Fechadas" + select de tenant
- [ ] Lista de conversas: avatar inicial, número, nome do tenant, última mensagem truncada, timestamp relativo, badge de status
- [ ] Clicar → painel lateral (slide-in em mobile, aside em desktop)
- [ ] Painel lateral: header com número + nome do tenant; timeline de msgs com alinhamento L/R e role badge (🤖 bot / 👤 cliente / 🙋 você)
- [ ] Input de resposta + botão Enviar (desabilitado se `opted_out=true`)
- [ ] Botões de ação: "Devolver ao bot" / "Fechar conversa" / "Bloquear número"
- [ ] Badge "Aguardando humano" no nav atualiza a cada 30s (polling simples)
- [ ] Mobile: painel lateral ocupa 100% da tela com botão "← Voltar"

**Dependência:** T010.

---

## FASE 4 — Dashboard + Leads

### T012 — API Edge: Stats + Demo Leads
**Esforço:** S | **Critério:** dashboard carrega com dados reais; leads do demo aparecem na lista.

- [ ] Criar `api/ia/admin/stats.js` — GET: consulta counts de `ia.tenants`, `ia.conversations`, msgs de hoje, needs_human + lista de instâncias com status
- [ ] Criar `api/ia/demo/lead.js` — POST **público** (sem auth): valida `{ contact, contact_type, demo_snippet }`; insert em `ia.demo_leads`; rate limit simples por IP (3/hr — reutilizar lógica de leads de hardware)
- [ ] Criar `api/ia/admin/demo-leads.js` — GET (lista: ?status=) + PATCH (`:id` atualiza status)

**Dependência:** T001.

---

### T013 — UI: Dashboard + Botão Lead no Demo
**Esforço:** M | **Critério:** dashboard mostra dados reais; /ia/demo tem botão que captura lead.

**Dashboard:**
- [ ] 4 stat cards: Tenants ativos / Conversas abertas / Msgs hoje / Aguardando humano (links para rotas)
- [ ] Tabela de instâncias WA: nome, tenant, status (badge), fase warmup, última atividade
- [ ] Lista últimas 5 conversas com link para monitor
- [ ] Auto-refresh dos stats a cada 60s

**Demo lead:**
- [ ] Adicionar em `ia/demo/index.html` botão flutuante ou banner no rodapé: "Quer isso para o seu negócio? → Falar com Iago"
- [ ] Clicar: abre mini-modal com campo de telefone ou email + nome empresa + botão "Enviar"
- [ ] Submissão: POST `/api/ia/demo/lead` → confirma com mensagem de sucesso + link WhatsApp direto

**UI Leads admin:**
- [ ] `ia/admin/leads/index.html`: lista com contato, trecho da conversa de demo, data, status badge
- [ ] Pills de filtro por status
- [ ] Botão "Abrir WhatsApp" (`wa.me/5511919691542?text=...` pré-preenchido com contexto do lead)
- [ ] Botão de ação para mudar status (contatado/convertido/descartado)

**Dependência:** T012.

---

## FASE 5 — Qualidade

### T014 — Testes E2E Playwright
**Esforço:** M | **Critério:** suite passa, cobrindo fluxo principal de onboarding de tenant.

- [ ] Criar `tests/ia-admin.spec.js`
- [ ] Teste: auth redirect sem login → `/admin/login`
- [ ] Teste: dashboard carrega (mock API)
- [ ] Teste: criar tenant → aparece na lista
- [ ] Teste: editar prompt do agente → versão salva na lista de versões
- [ ] Teste: webhook recebedor POST com token errado → 401
- [ ] Teste: webhook com `evolution_id` duplicado → 200 sem inserir duplicata
- [ ] Teste mobile 390px: todas as páginas sem overflow horizontal

**Dependência:** T013.

---

### T015 — Revisão Anti-Ban Final + Documentação n8n
**Esforço:** S | **Critério:** checklist anti-ban completo, template de workflow n8n exportado no repo.

- [ ] Verificar endpoint `/api/ia/config/:instance_name` retornando config completa
- [ ] Criar `n8n/README.md` com instruções de setup do workflow (webhook, Groq node, Supabase node)
- [ ] Criar `n8n/workflow-agent-template.json` — workflow base do n8n exportado (template)
- [ ] Checklist anti-ban validado:
  - [ ] Delay aleatório entre min_ms e max_ms configurado no n8n
  - [ ] Typing indicator ativo por padrão
  - [ ] Idempotência por `evolution_id` testada
  - [ ] Opt-out keywords detectados e `opted_out` setado
  - [ ] Warmup phase 1 limita a 20 msgs/dia
  - [ ] Blackout hours respeitado pelo n8n
- [ ] Atualizar `CLAUDE.md` seção "Estado atual" com 012 concluído

**Dependência:** T014.

---

## Resumo

| Task | Fase | Esforço | Bloqueante para |
|------|------|---------|-----------------|
| T001 — Migration | 1 | M | T004-T009-T012 |
| T002 — Auth middleware | 1 | S | T003 |
| T003 — Scaffold HTML | 1 | S | T007-T008-T011-T013 |
| T004 — API Tenants | 2 | M | T005-T006-T007 |
| T005 — API Agentes | 2 | M | T008 |
| T006 — API WA Instances | 2 | M | T008 |
| T007 — UI Lista Tenants | 2 | M | — |
| T008 — UI Detalhe Tenant | 2 | L | — |
| T009 — Webhook Recebedor | 3 | M | T010 |
| T010 — API Conversas | 3 | M | T011 |
| T011 — UI Monitor Conversas | 3 | L | — |
| T012 — API Stats + Leads | 4 | S | T013 |
| T013 — UI Dashboard + Demo Lead | 4 | M | — |
| T014 — Testes E2E | 5 | M | T015 |
| T015 — Anti-Ban Review + n8n docs | 5 | S | — |

**Sequência crítica:** T001 → T004 → T005+T006 → T008 → T009 → T010 → T011
