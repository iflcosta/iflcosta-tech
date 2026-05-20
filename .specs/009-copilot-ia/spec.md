# Spec: Copilot IA

**Feature:** `009-copilot-ia`
**Status:** Resumida (a expandir após 005-007 com dados reais)
**Criada:** 2026-05-19
**Depende de:** `005-admin-crm` · `006-admin-os` · `007-admin-inventory` (precisa de dados)
**Bloqueia:** —

---

## 1. Contexto

Com leads + customers + OS + estoque + wiki no Supabase, surge uma camada de valor que não existia no Notion: **perguntar em linguagem natural**.

Cenários reais que o Iago tem:
- "Quanto faturei esse mês em consertos de iPhone?"
- "Que clientes não trouxeram nada há > 6 meses? Faz sentido enviar mensagem de check-in?"
- "Tem SSD M.2 NVMe de 1TB em estoque?"
- "Qual o defeito mais comum em Samsung Galaxy S20?"
- "Tutorial de como fazer reballing de chip de áudio do iPhone 11?"

Hoje ele precisa procurar em vários lugares — pasta de notas, planilha, Notion, Google. O copilot consolida tudo em **chat no admin**, com acesso aos dados via tool use e à wiki técnica via RAG.

A constituição (§III Supabase é o Único Banco) já tem **pgvector** habilitado, e a tabela `wiki` está modelada no legado.

---

## 2. Objetivos

1. **Resposta em ≤ 3s** para queries SQL simples ("quanto faturei?", "estoque de X?").
2. **RAG sobre wiki técnica** — Iago coloca documentos de manutenção, IA recupera trecho exato.
3. **Tool use seguro** — IA pode LER tabelas do Supabase, mas **NUNCA modifica** dados nesta feature.
4. **Histórico de conversa** — Iago retoma de onde parou.
5. **Mobile-first** — chat funciona em iPhone igual ao desktop.

---

## 3. Cenários principais

### A. Pergunta de faturamento
Iago: "Quanto faturei em consertos de iPhone esse mês?"
IA chama tool `query_repairs({ equipamento: 'iPhone', date_range: 'current_month', status: 'entregue' })` → retorna SQL aggregado → IA responde: "R$ 2.840 em 12 consertos de iPhone esse mês. 60% foi troca de tela."

### B. Busca de cliente
Iago: "Aquele cara do Galaxy S20 do mês passado, qual o telefone dele?"
IA chama tool `search_customers({ equipamento_owned: 'Galaxy S20', within: '30 days' })` → retorna lista → IA: "Achei 2: João Silva (11 91234-5678) e Pedro Costa (11 98765-4321). É qual?"

### C. Consulta técnica RAG
Iago: "Como faço reballing de áudio em iPhone 11?"
IA busca em pgvector na tabela `wiki` por similaridade → recupera 3 trechos relevantes → responde com passos extraídos + cita fonte.

### D. Sugestão proativa (futuro, fora desta feature mas previsto)
Dashboard mostra: "Você tem 3 clientes inativos há > 6 meses que tiveram OS de alto valor. Vale check-in?"

---

## 4. Requisitos Funcionais (resumidos)

### Schema

- **RF-1.** Tabela `copilot_conversations`: id, started_at, last_message_at, summary (text, auto-generated), pinned (bool).
- **RF-2.** Tabela `copilot_messages`: id, conversation_id FK, role (user/assistant/tool), content, tool_calls (jsonb), tool_results (jsonb), tokens_in, tokens_out, latency_ms, at.
- **RF-3.** Tabela `wiki`: id, titulo, conteudo (text), categoria, tags, embedding (vector(1536)), updated_at. **Já existe no legado** — esta feature popula/usa.
- **RF-4.** Index pgvector: `CREATE INDEX ON wiki USING ivfflat (embedding vector_cosine_ops)`.

### LLM provider

- **RF-10.** Groq (Llama 3.x — provavelmente 3.3 70B versatile) como provedor primário. Endpoint server-side em `/api/groq.js` (já existe no legado).
- **RF-11.** Fallback: Claude Haiku via Anthropic API (env `ANTHROPIC_API_KEY`).
- **RF-12.** Modelo escolhido em `plan.md` baseado em latência + qualidade + custo.

### Tool use

