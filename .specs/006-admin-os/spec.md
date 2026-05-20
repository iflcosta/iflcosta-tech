# Spec: Admin OS (Ordens de Serviço)

**Feature:** `006-admin-os`
**Status:** Resumida (a expandir após 005 mergeado)
**Criada:** 2026-05-19
**Depende de:** `005-admin-crm` (customers) · `004-admin-auth`
**Bloqueia:** `007-admin-inventory` (peças consumidas em OS)

---

## 1. Contexto

Iago hoje rastreia consertos em planilha + Notion. Problemas: status fica obsoleto, não tem prazo claro, esquece etapas (testou bateria? validou wifi?), perde foto do "antes/depois" pra garantia. Cliente liga "cadê meu celular?" e ele leva 5min pra achar.

Esta feature é o **operacional core do dia-a-dia**: cada conserto vira uma OS com estado, checklist, fotos, custo, lucro e timeline.

---

## 2. Objetivos

1. **Abrir OS em ≤ 1min** — selecionar cliente, equipamento, problema reportado, salvar.
2. **Estado claro em 1 toque** — listagem mostra status visual (rascunho, diagnóstico, aguardando peça, em conserto, pronto, entregue).
3. **Histórico completo por equipamento** — fotos antes/durante/depois, checklist de testes, peças trocadas.
4. **Cálculo automático de lucro** — valor cobrado − custo de peças = margem por OS.
5. **Garantia rastreável** — 90 dias default, data de validade visível na ficha.

---

## 3. Cenários principais

### A. Maria traz iPhone com tela quebrada
Iago abre `/admin/clientes/maria`, toca "Nova OS". Form: equipamento (iPhone 12), problema (tela quebrada), prazo prometido (3 dias). Tira 2 fotos (frente + verso) pelo celular. Salva. OS criada em status `rascunho`.

### B. Diagnóstico
No dia seguinte, Iago abre a OS → muda status pra `diagnóstico` → escreve laudo ("tela troca, sem outros danos"), define valor (R$ 280). Status vira `aguardando aprovação`. Botão "Mandar orçamento no WhatsApp" → envia template pro cliente.

### C. Aprovação → conserto
Maria aprova no WhatsApp. Iago marca `aprovado` → `em conserto`. Consome 1 tela da estoque (link com feature 007). Termina, marca `pronto`, foto de tela nova ligada.

### D. Entrega + garantia
Maria busca. Iago marca `entregue`, valor recebido, forma de pagamento. Sistema calcula garantia (90 dias a partir de hoje), grava na OS. Audit log registra tudo.

### E. Cliente liga 2 meses depois com mesmo defeito
Iago busca cliente → vê última OS → confirma "ainda dentro da garantia" → cria OS filha com flag `garantia_de=<id_anterior>`, custo zero pro cliente, mas peça consumida sai do estoque normalmente.

---

## 4. Requisitos Funcionais (resumidos)

### Schema

- **RF-1.** Tabela `repairs` (OS): id, customer_id FK, equipamento (tipo, marca, modelo, serial), problema_reportado, laudo, status (enum), prazo_prometido, valor_cobrado, valor_custo_peças (calculado), valor_lucro (computed), forma_pagamento, garantia_dias (default 90), garantia_ate (computed), garantia_de (FK self, nullable), created_at, updated_at, entregue_at, audit fields.
- **RF-2.** Tabela `repair_photos`: id, repair_id, url (Supabase Storage), tipo (antes/durante/depois), uploaded_at.
- **RF-3.** Tabela `repair_checklist_items`: id, repair_id, label, checked (bool), order.
- **RF-4.** Tabela `repair_parts`: id, repair_id, product_id FK (entra na 007), qty, custo_unitario (snapshot).
- **RF-5.** RLS authenticated full em todas.

### Status (enum)

