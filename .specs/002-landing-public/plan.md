# Plan: Landing Pública

**Feature:** `002-landing-public`
**Status:** Draft
**Criada:** 2026-05-19
**Spec:** [spec.md](./spec.md)
**Depende de:** [001-design-system/plan.md](../001-design-system/plan.md)

> Este plano define a estrutura final da landing pública: copy direcional por seção, layout por breakpoint, estratégia de imagens, JSON-LD, arquitetura de arquivos e deploy. Material consumível por Claude Design pra produzir mockups.

---

## 1. Identidade e Voz

### Nome e Brand

- **Brand:** Iago Lopes | Hardware & Tech
- **Headline curta de identidade:** "Especialista em hardware e TI — Bragança, Atibaia e Itatiba"
- **Tagline opcional:** "Sem balcão, com garantia."
- **Wordmark — três opções para o Claude Design propor mockup:**
  1. **Linha única com separador elegante:** "Iago Lopes — Hardware & Tech" (em-dash em vez de pipe)
  2. **Duas linhas (preferência inicial):** "Iago Lopes" em peso `bold` em cima, "Hardware & Tech" em peso `medium` e cor `--color-text-secondary` embaixo, com leading apertado
  3. **Pipe estilizado:** "Iago Lopes | Hardware & Tech" com pipe fino (border-left/divisor em vez de caractere `|`)
- **Monograma compacto (favicon, avatar, OG square):** "IL" (Iago Lopes) em fundo `--color-brand`, texto branco, raio `--radius-md`
- **Diferencial técnico de marca:** **Manutenção em placa / Microsoldagem** — habilidade rara entre técnicos da região. Aparece reforçada em "Por que comigo" e no card de Celular/Tablet

### Voz

- **Primeira pessoa do singular:** "eu atendo", "eu consigo", "eu garanto"
- **Direta, sem floreios:** "Quebrou? Eu conserto." em vez de "Estamos aqui para resolver suas necessidades tecnológicas"
- **Técnico mas claro:** pode citar peças, processos, mas explica o que significa
- **Sem urgência fabricada:** sem "promoção", "últimas vagas", "agora ou nunca"
- **Sem emojis no texto principal** — pode usar ícones SVG nos serviços

### Palavras-chave (SEO)

Densidade alvo ≤ 3% por palavra-chave, distribuída naturalmente:

- "técnico em informática" (Bragança Paulista, Atibaia, Itatiba)
- "conserto de celular"
- "manutenção de notebook"
- "suporte técnico de TI"
- "montagem de PC" / "Custom PC"

---

## 2. Arquitetura de Páginas

```
iflcosta.tech/
├── /                  index.html       Home (todas as seções)
├── /orcamento         orcamento.html   Formulário longo (definido em 003)
├── /obrigado          obrigado.html    Fallback de pós-submit
├── /privacidade       privacidade.html LGPD
├── /termos            termos.html      Termos de serviço
├── /styleguide        styleguide.html  Catálogo do design system (robots noindex)
├── /404               404.html         Erro custom
├── /robots.txt
├── /sitemap.xml
└── /humans.txt (opcional, vaidade)
```

Todas servidas como arquivos `.html` estáticos na Vercel. `/api/*` permanece como edge functions.

---

## 3. Estrutura da Home — Seção por Seção

### 3.1 Header (sticky, discreto)

**Mobile (< 768px):**
```
┌────────────────────────────────────────┐
│ Iago Lopes         [Pedir orçamento] │  ← height 56px, bg surface, border-bottom subtle
│ Hardware & Tech                       │     (apenas linha 1 em telas < 360px de largura)
└────────────────────────────────────────┘
```

**Desktop (≥ 768px):**
```
┌──────────────────────────────────────────────────────────────┐
│ Iago Lopes | Hardware & Tech   Serviços  FAQ  Contato [CTA] │  ← height 64px
└──────────────────────────────────────────────────────────────┘
```