- **RF-20.** IA tem acesso a tools READ-ONLY:
  - `query_leads({ filters })` → lista
  - `query_customers({ filters })` → lista
  - `query_repairs({ filters, agg? })` → lista ou agregado
  - `query_products({ filters })` → lista
  - `search_wiki({ query, k=3 })` → trechos por similaridade
- **RF-21.** **Nenhuma tool de escrita.** Mutações ficam fora do escopo — IA sugere, Iago executa manualmente.
- **RF-22.** Tools retornam JSON estruturado. IA monta resposta natural.

### RAG (wiki)

- **RF-30.** Embedding generation: usar OpenAI `text-embedding-3-small` (1536d) ou similar via API.
- **RF-31.** Pipeline: Iago cria/edita doc em `/admin/wiki` → trigger calcula embedding → grava no Supabase.
- **RF-32.** Query: pergunta do user → embedding → top-K (3) por cosine similarity → fed pro LLM como contexto.

### Interface `/admin/copilot`

- **RF-40.** Chat single-conversation por default; histórico acessível via drawer lateral.
- **RF-41.** Streaming de resposta (SSE) — caracteres aparecem conforme chegam.
- **RF-42.** Markdown rendering (negrito, listas, blocos de código).
- **RF-43.** Botão "Nova conversa" cria novo `copilot_conversations`.
- **RF-44.** Indicador visual quando IA está chamando tool ("Buscando estoque…").
- **RF-45.** Mobile-first: input full-width, mensagens em bubbles.

### Privacidade

- **RF-50.** Conversas ficam locais no Supabase do Iago — não vão para storage do Groq/Anthropic além do tempo da requisição.
- **RF-51.** Telemetria: tokens consumidos + custo estimado por mês visíveis em `/admin/copilot/uso`.

---

## 5. Fora de Escopo

- ❌ Mutações via IA (criar/editar/deletar) — só leitura.
- ❌ Resposta automatizada de WhatsApp via IA (fica na 008 ou versão 010+).
- ❌ Geração de imagem — não há use case identificado.
- ❌ Multi-modal (foto de placa → IA identifica chip) — futuro distante.
- ❌ Fine-tuning — Llama base + RAG basta.

---

## 6. Critérios de Pronto

- [ ] Tabela `wiki` com pgvector index criada
- [ ] Pipeline de embedding funciona (cria doc → embedding gravado)
- [ ] `/api/groq.js` aceita histórico + tools + retorna streaming
- [ ] 5 tools READ-ONLY implementadas e testadas com SQL real
- [ ] Chat UI funciona em iPhone real
- [ ] Latência média da primeira resposta < 3s
- [ ] RAG retorna trechos relevantes para 80% das perguntas técnicas (eval manual)
- [ ] Custo mensal estimado < R$ 30 (Iago usa ~50 queries/dia)
- [ ] Conversa persistida e retornável
- [ ] Nenhuma tool de escrita exposta acidentalmente

---

## 7. Notas para o plan.md

- **Decisão de modelo:** comparar Groq Llama 3.3 70B vs Claude Haiku 4.5. Groq é mais rápido (TPS alta) e gratuito até limite; Haiku é mais inteligente em tool use. **Recomendação inicial:** Groq pra default, Haiku via toggle se Iago achar respostas pobres.
- **Embedding:** OpenAI `text-embedding-3-small` é barato (~$0.02/M tokens). Alternativa: usar embedding do próprio Groq se disponível.
- **Tool calling:** Groq suporta function calling estilo OpenAI. Anthropic SDK tem tool use nativo. Abstrair via interface comum no `/api/groq.js`.
- **SQL queries:** as tools delegam pra functions Supabase pre-aprovadas (não geram SQL ad-hoc). Evita injection.
- **Custo de produção:** se Groq cobrar, considerar quota mensal hard-cap no admin pra evitar surpresa.
- **Anti-PII em logs:** mensagens podem ter PII de clientes; respeitar política de retenção (deletar conversa > 90 dias automaticamente).
- **MCP / Claude API:** documentação detalhada das integrações está em `https://docs.anthropic.com` — usar a skill `claude-api` ao implementar.

**Próximo:** detalhar `plan.md` quando 005-007 tiverem dados reais suficientes pra eval. Antes disso, qualquer modelo "funciona" mas não há como medir utilidade.
