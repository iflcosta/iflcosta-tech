# Spec: Admin OS & Portal de Rastreamento Avançado

**Feature:** `006-admin-os` (incluindo `006-admin-os-tracking-upgrade`)
**Status:** Aprovada / Em Execução (Upgrade de Portal Ativo)
**Criada:** 2026-05-19
**Atualizada:** 2026-05-21
**Depende de:** `005-admin-crm` (customers) · `004-admin-auth`
**Bloqueia:** `007-admin-inventory` (peças consumidas em OS) · `008-whatsapp-bridge` (notificações ativas)

---

## 1. Contexto

Iago hoje rastreia consertos em planilha + Notion. Problemas: status fica obsoleto, não tem prazo claro, esquece etapas (testou bateria? validou wifi?), perde foto do "antes/depois" pra garantia. Cliente liga "cadê meu celular?" e ele leva 5min pra achar.

Esta feature é o **operacional core do dia-a-dia**: cada conserto vira uma OS com estado, checklist, fotos, custo, lucro e timeline. Adicionalmente, o portal público de rastreamento do cliente (`/rastrear`) é estendido para atuar como uma **vitrine de transparência premium**, exibindo o número sequencial da OS, notas públicas amigáveis para reduzir a ansiedade do suporte, um Showcase de hardware de alta fidelidade para computadores montados (**Custom PC Builder**) e certificado de garantia digital legível, sob estrita conformidade com a LGPD e sigilo absoluto de margens comerciais.

---

## 2. Objetivos

1. **Abrir OS em ≤ 1min** — selecionar cliente, equipamento, problema reportado, salvar.
2. **Estado claro em 1 toque** — listagem mostra status visual (rascunho, diagnóstico, aguardando peça, em conserto, pronto, entregue).
3. **Histórico completo por equipamento** — fotos antes/durante/depois, checklist de testes, peças trocadas.
4. **Cálculo automático de lucro** — valor cobrado − custo de peças = margem por OS (exclusivo do painel administrativo).
5. **Garantia digital rastreável** — auto-gerada pelo sistema, com código de validação copiável e data de vencimento calculada dinamicamente.
6. **Portal Público Premium** — visual Glassmorphic HSL contendo timeline evolutiva com notas técnicas explicativas, contador de tempo ativo na etapa, e Showcase condicional de hardware para computadores customizados.

---

## 3. Cenários principais

### A. Maria traz iPhone com tela quebrada
Iago abre `/admin/clientes/maria`, toca "Nova OS". Form: equipamento (iPhone 12), problema (tela quebrada), prazo prometido (3 dias). Tira 2 fotos (frente + verso) pelo celular. Salva. OS criada em status `rascunho`. O banco gera automaticamente o número `OS-2026-0001` e a hash de garantia `WARR-2026-F89A12`.

### B. Diagnóstico e Orçamento
No dia seguinte, Iago abre da OS → muda status pra `diagnóstico` → escreve laudo ("tela troca, sem outros danos"), define valor (R$ 280). Status vira `aguardando aprovação`. O cliente recebe pelo WhatsApp o link `/rastrear?token=UUID` e vê o status e a nota do diagnóstico em tempo real.

### C. Conserto Clássico
Maria aprova no WhatsApp. Iago marca `aprovado` → `em conserto`. Consome 1 tela de estoque (link com feature 007). Ao trocar a tela, grava uma Nota Pública explicativa: *"Efetuando troca da tela original e realizando testes de calibração do sensor TrueTone"*. Maria acompanha a atualização em tempo real pelo link.

### D. Montagem de Custom PC
Rodrigo contrata a montagem de um computador de alta performance no Custom PC Builder. Iago ativa o switch `🖥️ Custom PC` na ficha da OS administrativa. Ao abrir o portal de rastreio de Rodrigo, a tela se transforma em uma vitrine premium (Showcase), exibindo todos os componentes instalados (CPU, GPU, RAM) com suas especificações completas em cards glassmorphic e badges de progresso de teste.

### E. Entrega + Garantia Digital
Maria busca o iPhone. Iago marca `entregue`, valor recebido e muda a situação de pagamento para `Quitado / Pago`. O sistema calcula automaticamente os 90 dias de garantia e ativa o Certificado de Garantia Digital. No portal, o cliente visualiza o código de validação `WARR-2026-F89A12` ativo com botão para cópia rápida.

---

## 4. Requisitos Funcionais

### Schema & Banco de Dados (DDL)
- **RF-1.** Tabela `repairs` (OS): id, customer_id FK, equipamento (tipo, marca, modelo, serial), problema_reportado, laudo, status (enum), prazo_prometido, valor_cobrado, valor_custo_peças (calculado), valor_lucro (computed), forma_pagamento, garantia_dias (default 90), garantia_ate (computed), garantia_de (FK self, nullable), created_at, updated_at, entregue_at, audit fields.
- **RF-2.** Tabela `repair_photos`: id, repair_id, url (Supabase Storage), tipo (antes/durante/depois), uploaded_at.
- **RF-3.** Tabela `repair_checklist_items`: id, repair_id, label, checked (bool), order.
- **RF-4.** Tabela `repair_parts`: id, repair_id, product_id FK (entra na 007), qty, custo_unitario (snapshot).
- **RF-5.** **Trigger de Metadados:** Geração automática e sequencial anual de `os_number` (Ex: `OS-2026-0001`) e da hash amigável `digital_warranty_code` (Ex: `WARR-2026-AB12`) no `INSERT` da OS.
- **RF-6.** **Trigger de Transição de Status:** Monitora atualizações de status. Encerra a etapa atual calculando a duração gasta em segundos (`duration_seconds`), e insere automaticamente o novo status no histórico.

