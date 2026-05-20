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