- Em mobile, o wordmark de duas linhas reduz altura visual mantendo identidade
- Em telas muito pequenas (< 360px), exibir apenas "Iago Lopes" no header
- O monograma "IL" pode substituir o wordmark inteiro em viewports < 320px (edge case)

- Links de navegação são âncoras (`#servicos`, `#faq`, `#contato`)
- Botão "Orçamento" abre modal `<ifl-orcamento-form mode="modal">`
- Sticky com `position: sticky; top: 0` e fundo translúcido (`backdrop-filter: blur(8px)`) ao scroll

### 3.2 Hero

**Estrutura:**
- Eyebrow pequeno (uppercase, tracking-wide): "BRAGANÇA · ATIBAIA · ITATIBA"
- Headline (display):
  > **Quebrou, travou ou ficou lento? Eu resolvo.**
- Subhead (text-lg, secondary):
  > Especialista em TI atendendo direto, sem balcão, com **garantia de 90 dias**. Conserto de celular, notebook, PC e suporte técnico onde você estiver.
- CTAs lado a lado (em mobile: empilhados):
  - Primário: **"Pedir orçamento agora"** → abre modal
  - Secundário: **"Falar no WhatsApp"** → `wa.me/5511919691542`
- Trust strip abaixo: 4 ícones pequenos com label:
  - 🛡 Garantia 90 dias
  - 🔬 Manutenção em placa
  - 🏠 Atendimento sem balcão
  - 💳 Pix, dinheiro ou cartão

**Visual:**
- Mobile: fundo com gradiente sutil indigo→slate, ou ilustração leve à direita em desktop
- Sem foto de stock. Se houver foto, é foto real do Iago (Claude Design pode propor)
- LCP é a headline; nada de imagem grande bloqueando

**Layout por breakpoint:**

| Breakpoint | Layout |
|---|---|
| < 768px | Coluna única, headline ~ 32px, CTAs empilhados full-width |
| 768–1023px | Coluna única centralizada, max-width 720px |
| ≥ 1024px | Duas colunas (texto à esquerda, elemento visual à direita), CTAs inline |

### 3.3 Seção "Serviços"

**Estrutura:**
- H2: **"O que eu faço"**
- Subhead: "4 frentes, todas com a mesma garantia."
- Grid de 4 cards:

| Card | Título | Conteúdo curto | Faixa de preço orientativa |
|---|---|---|---|
| 📱 | **Celular e tablet** | Troca de tela, bateria, conector, recuperação de dados, reparo em placas | A partir de R$ 80 |
| 💻 | **Notebook e PC** | Manutenção preventiva, troca de SSD/RAM, formatação, limpeza, recuperação, reparo em placa | A partir de R$ 120 |
| 🎮 | **Custom PC** | Montagem do zero, upgrade, escolha de peças, bench e otimização | Orçamento sob medida |
| 🌐 | **Suporte TI / Redes** | Wi-Fi, roteador, impressora, NAS, configuração de loja/escritório | A partir de R$ 150 |

**Cada card:**
- Ícone Lucide grande no topo
- H3 com nome do serviço
- Parágrafo 1–2 linhas
- Faixa de preço em destaque (badge `info`)
- CTA pequeno "Pedir orçamento" → abre modal com `servico` pré-selecionado

**Layout:**
- Mobile: grid 1 coluna
- Tablet: grid 2 colunas
- Desktop: grid 4 colunas

### 3.4 Seção "Como funciona"

**Estrutura:**
- H2: **"Como funciona, do oi ao conserto"**
- Stepper de 3 passos, com número grande à esquerda:

| Passo | Título | Descrição |
|---|---|---|
| **01** | Você manda o problema | Pelo formulário ou direto no WhatsApp. Pode mandar foto. |
| **02** | Eu dou orçamento e prazo | Sem pegadinha. Faixa de preço fechada antes de qualquer reparo. |
| **03** | Conserto com garantia | 90 dias cobrindo a peça e o serviço. Se voltar, eu resolvo. |

