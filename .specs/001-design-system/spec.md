# Spec: Design System

**Feature:** `001-design-system`
**Status:** Draft
**Criada:** 2026-05-19
**Depende de:** `constitution.md`
**Bloqueia:** `002-landing-public`, `003-lead-capture`, todas as features de admin

---

## 1. Contexto

O design system é a fundação visual e interativa compartilhada entre a landing pública (`iflcosta.tech`) e o admin SaaS solo (`iflcosta.tech/admin`). Ele define tokens, padrões de interação, componentes base como Web Components vanilla, e regras de acessibilidade. Não é um produto entregável ao usuário final — é a base sobre a qual todas as outras 8 features são construídas.

A escolha por Web Components vanilla (em vez de React/Vue/Svelte) é não-negociável: deriva diretamente dos princípios **II (zero build na landing)** e **VI (performance budget)**.

---

## 2. Objetivos

1. **Consistência visual** entre landing pública e admin, sem que pareçam o mesmo produto.
2. **Reuso de código** — um único `<ifl-button>` serve landing e admin.
3. **Trocas de tema** claro/escuro automáticas, com override manual persistente.
4. **Acessibilidade desde o token** — contraste e foco são propriedades dos tokens, não enxertos posteriores.
5. **Onboarding de IA** — o sistema é simples o suficiente para que Claude Code produza componentes que respeitem o estilo sem orientação caso a caso.

---

## 3. Cenários de Uso

### Cenário A: Visitante mobile abre a landing pela primeira vez

Maria abre `iflcosta.tech` no Chrome Android em 4G. A página renderiza em ≤ 2.5s. O tema respeita o sistema dela (escuro à noite). Ela toca no botão "Pedir orçamento" — o foco visual aparece, o feedback tátil dispara, o modal abre com animação respeitando `prefers-reduced-motion`. Ela consegue tabular pelo formulário inteiro com o teclado virtual sem que nada saia da viewport.

### Cenário B: Iago opera o admin no celular entre atendimentos

Iago abre `iflcosta.tech/admin/os/123` numa mão segurando o celular. Os botões de ação (Iniciar reparo / Solicitar peça / Concluir) são tocáveis com o polegar sem alongamento. O badge de status muda de cor de forma legível com contraste 4.5:1 em ambos os temas. A tabela de peças vira card empilhado.

### Cenário C: Cliente com baixa visão usa leitor de tela

João usa NVDA. Todo botão tem rótulo claro ("Pedir orçamento via WhatsApp", não "Clique aqui"). Toda mensagem dinâmica de sucesso/erro aparece com `aria-live="polite"`. Toda imagem decorativa tem `alt=""`; toda imagem informativa tem `alt` descritivo.

### Cenário D: Iago instrui Claude Code a criar um novo componente

Iago pede "cria um `<ifl-badge variant='warning'>`". Claude Code consulta o design system, encontra a taxonomia de variantes (success/warning/danger/info/neutral), os tokens de cor para warning, o padrão de tipografia para badge, e produz o componente sem inventar valores fora do sistema.

---

## 4. Requisitos Funcionais

### Tokens

- **RF-1.** O sistema deve definir uma taxonomia de tokens cobrindo: cor (foreground/background/border/accent), tipografia (família/tamanho/peso/altura de linha), espaçamento (escala de 8px-base), raio, sombra, e duração/easing de animação.
- **RF-2.** Tokens devem suportar tema claro e tema escuro, com troca automática via `prefers-color-scheme` e override manual persistido em `localStorage`.
- **RF-3.** Tokens semânticos (ex: `--color-bg-surface`, `--color-text-primary`) referenciam tokens primitivos (ex: `--gray-50`), e somente os semânticos são usados em componentes.
- **RF-4.** A paleta deve incluir cores funcionais: `success`, `warning`, `danger`, `info`, `neutral`, cada uma com no mínimo: `solid`, `subtle`, `text`, `border`.

### Tipografia

- **RF-5.** O sistema deve usar no máximo duas famílias de fonte: uma para UI (sans-serif system stack ou fonte web ≤ 30KB) e uma opcional para destaque (heading). Sem fontes carregadas que não sejam usadas above-the-fold.
- **RF-6.** A escala tipográfica deve cobrir no mínimo 5 níveis (display, h1, h2, h3, body, caption) e ser responsiva via `clamp()`.

### Componentes Base

- **RF-7.** O sistema deve fornecer os seguintes Web Components como `<ifl-*>`: `button`, `input`, `textarea`, `select`, `modal`, `badge`, `card`, `toast`, `skeleton`, `spinner`, `theme-toggle`.
- **RF-8.** Todo componente interativo deve declarar explicitamente os estados: `default`, `hover`, `focus-visible`, `active`, `disabled`, `loading`.
- **RF-9.** Todo componente deve funcionar sem JS habilitado quando viável (button, input, textarea, select), com fallback semântico HTML.
- **RF-10.** Modal deve trapar foco enquanto aberto, fechar com `Esc`, retornar foco ao trigger ao fechar, e bloquear scroll do body.

