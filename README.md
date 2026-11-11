# IF Tech (`iflcosta.tech`)

Plataforma web, Cockpit Administrativo ERP 360° e Portal de Acompanhamento da **IF Tech** — consultoria solo de Engenharia de Hardware, Sistemas Web/Automações e Gestão de TI (MSP) em Bragança Paulista - SP.

## 🚀 Ambientes & Rotas em Produção (Vercel + Supabase)

| Rota Pública | Destino Real | Função |
|--------------|--------------|--------|
| `https://iflcosta.tech/` | [`index.html`](index.html) | Landing Page institucional + triagem WhatsApp + consulta rápida de OS |
| `https://iflcosta.tech/app` | [`admin.html`](admin.html) *(Tríade)* | Cockpit Admin / ERP 360° protegido exclusivamente por **Supabase Auth (JWT + RLS)** |
| `https://iflcosta.tech/status` | [`portal.html`](portal.html) *(Tríade)* | Portal do Cliente em tempo real (tracking por UUID/OS, aprovação de orçamento e homologação) |
| `https://iflcosta.tech/os/:id` | [`portal.html`](portal.html) | Atalho direto por número de Ordem de Serviço |
| `https://iflcosta.tech/t/:token` | [`portal.html`](portal.html) | Magic link direto por token UUID |
| `https://iflcosta.tech/sitemap.xml` | [`sitemap.xml`](sitemap.xml) | Sitemap XML público (rotas privadas bloqueadas em [`robots.txt`](robots.txt)) |

> **Regra de Tríade:** Após qualquer edição em [`admin.html`](admin.html), manter paridade SHA-256 idêntica em [`app.html`](app.html) e [`app/index.html`](app/index.html). Após editar [`portal.html`](portal.html), replicar identicamente em [`status.html`](status.html) e [`status/index.html`](status/index.html).

## 🏗️ Arquitetura Atual (Fase Enxuta Sem VPS)

O projeto opera em **arquitetura serverless gratuita/enxuta**, sem dependência de servidor VPS dedicado no momento:

- **Frontend / Edge:** HTML5 semântico + Tailwind CSS pré-compilado ([`assets/css/style.min.css`](assets/css/style.min.css)) + Lucide Icons self-hosted ([`assets/js/lucide.min.js`](assets/js/lucide.min.js)), hospedado na **Vercel** via [`vercel.json`](vercel.json).
- **Backend / Auth / Storage:** **Supabase Cloud** (`togrnwxazuweuihlaljo`) com Row Level Security (RLS), RPCs atômicas e autenticação exclusiva via JWT no `/app`.
- **Módulo NOC / VPS (Standby):** A sub-aba NOC no Cockpit permanece em modo **Standby** (`NOC_VPS_PROVISIONED = false`) até a contratação de uma VPS dedicada para Tactical RMM, RustDesk Relay e Evolution API.
- **Automação & Desktop Auxiliar:**
  - [`apps/life-ops/main.py`](apps/life-ops/main.py): Aplicativo desktop Python (`CustomTkinter` + SQLite) para controle pessoal, logística e caixa (iniciável via [`Iniciar_LifeOps.bat`](Iniciar_LifeOps.bat)).
  - [`docs/ops/sniper_engine_bot.py`](docs/ops/sniper_engine_bot.py): Protótipo Python para cálculo de margem e alertas de hardware no Telegram.
  - [`marketing/`](marketing) e [`assets/`](assets): Peças gráficas, cartões, carrosséis e scripts de renderização de mídia.

## 📚 Documentação & Operações

- [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md): Diretrizes de design Neobrutalista, paleta e tipografia.
- [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md): Contexto de negócio, personas e proposta de valor.
- [`docs/TASKS.md`](docs/TASKS.md): Roadmap e histórico de Sprints.
- [`docs/LIVING_DOCUMENTATION.md`](docs/LIVING_DOCUMENTATION.md): Mapa técnico canônico do Cockpit Admin e Portal.
- [`docs/ops/ERP_ARCHITECTURE_SPECIFICATION.md`](docs/ops/ERP_ARCHITECTURE_SPECIFICATION.md): Especificação dos módulos do ERP.
- [`docs/ops/SERVICE_CATALOG_PRICING.md`](docs/ops/SERVICE_CATALOG_PRICING.md): Catálogo de serviços e matriz de precificação.
- [`docs/ops/STANDARD_OPERATING_PROCEDURES.md`](docs/ops/STANDARD_OPERATING_PROCEDURES.md): POPs de bancada, orçamento e SLA.

## 🧪 Auditorias & Verificação Local

Para validar sintaxe JS, integridade de DOM IDs, handlers inline e paridade SHA-256 das Tríades antes de commitar:

```bash
python scripts/test_syntax.py
python scripts/audit_dom_ids.py
python scripts/audit_handlers.py
python scripts/find_hardcoded.py
```

Para recompilar o CSS Tailwind manualmente (quando `tailwindcss3.exe` estiver disponível localmente):

```bash
.\tailwindcss3.exe -i ./assets/css/style.css -o ./assets/css/style.min.css --minify
```
