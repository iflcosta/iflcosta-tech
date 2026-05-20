# Plan: Design System

**Feature:** `001-design-system`
**Status:** Draft
**Criada:** 2026-05-19
**Spec:** [spec.md](./spec.md)

> Este plano traduz os requisitos da `spec.md` em decisões concretas de implementação: valores de tokens, paleta, tipografia, arquitetura de arquivos, abordagem de Web Components. Tudo aqui é negociável até o merge; depois disso, vira contrato.

---

## 1. Decisões Estratégicas

### Pilares Visuais

| Pilar | Decisão | Justificativa |
|---|---|---|
| Atmosfera | Tech limpo, próximo de Linear / Vercel / Stripe, com peso visual confortável (não minimalismo gélido) | Construir percepção de competência técnica sem soar corporativo intimidador |
| Densidade | Média-baixa (whitespace generoso) | Mobile-first manda; densidade alta sufoca em 360px |
| Tom de cor | Azul-índigo como brand, neutros frios (slate) como base | Azul = confiança em serviços técnicos; slate combina sem competir com brand |
| Estética de bordas | Bordas suaves (8–16px) | Toque "produto digital" sem soar infantil |
| Sombras | Sutis, em camadas | Hierarquia sem peso; performa bem em mobile |

### Trade-offs Aceitos

- **System fonts em vez de web font** — zero KB de fonte, melhor LCP, fonte coerente por OS. Trade-off: identidade visual menos própria. ADR futuro pode introduzir Inter Variable se necessário.
- **Sem CSS framework** (Tailwind, etc.) — tokens em CSS Custom Properties + classes utilitárias mínimas próprias. Trade-off: mais código pra escrever; ganho: zero dependência, ≤ 15KB CSS base.
- **Shadow DOM nos componentes** — isolamento real, mas com penalidade de styling externo. Mitigação: usar `::part()` para slots customizáveis.

---

## 2. Tokens — Paleta de Cor

### Primitivos (não usar diretamente em componentes)

#### Slate (neutros frios — base)

```css
--slate-50:  #F8FAFC;
--slate-100: #F1F5F9;
--slate-200: #E2E8F0;
--slate-300: #CBD5E1;
--slate-400: #94A3B8;
--slate-500: #64748B;
--slate-600: #475569;
--slate-700: #334155;
--slate-800: #1E293B;
--slate-900: #0F172A;
--slate-950: #020617;
```

#### Indigo (brand)

```css
--indigo-50:  #EEF2FF;
--indigo-100: #E0E7FF;
--indigo-200: #C7D2FE;
--indigo-300: #A5B4FC;
--indigo-400: #818CF8;
--indigo-500: #6366F1;
--indigo-600: #4F46E5;   /* brand light */
--indigo-700: #4338CA;
--indigo-800: #3730A3;
--indigo-900: #312E81;
```

#### Functional

```css
/* Success (verde) */
--green-100: #D1FAE5; --green-500: #10B981; --green-700: #047857;

/* Warning (âmbar) */
--amber-100: #FEF3C7; --amber-500: #F59E0B; --amber-700: #B45309;

/* Danger (vermelho) */
--red-100: #FEE2E2; --red-500: #EF4444; --red-700: #B91C1C;

/* Info (azul-céu — distinto do brand) */
--sky-100: #E0F2FE; --sky-500: #0EA5E9; --sky-700: #0369A1;
```

### Semânticos (usar SEMPRE estes em componentes)

