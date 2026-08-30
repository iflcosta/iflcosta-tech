# Auditoria Completa: Landing Page e Infraestrutura (IF Tech)

## 1. Landing Page (index.html)

BUG-LP-001: Arquivo JavaScript (main.js) nao importado / Codigo Morto
- Arquivo: assets/js/main.js e index.html
- Severidade: BAIXO
- Descricao: O arquivo main.js contem logica de Accordion FAQ e scroll reveal, mas nao esta carregado em nenhum lugar do index.html.
- Correcao: Importar com script defer ou apagar o arquivo.

BUG-LP-002: Imagem Open Graph Ausente e Inexistente
- Arquivo: index.html, Linha: ~13 e ~28
- Severidade: ALTO
- Descricao: Meta tags og:image e og:url ausentes. JSON-LD declara assets/img/og-image.jpg que nao existe. WhatsApp nao exibira thumbnail.
- Correcao: Adicionar meta tags e upload da imagem og-image.jpg.

## 2. Infraestrutura de Deploy

BUG-LP-003: Rewrites ausentes no Vercel para rotas dinamicas (Resulta em 404)
- Arquivo: vercel.json
- Severidade: CRITICO
- Descricao: Rotas /os/:id e /t/:token configuradas no _redirects (Cloudflare), mas vercel.json so possui redirects. Na Vercel, links diretos de OS retornam 404.
- Correcao: Adicionar bloco rewrites no vercel.json.

## 3. Design System e Assets

BUG-LP-004: Assets Pesados Nao Utilizados (Dead Assets)
- Arquivo: assets/img/
- Severidade: MEDIO
- Descricao: 8 imagens .jpg totalizando ~7MB nao referenciadas em nenhum lugar.
- Correcao: Excluir as imagens para reduzir peso do repositorio.

## 4. Documentacao

BUG-LP-005: Desatualizacao no SPECIFICATION.md sobre CSS
- Arquivo: docs/SPECIFICATION.md, Linha: 30
- Severidade: BAIXO
- Descricao: Documento relata Tailwind CDN, mas index.html ja usa style.min.css compilado.
- Correcao: Atualizar documento.

## 5. Paridade de Triades e Gitignore
- admin.html = app.html = app/index.html: PARIDADE EXATA (434724 bytes)
- portal.html = status.html = status/index.html: PARIDADE EXATA (183621 bytes)
- .gitignore: Correto (.env.local coberto)
