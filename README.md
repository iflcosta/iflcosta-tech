# IFLCosta Tech

A landing page e infraestrutura de documentação operacional da **IFLCosta Tech**, uma consultoria tech híbrida focada em Engenharia de Software, Upgrades de Hardware de alta performance e TI Gerenciada B2B (MSP).

## 🏗️ Arquitetura do Projeto

O projeto segue a filosofia de máxima performance, zero dependências complexas e design Neobrutalista:
- **Core:** HTML5 Semântico puro.
- **Estilização:** Tailwind CSS (Compilado e Minificado para produção).
- **Ícones:** Lucide Icons (Carregamento via CDN deferido).
- **Design System:** Neobrutalismo Tech (Fundo Carbono, Verde Fósforo, Bordas Fortes e Fontes Inter/JetBrains Mono).

## 📚 Documentação Viva (Spec-Driven Development)

Toda a lógica de negócios, tarefas concluídas e o ecossistema operacional interno estão fortemente documentados na pasta `/docs`. 

### Documentação de Projeto
- [Especificação Técnica](docs/SPECIFICATION.md): Diretrizes de design, cores, tipografia e tom de voz (Pivô Neobrutalista).
- [Contexto do Negócio](docs/PROJECT_CONTEXT.md): Público-alvo, personas, personas B2B e proposta de valor.
- [Registro de Tarefas](docs/TASKS.md): Histórico completo de desenvolvimento (Fases 1 a 10 + Sprints do ERP).

### Engenharia de Operações, Precificação e ERP (`/docs/ops`)
- [Catálogo de Serviços & Matriz de Precificação](docs/ops/SERVICE_CATALOG_PRICING.md): Mão de obra, margens de peças e planos MSP por estação (Essential R$ 69,90 / Pro R$ 109,90 / Enterprise R$ 189,90).
- [Especificação da Arquitetura do ERP](docs/ops/ERP_ARCHITECTURE_SPECIFICATION.md): Arquitetura completa em 7 módulos (CRM 360°, Bancada, Software 50/50, RMM/Backup e Ledger).
- [Schema de Banco de Dados](docs/ops/DATABASE_SCHEMA.md): Modelagem relacional normalizada (PostgreSQL 15+).
- [Script de Migração do Supabase](docs/ops/supabase_migration_v1.sql): Script DDL executado no projeto `togrnwxazuweuihlaljo`.
- [Procedimentos Operacionais (SOP)](docs/ops/STANDARD_OPERATING_PROCEDURES.md): Checklist de bancada, ciclo de orçamento, testes de estresse e onboarding MSP.
- [Templates de Comunicação](docs/ops/COMMUNICATION_TEMPLATES.md): Modelos de WhatsApp e PDF para orçamentos, aprovações, notificações de conclusão e contratos B2B.

---

## 🌐 Arquitetura de Subdomínios & Produção

- **Landing Page Oficial:** [https://iflcosta.tech](https://iflcosta.tech) (Deploy automático via Vercel)
- **Painel Administrativo do Gestor:** `app.iflcosta.tech` (Planejado)
- **Portal & Tracking de OS do Cliente:** `portal.iflcosta.tech` (Planejado)
- **Backend & Storage:** Supabase Cloud (`togrnwxazuweuihlaljo`) com buckets `os-photos` e `technical-reports`.

---

## 🚀 Como Rodar Localmente

O projeto não requer Node.js ou servidores complexos para rodar a landing page:
1. Clone este repositório: `git clone https://github.com/iflcosta/iflcosta-tech.git`
2. Abra o arquivo `index.html` diretamente no seu navegador.

## 🛠️ Como Compilar o Tailwind CSS (Modo de Desenvolvimento)

Para compilar e minificar alterações de classes e estilos:
```bash
.\tailwindcss3.exe -i ./assets/css/style.css -o ./assets/css/style.min.css --minify
```