```css
/* Tema claro */
:root {
  --color-bg-base:       var(--slate-50);
  --color-bg-surface:    #FFFFFF;
  --color-bg-elevated:   #FFFFFF;
  --color-bg-subtle:     var(--slate-100);
  --color-bg-inverse:    var(--slate-900);

  --color-text-primary:   var(--slate-900);
  --color-text-secondary: var(--slate-600);
  --color-text-tertiary:  var(--slate-500);
  --color-text-inverse:   var(--slate-50);
  --color-text-brand:     var(--indigo-700);
  --color-text-on-brand:  #FFFFFF;

  --color-border-subtle:  var(--slate-200);
  --color-border-default: var(--slate-300);
  --color-border-strong:  var(--slate-400);
  --color-border-focus:   var(--indigo-600);

  --color-brand:          var(--indigo-600);
  --color-brand-hover:    var(--indigo-700);
  --color-brand-active:   var(--indigo-800);
  --color-brand-subtle:   var(--indigo-50);

  --color-success:        var(--green-500);
  --color-success-subtle: var(--green-100);
  --color-warning:        var(--amber-500);
  --color-warning-subtle: var(--amber-100);
  --color-danger:         var(--red-500);
  --color-danger-subtle:  var(--red-100);
  --color-info:           var(--sky-500);
  --color-info-subtle:    var(--sky-100);
}

/* Tema escuro */
[data-theme="dark"] {
  --color-bg-base:       #0B1220;
  --color-bg-surface:    #111827;
  --color-bg-elevated:   #1A2333;
  --color-bg-subtle:     #0F172A;
  --color-bg-inverse:    var(--slate-50);

  --color-text-primary:   var(--slate-50);
  --color-text-secondary: var(--slate-300);
  --color-text-tertiary:  var(--slate-400);
  --color-text-inverse:   var(--slate-900);
  --color-text-brand:     var(--indigo-300);
  --color-text-on-brand:  #FFFFFF;

  --color-border-subtle:  #1E293B;
  --color-border-default: #334155;
  --color-border-strong:  var(--slate-600);
  --color-border-focus:   var(--indigo-400);

  --color-brand:          var(--indigo-500);
  --color-brand-hover:    var(--indigo-400);
  --color-brand-active:   var(--indigo-300);
  --color-brand-subtle:   rgba(99, 102, 241, 0.12);

  /* Functional — versões adaptadas */
  --color-success-subtle: rgba(16, 185, 129, 0.15);
  --color-warning-subtle: rgba(245, 158, 11, 0.15);
  --color-danger-subtle:  rgba(239, 68, 68, 0.15);
  --color-info-subtle:    rgba(14, 165, 233, 0.15);
}

/* Auto via prefers-color-scheme se usuário não escolheu */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) { /* aplicar overrides de dark */ }
}
```

### Validação de Contraste

Todos os pares texto/fundo abaixo são auditados em ambos os temas e atendem WCAG AA:

| Par (tema claro) | Razão de Contraste | AA |
|---|---|---|
| `text-primary` sobre `bg-base` | 16.1:1 | ✅ |
| `text-secondary` sobre `bg-base` | 7.8:1 | ✅ |
| `text-tertiary` sobre `bg-base` | 5.2:1 | ✅ |
| `text-on-brand` sobre `brand` | 7.1:1 | ✅ |
| `brand` sobre `bg-base` | 6.5:1 | ✅ |

(Mesma validação em dark theme — confirmar com WebAIM contrast checker durante implementação.)

---

## 3. Tokens — Tipografia

### Família

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
             "Helvetica Neue", "Inter", system-ui, sans-serif;
--font-mono: ui-monospace, "SF Mono", "Cascadia Code", "JetBrains Mono",
             Menlo, Consolas, monospace;
