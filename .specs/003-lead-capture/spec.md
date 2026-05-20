# Spec: Captação de Leads

**Feature:** `003-lead-capture`
**Status:** Draft
**Criada:** 2026-05-19
**Depende de:** `constitution.md`, `001-design-system`, `002-landing-public`
**Bloqueia:** `005-admin-crm` (consome a tabela `leads`)

---

## 1. Contexto

Esta feature é o coração comercial do produto: transforma visitante anônimo em conversa de WhatsApp comigo, persistindo o lead no Supabase pra eu acompanhar pelo admin depois. Existem dois pontos de entrada, ambos reaproveitando o **mesmo Web Component** `<ifl-orcamento-form>`:

1. **Modal rápido** — disparado pelos CTAs da landing (`#hero`, `#servicos`, `#final`). Versão enxuta (3–4 campos), foco em fricção mínima.
2. **Página dedicada `/orcamento`** — versão completa do formulário (8–12 campos), para casos de orçamento mais elaborado (Custom PC, redes corporativas, urgência declarada).

Em ambos os casos, o fluxo termina com: lead salvo no Supabase, evento GA4 disparado, e usuário redirecionado para `wa.me/5511919691542` com mensagem pré-preenchida contextualizando.

---

## 2. Objetivos

1. **Reduzir fricção** — modal de 3 campos preenchível em ≤ 20s.
2. **Capturar contexto suficiente** pra eu responder no WhatsApp já sabendo o que é, sem ping-pong inicial.
3. **Não perder lead** mesmo se o usuário não chegar ao WhatsApp — o registro no Supabase persiste.
4. **Prevenir spam** sem usar CAPTCHA visível (atrito alto em mobile).
5. **Atender LGPD** — consentimento explícito antes de coletar telefone.
6. **Reaproveitar código** — um único componente serve modal + página.

---

## 3. Cenários de Uso

### Cenário A: Maria abre modal e envia em 20s

