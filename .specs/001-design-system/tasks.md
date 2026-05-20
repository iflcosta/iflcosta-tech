# Tasks: Design System

**Feature:** `001-design-system`
**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
**Status geral:** 70% — fundação implementada, falta styleguide, audit e enforcement

---

## Convenções

- **Status:** `[x]` feito · `[ ]` pendente · `[~]` em progresso
- **Estimativa:** S = ≤ 1h · M = 2–4h · L = ≥ 4h
- **Ref:** referência ao requisito da spec (ex: RF-7) ou ao ADR
- IDs `T001+` (this feature) — não confunda com IDs de outras features

---

## 1. Fundação (CSS)

- [x] **T001** — Definir tokens em `tokens.css` (paleta light/dark, tipografia fluida, spacing, radius, shadow, motion). Ref: RF-1–6. **S** *(Claude Design)*
- [x] **T002** — Reset modernizado + base tipográfica + utilitários mínimos em `base.css`. Ref: RF-11–14. **S** *(Claude Design)*
- [x] **T003** — Componentes BEM em `components.css` (`.btn`, `.badge`, `.card`, `.chip`, `.field`, `.input`, `.textarea`, `.modal`, `.checkbox-label`, `.form-success`). Ref: RF-7, ADR 0005. **M** *(Claude Design + manual)*
- [x] **T004** — Layout seções em `layout.css` (header, hero, services, steps, why, areas, faq, final-cta, footer, wa-float, consent-banner, diag-ticket). **M** *(Claude Design)*
- [x] **T005** — Reveal animation via IntersectionObserver em `reveal.css` + `app.js`. Ref: RF-14. **S** *(Claude Design)*
- [x] **T006** — Theme toggle com persistência em `localStorage['ifl-theme']`, anti-FOUC inline no `<head>`. Ref: RF-2. **S** *(Claude Design)*
- [x] **T007** — Botão `.btn--secondary-inverse` para uso em fundo escuro permanente (Final CTA). Ref: ADR 0004. **S**

---

## 2. Styleguide

- [x] **T010** — `styleguide.html` (791 linhas) com tokens de cor, tipografia, espaçamento, todos os componentes em variantes, modal demo, theme toggle inline. `noindex,nofollow` no head. **M** *(Agent A)*
- [x] **T011** — `Disallow: /styleguide` já em `robots.txt`. **S**
- [ ] **T012** — Adicionar `:disabled` para `.input/.textarea/.select` e `.btn` em `components.css` (Agent A flagou que estão apenas no styleguide local). **S**
- [ ] **T013** — Adicionar `.field--error` formal em `components.css` (atualmente só `aria-invalid`). **S**
- [ ] **T014** — Adicionar estilo de `<kbd>` em `components.css` (usado em UI de teclado, sem estilo definido). **S**

---

## 3. Acessibilidade

- [ ] **T020** — Auditoria de contraste com WebAIM/axe em todos os pares texto/fundo do `tokens.css`, em ambos os temas. Documentar pares com razão < 4.5:1 (texto pequeno) ou < 3:1 (texto grande). Ref: RF-13. **S**
- [ ] **T021** — Auditoria axe-core na styleguide e na home. Zero violações `serious`/`critical`. Ref: critério de aceite spec. **S**
- [ ] **T022** — Validar foco visível em todos os componentes interativos (button, input, chip, modal close, faq summary, theme-toggle, footer links). Ref: RF-12. **S**
- [ ] **T023** — Validar navegação por teclado completa: tab order, modal trap, esc-close, skip link. **S**
- [ ] **T024** — Testar com leitor de tela (NVDA no Windows, ou VoiceOver) em pelo menos: hero, modal, FAQ. **M**

---

## 4. Performance

- [ ] **T030** — Medir bundle gzipped de cada arquivo CSS isoladamente. Confirmar:
  - `tokens.css + base.css` ≤ 8KB gzipped
  - `components.css` ≤ tamanho razoável
  - `layout.css` ≤ tamanho razoável
  - Total CSS da home ≤ ~30KB gzipped
  - **AC:** size-limit script no `package.json` (a criar) ou check manual via `gzip -c file.css | wc -c`. Ref: RF-16. **S**
- [ ] **T031** — Medir `app.js` gzipped. Confirmar ≤ 3KB. **S**
- [ ] **T032** — Configurar Lighthouse CI no GitHub Action rodando contra `/`, `/privacidade`, `/termos`, `/styleguide`. Budget: Performance/A11y/Best Practices/SEO ≥ 95 em mobile. **M**

---

## 5. Documentação

- [ ] **T040** — Adicionar comentário-cabeçalho em cada arquivo CSS explicando escopo (já existe parcial; padronizar). **S**
- [ ] **T041** — Atualizar `001-design-system/plan.md` se algum token ou componente mudar durante implementação real. **S** *(contínuo)*
- [ ] **T042** — Criar `CONTRIBUTING.md` (opcional, solo dev) ou docstring inline com "como adicionar um novo componente" seguindo o padrão BEM + tokens. **S**

---

## 6. Critério de pronto (Feature 001)

A feature é considerada **pronta** quando:

- [ ] Todos os tokens light + dark passam contraste WCAG AA validado
- [ ] Styleguide renderiza todos os componentes em todos os estados, ambos os temas
- [ ] axe-core sem violações `serious`/`critical` em styleguide + home
- [ ] Lighthouse mobile ≥ 95 em todas as 4 categorias
- [ ] Bundle CSS total ≤ 30KB gzipped na home
- [ ] Navegação 100% por teclado funciona
- [ ] Pelo menos 1 teste manual com leitor de tela executado

---

## 7. Bloqueios e dependências externas

- Não há bloqueios externos. Feature é fundação e independente.
- **Habilita:** 002-landing-public (já consumiu), 003-lead-capture, 004+ (admin pode reusar tokens e padrões).
