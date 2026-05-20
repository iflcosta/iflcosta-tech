# Spec: Landing Pública

**Feature:** `002-landing-public`
**Status:** Draft
**Criada:** 2026-05-19
**Depende de:** `constitution.md`, `001-design-system`
**Bloqueia:** `003-lead-capture` (compartilha CTAs e componentes)

---

## 1. Contexto

A landing pública de `iflcosta.tech` é a porta de entrada do negócio: ela apresenta os serviços (conserto de celular/tablet, manutenção de notebook/PC, montagem de Custom PC, suporte TI/redes), constrói confiança, e converte visitante em conversa de WhatsApp comigo. Hoje existe uma landing estática na Vercel — essa spec define a reescrita do zero.

Não é um site institucional. É uma página de conversão otimizada para tráfego mobile vindo de Google ("conserto celular Bragança Paulista", "técnico em informática Atibaia") e indicação direta. A meta de negócio é única: **maximizar leads qualificados via WhatsApp**.

---

## 2. Objetivos

1. **Converter** visitante em conversa de WhatsApp em ≤ 30 segundos desde o primeiro toque.
2. **Construir confiança** com sinais concretos: garantia 90 dias, áreas atendidas, especialidade técnica, atendimento direto sem balcão.
3. **Aparecer no Google** para buscas locais (Bragança/Atibaia/Itatiba + serviços).
4. **Bater Lighthouse 95+** em mobile (princípio VI).
5. **Não exigir manutenção semanal** — conteúdo majoritariamente estático.

---

## 3. Cenários de Uso

### Cenário A: Maria com celular quebrado pesquisa no Google

Maria pesquisa "trocar tela iphone Bragança Paulista". Clica num resultado e cai em `iflcosta.tech`. Em 2s vê: headline clara dizendo que faço conserto de celular, badge de garantia 90 dias, botão "Pedir orçamento agora". Toca, modal abre, ela preenche nome + serviço, envia, é redirecionada pro meu WhatsApp com mensagem pré-preenchida com os dados.

### Cenário B: Pedro indicado por amigo

Pedro recebeu meu link por WhatsApp. Abre, faz um scroll rápido pra ver "se o cara é sério". Vê: foto/avatar (eu, real, não stock), depoimentos curtos, serviços, áreas atendidas, e o mesmo CTA persistente. Decide chamar direto pelo botão flutuante de WhatsApp no canto inferior.

### Cenário C: Joana com PC que não liga

Joana busca "técnico computador atibaia urgente". Cai na landing, vê que atendo Atibaia, vê que tenho experiência com PC, e que oferto atendimento sem balcão (vou na casa dela). Converte.

### Cenário D: Cliente avançado quer Custom PC

Lucas pesquisa "montagem pc gamer bragança". Cai na seção específica de Custom PC, vê que entendo do assunto (lista de componentes possíveis, faixa de preço, garantia de montagem), e pede orçamento por formulário longo em `/orcamento` em vez do modal rápido.

---

## 4. Requisitos Funcionais

### Estrutura de Conteúdo

- **RF-1.** A landing deve ter uma única rota principal (`/`) renderizando todas as seções em scroll vertical contínuo.
- **RF-2.** As seções, em ordem, devem ser:
  1. **Hero** — headline, sub-headline, CTA primário (modal de orçamento), CTA secundário (WhatsApp direto)
  2. **Serviços** — 4 cards: Celular/Tablet, Notebook/PC, Custom PC, Suporte TI/Redes
  3. **Como funciona** — 3 passos: solicitar → orçamento → conserto com garantia
  4. **Por que comigo** — sinais de confiança: garantia 90 dias, atendimento direto, sem balcão, especialista, áreas atendidas
  5. **Áreas atendidas** — Bragança Paulista, Atibaia, Itatiba (com mapa visual ou lista de bairros)
  6. **FAQ** — 5–8 perguntas (preço, prazo, peças originais, garantia, atendimento domiciliar)
  7. **Contato final** — repetição do CTA + telefone + email
  8. **Footer** — links institucionais (Política de Privacidade, Termos), CNPJ se aplicável, copyright, redes sociais