Maria está no hero, toca "Pedir orçamento". Modal abre com foco no primeiro campo (Nome). Ela preenche: Nome ("Maria"), Tipo de serviço (select: "Conserto de celular"), Telefone com máscara ("(11) 99...). Toca "Enviar". Vê toast "Enviado, redirecionando pro WhatsApp...", e em < 1s já está no WhatsApp meu com mensagem: *"Oi Iago, sou Maria. Preciso de Conserto de celular. Telefone: (11) 9...".*

### Cenário B: Lucas quer Custom PC pela página dedicada

Lucas chegou pela landing, clicou em "Quero montar meu PC", abriu `/orcamento`. Formulário longo: além dos campos do modal, vê: Tipo de uso (gamer / produtividade / workstation), Faixa de orçamento, Componentes preferidos (textarea), Prazo desejado, Endereço pra entrega/retirada. Envia. Mesma confirmação + redirect, mas a mensagem do WhatsApp inclui o contexto completo.

### Cenário C: Tentativa de spam por bot

Bot preenche o formulário em < 2s, marca o campo honeypot, envia. Servidor retorna 200 (fingindo sucesso) mas descarta. Nada vai pro Supabase, nada vai pro GA4. Bot vai embora satisfeito; eu não sou incomodado.

### Cenário D: Maria muda de ideia

Maria toca o CTA, abre o modal, lê os campos, fecha (X ou Esc). O foco volta pro CTA que ela tocou. Nenhum dado parcial é enviado. Se ela reabrir em < 5 minutos, os campos preenchidos parcialmente persistem (sessionStorage).

### Cenário E: Erro de rede no envio

Maria preenche, toca enviar, internet cai. Toast vermelho aparece: "Não consegui enviar. Tente de novo ou fale direto: (11) 91969-1542". Botão volta a estar disponível. Dados preenchidos permanecem. Evento GA4 `form_error` é disparado quando voltar.

---

## 4. Requisitos Funcionais

### Componente Compartilhado

- **RF-1.** Existe um único Web Component `<ifl-orcamento-form mode="modal|page">` que renderiza ambas as versões a partir do mesmo código.
- **RF-2.** O componente expõe atributos para pré-selecionar tipo de serviço: `<ifl-orcamento-form servico="custom-pc">`.
- **RF-3.** Em modo `modal`, é montado dentro de `<ifl-modal>`. Em modo `page`, é montado direto na página `/orcamento` com layout adaptado.

### Campos — Versão Modal (mínima)

- **RF-4.** Campos exibidos: **Nome** (obrigatório), **Tipo de serviço** (select, obrigatório), **Telefone** (obrigatório com máscara `(11) 99999-9999`), **Mensagem curta** (opcional, textarea 280 chars).
- **RF-5.** Tipo de serviço deve ter opções: Conserto de celular/tablet, Manutenção de notebook/PC, Montagem de Custom PC, Suporte TI/Redes, Outro.

### Campos — Versão Página (`/orcamento`)

- **RF-6.** Inclui todos os campos do modal **mais**: Email (opcional), Tipo de uso (apenas se Custom PC selecionado), Faixa de orçamento (select com ranges), Cidade (select: Bragança / Atibaia / Itatiba / Outra), Urgência (select: Hoje / Essa semana / Sem pressa), Mensagem detalhada (textarea 1500 chars), Como soube de mim (select opcional).
- **RF-7.** Campos condicionais (ex: Tipo de uso só aparece se serviço = Custom PC) devem se mostrar/ocultar sem reload, com transição respeitando reduced-motion.

### Validação

- **RF-8.** Validação no cliente em tempo real, mas com mensagem de erro só após primeiro `blur` do campo (não enquanto digita).
- **RF-9.** Validação no servidor é fonte da verdade — cliente nunca é confiável.
- **RF-10.** Regras: Nome ≥ 2 chars e ≤ 80 chars; Telefone 10 ou 11 dígitos numéricos; Email regex padrão se preenchido; Mensagem ≤ limite declarado.
- **RF-11.** Mensagens de erro são em pt-BR, claras, indicam como corrigir (ex: "Telefone precisa ter 10 ou 11 dígitos. Coloca o DDD junto.").
- **RF-12.** Cada erro de campo é anunciado via `aria-describedby` e `aria-invalid`.

### Anti-Spam

- **RF-13.** Honeypot: um campo escondido (display none + `tabindex="-1"` + `aria-hidden="true"`) que, se preenchido, descarta silenciosamente.
- **RF-14.** Rate limit no servidor: máximo 3 envios por IP por hora.
- **RF-15.** Validação temporal: se o tempo entre `form_open` e `form_submit` for < 3s, descartar silenciosamente.
- **RF-16.** Não usar CAPTCHA visual nessa fase.

### Persistência

- **RF-17.** Cada envio bem-sucedido cria uma linha na tabela `leads` do Supabase com pelo menos: `id`, `created_at`, `nome`, `telefone`, `email` (nullable), `servico`, `mensagem` (nullable), `cidade` (nullable), `urgencia` (nullable), `origem` (enum: modal | page), `cta_location` (enum: hero | servicos | final | float | direct), `user_agent`, `referrer`, `consent_at`, `ip_hash` (sha256 do IP, não o IP cru).
- **RF-18.** RLS: tabela `leads` é **insert-only** para o role `anon` via endpoint server-side. `service_role` faz o INSERT a partir do endpoint `/api/leads` (ou `/api/submit`). `anon` não SELECT.
- **RF-19.** Status inicial do lead é `novo`. Ciclo de vida (`novo → contatado → orcamento_enviado → convertido | perdido`) é gerenciado pelo admin (feature `005-admin-crm`).
- **RF-20.** Não armazenar IP cru. Hash + truncamento.

### LGPD

- **RF-21.** Antes de submeter, o usuário consente explicitamente via checkbox **não pré-marcado**: "Concordo com a [Política de Privacidade](/privacidade) e autorizo o contato pelos dados fornecidos."
- **RF-22.** Checkbox de consentimento é obrigatório no servidor — sem ele, retorna 400 com mensagem clara.
- **RF-23.** A timestamp do consentimento é salva em `consent_at`.
- **RF-24.** Lead pode ser excluído mediante pedido por WhatsApp/email; admin terá ação manual nessa fase (princípio V).

### Fluxo de Sucesso

- **RF-25.** Após envio bem-sucedido (200 do servidor): toast de sucesso aparece, e em ≤ 1s o browser navega para `wa.me/5511919691542?text=` com mensagem pré-preenchida URI-encoded.
- **RF-26.** A mensagem do WhatsApp segue template: `"Oi Iago, sou {nome}. Preciso de {servico}. {se mensagem: '\n\nDetalhes: {mensagem}'}{se cidade: '\nCidade: {cidade}'}{se urgencia: '\nUrgência: {urgencia}'}\n\nVim pelo site."`
- **RF-27.** Se navegação automática falhar (pop-up bloqueado, etc.), botão grande "Continuar no WhatsApp" aparece na tela.
- **RF-28.** Página `/obrigado` é fallback caso `target=_blank` falhe — exibe link direto.

### Persistência Local

- **RF-29.** Campos preenchidos parcialmente persistem em `sessionStorage` por 5 minutos, para sobrevivermos a fechamento acidental do modal.
- **RF-30.** Após envio bem-sucedido, `sessionStorage` é limpo.

### Analytics

- **RF-31.** Eventos GA4:
  - `form_open` (params: `form_type` = modal|page, `cta_location`)
  - `form_field_focus` (param: `field_name`) — opcional, ajuda a entender abandono
  - `form_submit_attempt` (param: `form_type`)
  - `form_submit_success` (params: `form_type`, `servico`)
  - `form_submit_error` (params: `form_type`, `error_code`)
  - `whatsapp_redirect` (param: `from_form`)
- **RF-32.** Nenhum evento GA4 carrega PII (nome/telefone/email) — apenas categorias/tipos.

### Acessibilidade

- **RF-33.** Modal trapa foco enquanto aberto; `Esc` fecha; foco retorna ao trigger.
- **RF-34.** Todo campo tem `<label>` associado via `for`/`id`. Placeholder nunca substitui label.
- **RF-35.** Mensagens de erro são anunciadas via `aria-live="polite"` quando aparecem.
- **RF-36.** Botão de submit anuncia estado de loading via `aria-busy="true"` durante envio.
- **RF-37.** Formulário é submetível por `Enter` quando o foco está em qualquer campo de texto (exceto textarea).

### Performance

- **RF-38.** O componente `<ifl-orcamento-form>` carrega ≤ 8KB gzipped (script + estilo).
- **RF-39.** Em modo modal, o componente é lazy-carregado no primeiro toque do CTA (não no page load).
- **RF-40.** Em `/orcamento`, o componente carrega no page load (é o conteúdo principal).

---

## 5. Entidades-Chave

### Lead (tabela `leads`)

| Campo | Tipo | Obrigatório | Notas |
|---|---|---|---|
| `id` | uuid | sim | PK, default `gen_random_uuid()` |
| `created_at` | timestamptz | sim | default `now()` |
| `nome` | text | sim | 2–80 chars |
| `telefone` | text | sim | normalizado pra 10–11 dígitos |
| `email` | text | não | nullable |
| `servico` | enum | sim | celular_tablet \| notebook_pc \| custom_pc \| suporte_ti \| outro |
| `mensagem` | text | não | ≤ 1500 chars |
| `cidade` | text | não | apenas modo page |
| `urgencia` | text | não | apenas modo page |
| `origem` | enum | sim | modal \| page |
| `cta_location` | text | não | hero \| servicos \| final \| float \| direct |
| `user_agent` | text | não | truncado a 500 chars |
| `referrer` | text | não | truncado a 500 chars |
| `consent_at` | timestamptz | sim | obrigatório por LGPD |
| `ip_hash` | text | não | sha256(ip) |
| `status` | enum | sim | default `novo`; gerenciado pelo admin |

### Endpoint `/api/leads` (já existe parcialmente; será revisitado em `plan.md`)

- **Método:** POST
- **Body:** JSON com os campos acima (exceto `id`, `created_at`, `ip_hash`, `status`, `user_agent`, `referrer`)
- **Headers de servidor adicionam:** `user_agent`, `referrer`, `ip_hash`
- **Resposta sucesso:** `{ ok: true, redirect: "https://wa.me/..." }` (200)
- **Resposta erro:** `{ ok: false, error: "<code>", message: "<human readable pt-BR>" }` (400 | 429 | 500)
- **Códigos de erro:** `validation_failed`, `rate_limited`, `consent_missing`, `honeypot_triggered` (mas retorna 200 fake), `server_error`

---

## 6. Critérios de Aceite

- [ ] Modal preenchível em ≤ 20s por usuário sem deficiência em mobile real.
- [ ] Página `/orcamento` preenchível em ≤ 90s para Custom PC.
- [ ] 100% dos envios válidos resultam em linha na tabela `leads` e redirect ao WhatsApp.
- [ ] Honeypot, rate limit e timing block prevenem 95%+ de bots (medido por logs após 30 dias).
- [ ] Validação cliente + servidor cobrem todos os campos com mensagens em pt-BR.
- [ ] LGPD: checkbox de consentimento é obrigatório e não pode ser pré-marcado.
- [ ] Eventos GA4 disparam corretamente nos pontos definidos.
- [ ] axe-core não reporta violações `serious`/`critical` no modal aberto nem em `/orcamento`.
- [ ] Modal é trap-focused e fecha com `Esc`.
- [ ] Componente `<ifl-orcamento-form>` ≤ 8KB gzipped.
- [ ] Mensagem do WhatsApp pré-preenchida renderiza corretamente em iOS e Android.
- [ ] `sessionStorage` preserva campos por 5 min e limpa após sucesso.
- [ ] Erro de rede mostra mensagem clara e permite retry sem perder dados.

---

## 7. Fora de Escopo

- Confirmação por SMS ou validação de telefone (caro, atrito alto).
- Upload de imagens (foto do aparelho quebrado) — fica pra v2, possível ADR.
- Agendamento online com calendário — princípio IV (WhatsApp é o canal).
- Pagamento de sinal — princípio IV.
- Notificação push para mim quando lead chega (vem em `005-admin-crm` ou `008-whatsapp-bridge`).
- Auto-resposta WhatsApp via Evolution (princípio: VPS é caixa-preta nessa fase).
- A/B test entre versões do formulário (sem ferramenta nessa fase).
- Captura por email standalone sem WhatsApp (princípio IV).

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Bots passarem por honeypot + timing | Média | Médio | Monitorar via admin; adicionar Turnstile como ADR se passar de 5 spam/dia |
| Redirect pro WhatsApp falhar em iOS Safari (pop-up block) | Alta | Alto | Fallback com botão visível "Continuar no WhatsApp"; abrir no mesmo tab se `target=_blank` falhar |
| Usuário enviar sem internet | Média | Médio | Detecção de offline via `navigator.onLine`; mensagem proativa |
| Lead duplicado por toque acidental no submit | Média | Baixo | Botão entra em estado `loading` imediatamente e bloqueia novo submit; dedupe server-side por (telefone, dia) |
| LGPD audit pegar consentimento não armazenado | Baixa | Alto | `consent_at` é NOT NULL; teste de schema garante |

---

## 9. Métricas de Sucesso (3 meses pós-lançamento)

- Taxa de conversão (form open → form submit success) ≥ 50% no modal.
- Taxa de conversão (form submit success → mensagem real no WhatsApp) ≥ 70%.
- Tempo mediano modal-aberto-até-submit ≤ 25s.
- Spam efetivo ≤ 2 por mês.
- Zero violação LGPD reportada.

---

## 10. Próximos Passos

1. Aprovação deste `spec.md`.
2. `plan.md` desta feature define: estrutura do endpoint `/api/leads` (revisão do existente `api/submit.js`), schema SQL detalhado com migration, máscara de telefone (lib leve ou regex), arquitetura do componente, estratégia anti-spam servidora.
3. `tasks.md` define os passos executáveis pro Claude Code.
