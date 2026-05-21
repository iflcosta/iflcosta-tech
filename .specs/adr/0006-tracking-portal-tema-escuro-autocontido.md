# ADR 0006 — Portal de rastreamento usa tema escuro autocontido

**Status:** Aceito
**Data:** 2026-05-21
**Decisor:** Iago Lopes
**Contexto da feature:** `006-admin-os` (tracking upgrade) · ver `tracking_upgrade.md`

---

## Contexto

A constituição do projeto e o ADR 0005 estabelecem que landing e admin compartilham
o design system (`tokens.css` + `components.css`) como fonte única da verdade. Isso evita
"drift de design" — um dos riscos transversais listados no `ROADMAP.md`.

O portal público de rastreamento de OS (`/rastrear?token=UUID`) foi implementado com um
**stylesheet dark glassmorphism autocontido**: ~840 linhas de CSS num único `<style>` no
`<head>`, com um `:root` próprio (tokens `--bg-*`, `--glass-*`, `--violet`, `--slate-*`,
`--r-*`). Ele **não importa `tokens.css`**.

Isso contradiz o princípio do design system compartilhado e foi corretamente apontado
numa auditoria como risco de drift.

## Opções Avaliadas

### Opção A — Manter tema escuro autocontido (exceção documentada)
O portal continua com seu stylesheet próprio. A divergência vira uma decisão explícita,
não drift acidental.

**Prós:**
- O portal é uma superfície **voltada ao cliente** com estética deliberadamente distinta
  (dark glassmorphism premium) — diferente do tema claro de landing/admin. Forçar os tokens
  semânticos claros não atenderia o design especificado em `tracking_upgrade.md` §2.
- É **uma única página isolada**, sem componentes compartilhados — o risco de drift real
  (inconsistência entre telas que o Iago mantém) é baixo.
- Migrar 840 linhas de CSS bespoke às cegas, sem QA visual, arrisca regressão visual numa
  página que o cliente vê.
- Precedente: ADR 0004 já aceitou uma "ilha escura" (Final CTA) como exceção localizada.

**Contras:**
- Cria uma segunda ilha de design fora do sistema de tokens.
- Duplica primitivas (escala slate, raios, espaçamento) que `tokens.css` já provê.

### Opção B — Migrar o portal para `tokens.css`
Importar `tokens.css` e reescrever o stylesheet do portal usando os tokens do sistema.

**Prós:**
- Coerente com a constituição e o ADR 0005.
- Elimina a duplicação de primitivas.

**Contras:**
- `tokens.css` é um sistema de tema claro semântico; o portal é dark glassmorphism — não há
  mapeamento 1:1, exigiria uma camada de tokens dark nova.
- Refatorar 840 linhas sem ambiente de verificação visual é arriscado.
- Esforço alto para uma página isolada e estável.

## Decisão

**Adotada Opção A.**

O portal `/rastrear` mantém seu stylesheet dark glassmorphism autocontido. A divergência
fica registrada aqui como **exceção deliberada e localizada**, não como drift.

## Consequências

- O portal continua visualmente conforme `tracking_upgrade.md` §2 (glassmorphism premium).
- Landing e admin seguem usando `tokens.css` normalmente — o portal é a exceção.
- Esta exceção é localizada e documentada — não abre precedente para novas telas dark sem ADR.
- Se surgir uma **segunda** superfície dark (ex: área logada do cliente), reavaliar: nesse
  ponto compensa criar uma camada de tokens dark compartilhada em `tokens.css`.

## Revisão

Reavaliar se:
- Uma segunda superfície precisar do mesmo tema dark (sinal de que falta token dark compartilhado).
- O portal ganhar componentes que também existem em landing/admin (aí a duplicação dói).
- Uma auditoria de acessibilidade reprovar contraste — nesse caso, migrar para tokens auditados.