- **RF-3.** Botão flutuante de WhatsApp deve aparecer em todas as resoluções a partir do scroll do hero, fixed bottom-right, com `aria-label` explícito.
- **RF-4.** Header deve ser sticky discreto contendo logo + 1 CTA. Em mobile, sem hamburger menu — links âncora opcionais via scroll.

### Conteúdo Textual (governa redação)

- **RF-5.** Headline do hero deve comunicar especialização + área em ≤ 12 palavras. Exemplo válido: "Especialista em TI atendendo Bragança, Atibaia e Itatiba — sem balcão, com garantia."
- **RF-6.** Toda CTA primária deve usar verbo de ação no infinitivo + objeto claro: "Pedir orçamento", "Falar no WhatsApp", "Solicitar visita técnica". Nunca "Clique aqui" ou "Saiba mais" isolado.
- **RF-7.** Tom de voz: primeira pessoa do singular ("eu atendo", não "nós atendemos"). Direto, técnico mas acessível, sem jargão desnecessário.
- **RF-8.** Cada cartão de serviço deve listar: o que é feito, faixa de preço orientativa OU "orçamento sem compromisso", e prazo médio.

### SEO

- **RF-9.** A página deve ter `<title>` único e `<meta description>` única, com palavras-chave: "técnico em informática", "Bragança Paulista", "conserto de celular", "Atibaia", "Itatiba".
- **RF-10.** Estrutura semântica obrigatória: um único `<h1>` no hero, hierarquia `h2` → `h3` consistente, `<main>`, `<section>`, `<footer>`.
- **RF-11.** Schema.org `LocalBusiness` em JSON-LD no `<head>`, com: nome, telefone, áreas atendidas, horário de funcionamento, faixa de preço, tipo de serviço.
- **RF-12.** `sitemap.xml` e `robots.txt` servidos estaticamente. `robots.txt` bloqueia `/admin/*` e `/styleguide`.
- **RF-13.** Open Graph + Twitter Card configurados, com imagem otimizada de 1200×630 px ≤ 200KB.
- **RF-14.** URLs canônicas via `<link rel="canonical">` em todas as páginas.

### Performance

- **RF-15.** LCP ≤ 2.5s em 4G simulado (Moto G4, throttling Lighthouse mobile).
- **RF-16.** Lighthouse mobile ≥ 95 em todas as 4 categorias.
- **RF-17.** Imagens críticas servidas em AVIF com fallback WebP via `<picture>`. `loading="lazy"` em tudo exceto LCP. Dimensões explícitas para evitar CLS.
- **RF-18.** Sem JS de terceiros bloqueando render. GA4 carrega assíncrono pós-load. Sem chatbots, sem pixels múltiplos.
- **RF-19.** Total de requisições ≤ 25 no first paint.
- **RF-20.** HTML inicial ≤ 50KB gzipped.

### Analytics

- **RF-21.** Eventos GA4 obrigatórios:
  - `page_view` automático
  - `cta_click` com parâmetro `cta_location` (hero | servicos | final | float)
  - `whatsapp_open` quando usuário toca botão de WhatsApp direto
  - `form_open` quando modal de orçamento abre
  - `scroll_depth` em 25/50/75/100%
- **RF-22.** Sem eventos PII em GA4 (sem nome, sem telefone, sem email).

### LGPD e Compliance

- **RF-23.** Banner de cookies mínimo aparece apenas se GA4 estiver ativo e usuário ainda não consentiu. Opt-out funcional desativa GA4 efetivamente.
- **RF-24.** Página `/privacidade` linkada no footer e em todo formulário, descrevendo: dados coletados, finalidade, retenção, base legal (consentimento + legítimo interesse), direitos do titular, contato do controlador.
- **RF-25.** Página `/termos` linkada no footer, descrevendo condições de serviço, garantia, política de retorno.

### Acessibilidade

- **RF-26.** Skip link "Pular para o conteúdo principal" como primeiro elemento focável.
- **RF-27.** Toda imagem com `alt` significativo OU `alt=""` se decorativa.
- **RF-28.** Contraste de texto ≥ 4.5:1 em todas as combinações usadas.
- **RF-29.** Navegação inteiramente operável por teclado, com foco visível.

### Responsividade