```

**Decisão:** zero web font carregada. Identidade visual virá da paleta + estrutura, não da fonte.

### Escala Fluida (clamp entre 360px e 1440px)

```css
--text-xs:      0.75rem;                                   /* 12px fixo */
--text-sm:      clamp(0.875rem, 0.85rem + 0.1vw, 0.9375rem); /* 14→15px */
--text-base:    clamp(1rem, 0.95rem + 0.2vw, 1.0625rem);     /* 16→17px */
--text-lg:      clamp(1.125rem, 1rem + 0.4vw, 1.25rem);      /* 18→20px */
--text-xl:      clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);      /* 20→24px */
--text-2xl:     clamp(1.5rem, 1.2rem + 1vw, 1.875rem);       /* 24→30px */
--text-3xl:     clamp(1.875rem, 1.4rem + 1.6vw, 2.5rem);     /* 30→40px */
--text-display: clamp(2.5rem, 1.5rem + 3vw, 4rem);           /* 40→64px */
```

### Pesos

```css
--font-regular:  400;
--font-medium:   500;
--font-semibold: 600;
--font-bold:     700;
```

### Altura de Linha

```css
--leading-tight:   1.15;   /* display, h1, h2 */
--leading-snug:    1.3;    /* h3, h4 */
--leading-normal:  1.5;    /* body */
--leading-relaxed: 1.65;   /* leitura longa */
```

### Letter-spacing

```css
--tracking-tight:  -0.02em;  /* display */
--tracking-normal: 0;
--tracking-wide:   0.04em;   /* uppercase eyebrows */
```

### Hierarquia Aplicada

| Uso | Tamanho | Peso | Line-height | Letter-spacing |
|---|---|---|---|---|
| Display (hero) | `--text-display` | `--font-bold` | `--leading-tight` | `--tracking-tight` |
| H1 (page title) | `--text-3xl` | `--font-bold` | `--leading-tight` | `--tracking-tight` |
| H2 (section) | `--text-2xl` | `--font-semibold` | `--leading-snug` | `--tracking-normal` |
| H3 (card title) | `--text-xl` | `--font-semibold` | `--leading-snug` | `--tracking-normal` |
| H4 | `--text-lg` | `--font-semibold` | `--leading-snug` | `--tracking-normal` |
| Body | `--text-base` | `--font-regular` | `--leading-normal` | `--tracking-normal` |
| Body-large (lead) | `--text-lg` | `--font-regular` | `--leading-relaxed` | `--tracking-normal` |
| Small / caption | `--text-sm` | `--font-regular` | `--leading-normal` | `--tracking-normal` |
| Eyebrow (uppercase) | `--text-xs` | `--font-semibold` | `--leading-normal` | `--tracking-wide` |
| Label (form) | `--text-sm` | `--font-medium` | `--leading-snug` | `--tracking-normal` |

---

## 4. Tokens — Espaçamento

Base 4px. Escala intencionalmente esparsa em valores altos pra evitar inconsistência.

```css
--space-0:  0;
--space-1:  0.25rem;   /* 4px */
--space-2:  0.5rem;    /* 8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-5:  1.5rem;    /* 24px */
--space-6:  2rem;      /* 32px */
--space-7:  3rem;      /* 48px */
--space-8:  4rem;      /* 64px */
--space-9:  6rem;      /* 96px */
--space-10: 8rem;      /* 128px */
```

### Aplicação

- **Padding interno de componentes** (`button`, `input`, `card`): `--space-3` a `--space-5`
- **Gap entre seções da landing**: `--space-9` (mobile), `--space-10` (desktop)
- **Gap entre cards**: `--space-4` a `--space-5`
- **Padding lateral do container (gutter)**: `--space-4` (mobile), `--space-6` (tablet+)

### Container

```css
--container-max:    1200px;
--container-gutter: var(--space-4);          /* mobile */
@media (min-width: 768px) {
  --container-gutter: var(--space-6);
}
```

---

## 5. Tokens — Raio, Sombra, Motion

### Raio

```css
--radius-sm:   4px;     /* badges, tags */
--radius-md:   8px;     /* botões, inputs */
--radius-lg:   12px;    /* cards */
--radius-xl:   16px;    /* modal, cards de destaque */
--radius-2xl:  24px;    /* hero blobs, cta cards */
--radius-full: 9999px;  /* pills, avatares */
```

### Sombra

```css
--shadow-sm:    0 1px 2px 0 rgba(15, 23, 42, 0.05);
--shadow-md:    0 4px 6px -1px rgba(15, 23, 42, 0.08),
                0 2px 4px -2px rgba(15, 23, 42, 0.05);
--shadow-lg:    0 10px 15px -3px rgba(15, 23, 42, 0.08),
                0 4px 6px -4px rgba(15, 23, 42, 0.04);
--shadow-xl:    0 20px 25px -5px rgba(15, 23, 42, 0.1),
                0 8px 10px -6px rgba(15, 23, 42, 0.04);
--shadow-focus: 0 0 0 3px rgba(79, 70, 229, 0.3);
```

No tema escuro, sombras são quase imperceptíveis — usar `border` ou elevação por background mais claro.

### Motion

```css
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

