# Tasks — Feature 010: Painel Financeiro

**Status:** Em andamento  
**Criado:** 2026-05-21

---

## T001 — Specs (spec.md + plan.md + tasks.md) `S` ✅
**Critério:** Arquivos criados e aprovados por Iago.

---

## T002 — API `/api/admin/financeiro.js` `M` ✅
**Ref:** plan.md §2  
**Critério:**
- [ ] GET retorna `resumo`, `a_receber` e `grafico` com dados reais do Supabase
- [ ] Parâmetros `periodo` e `date_from`/`date_to` funcionam corretamente
- [ ] Retorna 401 sem sessão válida
- [ ] `a_receber.lista` inclui join com `customers` para nome do cliente

---

## T003 — HTML + CSS `admin/financeiro/index.html` `M` ✅
**Ref:** plan.md §3  
**Critério:**
- [ ] 4 cards de métrica com IDs corretos para JS preencher
- [ ] `<canvas id="grafico-financeiro">` presente
- [ ] Tabela A Receber com estrutura correta
- [ ] Select de período com opções corretas
- [ ] Layout responsivo: coluna única em 360px, grid 2×2 em ≥ 768px, grid 4×1 em ≥ 1024px
- [ ] Usa tokens CSS do design system (sem CSS inline além de ajustes pontuais)

---

## T004 — JS `assets/js/admin/financeiro.js` `M` ✅
**Ref:** plan.md §3 Componentes JS  
**Critério:**
- [ ] `loadFinanceiro()` chama API e trata 401 redirecionando para login
- [ ] Cards atualizam ao trocar o período
- [ ] Gráfico de barras renderiza via `<canvas>` API (sem lib externa)
- [ ] Gráfico mostra 6 meses com barras de receita (azul) e lucro (verde)
- [ ] Tabela A Receber com link clicável para `/admin/os/detalhes?id=`
- [ ] Estado vazio ("Nenhum valor a receber 🎉") quando lista está vazia
- [ ] Valores formatados em R$ com `Intl.NumberFormat('pt-BR')`

---

## T005 — Sidebar + Dashboard card `S` ✅
**Ref:** plan.md §4  
**Critério:**
- [x] Link "💰 Financeiro" no sidebar do admin (layout.js ou HTML do sidebar)
- [x] Card no `admin/index.html` mostrando receita do mês atual (via API)
- [x] Card é clicável e navega para `/admin/financeiro/`

---

## T006 — Suíte E2E Playwright `S` ✅
**Ref:** padrão de `tests/admin-*.spec.js`  
**Critério:**
- [x] `tests/admin-financeiro.spec.js` com mock de `/api/admin/financeiro`
- [x] T01 cards de resumo · T02 troca de período · T03 tabela A Receber
- [x] T04 estado vazio · T05 range personalizado · T06 canvas do gráfico
- [x] Sintaxe e encoding validados (execução depende de browser no CI)