**Layout:**
- Mobile: vertical, número à esquerda do texto
- Desktop: 3 colunas horizontais com seta entre

### 3.5 Seção "Por que comigo"

**Estrutura:**
- H2: **"Por que escolher um especialista direto"**
- Subhead: "Sem intermediário, sem balcão lotado, sem técnico que troca toda semana."
- Lista de 6 diferenciais, em grid 2×3 mobile / 3×2 desktop:

| Ícone | Diferencial | Microcopy |
|---|---|---|
| ✓ | **Garantia de 90 dias** | Peça e serviço cobertos. |
| ✓ | **Manutenção em placa** | Microsoldagem, BGA e reparo de trilhas — não troco tudo na primeira tentativa. |
| ✓ | **Atendimento direto comigo** | Você fala com quem conserta. |
| ✓ | **Sem balcão** | Eu vou até você ou combinamos retirada. |
| ✓ | **Peças com procedência** | Originais ou compatíveis premium, sempre informado. |
| ✓ | **Pix, dinheiro ou cartão** | Sem taxa em Pix. Cartão em até 6×. |

### 3.6 Seção "Áreas atendidas"

**Estrutura:**
- H2: **"Onde eu atendo"**
- Subhead: "Atendimento presencial nas três cidades. Suporte remoto pra Brasil inteiro."
- Lista visual:
  - **Bragança Paulista** — todos os bairros
  - **Atibaia** — Centro e bairros principais
  - **Itatiba** — Centro e bairros principais
  - **Remoto** — qualquer lugar via AnyDesk / TeamViewer

- Mapa estilizado opcional (SVG leve, não Google Maps embed) — Claude Design decide
- CTA secundário: "Não é dessas cidades? Posso atender remoto. Fala comigo."

### 3.7 Seção "FAQ"

**Estrutura:**
- H2: **"Perguntas que ouço toda semana"**
- Lista de `<details>` nativos com `<summary>`:

1. **Quanto custa pra trocar a tela do meu celular?**
   Depende do modelo. iPhone vai de R$ 250 a R$ 1.200; Android genérico de R$ 80 a R$ 600. Manda o modelo no WhatsApp que eu fecho o preço antes.

2. **Vocês fazem orçamento pelo WhatsApp?**
   Sim, sempre. Mando faixa de preço pela mensagem mesmo, e fecho só depois que você aprova.

3. **As peças são originais?**
   Eu trabalho com originais e com compatíveis premium. Antes de aprovar o orçamento eu te falo qual vou usar e o porquê.

4. **Você faz manutenção em placa? (reballing, microsoldagem)**
   Faço. Trabalho com BGA, reparo de trilha, troca de CI e diagnóstico de placa. Quando dá pra reparar em vez de trocar a placa inteira, eu prefiro — quase sempre fica mais barato pra você.

5. **Quanto tempo demora?**
   Conserto simples de celular: mesmo dia. Notebook/PC: 1 a 3 dias. Reparo em placa: 2 a 5 dias dependendo do diagnóstico. Custom PC: até 2 dias úteis após aprovar orçamento.

6. **Tem garantia mesmo se eu mexer depois?**
   A garantia cobre a peça e o serviço. Se o problema voltar **sem indício de novo dano**, eu refaço sem cobrar. Quebra nova, queda ou líquido não entram.

7. **Você emite nota fiscal?**
   Sim, NFe eletrônica sempre que solicitada.

8. **Atendem urgência?**
   Atendo. Manda no WhatsApp marcando "urgente" que eu encaixo no mesmo dia se possível.

9. **Atende empresas?**
   Sim. Tenho clientes com contrato mensal de suporte. Posso fazer proposta sob medida.

- Cada item usa `<details>` nativo (zero JS) com estilização customizada do disclosure
- Schema.org `FAQPage` JSON-LD junto

