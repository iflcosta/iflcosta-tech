# Guia de Entrega — iflStudio (Stack Open Source)

> Guia operacional para entregar os dois serviços principais usando ferramentas **100% gratuitas e open source**.
> Nenhuma assinatura. Nenhuma dependência de vendor.

---

## Serviços cobertos

| # | Serviço | Stack principal |
|---|---|---|
| **A** | Automações e Sistemas com IA | n8n · Ollama · Evolution API · Chatwoot |
| **B** | Desenvolvimento de SaaS e MVPs | Supabase · Coolify · Qdrant · Next.js |

---

## Serviço A — Automações e Sistemas com IA

### O que o cliente compra

> *"Robôs que trabalham 24/7 sem salário, férias ou erro humano."*

Três entregáveis típicos, em ordem de complexidade e valor:

| Entregável | Tempo estimado | Valor típico |
|---|---|---|
| **A1** — Pipeline de qualificação de leads | 1–2 semanas | R$ 2.000–5.000 |
| **A2** — Onboarding automático de clientes | 2–3 semanas | R$ 3.000–8.000 |
| **A3** — Geração automática de relatórios (Meta + Google Ads) | 2–4 semanas | R$ 4.000–10.000 |

---

### Stack Open Source — Automações

| Ferramenta paga (original) | Substituto Open Source | Por quê |
|---|---|---|
| Zapier | **n8n** (self-hosted) | Mesma lógica de nodes/triggers, UI visual, auto-hospedável |
| OpenAI GPT-4 API | **Ollama + Llama 3 / Mistral** (local) ou **Groq API** (gratuito) | LLM local sem custo, ou Groq com free tier generoso |
| WhatsApp Business API (paga) | **Evolution API** (open source) + **WhatsApp Web** | API REST completa sobre WhatsApp Web, grátis |
| HubSpot / Salesforce CRM | **Twenty CRM** (open source) ou **Chatwoot** | CRM open source com API completa |
| Twilio (SMS/notificações) | **ntfy** (push gratuito) ou **Chatwoot** | Notificações via webhook sem custo |
| Airtable | **NocoDB** (Airtable open source) | Banco de dados visual com API REST automática |

---

### Infraestrutura para hospedar tudo

> **Opção recomendada: VPS barata + Coolify**
>
> Um VPS de R$50–80/mês (Hetzner, Contabo, ou Oracle Cloud Free Tier) com **Coolify** instalado
> permite hospedar n8n, Evolution API, Chatwoot, NocoDB, e mais — tudo com 1-click deploy e SSL automático.

```
[VPS Linux Ubuntu 22.04]
  └── Coolify (painel de deploy self-hosted)
       ├── n8n          → porta 5678 (automações)
       ├── Evolution API → porta 8080 (WhatsApp)
       ├── Chatwoot      → porta 3000 (CRM/suporte)
       ├── NocoDB        → porta 8081 (banco visual)
       └── Ollama        → porta 11434 (LLM local)*
```
> *Ollama com LLM local requer VPS com pelo menos 8GB RAM. Alternativa: usar Groq API (grátis).

---

### Entregável A1 — Pipeline de Qualificação de Leads

**Cenário:** Lead preenche formulário → é qualificado por IA → proposta vai pro WhatsApp do vendedor em 15 segundos.

#### Fluxo completo no n8n

```
[Webhook Trigger]
  ↓ (lead submete formulário)
[HTTP Request → NocoDB]
  ↓ (busca histórico do lead, se existir)
[HTTP Request → Groq API / Ollama]
  ↓ (envia: nome, empresa, budget, dor principal)
  Prompt:
  "Você é um SDR especialista. Com base neste lead: {dados},
   gere uma pontuação de 1-10 e uma proposta personalizada
   de 3 parágrafos para o vendedor enviar por WhatsApp."
[Switch Node]
  ├── Score >= 7 → [Evolution API] → WhatsApp do vendedor
  ├── Score 4-6  → [Evolution API] → WhatsApp + tag "morno"
  └── Score < 4  → [NocoDB] → salva como "frio" sem notificação
[NocoDB Update]
  ↓ (salva lead com score e proposta gerada)
```