### Segurança e LGPD
- **RF-8.** **View de Segurança Pública (`view_public_os_tracking`):** Expõe dados sanitizados para o cliente anônimo. O nome do cliente exibe apenas o primeiro nome (ex: *"Olá, Maria"*), o sobrenome e e-mail são omitidos, e o número serial é mascarado (ex: `ABCD****EF`).
- **RF-9.** **Ocultação de Margens Comerciais:** A API de tracking pública **nunca expõe** custos de compra internos (`cost_price_snapshot`) ou markups financeiros da empresa, enviando apenas os componentes, marcas e quantidades ao cliente.
- **RF-10.** **RLS Blindado:** Somente conexões autenticadas do administrador podem realizar mutações (`INSERT`/`UPDATE`/`DELETE`). Conexões anônimas possuem permissão estritamente restrita de leitura (`SELECT`) por token UUID.

### Listagem `/admin/os`
- **RF-20.** Cards (mobile) / tabela (desktop) com: cliente, equipamento, status (badge colorido), prazo, valor.
- **RF-21.** Filtros: status, faixa de data, em garantia, atrasado (prazo < hoje). Destaque visual pulsante para itens atrasados.

### Ficha da OS Administrativa
- **RF-30.** Header: cliente (link), equipamento, status atual (badge + máquina de transição de status).
- **RF-31.** **Controle de Upgrade:** Inputs para alternar a flag de Custom PC (`is_custom_pc`), e alterar a Situação Financeira discreta (`payment_status`).
- **RF-32.** **Transição com Notas:** Caixa de texto para preencher "Nota Técnica Pública" no histórico ao mudar de status.
- **RF-33.** Seção "Fotos" com upload direto de câmera compactado em client-side via canvas (max 1920px, JPEG q=80) salvando no bucket `os-photos`.
- **RF-34.** Seção "Valores" — valor cobrado, custo de peças calculado, lucro e margem bruta real-time (visível apenas para admin).

### Portal Público do Cliente `/rastrear`
- **RF-50.** **Estética Premium HSL:** Layout responsivo mobile-first utilizando desfoque de vidro (glassmorphism), fundos com gradientes escuros e glows coloridos de alta fidelidade visual.
- **RF-51.** **Timeline interativa com Notas Públicas:** Exibe os status históricos com as notas explicativas preenchidas pelo técnico de forma amigável e legível.
- **RF-52.** **Contador Ativo:** Script em JS que calcula e atualiza dinamicamente o tempo que a OS está no status ativo atual (ex: *"Há 1 dia e 4 horas nesta etapa"*) a cada 60 segundos na tela, sem recarregamento de página.
- **RF-53.** **Grid Custom PC Builder Showcase:** Layout condicional para `is_custom_pc = true` que exibe a grid detalhada de hardware por categorias com especificações completas de cada componente instalado.
- **RF-54.** **Lista de Peças de Reposição:** Layout condicional alternativo (`is_custom_pc = false`) que renderiza a relação limpa das peças de reposição consumidas sem expor valores.
- **RF-55.** **Certificado de Garantia Digital:** Renderiza no rodapé o código de garantia digital legível, acompanhado de botão de cópia rápida e duração da cobertura em dias.
- **RF-56.** **Financeiro Discreto:** Exibição discreta da situação de pagamento por badges para evitar constrangimentos públicos.
- **RF-57.** **WhatsApp CTA:** Botão persistente para entrar em contato no WhatsApp com mensagem contextualizada da OS ativa.

---

## 5. Fora de Escopo

- ❌ Assinatura digital física na tela — usa aprovação por WhatsApp (registro de histórico de mensagens).
- ❌ Integração direta com gateways de pagamento — a OS apenas registra a situação financeira informada pelo admin de forma manual.
- ❌ Multi-técnico — sistema focado em operador único (Iago).

---

## 6. Critérios de Pronto

- [x] Migrações do banco rodadas no Supabase com suporte a `is_custom_pc`, `payment_status` e `public_notes`.
- [x] Triggers automáticos PL/pgSQL gerando `os_number` sequencial, hash de garantia e registrando histórico de status no banco.
- [x] View de segurança pública `view_public_os_tracking` criada com RLS anônimo SELECT restrito a token UUID.
- [x] APIs administrativas (`index.js`, `status.js`) e API pública de tracking (`tracking.js`) implementadas, seguras e testadas contra vazamento de PII e custos.
- [x] Painel administrativo de detalhes (`admin/os/detalhes.html`, `os-detalhes.js`) operando os novos seletores e notas públicas.
- [ ] Portal público do cliente (`/rastrear/index.html`, `rastrear.js`) renderizando o design glassmorphism premium com suporte a Custom PC Builder Showcase, notas explicativas na timeline, garantia copiável e badges de pagamento discretos.
- [ ] Suíte de testes automatizados (Playwright) `tests/admin-os.spec.js` atualizada para cobrir o fluxo completo do novo portal de rastreamento aprimorado.

---

## 7. Referências e Sub-Especificações de Design

- [Design Conceitual & Webhook WhatsApp](file:///C:/Users/Iago/.gemini/antigravity/scratch/iflcosta-tech/.specs/006-admin-os/tracking_design.md)
- [Design UX/UI do Portal de Rastreamento Robustecido](file:///C:/Users/Iago/.gemini/antigravity/scratch/iflcosta-tech/.specs/006-admin-os/tracking_upgrade.md)
- [Plano de Implementação de Engenharia](file:///C:/Users/Iago/.gemini/antigravity/brain/13af7990-b894-4e30-9c94-4ade718aca77/implementation_plan.md)

**Próximo:** detalhar `plan.md` após `005-admin-crm` operável.