### 3.8 Seção "Contato final"

**Estrutura:**
- H2: **"Vamos resolver?"**
- Parágrafo curto reforçando o próximo passo
- Três blocos lado a lado (mobile: empilhados):
  - **WhatsApp:** (11) 91969-1542 — botão `Falar no WhatsApp`
  - **Orçamento online:** botão "Pedir orçamento" abre modal
  - **Email:** iflcosta@outlook.com (mailto)

> **Nota de transição:** o email primário é `iflcosta@outlook.com` no lançamento. Quando o Iago migrar pra `contato@iflcosta.tech`, basta atualizar a variável `EMAIL_CONTATO` (ver seção 14) — o template referencia a variável, não o valor literal.
- Horário de atendimento: "Seg a Sáb, 9h às 19h. WhatsApp pode mandar fora do horário, respondo na próxima janela."

### 3.9 Footer

**Estrutura:**
- 3 colunas (1 em mobile):
  1. **Iago Lopes | Hardware & Tech** — descrição curta + redes sociais (Instagram, opcional)
  2. **Navegação** — Serviços, FAQ, Orçamento, Contato
  3. **Legal** — Política de Privacidade, Termos
- Linha inferior: "© 2026 Iago Lopes · Bragança Paulista – SP"
- CNPJ se aplicável

### 3.10 Botão flutuante de WhatsApp

- `position: fixed; bottom: 16px; right: 16px;`
- Aparece após scroll > 30% do hero
- 56×56 px, ícone Lucide `message-circle`, fundo `--color-success` (verde WhatsApp)
- `aria-label="Falar no WhatsApp"`
- Dispara evento GA4 `whatsapp_open` com `cta_location="float"`

---

## 4. Estratégia de Copy

Toda a copy desta proposta é **draft inicial** — vai pra revisão final do Iago antes do go-live. Princípios:

1. **Verbo de ação no infinitivo** em CTAs ("Pedir", "Falar")
2. **Números concretos** em vez de adjetivos ("90 dias" não "longa garantia")
3. **"Eu" e "você"** — nunca "nós" ou "o cliente"
4. **Frase curta primeiro**, expansão depois
5. **Zero jargão sem explicação** (se citar SSD, dizer "(o disco rápido)" em parêntese se contextual)

---

## 5. Estratégia de Imagens

### Origem

- **Sem stock photos.** Fotos genéricas de "pessoa olhando notebook" são detectáveis e quebram confiança.
- **Foto real do Iago:** vai entrar na seção "Por que comigo" ou no hero (Claude Design decide o melhor encaixe). **Foto definitiva ainda não foi tirada** — no lançamento entra um **placeholder visual** (ilustração SVG ou avatar com monograma "IL") e a foto real substitui depois sem mudança de layout. O slot precisa ter dimensões fixas para evitar CLS na troca.
- **Ilustrações** vetoriais leves para hero e seções (SVG inline, não PNG).
- **Ícones:** Lucide via SVG inline.

### Formatos

- Foto: AVIF principal, WebP fallback, JPG último recurso.
- Ilustração: SVG inline sempre.
- OG image: 1200×630 JPG ou WebP ≤ 150KB.
- Favicon: ICO multi-size (16, 32, 48) + PNG 180×180 (apple-touch).

### Dimensões e Lazy Loading

- Toda `<img>` tem `width` e `height` explícitos pra prevenir CLS.
- `loading="lazy"` em tudo exceto LCP (qualquer imagem above-the-fold).
- `decoding="async"` em tudo.
- `<picture>` com `<source>` AVIF + WebP + `<img>` fallback.

---

## 6. SEO — Implementação Concreta

### `<head>` da home