#### Como instalar

```bash
# 1. Instale Coolify no VPS
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# 2. No painel Coolify, crie os serviços (1-click):
#    → n8n, Evolution API, NocoDB

# 3. Configure n8n via UI:
#    New Workflow → Add Webhook Trigger
#    Copie a URL do webhook
#    Cole no formulário do cliente (Typeform / formulário próprio)
```

#### Como conectar o WhatsApp (Evolution API)

```bash
# Após instalação, acesse: http://seu-vps:8080

# Crie uma instância:
POST /instance/create
{ "instanceName": "agencia-cliente-x", "token": "seu-token" }

# Gere QR Code para escanear:
GET /instance/connect/agencia-cliente-x

# Envie mensagem (chamado pelo n8n):
POST /message/sendText/agencia-cliente-x
{
  "number": "5511999999999",
  "text": "Olá {nome}, vi seu contato sobre {dor}. Aqui está nossa proposta..."
}
```

#### Configuração do LLM (Groq — Free Tier)

```javascript
// No n8n, node "HTTP Request":
// URL: https://api.groq.com/openai/v1/chat/completions
// Headers: Authorization: Bearer {SUA_GROQ_API_KEY}
// Body:
{
  "model": "llama3-8b-8192",  // grátis, rápido
  "messages": [
    {
      "role": "system",
      "content": "Você é um SDR especialista em agências de marketing digital..."
    },
    {
      "role": "user", 
      "content": "Lead: {{$json.nome}}, Empresa: {{$json.empresa}}, Budget: {{$json.budget}}..."
    }
  ]
}
```