### Acessibilidade

- **RF-11.** Todo touch target deve medir no mínimo 44×44 px em mobile.
- **RF-12.** Toda interação interativa deve ter estado de foco visível atendendo contraste ≥ 3:1 contra o fundo adjacente.
- **RF-13.** O contraste de texto deve atender WCAG 2.2 AA: ≥ 4.5:1 para corpo, ≥ 3:1 para texto grande (≥ 18pt ou 14pt bold).
- **RF-14.** O sistema deve respeitar `prefers-reduced-motion: reduce` desativando animações não essenciais.
- **RF-15.** Toda mudança de estado relevante deve ser anunciada via `aria-live` apropriado.

### Performance

- **RF-16.** O CSS base do design system (tokens + reset + tipografia) deve caber em ≤ 15KB gzipped.
- **RF-17.** Cada Web Component individual deve pesar ≤ 5KB gzipped (script + estilo).
- **RF-18.** Componentes devem ser tree-shakable: importar `<ifl-modal>` não traz `<ifl-toast>` junto.

### Internacionalização

- **RF-19.** Todo texto exibido pelo design system (placeholders default, mensagens de loading, rótulos de close) deve ser em pt-BR. Não há suporte multi-idioma nessa fase.

---

## 5. Entidades-Chave (Conceituais)

> Estas entidades existem como conceitos do sistema, não como tabelas. Os valores específicos vão em `plan.md`.

### Token

- `name` (string, kebab-case): identificador único
- `category` (enum): color | typography | spacing | radius | shadow | motion
- `scope` (enum): primitive | semantic
- `value-light` (string): valor no tema claro
- `value-dark` (string): valor no tema escuro
- `references` (list of token names): para semânticos, qual primitivo eles apontam

### Componente

- `name` (string): `ifl-{nome}`
- `slots` (list): áreas customizáveis
- `attributes` (list): props expostas
- `events` (list): eventos custom emitidos
- `states` (list): subset de [default, hover, focus, active, disabled, loading, error]
- `variants` (list): subset de [primary, secondary, ghost, danger, etc.]
- `sizes` (list): subset de [sm, md, lg]

---

## 6. Critérios de Aceite

- [ ] Toda variante de cor (success/warning/danger/info/neutral) passa contraste AA em ambos os temas.
- [ ] Toggle de tema (`<ifl-theme-toggle>`) persiste escolha em `localStorage` e respeita preferência do sistema como default.
- [ ] Tipografia escala fluidamente entre 360px e 1440px sem quebra de layout.
- [ ] Todo componente interativo é navegável e operável apenas com teclado.
- [ ] Lighthouse (Acessibilidade) ≥ 95 numa página demo contendo todos os componentes.
- [ ] axe-core não reporta violações `serious` ou `critical` na página demo.
- [ ] Bundle total da página demo (todos os componentes + tokens) ≤ 60KB gzipped.
- [ ] Documentação visual existe em `iflcosta.tech/styleguide` (oculta do robots em produção mas acessível por URL).
- [ ] Cada Web Component tem teste de smoke (render + interação principal) rodando em Playwright.

---

## 7. Fora de Escopo

- Implementação dos componentes (vai em `plan.md` e `tasks.md`).
- Valores específicos de tokens — paleta, fonte, escala (vão em `plan.md`).
- Storybook ou ferramenta de catálogo (decisão futura, possível ADR).
- Sistema de ícones — será spec separada se vier a ser custom; nessa fase usar Phosphor ou Lucide via SVG inline.
- Animações complexas (lottie, scroll-driven). Apenas transições simples de estado.
- Multi-idioma.

---

## 8. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Web Components vanilla custarem muito para implementar formulários complexos | Média | Alto | Limitar uso a primitivos; usar HTML nativo (`<form>`, `<input>`) sempre que possível |
| Bundle de componentes crescer sem percepção | Alta | Médio | Lighthouse CI bloqueia regressão; size-limit por componente |
| Tema escuro ficar inconsistente | Média | Médio | Token-first: nada de cor hardcoded em componente, sempre via var() |

---

## 9. Métricas de Sucesso

- Lighthouse Acessibilidade ≥ 95 em todas as páginas que usam o sistema.
- Tempo para criar um novo componente seguindo o sistema ≤ 1h (medido subjetivamente em 3 componentes pós-MVP).
- Zero violação de contraste reportada por axe-core em produção por 30 dias seguidos.

---

## 10. Próximos Passos

1. Aprovação deste `spec.md` por mim mesmo (PR para `main`).
2. Escrita de `plan.md` — paleta, fonte, escala, arquitetura de arquivos, build pipeline (se houver).
3. Escrita de `tasks.md` — passos executáveis pro Claude Code.