```html
<title>Iago Lopes | Hardware & Tech — Técnico em Bragança Paulista, Atibaia e Itatiba</title>
<meta name="description" content="Conserto de celular, manutenção de notebook e PC, manutenção em placa (microsoldagem), montagem de Custom PC e suporte de TI. Atendimento direto, sem balcão, com garantia de 90 dias.">
<link rel="canonical" href="https://iflcosta.tech/">

<!-- Open Graph -->
<meta property="og:title" content="Iago Lopes | Hardware & Tech — Técnico em Informática">
<meta property="og:description" content="Conserto de celular, notebook, PC, manutenção em placa e suporte TI em Bragança, Atibaia e Itatiba. Direto, com garantia.">
<meta property="og:image" content="https://iflcosta.tech/assets/img/og.jpg">
<meta property="og:url" content="https://iflcosta.tech/">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Iago Lopes | Hardware & Tech">
<meta name="twitter:description" content="Conserto de celular, notebook, PC, manutenção em placa e suporte TI. Direto, com garantia.">
<meta name="twitter:image" content="https://iflcosta.tech/assets/img/og.jpg">
```

### JSON-LD `LocalBusiness`

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://iflcosta.tech/#business",
  "name": "Iago Lopes | Hardware & Tech",
  "alternateName": "Iago Lopes Hardware & Tech",
  "description": "Especialista em hardware e TI — conserto de celular, manutenção de notebook/PC, manutenção em placa (microsoldagem), montagem de Custom PC e suporte técnico em Bragança Paulista, Atibaia e Itatiba.",
  "url": "https://iflcosta.tech",
  "telephone": "+5511919691542",
  "email": "iflcosta@outlook.com",
  "image": "https://iflcosta.tech/assets/img/og.jpg",
  "priceRange": "R$",
  "currenciesAccepted": "BRL",
  "paymentAccepted": "Cash, Credit Card, Pix",
  "areaServed": [
    { "@type": "City", "name": "Bragança Paulista" },
    { "@type": "City", "name": "Atibaia" },
    { "@type": "City", "name": "Itatiba" }
  ],
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    "opens": "09:00",
    "closes": "19:00"
  }],
  "sameAs": []
}
```

### JSON-LD `FAQPage`

Gerado a partir do conteúdo da seção FAQ (8 perguntas), seguindo schema.org/FAQPage.

### `robots.txt`

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /styleguide
Disallow: /api/

Sitemap: https://iflcosta.tech/sitemap.xml
```

### `sitemap.xml`

URLs: `/`, `/orcamento`, `/privacidade`, `/termos`. Atualização manual.

---

## 7. Layout — Padrões Compartilhados

### Container

```css
.container {
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: var(--space-4);
}
@media (min-width: 768px) {
  .container { padding-inline: var(--space-6); }
}
```

### Espaçamento entre Seções

```css
section {
  padding-block: var(--space-9);  /* 96px mobile */
}
@media (min-width: 768px) {
  section { padding-block: var(--space-10); }  /* 128px desktop */
}
```

### Cards (padrão visual reusado)

- `background: var(--color-bg-surface)`
- `border: 1px solid var(--color-border-subtle)`
- `border-radius: var(--radius-lg)`
- `padding: var(--space-5)` mobile, `var(--space-6)` desktop
- `box-shadow: var(--shadow-sm)`
- Em hover/focus (se card é interativo): `box-shadow: var(--shadow-md)`, `transform: translateY(-2px)`, `transition: var(--duration-fast)`

---

## 8. Analytics — Implementação

### Estrutura

```javascript
// /assets/js/lib/analytics.js
export function track(eventName, params = {}) {
  if (typeof gtag !== 'function') return;
  gtag('event', eventName, {
    ...params,
    send_to: 'G-XXXXXXXXXX'  // GA4 ID
  });
}
```

### Eventos Disparados na Landing

| Evento | Trigger | Params |
|---|---|---|
| `page_view` | Automático GA4 | – |
| `cta_click` | Click em qualquer botão de CTA principal | `cta_location` (hero \| servicos \| final \| float), `cta_label` |
| `form_open` | Modal de orçamento abre | `cta_location` |
| `whatsapp_open` | Click em link `wa.me` | `cta_location` |
| `scroll_depth` | 25/50/75/100% do scroll | `depth` |
| `faq_expand` | `<details>` aberto | `question_index` |

