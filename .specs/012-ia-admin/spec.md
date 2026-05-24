# Spec: IA Admin — Painel de Gestão de Automação

**Feature:** `012-ia-admin`
**Status:** Spec aprovada — aguardando plan + tasks
**Criada:** 2026-05-24
**Domínio:** `ia.iflcosta.tech/admin`
**Depende de:** `011-ia-landing` (deploy ativo), Supabase projeto `togrnwxazuweuihlaljo`
**Bloqueia:** `013-ia-whatsapp-bridge` (multi-tenant WA), `014-ia-copilot` (agentes avançados)

---

## 1. Contexto

O produto de IA (ia.iflcosta.tech) vende automação de atendimento via WhatsApp para PMEs
(imobiliárias, clínicas, prestadores de serviço). Cada cliente contratante recebe um agente
configurado, um número dedicado no WhatsApp e histórico de conversas isolado.

Iago opera solo: **precisa de um painel para provisionar novos clientes, configurar agentes,
monitorar conversas e gerenciar instâncias WhatsApp** — tudo sem tocar no servidor da VPS
manualmente para cada cliente novo.

A infra de orquestração (Evolution API + n8n) roda em VPS separada. Este painel **não**
substitui o n8n — ele é a camada de configuração e monitoramento que o n8n consome via
Supabase.

---

## 2. Modelo de Negócio

- **Multi-tenant:** cada cliente (tenant) tem dados isolados, agente próprio, instância WA própria.
- **Operador único:** Iago é o único admin — sem RBAC, sem convite de usuário.
- **Receita:** setup R$1.500–3.000 + mensalidade R$300–800/tenant.
- **Capacidade inicial:** 1–15 tenants (VPS 4GB Hetzner).

---

## 3. Objetivos

1. **Onboarding de tenant em < 15 min** — criar cliente, configurar prompt, ativar instância WA.
2. **Visibilidade total** — Iago vê todas as conversas em andamento de todos os clientes.
3. **Controle anti-ban centralizado** — config de delay, warmup e limites por instância WA.
4. **Editor de agente** — system prompt, FAQ/base de conhecimento, modelo LLM, temperatura.
5. **Handoff humano** — marcar conversa para Iago responder manualmente.
6. **Leads do demo público** — capturar contatos que usaram /ia/demo e pediram contato.

---

## 4. Cenários Principais

### A. Novo cliente onboarding
Iago fecha contrato com imobiliária XYZ. Abre o admin → "Novo tenant" → preenche nome,
segmento, telefone de contato → cria agente com prompt do segmento imobiliário → registra
número WA dedicado e inicia período de warmup → em 30min, agente está ativo e respondendo.

### B. Conversa que bot não conseguiu responder
Cliente Marina perguntou algo fora do escopo. Bot marcou conversa como `needs_human`. Iago vê
badge de alerta no dashboard, abre a conversa, lê o histórico, responde pelo painel → mensagem
vai via n8n → Evolution → WhatsApp do cliente final.

### C. Ajuste de prompt em produção
Taxa de "não entendi" subiu. Iago abre configuração do agente, edita o system prompt,
salva → n8n lê config atualizada no próximo ciclo, sem precisar redeployar nada.

### D. Instância WA caiu/banida
Monitor mostra instância "desconectada". Iago cria instância nova, inicia warmup gradual,
redireciona agente para nova instância. Período de warmup configurado para 30 dias com
limites crescentes automáticos.

### E. Lead do demo quer contratar
Usuário usou /ia/demo, clicou "Quero isso para o meu negócio". Lead aparece na lista com
histórico da conversa de demo. Iago entra em contato pelo WhatsApp pessoal.

---

## 5. Requisitos Funcionais

### RF-01 — Autenticação
- Mesmo Supabase Auth do hardware admin (magic link + senha).
- Middleware protege `/ia/admin/*` igual ao `/admin/*`.
- Sessão compartilhada — login único serve os dois painéis.

### RF-02 — Dashboard
- Contadores em tempo real: tenants ativos, conversas abertas, msgs processadas hoje, conversas aguardando humano.
- Lista das últimas 10 conversas com atividade (qualquer tenant).
- Status de cada instância WA (conectada/desconectada/em warmup/banida).