> **Groq Free Tier:** 14.400 requests/dia no Llama3-8B. Suficiente para ~400 leads/dia.
> Cadastro em: [console.groq.com](https://console.groq.com)

---

### Entregável A2 — Onboarding Automático de Clientes

**Cenário:** Contrato assinado → ambiente configurado + credenciais geradas + e-mail + WhatsApp de boas-vindas. Sem intervenção humana.

#### Ferramentas adicionais

| Ferramenta paga | Substituto Open Source |
|---|---|
| DocuSign / HelloSign | **DocuSeal** (open source, self-hosted) |
| Slack (notificações internas) | **Mattermost** (open source) ou webhook Discord (grátis) |
| SendGrid (e-mail) | **Postal** (SMTP open source) ou **Brevo** (free tier: 300 emails/dia) |

#### Fluxo completo no n8n

```
[Webhook Trigger: DocuSeal — contrato assinado]
  ↓
[HTTP Request → NocoDB]
  ↓ (cria registro do cliente com status "onboarding")
[Execute Command / HTTP]
  ↓ (cria subdomínio / ambiente do cliente via API do servidor)
[Generate Credentials Node]
  ↓ (gera senha aleatória segura)
[HTTP Request → Brevo / Postal]
  ↓ (envia e-mail de boas-vindas com credenciais e próximos passos)
[HTTP Request → Evolution API]
  ↓ (envia WhatsApp: "Seu ambiente está pronto! Acesse: link")
[HTTP Request → Mattermost/Discord]
  ↓ (notifica time interno: "Cliente X onboardado com sucesso")
[NocoDB Update]
  ↓ (atualiza status para "ativo")
```

#### Template de e-mail de boas-vindas (HTML)

```html
<!-- Salvar no n8n como template -->
<h2>Bem-vindo(a) à iflStudio, {{nome}}! 🚀</h2>
<p>Seu projeto está configurado e pronto.</p>
<table>
  <tr><td><strong>Painel:</strong></td><td>https://{{subdominio}}.app.com.br</td></tr>
  <tr><td><strong>Usuário:</strong></td><td>{{email}}</td></tr>
  <tr><td><strong>Senha temporária:</strong></td><td>{{senha}}</td></tr>
</table>
<p>Próximo passo: <a href="https://calendly.com/seu-link">Agende seu kickoff de 30min</a></p>
```

---

### Entregável A3 — Geração Automática de Relatórios (Meta + Google Ads)

**Cenário:** Todo domingo às 20h → sistema puxa dados das APIs → LLM escreve narrativa executiva → PDF gerado → enviado por e-mail e WhatsApp ao cliente.

#### Ferramentas adicionais

| Ferramenta paga | Substituto Open Source |
|---|---|
| Google Data Studio (limitado) | **Metabase** (open source, self-hosted) |
| PDF gerado por serviço pago | **Gotenberg** (Docker, converte HTML→PDF grátis) |

#### Fluxo completo no n8n (agendado — todo domingo 20h)

```
[Schedule Trigger: 0 20 * * 0]
  ↓
[HTTP Request → Meta Ads API]
  ↓ (busca: spend, impressões, cliques, conversões, CPA, ROAS)
  Endpoint: https://graph.facebook.com/v18.0/act_{AD_ACCOUNT_ID}/insights
  Params: time_range, fields=spend,impressions,clicks,conversions,cpc,cpm
  
[HTTP Request → Google Ads API]  
  ↓ (busca mesmas métricas pelo Google Ads Query Language - GAQL)
  
[Merge Node]
  ↓ (combina dados Meta + Google num objeto unificado)
  
[HTTP Request → Groq API / Ollama]
  ↓ (envia dados estruturados)
  Prompt:
  "Você é um analista de mídia sênior. Com base nos dados abaixo,
   escreva um relatório executivo em português de 400-600 palavras,
   com: resumo executivo, análise de performance, pontos de atenção
   e 3 recomendações concretas para a próxima semana.
   
   Dados: {{dados_formatados}}"
   
[HTTP Request → Gotenberg]
  ↓ (converte HTML do relatório em PDF)
  POST http://gotenberg:3000/forms/chromium/convert/html
  
[HTTP Request → Brevo / Postal]
  ↓ (envia PDF por e-mail)
  
[HTTP Request → Evolution API]
  ↓ (envia mensagem WhatsApp com link ou PDF)
```

#### Como conectar Meta Ads API (gratuito)

```
1. Acesse: developers.facebook.com
2. Crie um App do tipo "Business"
3. Adicione o produto "Marketing API"
4. Gere um User Access Token (long-lived: 60 dias)
5. No n8n, use em: Authorization: Bearer {TOKEN}
```

#### Como conectar Google Ads API (gratuito)

```
1. Acesse: console.cloud.google.com
2. Ative a "Google Ads API"
3. Crie credenciais OAuth 2.0
4. No n8n, use o node nativo "Google Ads" ou HTTP Request com refresh token
Quota grátis: 15.000 operações/dia
```

> **Custo total deste entregável: R$ 0/mês** (assumindo VPS já contratado)

---

## Serviço B — Desenvolvimento de SaaS e MVPs Escaláveis

### O que o cliente compra

> *"Ferramentas internas que sua concorrência não tem — prontas em semanas."*

Três tipos de entregável:

| Entregável | Tempo estimado | Valor típico |
|---|---|---|
| **B1** — Ferramenta interna (dashboard/automação) | 3–6 semanas | R$ 8.000–20.000 |
| **B2** — SaaS multi-tenant completo | 8–16 semanas | R$ 25.000–80.000 |
| **B3** — MVP com busca semântica / IA embutida | 4–8 semanas | R$ 15.000–40.000 |

---

### Stack Open Source — SaaS/MVP

| Categoria | Ferramenta paga (original) | Substituto Open Source | Custo |
|---|---|---|---|
| Backend / Banco | Supabase Pro | **Supabase** (free tier: 500MB, 2 projetos) | Grátis |
| Autenticação | Auth0 / Clerk | **Supabase Auth** (embutido) ou **Keycloak** | Grátis |
| Deploy / Hosting | Vercel Pro, Railway Pro | **Coolify** no próprio VPS | VPS ~R$ 60/mês |
| Banco vetorial | Pinecone ($) | **Qdrant** (self-hosted) ou **pgvector** (extensão PostgreSQL) | Grátis |
| Monitoramento | Datadog ($) | **Grafana + Prometheus** (open source) | Grátis |
| Logs | Papertrail ($) | **Grafana Loki** (self-hosted) | Grátis |
| Analytics do produto | Mixpanel ($) | **PostHog** (self-hosted, free) | Grátis |
| Fila de jobs | Bull/BullMQ (pago em cloud) | **BullMQ** (self-hosted) + **Redis** | Grátis |
| Armazenamento de arquivos | AWS S3 ($) | **MinIO** (S3-compatible, self-hosted) | Grátis |
| E-mails transacionais | SendGrid ($) | **Brevo** (300/dia grátis) ou **Postal** | Grátis |
| CMS headless | Contentful ($) | **Payload CMS** (open source) ou **Directus** | Grátis |

---

### Entregável B1 — Ferramenta Interna (Dashboard + Automação)

**Exemplo real do portfólio:** Sistema de automação de relatórios para agência.

#### Stack recomendada

```
Frontend:  Next.js 14 (App Router) + shadcn/ui
Backend:   Supabase (PostgreSQL + Auth + Storage + Realtime)
Deploy:    Coolify no VPS
Cron jobs: n8n (automações agendadas)
E-mails:   Brevo (free tier)
```

#### Estrutura de pastas do projeto

```
/meu-saas
  ├── /app                    → Next.js App Router
  │   ├── /dashboard          → área logada
  │   ├── /api                → API Routes (serverless functions)
  │   └── /auth               → login/cadastro
  ├── /components             → componentes reutilizáveis (shadcn/ui)
  ├── /lib
  │   ├── supabase.ts         → cliente Supabase
  │   └── ai.ts               → cliente Groq/Ollama
  └── /supabase
      └── /migrations         → SQL migrations versionadas
```

#### Setup em 15 minutos

```bash
# 1. Criar projeto Next.js
npx create-next-app@latest meu-saas --typescript --tailwind --app

# 2. Instalar Supabase
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

# 3. Instalar componentes UI prontos
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card table input

# 4. Configurar .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=seu-anon-key
GROQ_API_KEY=sua-groq-key
```

#### Autenticação pronta com Supabase (5 linhas)

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Uso em qualquer componente:
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'usuario@agencia.com',
  password: 'senha123'
})
```

---

### Entregável B2 — SaaS Multi-Tenant

**Exemplo do portfólio:** Plataforma SaaS com isolamento seguro entre clientes (Row-Level Security).

#### O que é multi-tenancy

Múltiplos clientes (tenants) compartilham a mesma instância do software, mas cada um vê **apenas seus próprios dados**. Implementado via **Row-Level Security (RLS)** no PostgreSQL (Supabase).

#### Implementação com Supabase RLS

```sql
-- 1. Adicionar coluna tenant_id em todas as tabelas
ALTER TABLE relatorios ADD COLUMN tenant_id UUID REFERENCES auth.users(id);