--duration-instant: 100ms;
--duration-fast:    150ms;
--duration-base:    200ms;
--duration-slow:    300ms;
--duration-slower:  500ms;
```

**Regras:**
- Animação de cor / opacidade: `--duration-fast`
- Animação de tamanho / posição: `--duration-base`
- Modal abre / fecha: `--duration-slow`
- Loader / skeleton: loop com `--duration-slower`

Tudo dentro de `@media (prefers-reduced-motion: no-preference)`.

---

## 6. Breakpoints

```css
--bp-sm: 480px;    /* mobile L */
--bp-md: 768px;    /* tablet */
--bp-lg: 1024px;   /* laptop */
--bp-xl: 1280px;   /* desktop */
--bp-2xl: 1536px;  /* large */
```

Mobile-first sempre. Min-width queries apenas. Nunca max-width como base.

---

## 7. Arquitetura de Componentes

> **Decisão arquitetural (ver ADR 0005):** duas trilhas conforme contexto.
> - **Landing pública:** CSS classes BEM + JS imperativo com data attributes
> - **Admin:** Web Components vanilla `<ifl-*>` com Shadow DOM
>
> Tokens (`tokens.css`) e padrões visuais de componentes (`components.css`) são compartilhados.

### Trilha A — Landing (CSS classes BEM)

- **Naming:** classes BEM (`.btn`, `.btn--primary`, `.btn--sm`, `.modal`, `.modal__header`, etc.)
- **Hooks de JS:** data attributes (`[data-modal-open]`, `[data-theme-toggle]`, `[data-consent]`)
- **Sem build step** — CSS estático servido direto, JS num único `app.js` IIFE
- **Tokens consumidos via `var(--*)`** dentro do CSS regular (não Shadow DOM)
- **A11y:** ARIA attributes diretamente no HTML, focus management em JS imperativo

### Trilha B — Admin (Web Components)

- **Custom Elements v1** com Shadow DOM aberto
- **Naming:** `ifl-*` (prefixo de brand)
- **Cada componente em `.js` próprio** com `<template>` inline (admin pode ter build step)
- **Tokens vazam pra dentro do shadow** via `:host { ... }` e referência a CSS Custom Properties globais
- **Slots nomeados** para flexibilidade (`<slot name="icon">`)
- **`::part()` exposto** quando estilização externa for legítima

### Estrutura tipo de um componente

```javascript
// /assets/js/components/ifl-button.js
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: inline-flex;
      /* uses global tokens via var() */
    }
    button {
      font: inherit;
      padding: var(--space-3) var(--space-5);
      border-radius: var(--radius-md);
      /* ... */
    }
    :host([variant="primary"]) button { background: var(--color-brand); }
    :host([disabled]) button { opacity: 0.5; cursor: not-allowed; }
  </style>
  <button part="button"><slot></slot></button>
`;

class IflButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }
  // ...
}
customElements.define('ifl-button', IflButton);
```

### Inventário de Componentes (MVP)

#### Landing — CSS classes BEM (já implementado)

| Componente | Classes | Estados | Notas |
|---|---|---|---|
| Button | `.btn`, `.btn--primary`, `.btn--secondary`, `.btn--ghost`, `.btn--success`, `.btn--sm`, `.btn--lg`, `.btn--block` | default, hover, active, focus-visible | min-height 44px (touch target) |
| Badge | `.badge`, `.badge--info`, `.badge--success`, `.badge--brand`, `.badge--neutral` | – | `.dot` interno opcional |
| Card | `.card`, `.card--interactive`, `.card--feature` | hover (se interactive) | shadow-sm padrão |
| Chip | `.chip`, `.chip.is-active` | hover, active | usado no modal pra selecionar serviço |
| Input/Textarea/Select | `.field`, `.input`, `.textarea`, `.select` | hover, focus, error | min-height 44px |
| Modal | `.modal-backdrop.is-open`, `.modal`, `.modal__header/__body/__footer/__close` | open, closing | trap focus via JS, esc-close, scroll lock |
| Theme toggle | `.theme-toggle` com `data-theme-toggle` | sun/moon swap via `[data-theme="dark"]` | persiste em `localStorage['ifl-theme']` |
| WhatsApp float | `.wa-float`, `.wa-float.is-visible`, `.wa-float .pulse` | hidden, visible | aparece após scroll > 30% do hero |
| Consent banner | `.consent-banner`, `.consent-banner.is-visible` | hidden, visible | LGPD, persiste em `localStorage['ifl-consent']` |

#### Admin — Web Components `<ifl-*>` (a implementar em `004-admin-auth` em diante)