### Banner LGPD

- Aparece se `localStorage['ifl-consent']` for null
- 3 botões: "Aceitar todos", "Apenas necessários", "Política completa"
- "Apenas necessários" → GA4 não carrega
- Carregamento de GA4 condicionado a consentimento (defer até decisão)

---

## 9. Arquitetura de Arquivos

```
/                         (deploy root Vercel)
├── index.html
├── orcamento.html
├── obrigado.html
├── privacidade.html
├── termos.html
├── styleguide.html
├── 404.html
├── robots.txt
├── sitemap.xml
├── /assets
│   ├── /css
│   │   ├── tokens.css       ← do design system
│   │   ├── reset.css
│   │   ├── base.css
│   │   ├── utilities.css
│   │   ├── main.css         ← @imports
│   │   └── /pages
│   │       ├── home.css
│   │       ├── orcamento.css
│   │       └── styleguide.css
│   ├── /js
│   │   ├── /components      ← Web Components do DS
│   │   ├── /lib
│   │   │   ├── theme.js
│   │   │   ├── analytics.js
│   │   │   ├── consent.js
│   │   │   └── focus-trap.js
│   │   ├── main.js          ← entry comum
│   │   └── home.js          ← lógica específica da home (scroll-depth, etc.)
│   ├── /img
│   │   ├── og.jpg
│   │   ├── favicon.ico
│   │   ├── apple-touch-icon.png
│   │   └── /servicos
│   │       ├── celular.svg
│   │       ├── notebook.svg
│   │       ├── custom-pc.svg
│   │       └── suporte.svg
│   └── /data
│       └── faq.json          ← conteúdo do FAQ pra gerar JSON-LD + HTML
└── /api                      ← edge functions (já existe)
    ├── submit.js
    ├── leads.js
    └── groq.js
```

---

## 10. Deploy e Build

### Stack de Deploy

- **Vercel** — projeto já existente, domínio `iflcosta.tech` configurado.
- **Sem build step** na landing — push to main = deploy de arquivos estáticos.
- **Edge functions** continuam em `/api`.
- **Preview deploys** por PR via Vercel Git integration.

### Cache Headers (via `vercel.json`)

```json
{
  "headers": [
    {
      "source": "/assets/(css|js|img|fonts)/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*).html",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=3600, must-revalidate" }
      ]
    }
  ]
}
```

Versionamento de assets via query string (`main.css?v=1`) para invalidação.

### Lighthouse CI

- GitHub Action rodando Lighthouse mobile em cada PR contra `/`, `/orcamento`, `/styleguide`.
- Budget: P 95+, A 95+, BP 95+, SEO 95+.
- Falha do CI bloqueia merge.

---

## 11. Performance — Estratégias Específicas

| Estratégia | Aplicação |
|---|---|
| Inline critical CSS no `<head>` | Tokens + reset + base + above-the-fold layout |
| Defer rest of CSS | `main.css` com `media="print" onload="this.media='all'"` |
| Module scripts com `defer` | Componentes Web Components |
| `<link rel="preconnect">` | wa.me, www.googletagmanager.com (após consentimento) |
| `<link rel="preload">` | Imagem LCP, se existir |
| Sem fontes web | System stack (decidido no DS) |
| HTML inicial ≤ 50KB | Conteúdo das seções inline; SVGs inline |
| Imagens com `width`/`height` | Sempre — prevenção CLS |
| Lazy loading | Tudo abaixo da dobra |
| AVIF + WebP fallback | `<picture>` com `<source>` |

---

## 12. Acessibilidade — Implementação

### Skip Link

```html
<a href="#main" class="skip-link">Pular para o conteúdo principal</a>
```

Visível apenas em `:focus-visible`, no canto superior esquerdo.