-- 2. Habilitar RLS na tabela
ALTER TABLE relatorios ENABLE ROW LEVEL SECURITY;

-- 3. Criar policy: cada usuário vê APENAS seus próprios dados
CREATE POLICY "tenant_isolation" ON relatorios
  FOR ALL
  USING (tenant_id = auth.uid());

-- 4. Pronto. O Supabase aplica isso automaticamente em todas as queries.
-- Não é possível vazar dados entre clientes.
```

#### Arquitetura de planos (Free / Pro / Enterprise)

```typescript
// Tabela de subscriptions no Supabase
// (integrado com MercadoPago ou Stripe — ambos gratuitos para integrar)

interface Subscription {
  tenant_id: string
  plan: 'free' | 'pro' | 'enterprise'
  limits: {
    automations: number      // free: 3, pro: 50, enterprise: unlimited
    reports_per_month: number // free: 10, pro: 500, enterprise: unlimited
    team_members: number      // free: 1, pro: 10, enterprise: unlimited
  }
}

// Middleware Next.js para verificar plano
export async function middleware(request: NextRequest) {
  const subscription = await getSubscription(tenantId)
  if (!canAccess(subscription, request.pathname)) {
    return NextResponse.redirect('/upgrade')
  }
}
```

#### Pagamentos com MercadoPago (grátis para integrar, BR-native)

```typescript
// Sem mensalidade, sem setup fee. Cobra só % por transação.
// SDK oficial: npm install mercadopago