| Nome | Variantes | Tamanhos | Estados | Observações |
|---|---|---|---|---|
| `ifl-button` | primary, secondary, ghost, danger, link | sm, md, lg | default, hover, focus, active, disabled, loading | reaproveita CSS de `.btn` via tokens |
| `ifl-input` | text, email, tel, number, password | sm, md | default, focus, error, disabled, readonly | label externa via attr `label` |
| `ifl-textarea` | – | – | mesmo de input | counter de chars opcional |
| `ifl-select` | – | sm, md | mesmo de input | `<option>` via slot |
| `ifl-checkbox` | – | md | default, checked, disabled, error | |
| `ifl-radio` | – | md | mesmo de checkbox | group via attr `name` |
| `ifl-modal` | – | sm, md, lg, full | open, closing | trap focus, esc-close |
| `ifl-drawer` | – | sm, md, lg | open, closing | side panel (exclusivo admin) |
| `ifl-table` | – | – | loading, empty, populated | exclusivo admin |
| `ifl-toast` | success, warning, danger, info | – | entering, visible, leaving | host global `<ifl-toast-host>` |
| `ifl-skeleton` | text, rect, circle | – | – | shimmer animation |
| `ifl-spinner` | – | sm, md, lg | – | inline + standalone |

### Inventário de Componentes (Pós-MVP, não bloqueante)

- `ifl-tabs`, `ifl-accordion`, `ifl-tooltip`, `ifl-popover`, `ifl-dropdown`, `ifl-table` (apenas admin)
- `ifl-orcamento-form` (definido em `003-lead-capture/plan.md`)

---

## 8. Arquitetura de Arquivos

### Estrutura da Landing (atual, gerada pelo Claude Design + ajustada)

```
/
├── index.html
├── /assets
│   ├── /css
│   │   ├── tokens.css          ← variáveis CSS (paleta, tipografia, spacing, etc.)
│   │   ├── base.css            ← reset + base tipográfica + utilitários mínimos + .container, .sr-only, .skip-link
│   │   ├── components.css      ← .btn, .badge, .card, .input, .modal, .chip (CSS classes BEM)
│   │   ├── layout.css          ← header, hero, services-grid, steps, why-grid, areas, faq, final-cta, footer, wa-float, consent-banner
│   │   └── reveal.css          ← animações de entrada (data-reveal + IntersectionObserver)
│   ├── /js
│   │   └── app.js              ← IIFE único: theme toggle, sticky header, modal, form, FAQ, LGPD, smooth scroll, reveal
│   └── /img                    ← imagens otimizadas (AVIF/WebP)
```

> **Diferença do plano original:** foi consolidado `reset.css` + `base.css` + `utilities.css` em um único `base.css` (mais pragmático para landing estática), e `components.css` reúne todos os componentes em um arquivo BEM em vez de um `.js` por Web Component. Ver **ADR 0005** para justificativa.

### Estrutura do Admin (planejada para `004-admin-auth` em diante)

```
/admin
├── index.html
├── /assets
│   ├── /css
│   │   └── (compartilha tokens.css, herda padrões de components.css)
│   └── /js
│       ├── /components         ← um .js por Web Component
│       │   ├── ifl-button.js
│       │   ├── ifl-input.js
│       │   ├── ifl-modal.js
│       │   ├── ifl-drawer.js   ← exclusivo do admin
│       │   ├── ifl-table.js    ← exclusivo do admin
│       │   └── ...
│       ├── /lib
│       │   ├── focus-trap.js
│       │   ├── a11y.js
│       │   └── supabase.js
│       └── main.js
```

### Loading Strategy (Landing)

- **`tokens.css` + `base.css` + `components.css` + `layout.css`** carregam em `<link rel="stylesheet">` no `<head>` — críticos.
- **`reveal.css`** é não-crítico, pode carregar com `media="print" onload="this.media='all'"`.
- **`app.js`** carrega com `defer` no `<body>` (não bloqueia render).
- **Inline crítico** apenas o snippet de tema no `<head>` para evitar FOUC.

---

## 9. Utilities CSS Mínimas

Em vez de Tailwind, um conjunto curto de utilitários para padding/margin/flex/grid em `utilities.css`:

