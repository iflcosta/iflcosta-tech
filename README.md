# ⚡ iflStudio

Site institucional e landing page do **iflStudio** — estúdio de desenvolvimento web especializado em landing pages de ultra-performance, automações com IA e desenvolvimento de SaaS/MVPs para agências de marketing digital.

**[iflcosta.tech](https://iflcosta.tech)**

---

## Stack

| Camada | Tecnologia |
|---|---|
| HTML | Vanilla HTML5 semântico |
| CSS | Vanilla CSS com Custom Properties (Design System v2) |
| JavaScript | Vanilla JS (IIFE), zero dependências |
| Fontes | Google Fonts — Inter + Space Grotesk |
| Hospedagem | Vercel (static + Edge Middleware) |

**Zero framework. Zero bundler. Zero build step.**

---

## Estrutura

```
├── index.html              # Página principal
├── main.js                 # Interações (calculadora ROI, quiz, filtros, etc.)
├── style.css               # Design System completo (~2300 linhas)
├── middleware.js            # Edge Middleware (subdomínio hardware.iflcosta.tech)
├── vercel.json             # Config do Vercel
├── manifest.json           # PWA manifest
├── 404.html                # Página de erro personalizada
├── robots.txt / sitemap.xml
├── docs/                   # Documentação interna
├── portfolio/              # 6 landing pages de portfólio
│   ├── aroma-cafe/
│   ├── burgercraft/
│   ├── hardware-tech/      # Site completo com múltiplas páginas
│   ├── imovel-prime/
│   ├── studio-bella/
│   └── verde-vivo/
└── portfolio-previews/     # Screenshots dos projetos
```

---

## Desenvolvimento Local

```bash
# Qualquer servidor estático funciona:
npx serve .
# ou
python3 -m http.server 8000
```

Acesse `http://localhost:8000` (ou `http://localhost:3000` com `serve`).

---

## Deploy

O deploy é automático via **Vercel** — cada push na branch `main` gera um novo deploy em produção.

- **Domínio principal:** [iflcosta.tech](https://iflcosta.tech)
- **Subdomínio:** [hardware.iflcosta.tech](https://hardware.iflcosta.tech) (roteado via Edge Middleware)

---

## Funcionalidades

- **Widget PageSpeed 100/100** — SVG rings animados com IntersectionObserver
- **Simulador de Velocidade** — Comparação visual LP rápida vs. lenta
- **Calculadora de ROI** — Modelo baseado em pesquisa Google/Deloitte
- **Tradutor de Jargões** — Termos técnicos → impacto financeiro
- **Portfólio Bento Grid** — Filtros por categoria com animações CSS
- **Quiz Diagnóstico** — Multi-step form com envio via WhatsApp
- **Design System** — 100+ CSS custom properties, dark theme, glassmorphism

---

## Licença

Todos os direitos reservados © 2026 iflStudio.