### RF-03 — Gestão de Tenants (CRUD)
- Campos: nome, razão social, segmento (imobiliária/clínica/pet/outro), telefone, email, plano, status (ativo/inativo/trial), notas internas.
- Ativar/desativar tenant interrompe o agente sem deletar dados.
- Listagem paginada com filtro por status/segmento.

### RF-04 — Configuração de Agente por Tenant
- **System prompt**: textarea com syntax highlight mínimo, suporte a variáveis `{{nome_empresa}}`, `{{segmento}}`, `{{horario_atendimento}}`.
- **Modelo**: seletor (llama-3.3-70b-versatile / llama-3.1-8b-instant — vem do Groq).
- **Temperatura**: slider 0.0–1.0 (padrão 0.3).
- **Max tokens**: campo numérico (padrão 400).
- **Horário de atendimento**: intervalo por dia da semana. Fora do horário → mensagem de fora de expediente.
- **FAQ / Base de conhecimento**: lista de pares pergunta/resposta que o agente consulta antes de chamar o LLM. CRUD simples.
- **Versionamento de prompt**: salvar sempre cria nova versão; pode reverter para versão anterior.

### RF-05 — Gestão de Instâncias WhatsApp
- Cada tenant pode ter 1 instância WA (expansível).
- Campos: nome da instância (usado no Evolution API), número, status, data de criação, fase de warmup.
- **Config anti-ban por instância** (ver RF-09).
- Botão "Verificar status" — faz ping na Evolution API e atualiza status.
- Botão "QR Code" — abre modal com QR para conectar número novo.

### RF-06 — Monitor de Conversas
- Lista de todas as conversas de todos os tenants, filtráveis por: tenant, status (bot/human/closed), data.
- Badge contando conversas `needs_human` no menu.
- Abrir conversa: timeline de mensagens estilo chat, indicando quem enviou (cliente/bot/Iago).
- Input para resposta manual → envia via n8n webhook.
- Ações: "Retornar para bot", "Fechar conversa", "Bloquear número".

### RF-07 — Leads do Demo Público
- `/ia/demo` captura contato quando usuário pede mais informações.
- Admin lista leads com: número/email, data, trecho da conversa de demo, status (novo/contatado/convertido/descartado).
- Botão "Abrir WhatsApp" com mensagem pré-preenchida referenciando o demo.

### RF-08 — API Edge (Vercel)
Todos os endpoints em `/api/ia/admin/*`, protegidos por `service_role` + validação de sessão:
- `GET/POST/PATCH/DELETE /api/ia/admin/tenants`
- `GET/POST/PATCH /api/ia/admin/tenants/:id/agent`
- `GET/POST /api/ia/admin/tenants/:id/agent/versions`
- `GET/POST/PATCH/DELETE /api/ia/admin/tenants/:id/wa-instances`
- `GET /api/ia/admin/conversations` (query: tenant_id, status, page)
- `POST /api/ia/admin/conversations/:id/reply`
- `PATCH /api/ia/admin/conversations/:id/status`
- `GET /api/ia/admin/demo-leads`
- `GET /api/ia/admin/stats` (dashboard counters)
- `POST /api/ia/webhook/whatsapp` (recebe eventos do n8n, público + token)

### RF-09 — Anti-Ban (CRÍTICO)
Config por instância WA, consumida pelo n8n:

| Parâmetro | Padrão | Descrição |
|-----------|--------|-----------|
| `delay_min_ms` | 1500 | Delay mínimo antes de responder |
| `delay_max_ms` | 4000 | Delay máximo (random entre min/max) |
| `typing_enabled` | true | Enviar "digitando..." antes de responder |
| `typing_duration_ms` | 2000 | Duração do indicador de digitação |
| `max_msgs_per_minute` | 8 | Limite de mensagens enviadas por minuto |
| `max_msgs_per_day` | variável | Depende da fase de warmup |
| `blackout_start` | null | Hora início bloqueio noturno (ex: "23:00") |
| `blackout_end` | null | Hora fim bloqueio noturno (ex: "07:00") |
| `warmup_phase` | 1 | Fase atual do warmup (1–5) |
| `warmup_started_at` | — | Data início warmup |

