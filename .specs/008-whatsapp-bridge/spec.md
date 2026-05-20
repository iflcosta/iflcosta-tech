# Spec: WhatsApp Bridge

**Feature:** `008-whatsapp-bridge`
**Status:** Resumida (caixa-preta nessa fase — não acelere)
**Criada:** 2026-05-19
**Depende de:** `005-admin-crm` · `006-admin-os` · `007-admin-inventory`
**Bloqueia:** `009-copilot-ia` (parcial — copilot pode operar sem bridge)

---

## 1. Contexto

Hoje o Iago responde WhatsApp manualmente — bom pra confiança, ruim pra escala. Quando ele estiver no meio de uma microsoldagem complexa, não pode parar pra responder "Iago, é hoje meu celular?".

A integração já está pré-existente no legado: **Evolution API + n8n na VPS própria**. Esta feature **não constrói a infra** — só conecta o admin a ela.

**Caixa-preta nessa fase:** a constituição explicitamente diz "WhatsApp é caixa-preta, Iago responde manual". Esta feature só sai do espera-aí quando todas as 005-007 estiverem maduras e Iago decidir automatizar. **Não é prioridade próxima.**

---

## 2. Objetivos

1. **Resposta automática de status de OS** — cliente manda "cadê meu celular?" → bot responde com status atual.
2. **Triagem inicial** — mensagem recebida cria lead se número não existe, ou anexa ao customer existente.
3. **Confirmação de orçamento por reação/palavra-chave** — cliente responde "sim" no orçamento → OS muda pra `aprovado`.
4. **Painel de conversas no admin** — Iago vê todas as conversas, intervém quando bot não consegue.
5. **Templates de mensagem** — Iago envia "Seu equipamento está pronto" com 1 clique.

---

## 3. Cenários principais

### A. Cliente pergunta status
Maria manda "Cadê meu iPhone?" no WhatsApp do Iago. Evolution → webhook → admin. Bot detecta intent "status_check", busca customer por telefone, encontra última OS aberta, responde: "Maria, seu iPhone 12 está em conserto — previsão pra amanhã 17h. Qualquer coisa me chama!"

### B. Cliente novo
Número desconhecido manda "Oi, queria saber sobre conserto de notebook". Bot cria lead com mensagem + número, responde "Oi, sou o Iago! Em até 30min te respondo. Pode me dizer marca/modelo do notebook?".

### C. Aprovação de orçamento
Iago manda orçamento via template ("Maria, é R$ 280, prazo 3 dias, OK?"). Maria responde "sim ✅". Bot detecta aprovação, marca OS = `aprovado`, responde "Beleza! Te aviso quando estiver pronto."

### D. Intervenção manual
Bot recebe pergunta complexa que não consegue ("Por que minha bateria descarrega rápido depois do conserto?"). Marca conversa como "precisa-resposta", aparece no painel do Iago no admin. Iago responde do painel ou direto no WhatsApp.

### E. Notificação proativa de status pronto
OS muda pra `pronto` no admin (feature 006). Trigger envia template WhatsApp: "Maria, seu iPhone 12 está pronto pra retirada! Posso te entregar entre 14-19h. Confirma?"

---

## 4. Requisitos Funcionais (resumidos)

### Integração Evolution API

- **RF-1.** Endpoint `/api/whatsapp/webhook` recebe eventos da Evolution (mensagem recebida, status entrega, etc.).
- **RF-2.** Endpoint `/api/whatsapp/send` envia mensagens via Evolution. Aceita: texto, mídia, template.
- **RF-3.** Autenticação via token compartilhado (`EVOLUTION_API_KEY`).

### Schema

- **RF-10.** Tabela `whatsapp_messages`: id, from_number, to_number, direction (in/out), content, content_type (text/image/audio/etc), evolution_id (id da Evolution), customer_id (FK nullable), repair_id (FK nullable), processed_by_bot (bool), at, raw_payload (jsonb).
- **RF-11.** Tabela `whatsapp_conversations`: id, customer_id (FK), last_message_at, status (active/needs_attention/closed), unread_count.
- **RF-12.** Tabela `message_templates`: id, slug (uniq), content (com placeholders `{{nome}}`, `{{equipamento}}`), category (status_update/orcamento/lembrete), is_active.

### Bot lógica

- **RF-20.** Intent detection simples baseada em palavras-chave (sem LLM nessa feature — IA fica na 009).
- **RF-21.** Intents suportados: `status_check`, `aprovacao`, `cancelamento`, `pergunta_geral` (fallback → painel).
- **RF-22.** Toda mensagem outbound do bot grava no `whatsapp_messages` com `processed_by_bot=true`.

### Painel `/admin/whatsapp`

- **RF-30.** Lista de conversas ordenadas por última mensagem.
- **RF-31.** Badge "precisa resposta" — destaca conversas que bot não conseguiu.
- **RF-32.** Abrir conversa → timeline de mensagens (estilo WhatsApp web).
- **RF-33.** Input pra responder direto do admin → envia via Evolution.
- **RF-34.** Botão "Enviar template" → modal seleciona template + preenche placeholders.

### Notificações proativas

- **RF-40.** Webhook do Supabase quando `repairs.status` muda → dispara template apropriado.
- **RF-41.** Lembretes automatizados: OS pronto há > 7 dias sem retirada → template "Maria, seu celular ainda está aqui!".

### Audit

- **RF-50.** Toda mensagem enviada pelo bot grava em `audit_log` com `actor='bot'`.

---

## 5. Fora de Escopo

- ❌ LLM-based bot (Llama / Claude) — fica na feature 009. Aqui é só palavra-chave.
- ❌ Multimídia processing (transcrição de áudio, OCR de foto) — pode entrar na 009.
- ❌ Múltiplos números WhatsApp — single number.
- ❌ Broadcast / lista de transmissão — proibido pela política WhatsApp Business.
- ❌ App próprio de mensageria — usar WhatsApp puro.

---

## 6. Critérios de Pronto

- [ ] Webhook `/api/whatsapp/webhook` valida token Evolution
- [ ] Mensagem recebida cria lead se número desconhecido
- [ ] Intent `status_check` responde corretamente para OS abertas
- [ ] Notificação automática de OS `pronto` envia template
- [ ] Painel `/admin/whatsapp` lista conversas em mobile sem fricção
- [ ] Iago consegue responder do admin e a mensagem chega no WhatsApp do cliente
- [ ] Bot não responde 2× a mesma mensagem (idempotência via `evolution_id`)
- [ ] Audit log captura toda mensagem outbound do bot

---

## 7. Notas para o plan.md

- **Caixa-preta:** Evolution API + n8n já rodam na VPS própria. Esta feature **NÃO** mexe na VPS — só consome a API. Doc Evolution: confirmar com Iago URL e endpoints.
- Intent detection: começar com regex simples (`/(cad[eê]|onde|status|pronto)/i` → `status_check`). Mover pra NLP só se 30% das mensagens caírem em fallback.
- Idempotência: usar `evolution_id` como unique constraint em `whatsapp_messages`.
- Templates: começar com 5–8 hardcoded ("aprovacao_solicitada", "os_pronto", "lembrete_retirada", "novo_lead_resposta_inicial", "orcamento_enviado").
- **Dependência humana:** Iago precisa ativar webhook na Evolution apontando pro `/api/whatsapp/webhook` da Vercel.
- LGPD: histórico de mensagens contém PII pesado. Retenção: 1 ano após `repair.entregue_at` ou último contato.

**Próximo:** ESPERAR. Esta feature só é desenvolvida quando 005-007 estiverem estáveis e Iago decidir que vale o trade-off de manutenção.
