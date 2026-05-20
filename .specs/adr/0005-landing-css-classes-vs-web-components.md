# ADR 0005 — Landing usa CSS classes + JS imperativo, não Web Components

**Status:** Aceito
**Data:** 2026-05-19
**Decisor:** Iago Lopes
**Contexto da feature:** `001-design-system`, `002-landing-public`

---

## Contexto

O `001-design-system/spec.md` (RF-7) determina que o design system forneça **Web Components vanilla** com prefixo `ifl-*` para todos os primitivos (button, input, modal, badge, card, toast, skeleton, spinner, theme-toggle). O `plan.md` detalha a arquitetura com Shadow DOM, `<template>` inline, `customElements.define()`, slots nomeados e `::part()` para customização externa.

Quando o Claude Design gerou a primeira versão do código (`assets/css/*` + `assets/js/app.js`), optou por **CSS classes BEM + JavaScript imperativo** em vez de Web Components. Os componentes existem como combinações de classes CSS (`.btn`, `.btn--primary`, `.modal`, `.modal__header`, etc.) com hooks de data attributes (`[data-modal-open]`, `[data-theme-toggle]`).

A divergência foi notada no audit. Antes de "consertar" para forçar Web Components, vale revisitar a decisão à luz do que a landing precisa de fato.

## Opções Avaliadas

### Opção A — Forçar Web Components na landing (cumprir o plan literal)
Reescrever os componentes gerados como `<ifl-button>`, `<ifl-modal>`, etc., com Shadow DOM e tudo que o `001-design-system/plan.md` descreve.

**Prós:**
- Coerência literal com o spec/plan original
- Encapsulamento real de estilos (sem vazamento)
- Reuso direto entre landing e admin

**Contras:**
- Mais código (template + class definition + custom element registration por componente)
- Shadow DOM dificulta debugging em DevTools e estilização via tooling externo
- Penalidade de bundle (~5KB por componente) que vai contra o budget agressivo da landing
- Para uma landing **estática** com ~6 componentes únicos, o overhead não compensa o ganho
- Acessibilidade de Shadow DOM ainda tem casos edge (label association, focus management) que precisam tratamento extra

### Opção B — Aceitar CSS classes + JS imperativo na landing, manter Web Components reservado pro admin
Documentar a divergência, atualizar o plan, e seguir com o código gerado.

**Prós:**
- Bundle menor (já está em ~12KB CSS + ~3KB JS, dentro do budget)
- Debugging mais simples (DevTools mostra estrutura plana)
- A11y mais previsível (label/input no mesmo DOM)
- Menor curva de manutenção para uma landing solo
- Cumprir Web Components no **admin** continua viável e faz mais sentido lá (componentes complexos como tabela, drawer, multi-step form se beneficiam mais do encapsulamento)

**Contras:**
- Diverge da intenção original do design system spec
- Reuso entre landing e admin precisa de adaptação (provavelmente os tokens.css e components.css podem ser compartilhados, mas a camada JS não)

## Decisão

**Adotada Opção B.**

A landing pública (`002-landing-public`) usa **CSS classes BEM + JavaScript imperativo** com data attributes para hooks. Web Components ficam reservados para o **admin** (`004-admin-auth` em diante), onde:
- Componentes têm mais estado interno
- Reuso é mais intenso (mesmo componente aparece em múltiplas telas)
- Encapsulamento previne conflito com estado de admin
- Bundle pode ser maior porque a primeira carga é menos crítica (usuário já está autenticado)

## Mudanças no Plan/Spec

1. `001-design-system/spec.md` RF-7 será revisado para diferenciar:
   - **Landing:** CSS classes BEM, componentes existem como combinações de classes documentadas
   - **Admin:** Web Components vanilla `<ifl-*>` com Shadow DOM
2. `001-design-system/plan.md` Seção 7 (Arquitetura de Componentes) ganha duas trilhas: "Landing pattern" e "Admin pattern"
3. `tokens.css` e `components.css` continuam compartilhados — são a base de ambos

## Consequências

- Tokens (`tokens.css`) ficam no contrato comum landing ↔ admin
- A linguagem visual fica consistente, mesmo com arquiteturas técnicas diferentes
- Quando começar o admin, é possível avaliar se vale "elevar" alguns padrões da landing pra Web Components (ex: o modal é candidato natural)
- Esta ADR habilita ADRs futuros do tipo "componente X passou pra Web Component porque…"

## Revisão

Reavaliar quando:
- Iniciar a build do admin (`004-admin-auth`) — confirmar que Web Components ainda fazem sentido lá
- Aparecer um terceiro produto (ex: copilot widget standalone) que precise de encapsulamento real
- O bundle da landing crescer ao ponto de o overhead de Web Components compensar o ganho de organização