**Fases de warmup automático (30 dias até fase 5):**

| Fase | Duração | Max msgs/dia | Comportamento |
|------|---------|--------------|---------------|
| 1 | dias 1–3 | 20 | Apenas respostas, sem proativas |
| 2 | dias 4–7 | 50 | Respostas + 1 notificação/dia/contato |
| 3 | dias 8–14 | 100 | Normal |
| 4 | dias 15–21 | 200 | Normal + templates proativos |
| 5 | dias 22+ | ilimitado* | Produção plena |

*"Ilimitado" = sem limite configurado, mas nunca burst (sempre respeita `max_msgs_per_minute`).

**Regras adicionais anti-ban (aplicadas no n8n, configuradas no admin):**
- Nunca responder duas vezes à mesma mensagem (idempotência por `message_id` da Evolution).
- Detectar opt-out ("parar", "sair", "cancelar", "remove") → marcar `opted_out=true`, parar de responder.
- Variar comprimento de respostas — n8n adiciona ruído de 0–200ms extra aleatório além do delay configurado.
- Não enviar mais de 3 mensagens consecutivas sem resposta do cliente.

---

## 6. Requisitos Não-Funcionais

- **Mobile-first**: painel usável no celular (Iago opera entre atendimentos).
- **Zero build step**: HTML vanilla + Edge Functions (igual ao admin de hardware).
- **Mesmo design system**: tokens.css compartilhado, mesma paleta do hardware admin.
- **Supabase schema isolado**: schema `ia` — nunca misturar com `public.*`.
- **RLS sempre ativo**: service_role apenas em Edge Functions.
- **LGPD**: mensagens têm retenção de 12 meses após última atividade da conversa.

---

## 7. Schema Supabase (`ia.*`)

```sql
ia.tenants          -- clientes contratantes
ia.agents           -- config do agente IA por tenant (1:1 por tenant)
ia.agent_versions   -- histórico de versões do prompt
ia.knowledge        -- FAQ por agente
ia.wa_instances     -- instâncias Evolution API
ia.wa_config        -- config anti-ban por instância (1:1)
ia.conversations    -- conversas WA agrupadas por número de contato
ia.messages         -- mensagens individuais
ia.demo_leads       -- leads do /ia/demo
```

---

## 8. Fora de Escopo

- ❌ Login de clientes (tenants) no painel — apenas Iago acessa.
- ❌ Billing automático / cobrança integrada — Iago cobra via PIX/boleto externamente.
- ❌ Multi-LLM simultâneo (A/B test de prompts) — fase futura.
- ❌ Transcrição de áudio WhatsApp — fase futura (014).
- ❌ Agendamento de reuniões diretamente (Google Calendar) — fase futura.
- ❌ Relatórios avançados (conversão, CSAT) — fase futura.
- ❌ Painel para o cliente final ver suas próprias conversas — fase futura.

---

## 9. Critérios de Pronto

- [ ] Login funciona em ia.iflcosta.tech/admin com a mesma senha do admin de hardware
- [ ] Criar tenant, configurar agente com prompt e FAQ, registrar instância WA em < 15 min
- [ ] Config anti-ban salva no Supabase e disponível para o n8n via API pública (token protegido)
- [ ] Monitor de conversas mostra histórico e permite resposta manual
- [ ] Leads do /ia/demo aparecem na lista com opção de abrir WhatsApp
- [ ] Mobile 390px: todas as telas navegáveis com uma mão
- [ ] Nenhum dado de tenant A visível para tenant B (RLS validado)

---

## 10. Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Evolution API bane número no warmup | Alta | Alto | Warmup gradual obrigatório, delay humano, chips velhos |
| Meta muda protocolo, Evolution quebra | Média | Alto | WAHA como fallback, número oficial como opção premium |
| n8n na VPS fora do ar | Baixa | Alto | Healthcheck + alerta Telegram, SLA Hetzner 99.9% |
| Groq rate limit em pico | Média | Médio | Fallback para llama-3.1-8b-instant, filas n8n |
| Tenant com contato excessivo (spam) | Baixa | Alto | Limites por instância + opt-out obrigatório |