`rascunho` → `diagnóstico` → `aguardando_aprovação` → `aprovado` → `aguardando_peça` → `em_conserto` → `pronto` → `entregue`. Estados terminais alternativos: `cancelado`, `cliente_desistiu`.

### Listagem `/admin/os`

- **RF-10.** Cards (mobile) / tabela (desktop) com: cliente, equipamento, status (badge colorido), prazo, valor.
- **RF-11.** Filtros: status, faixa de data, em garantia, atrasado (prazo < hoje).
- **RF-12.** Ordenação: prazo crescente (default), valor, data abertura.
- **RF-13.** Indicador visual: OS atrasadas em vermelho.

### Ficha da OS

- **RF-20.** Header: cliente (link), equipamento, status atual (badge + botão "Mudar status").
- **RF-21.** Seção "Fotos" com upload (input file capture=camera no mobile), grid de thumbnails, lightbox.
- **RF-22.** Seção "Checklist" com itens custom + presets por tipo de equipamento (celular: bateria, wifi, câmera, alto-falante; PC: boot, drivers, antivírus).
- **RF-23.** Seção "Peças usadas" — selector que busca em `products` (feature 007), qty, custo snapshot.
- **RF-24.** Seção "Valores" — valor cobrado (input), custo peças (calculado), lucro (computed). Forma de pagamento (PIX/dinheiro/cartão/transferência).
- **RF-25.** Seção "Garantia" — dias (default 90), data de validade computada, link pra OS de garantia se aplicável.
- **RF-26.** Botão "Mandar status no WhatsApp" → template com status atual.
- **RF-27.** Botão "Imprimir OS" — versão print-friendly em uma página.

### Mudança de status

- **RF-30.** Modal de mudança valida transições válidas (não pula `aprovado` direto pra `entregue` sem passar por `em_conserto`).
- **RF-31.** Cada mudança grava em `repair_status_history` (id, repair_id, from, to, at, actor).

### Foto upload

- **RF-40.** `input type="file" accept="image/*" capture="environment"` no mobile abre câmera direto.
- **RF-41.** Compressão client-side antes do upload (max 1920px lado maior, JPEG q=80) — feature usa `<canvas>` ou lib leve.
- **RF-42.** Upload pra Supabase Storage bucket `os-photos` com path `{repair_id}/{tipo}/{timestamp}.jpg`.

---

## 5. Fora de Escopo

- ❌ Assinatura digital do cliente — usa WhatsApp como aprovação (registro de mensagem).
- ❌ Etiquetas Bluetooth/QR para equipamentos físicos — pode entrar em 010+.
- ❌ Multi-técnico — single-user.
- ❌ App nativo iOS/Android — web responsivo basta.

---

## 6. Critérios de Pronto

- [ ] Tabelas `repairs`, `repair_photos`, `repair_checklist_items`, `repair_parts`, `repair_status_history` com RLS + audit
- [ ] Bucket `os-photos` no Supabase Storage com policy authenticated
- [ ] Fluxo completo (criar → diagnóstico → entrega) testado em iPhone real
- [ ] Foto direto da câmera funciona em iOS Safari e Android Chrome
- [ ] Compressão de foto reduz arquivo em ≥ 60% antes do upload
- [ ] Cálculo de lucro automático correto
- [ ] Garantia data calculada e visível
- [ ] Playwright: criar OS, mudar status, upload de foto (mockado)

---

## 7. Notas para o plan.md

- Decidir: lib de compressão (browser-image-compression) ou implementar manual com canvas? **Recomendação:** manual, ~30 linhas, evita dependência.
- Decidir: photos polling com IntersectionObserver pra lazy load.
- Schema do `equipamento` — jsonb flexível (`{ tipo, marca, modelo, serial }`) ou colunas separadas? **Recomendação:** jsonb, OS varia muito.
- Templates de mensagem WhatsApp por status — guardar em tabela `message_templates` ou hardcode? **Decidir em plan.**

**Próximo:** detalhar `plan.md` após `005-admin-crm` operável.
