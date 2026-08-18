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
- [Contexto do Negócio](docs/PROJECT_CONTEXT.md): Público-alvo, personas e proposta de valor.
- [Registro de Tarefas](docs/TASKS.md): Histórico completo de desenvolvimento (Fases 1 a 8).

### Engenharia de Operações e ERP (`/docs/ops`)
- [Schema de Banco de Dados](docs/ops/DATABASE_SCHEMA.md): Modelagem SQL/JSON para o sistema de gestão (OS, Clientes, Financeiro).
- [Procedimentos Operacionais (SOP)](docs/ops/STANDARD_OPERATING_PROCEDURES.md): Checklist de bancada, ciclo de orçamento, testes de estresse e onboarding MSP.
- [Templates de Comunicação](docs/ops/COMMUNICATION_TEMPLATES.md): Modelos de WhatsApp e PDF para orçamentos, aprovações, notificações de conclusão e contratos B2B.

---

## 🚀 Como Rodar Localmente

O projeto não requer Node.js, NPM ou servidores complexos para rodar a página final.
1. Clone este repositório.
2. Abra o arquivo `index.html` diretamente no seu navegador.
   *(Ou utilize a extensão "Live Server" do VSCode para ter auto-reload durante edições).*

## 🛠️ Como Compilar o Tailwind CSS (Modo de Desenvolvimento)

Se você desejar fazer alterações nos estilos e classes do HTML, precisará recompilar o CSS do Tailwind:

**Usando NPX (Recomendado se tiver Node.js):**
```bash
npx tailwindcss -i ./assets/css/style.css -o ./assets/css/style.min.css --minify
```

O arquivo de configuração `tailwind.config.js` já está na raiz apontando para as cores e fontes corretas.

## 🌐 Instruções de Deploy (Produção)

O projeto está **Production-Ready** (Pronto para ir ao ar). O CSS já está minificado, as tags de Open Graph estão configuradas e não há scripts bloqueantes.

**Para publicar na Vercel ou Netlify:**
1. Crie um novo projeto no painel da Vercel/Netlify.
2. Conecte este repositório do GitHub.
3. Não é necessário configurar nenhum "Build Command" (Comando de Construção) se você já subiu o arquivo `style.min.css` atualizado. Basta deixar as configurações padrão (Static Site).
4. *Checklist final antes do deploy:* Verifique se trocou o placeholder `SEUNUMERO` nos links do WhatsApp no `index.html`.