import { MercadoPago } from 'mercadopago'

const mp = new MercadoPago({ accessToken: process.env.MP_ACCESS_TOKEN })

// Criar preferência de pagamento (plano pro)
const preference = await mp.preferences.create({
  items: [{ title: 'iflStudio Pro — Mensal', unit_price: 197, quantity: 1 }],
  back_urls: { success: '/dashboard?upgraded=true' },
  auto_return: 'approved'
})
// Redirecionar para preference.init_point
```

---

### Entregável B3 — MVP com Busca Semântica / IA Embutida

**Cenário:** Ferramenta interna que a equipe do cliente pode "perguntar" sobre seus próprios documentos, relatórios e dados históricos.

#### O que é busca vetorial

Ao invés de buscar por palavras-chave exatas, o sistema entende o **significado** da pergunta e retorna o conteúdo mais relevante — mesmo que não contenha as palavras exatas.

#### Stack open source para RAG (Retrieval-Augmented Generation)

```
Documentos → Embeddings → Qdrant (banco vetorial) → Groq/Ollama (resposta)
```

| Componente | Ferramenta | Custo |
|---|---|---|
| Gerar embeddings | **Nomic Embed** (via Ollama) ou **Groq** | Grátis |
| Banco vetorial | **Qdrant** (Docker, self-hosted) | Grátis |
| LLM para resposta | **Groq** (Llama3) ou **Ollama** (local) | Grátis |
| Orquestração | **LangChain.js** ou código direto | Grátis |

#### Implementação passo a passo

```bash
# 1. Instalar Qdrant via Docker (no VPS com Coolify)
docker run -p 6333:6333 qdrant/qdrant

# 2. No projeto Next.js:
npm install @qdrant/js-client-rest langchain
```

```typescript
// lib/rag.ts — Pipeline completo de RAG

import { QdrantClient } from '@qdrant/js-client-rest'
import Groq from 'groq-sdk'

const qdrant = new QdrantClient({ url: 'http://seu-vps:6333' })
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// PASSO 1: Indexar documento
export async function indexDocument(text: string, docId: string) {
  // Gerar embedding via Groq (ou Ollama local)
  const embeddingRes = await fetch('http://seu-vps:11434/api/embeddings', {
    method: 'POST',
    body: JSON.stringify({ model: 'nomic-embed-text', prompt: text })
  })
  const { embedding } = await embeddingRes.json()

  // Salvar no Qdrant
  await qdrant.upsert('documentos', {
    points: [{ id: docId, vector: embedding, payload: { text, docId } }]
  })
}