### Landmarks

```html
<header>...</header>
<main id="main">
  <section aria-labelledby="hero-title">...</section>
  <section aria-labelledby="servicos-title">...</section>
  ...
</main>
<footer>...</footer>
```

### Heading Hierarchy

- 1× `<h1>` na home (no hero)
- `<h2>` em cada seção
- `<h3>` em cada card
- Sem skip de nível

### Foco Visível

Padrão do design system aplicado (outline indigo, offset 2px).

### Imagens

Toda `<img>` tem `alt`:
- Informativa: descrição funcional ("Tela de celular danificada com trinca")
- Decorativa: `alt=""`

### Reduced Motion

Todas as transições e animações dentro de `@media (prefers-reduced-motion: no-preference)`.

---

## 13. LGPD — Implementação Concreta

### Banner de Consentimento

```html
<aside id="consent-banner" hidden>
  <p>Usamos cookies para entender como o site é utilizado e melhorar sua experiência. <a href="/privacidade">Saiba mais</a>.</p>
  <button data-consent="accept">Aceitar todos</button>
  <button data-consent="essential">Apenas necessários</button>
</aside>
```

Lógica em `/assets/js/lib/consent.js`:
- Se `localStorage['ifl-consent']` ausente → mostra banner
- "Aceitar" → carrega GA4
- "Essential" → não carrega GA4, marca consentimento como essencial

### Páginas Legais

- `/privacidade` — finalidades, dados coletados, retenção (180 dias para leads não convertidos), direitos do titular, contato do controlador (Iago Lopes, `iflcosta@outlook.com`)
- `/termos` — condições de serviço, garantia 90 dias, política de retorno, jurisdição (foro de Bragança Paulista – SP)

### Direito de Exclusão

Processo manual nessa fase: cliente solicita via WhatsApp/email, Iago apaga linha no admin em ≤ 7 dias úteis.

---

## 14. Variáveis de Ambiente

Configuradas no Vercel:

| Var | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Apenas em `/api/*` |
| `SUPABASE_ANON_KEY` | Cliente, mas evitar usar diretamente na landing |
| `GA4_ID` | ID do GA4 (também pode ser inline) |
| `WHATSAPP_NUMBER` | `5511919691542` |
| `EMAIL_CONTATO` | `iflcosta@outlook.com` (migra pra `contato@iflcosta.tech` quando o domínio de email estiver pronto) |
| `RATE_LIMIT_MAX` | 3 (envios por hora por IP) |
| `RATE_LIMIT_WINDOW` | 3600 (segundos) |

---

## 15. Critérios de Pronto

- [ ] Todas as 8 seções da home renderizam corretamente em 360px, 414px, 768px, 1024px, 1440px
- [ ] Lighthouse mobile ≥ 95 nas 4 categorias em `/`, `/orcamento`, `/styleguide`
- [ ] axe-core sem violações `serious`/`critical`
- [ ] JSON-LD valida em validator.schema.org
- [ ] OG/Twitter Card preview correto
- [ ] Banner LGPD aparece e respeita escolha
- [ ] GA4 dispara todos os eventos definidos (verificado em DebugView)
- [ ] WhatsApp float aparece após scroll do hero e funciona
- [ ] Navegação por teclado completa
- [ ] HTML W3C válido
- [ ] Sem scroll horizontal de 320px a 1920px
- [ ] Cache headers configurados via vercel.json
- [ ] Sitemap e robots.txt válidos

---

## 16. Próximos Passos

1. Aprovação deste `plan.md`.
2. Envio deste documento + `001-design-system/plan.md` ao Claude Design pra mockups visuais.
3. Geração do `tasks.md` desta feature (Claude Code) — ordem de construção: tokens → reset → home seções → /orcamento (depende de 003) → páginas legais → styleguide.
4. Em paralelo, fechar `003-lead-capture/plan.md` pra ter o modal pronto pra integração na home.