- **RF-30.** Layout deve funcionar bem em: 360px (mobile pequeno), 414px (mobile padrão), 768px (tablet), 1024px (laptop), 1440px (desktop).
- **RF-31.** Nenhum elemento deve causar scroll horizontal em nenhuma resolução acima de 320px.

---

## 5. Páginas Adicionais

A landing pública inclui também:

- **`/orcamento`** — página dedicada com formulário longo (definida em detalhe em `003-lead-capture`)
- **`/privacidade`** — Política de Privacidade (LGPD)
- **`/termos`** — Termos de Serviço
- **`/obrigado`** — confirmação pós-envio de formulário (se não houver redirect direto pro WhatsApp)
- **`/404`** — página de erro custom com CTA pra voltar à home ou abrir WhatsApp
- **`/styleguide`** — catálogo do design system (bloqueado em robots, acessível por URL)

---

## 6. Entidades-Chave (Conceituais)

A landing pública em si não persiste dados. Toda persistência relevante (leads) é responsabilidade da feature `003-lead-capture` e é descrita lá.

---

## 7. Critérios de Aceite

- [ ] Lighthouse mobile ≥ 95 em Performance, Acessibilidade, Best Practices, SEO na home e em `/orcamento`.
- [ ] LCP ≤ 2.5s no PageSpeed Insights (Moto G4 throttling).
- [ ] HTML válido segundo W3C validator.
- [ ] JSON-LD `LocalBusiness` validado em [schema-validator](https://validator.schema.org/).
- [ ] Sitemap acessível em `/sitemap.xml`, robots em `/robots.txt`.
- [ ] Open Graph preview renderiza corretamente em Facebook Sharing Debugger e Twitter Card Validator.
- [ ] Todos os eventos GA4 disparam corretamente (verificado em DebugView).
- [ ] axe-core não reporta violações `serious` ou `critical`.
- [ ] Navegação completa por teclado funciona em todas as seções.
- [ ] Botão flutuante de WhatsApp abre `wa.me/5511919691542` com mensagem pré-preenchida.
- [ ] Banner de cookies aparece apenas em primeiro acesso e respeita opt-out.
- [ ] Páginas `/privacidade` e `/termos` existem e estão linkadas.
- [ ] Sem scroll horizontal em nenhuma resolução de 320px a 1920px.

---

## 8. Fora de Escopo

- Blog ou área de conteúdo editorial (decisão futura).
- Internacionalização — landing é exclusivamente pt-BR.
- Carrinho, e-commerce, pagamento online (princípio IV: WhatsApp é o canal).
- Sistema de avaliações com login (depoimentos são estáticos curados).
- Chatbot ou widget de chat na landing (princípio IV).
- Múltiplas variantes A/B (sem ferramenta dessa fase).
- Newsletter / captura de email separada (princípio IV).

---

## 9. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Conteúdo da landing desatualizar (preços, serviços, áreas) | Alta | Médio | Centralizar conteúdo em um único arquivo JSON/data file pra edição rápida; revisão trimestral |
| LCP regressar com nova imagem de hero | Alta | Alto | Lighthouse CI em cada PR; budget enforced |
| Texto SEO ficar "spammy" e prejudicar ranking | Média | Alto | Redigir pra humano primeiro; checar densidade < 3% por palavra-chave |
| Botão flutuante WhatsApp atrapalhar UX em mobile | Média | Baixo | Esconder em viewports < 400px de altura; testar em devices reais |

---

## 10. Métricas de Sucesso (3 meses pós-lançamento)

- ≥ 30 leads/mês via formulário (vs. baseline atual a medir antes do switch).
- Taxa de clique no CTA primário ≥ 8% dos visitantes únicos.
- Posição média no Google ≤ 10 para "técnico em informática Bragança Paulista".
- Bounce rate ≤ 55%.
- Lighthouse mobile 95+ mantido em todas as auditorias semanais.

---

## 11. Próximos Passos

1. Aprovação deste `spec.md`.
2. `003-lead-capture/spec.md` (já em sequência) define o comportamento do modal + `/orcamento`.
3. `plan.md` desta feature define: arquitetura de arquivos, estratégia de imagens, fontes escolhidas, copy final, JSON-LD detalhado.
4. `tasks.md` desta feature define: passos executáveis pra Claude Code montar a landing.