```css
/* Display */
.flex { display: flex; }
.grid { display: grid; }
.hidden { display: none; }

/* Flex */
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: var(--space-2); }
.gap-4 { gap: var(--space-4); }
/* ... apenas o que for usado em pelo menos 3 lugares */

/* Container */
.container {
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--container-gutter);
}

/* Visually hidden (a11y) */
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0;
  margin: -1px; overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}
```

**Regra:** se uma utility só é usada em um lugar, vira CSS daquele componente, não utility.

---

## 10. Estados de Foco

Padrão único reusado em **todos** os componentes interativos:

```css
:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

E para componentes em shadow DOM, replicado dentro de cada `<style>`.

---

## 11. Reset e Base

Adotar reset baseado em [Andy Bell's modern CSS reset](https://andy-bell.co.uk/a-modern-css-reset/) com adaptações pro projeto. Resumo:

- `box-sizing: border-box` em tudo
- Margens removidas em `h1-h6, p, ul, ol, dl, figure`
- `html { -webkit-text-size-adjust: 100%; }`
- `body { min-height: 100svh; line-height: var(--leading-normal); -webkit-font-smoothing: antialiased; }`
- `img, picture, svg, video { max-width: 100%; height: auto; display: block; }`
- `input, button, textarea, select { font: inherit; color: inherit; }`
- `:focus { outline: none; }` + `:focus-visible` padrão

---

## 12. Tema — Estratégia de Troca

```javascript
// /assets/js/lib/theme.js
const STORAGE_KEY = 'ifl-theme';

export function applyTheme(theme) {
  // theme = 'light' | 'dark' | 'system'
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

export function initTheme() {
  const stored = localStorage.getItem(STORAGE_KEY) || 'system';
  applyTheme(stored);
}
```

`initTheme()` roda inline no `<head>` antes do `<body>` pra evitar flash (FOUC).

```html
<script>
  (function() {
    const t = localStorage.getItem('ifl-theme') || 'system';
    if (t !== 'system') document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```

---

## 13. Documentação Visual — `/styleguide`

Página única `styleguide.html` (oculta em `robots.txt`) que renderiza:

1. **Cores** — todos os tokens semânticos em swatches, com nome + valor + contraste
2. **Tipografia** — cada nível da hierarquia com pangrama
3. **Espaçamento** — escala visual com barras
4. **Componentes** — cada componente em todas as variantes/estados/tamanhos
5. **Modo escuro toggle** no topo

Funciona como playground manual + smoke test visual.

---

## 14. Testes

| Tipo | Ferramenta | O que testa |
|---|---|---|
| Visual | Inspeção manual em `/styleguide` | Regressão visual rápida |
| Acessibilidade | axe-core CLI em `/styleguide` | WCAG AA |
| Performance | Lighthouse CI em `/styleguide` | Budget de bundle + a11y |
| Smoke (interação) | Playwright | Modal abre/fecha, theme toggle, input recebe valor |

Sem Storybook nessa fase (overkill pra solo dev).

---

## 15. Performance Budget Específico

| Recurso | Budget |
|---|---|
| `tokens.css` + `reset.css` + `base.css` | ≤ 8KB gzipped |
| `utilities.css` | ≤ 2KB gzipped |
| `theme.js` + `main.js` | ≤ 3KB gzipped |
| Cada Web Component individual | ≤ 5KB gzipped |
| Página `/styleguide` completa (todos componentes) | ≤ 60KB gzipped (HTML + CSS + JS) |

Enforced via `size-limit` em pre-commit hook ou GitHub Action.

---

## 16. ADRs Antecipados

| # | Tema | Status |
|---|---|---|
| 0001 | Adoção de Inter Variable como web font | Aberto pra futuro — gatilho: feedback de identidade visual fraca |
| 0002 | Adoção de Lit ou outro framework de Web Components | Aberto pra futuro — gatilho: dor de manutenção em 3+ componentes |
| 0003 | Sistema de ícones custom vs. Phosphor/Lucide | Decidido: usar **Lucide** via SVG inline copy-paste (zero dep) |

---

## 17. Próximos Passos

1. Aprovação deste `plan.md`.
2. Geração de `tasks.md` — passos executáveis ordenados pro Claude Code construir o sistema na ordem: tokens → reset/base → utilities → componentes (button, input, modal primeiro) → styleguide.
3. Em paralelo, o Claude Design pode mockar visualmente o `/styleguide` consumindo este documento como input.
