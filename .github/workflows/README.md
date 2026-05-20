# CI Workflows

Este diretório contém o workflow de CI que roda em cada PR e em push para `main`.

## Jobs

### `lighthouse` — Lighthouse CI mobile (bloqueante)

Roda `@lhci/cli` em modo mobile (Moto G–like, 4G throttling) contra as rotas:
`/`, `/privacidade`, `/termos`, `/obrigado`, `/404`.

Budgets (definidos em `lighthouserc.json`, princípio VI da constituição):

- Performance, Acessibilidade, Best Practices, SEO ≥ 95
- LCP ≤ 2500 ms
- CLS ≤ 0.05
- TBT ≤ 300 ms (warn)

Falha se algum budget marcado `error` não bater. Report é enviado pra
`temporary-public-storage` e também salvo como artifact (`lighthouse-report`).

### `a11y` — axe-core via Playwright (bloqueante)

Roda `scripts/a11y-check.mjs`, que abre cada rota no Chromium e injeta
`@axe-core/playwright`. Falha se houver qualquer violação com impact
`serious` ou `critical` em qualquer página.

### `html-validate` — informativo (não bloqueante)

Roda `html-validate` em todos os `.html` do diretório raiz. `continue-on-error`.

## Rodar localmente

```bash
npm install
npx playwright install --with-deps chromium

# Em um terminal:
npm run serve

# Em outro terminal:
npm run lhci   # Lighthouse CI
npm run a11y   # axe-core
npm run ci     # ambos
```

## Interpretando falhas

- **Lighthouse fail**: abra o artifact `lighthouse-report` ou a URL temporária
  impressa nos logs do job. Veja qual assertion falhou (categoria ou métrica).
- **axe-core fail**: o output lista cada violação com `id`, descrição, link da
  documentação e seletor do nó afetado.

## Segredos opcionais

- `LHCI_GITHUB_APP_TOKEN`: se configurado, o LHCI posta comentário no PR.
  Sem ele, o job roda normalmente, só não comenta.