// PASSO 2: Responder pergunta
export async function askQuestion(question: string): Promise<string> {
  // Gerar embedding da pergunta
  const qEmbedRes = await fetch('http://seu-vps:11434/api/embeddings', {
    method: 'POST',
    body: JSON.stringify({ model: 'nomic-embed-text', prompt: question })
  })
  const { embedding: qEmbedding } = await qEmbedRes.json()

  // Buscar contexto relevante no Qdrant
  const results = await qdrant.search('documentos', {
    vector: qEmbedding,
    limit: 3,                    // top 3 trechos mais relevantes
    with_payload: true
  })

  const context = results.map(r => r.payload?.text).join('\n\n')

  // Gerar resposta com LLM
  const completion = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
    messages: [
      { role: 'system', content: 'Responda em português baseado APENAS no contexto fornecido.' },
      { role: 'user', content: `Contexto:\n${context}\n\nPergunta: ${question}` }
    ]
  })

  return completion.choices[0].message.content ?? ''
}
```

---

## Checklist de Entrega para Cada Projeto

### Antes de começar (Discovery)

- [ ] Entender o processo manual atual do cliente (como é feito hoje)
- [ ] Mapear todos os sistemas que precisam se conectar (CRM, ads, WhatsApp, etc.)
- [ ] Definir o critério de sucesso mensurável (ex: tempo de resposta de 4h → 15s)
- [ ] Escolher stack baseado nos sistemas que o cliente já usa

### Durante o projeto

- [ ] Criar ambiente de staging separado para testar
- [ ] Construir o fluxo no n8n com dados fictícios primeiro
- [ ] Validar integração com o cliente antes de ir para produção
- [ ] Documentar cada node do workflow (descrição do que faz)

### Na entrega

- [ ] Gravar vídeo Loom de 5–10 min mostrando o fluxo funcionando
- [ ] Entregar documento PDF com: diagrama do fluxo + instruções de uso
- [ ] Criar usuário admin para o cliente no n8n (somente leitura de preferência)
- [ ] Configurar alertas por e-mail/WhatsApp em caso de erro no workflow
- [ ] Fazer 1 semana de monitoramento pós-entrega incluída no preço

---

## Infraestrutura Mínima Recomendada

### VPS para projetos de automação (A1, A2, A3)

```
Hetzner CX21 (€ 5,77/mês ≈ R$ 35/mês)
  CPU: 2 vCPU
  RAM: 4GB
  SSD: 40GB
  Serviços: n8n + Evolution API + NocoDB + Brevo webhook
```

### VPS para projetos SaaS (B1, B2, B3)

```
Hetzner CX41 (€ 18,36/mês ≈ R$ 110/mês)
  CPU: 4 vCPU
  RAM: 16GB
  SSD: 160GB
  Serviços: Coolify + Next.js + Qdrant + Supabase self-hosted (opcional)
```

> **Alternativa zero-custo:** Oracle Cloud Free Tier oferece 2 VMs ARM com 4 OCPUs + 24GB RAM cada — **permanentemente grátis**. Ideal para começar sem nenhum custo.

---

## Resumo de Links

| Ferramenta | Link |
|---|---|
| n8n (self-hosted) | [n8n.io/docs/hosting](https://docs.n8n.io/hosting/) |
| Coolify | [coolify.io](https://coolify.io) |
| Evolution API (WhatsApp) | [github.com/EvolutionAPI/evolution-api](https://github.com/EvolutionAPI/evolution-api) |
| Groq API (LLM grátis) | [console.groq.com](https://console.groq.com) |
| Ollama (LLM local) | [ollama.com](https://ollama.com) |
| Supabase | [supabase.com](https://supabase.com) |
| Qdrant | [qdrant.tech](https://qdrant.tech) |
| NocoDB | [nocodb.com](https://nocodb.com) |
| DocuSeal | [github.com/docusealco/docuseal](https://github.com/docusealco/docuseal) |
| Gotenberg (HTML→PDF) | [gotenberg.dev](https://gotenberg.dev) |
| PostHog (analytics) | [posthog.com](https://posthog.com) |
| Oracle Cloud Free Tier | [oracle.com/cloud/free](https://oracle.com/cloud/free) |
| Hetzner VPS | [hetzner.com/cloud](https://hetzner.com/cloud) |
