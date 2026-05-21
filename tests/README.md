# Tests — Iago Lopes | Hardware & Tech

Smoke tests da landing pública usando Playwright (mobile-first, chromium por padrão).

## Rodar localmente

```bash
npm install
npx playwright install chromium
npm test
```

O `webServer` do Playwright sobe `npm run serve` automaticamente em `http://localhost:3000`.

## Ver o relatório HTML

```bash
npm run test:report
```

## Modo interativo (UI)

```bash
npm run test:ui
```

## Adicionar firefox/webkit/desktop

Abra `playwright.config.js` e descomente os blocos `projects` no fim do arquivo (firefox, webkit, chromium-desktop etc.). Depois:

```bash
npx playwright install firefox webkit
npm test
```

## Estrutura

- `landing.spec.js` — smoke da home (`/`): hero, modal, theme, FAQ, LGPD, WhatsApp float, skip link, scroll.
- `legal-pages.spec.js` — smoke de `/privacidade` e `/termos`.
- `admin-auth.spec.js` — Feature 004: login, sessão, logout.
- `admin-crm.spec.js` — Feature 005: leads, conversão, ficha de cliente + regressões do modal de conversão.
- `admin-os.spec.js` — Feature 006: listagem, criação, ficha e transição de status de OS + código de garantia.
- `admin-inventory.spec.js` — Feature 007: estoque, movimentações, Custom PC Builder.
- `tracking-portal.spec.js` — Feature 006 (portal público `/rastrear`): timeline, Custom PC, garantia, LGPD.
- `admin-financeiro.spec.js` — Feature 010: cards de resumo, filtro de período, A Receber, gráfico.
