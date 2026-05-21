# Tasks: Admin OS & Portal de Rastreamento Avançado

**Feature:** `006-admin-os` (incluindo tracking upgrade)
**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
**Status geral:** 83% concluído — backend e admin prontos, portal público pendente
**Depende de:** `005-admin-crm` · `004-admin-auth`

---

## Convenções

- `[x]` feito · `[ ]` pendente · `[~]` em progresso
- S = ≤ 1h · M = 2–4h · L = ≥ 4h

---

## 1. Banco de Dados — Base

- [x] **T001** — Criar migration `2026_05_20_create_os.sql`: tabelas `repairs`, `os_status_history`, `repair_photos`, `repair_checklist_items`. **L**
- [x] **T002** — Habilitar RLS em todas as tabelas: `authenticated` full access. **S**
- [x] **T003** — Criar trigger `handle_os_status_transition`: ao mudar `repairs.status`, fechar status anterior (calculando `duration_seconds`) e inserir novo em `os_status_history`. **M**
- [x] **T004** — Criar trigger de garantia: quando `status = 'entregue'`, calcular e preencher `garantia_ate = NOW() + garantia_dias`. **M**
- [x] **T005** — Criar trigger `handle_os_audit_log`: gravar toda mutação em `audit_log`. **S**
- [x] **T006** — Criar bucket `os-photos` no Supabase Storage com policy: `authenticated` write, `authenticated` read (sem acesso anônimo às fotos). **S**

---

## 2. Banco de Dados — Tracking Upgrade

- [x] **T010** — Criar migration `2026_05_21_create_tracking_upgrade.sql`. **M**
- [x] **T011** — `ALTER TABLE repairs ADD COLUMN IF NOT EXISTS os_number, is_custom_pc, payment_status, digital_warranty_code`. **S**
- [x] **T012** — `ALTER TABLE os_status_history ADD COLUMN IF NOT EXISTS public_notes, private_notes`. **S**
- [x] **T013** — Criar função + trigger `generate_os_metadata` (BEFORE INSERT): gerar `os_number` sequencial anual (`OS-YYYY-NNNN`) e `digital_warranty_code` (`WARR-YYYY-XXXXXX`). **M**
- [x] **T014** — Criar UPDATE retroativo: preencher `os_number` e `digital_warranty_code` para OS já existentes no banco. **M**
- [x] **T015** — Criar view `public.view_public_os_tracking` com máscaras LGPD (primeiro nome, serial `ABCD****EF`, sem dados financeiros de custo). **M**
- [x] **T016** — Criar políticas RLS públicas (role `anon`): `SELECT` somente via `tracking_token`, zero mutações. **S**

---

## 3. APIs Edge Functions

- [x] **T020** — Criar `api/admin/os/index.js` GET: listagem com filtros `status`, `search`, `atrasado`, paginação. **M**
- [x] **T021** — Criar `api/admin/os/index.js` POST: criar nova OS com `customer_id`, `equipamento`, `is_custom_pc`, `payment_status`. Retornar OS criada com `os_number` e `tracking_token`. **M**
- [x] **T022** — Criar `api/admin/os/status.js` POST: validar máquina de estados, gravar transição com `public_notes` e `private_notes` em `os_status_history`. **M**
- [x] **T023** — Criar `api/admin/os/tracking.js` GET (público): buscar OS pela view de segurança + histórico público + lista de peças sem custos. Higienizar payload antes de retornar. **L**

---

## 4. Frontend Admin — Listagem OS

- [x] **T030** — Criar `admin/os/index.html`: layout admin shell + grid de cards mobile / tabela desktop. **M**
- [x] **T031** — Criar `assets/js/admin/os.js`: fetch de OS, renderização com badges de status HSL dinâmicos, filtros, busca, indicador de atraso (vermelho pulsante). **L**
- [x] **T032** — Modal "Nova OS": seletor de cliente (busca por nome/telefone), form de equipamento (tipo, marca, modelo, serial), prazo prometido, valor opcional. **M**
- [x] **T033** — Submissão do modal: `POST /api/admin/os/index` → redirecionar para `/admin/os/detalhes?id=UUID`. **S**

---

## 5. Frontend Admin — Ficha da OS

- [x] **T040** — Criar `admin/os/detalhes.html`: layout com todas as seções (header, controles de upgrade, máquina de status, fotos, checklist, valores, garantia). **L**
- [x] **T041** — Criar `assets/js/admin/os-detalhes.js`: carregar OS por ID, inicializar todos os inputs e seções. **L**
- [x] **T042** — Seção Controles de Upgrade: switch `is_custom_pc` (toggle glassmorphic) + seletor `payment_status` (pendente/parcial/pago). Persistir via `PUT`. **M**
- [x] **T043** — Seção Máquina de Status: seletor de novo status, textarea de `public_notes`, textarea de `private_notes`. Submissão via `POST /api/admin/os/status`. **M**
- [x] **T044** — Seção Fotos: `input[type=file][accept="image/*"][capture="environment"]`, compressão client-side via `<canvas>` (max 1920px, JPEG q=80), upload para Supabase Storage, exibição em grid com lightbox. **L**
- [x] **T045** — Seção Checklist: presets por tipo de equipamento (celular/PC), checkboxes dinâmicos, persistência no banco. **M**
- [x] **T046** — Seção Valores: inputs de valor cobrado, custo de peças calculado automaticamente, cálculo real-time de lucro e margem %. **M**
- [x] **T047** — Seção Garantia: dias configuráveis, data de validade calculada, link para OS pai se houver. **S**
- [x] **T048** — Botão "Mandar no WhatsApp": gera URL `wa.me/55{telefone}` com template do status atual. **S**

---

## 6. Portal Público do Cliente (`/rastrear`) — **CONCLUÍDO**

- [x] **T060** — Reescrever `rastrear/index.html`: fundo gradiente escuro (`hsl(222, 47%, 4%)`), meta tags SEO, estrutura dos 5 componentes (header, status ativo, timeline, peças/hardware, garantia). **M**
- [x] **T061** — Criar `assets/js/rastrear.js`: ler `?token=` da query string, `fetch(/api/admin/os/tracking?token=UUID)`, tratar erro 404 com tela amigável. **M**
- [x] **T062** — Componente Header: exibir `os_number`, `customer_first_name`, dados do equipamento, badge pulsante Custom PC se `is_custom_pc = true`. **M**
- [x] **T063** — Componente Status Ativo: card glassmorphic com status em destaque. Contador de tempo ativo via `setInterval` a cada 60 000ms: calcular diferença entre `entered_at` do status ativo e `Date.now()`, exibir em horas e minutos. **M**
- [x] **T064** — Componente Timeline: renderizar `status_history` em lista vertical. Ícone verde check (exited), violeta pulse (ativo), cinza (futuro). Data, duração, e `public_notes` em itálico com 💡. **M**
- [x] **T065** — Componente Peças — Layout Clássico (`is_custom_pc = false`): tabela de peças com `nome`, `qty`, `categoria`. Sem preços. **S**
- [x] **T066** — Componente Hardware Showcase (`is_custom_pc = true`): grid de cards glassmorphic por categoria (CPU, GPU, RAM, SSD, MOTHERBOARD, PSU, GABINETE). Cada card: ícone da categoria, nome do componente, specs em texto pequeno, badge "Instalado". Hover com glow violeta. **L**
- [x] **T067** — Componente Garantia & Financeiro: seção inferior com `digital_warranty_code` + botão de cópia (`navigator.clipboard.writeText`), duração da garantia em dias, badge discreto de `payment_status`. **M**
- [x] **T068** — Botão CTA WhatsApp: fixo no rodapé, `wa.me/5511919691542?text=Olá Iago, sou {primeiro_nome} e quero saber sobre minha OS {os_number}`. **S**
- [x] **T069** — Estilos CSS do portal: regras inline ou tag `<style>` no HTML — glassmorphism (`backdrop-filter: blur(16px)`), gradiente escuro, badges HSL dinâmicos, animação `pulse` para o status ativo. **M**
- [x] **T070** — Tela de erro: quando token não encontrado ou inválido, exibir tela com explicação amigável e botão WhatsApp de suporte. **S**
- [x] **T071** — Validar clean URL `/rastrear` (sem `.html`) via `vercel.json`. **S** *(cleanUrls: true já ativo)*

---

## 7. Testes Playwright

### Já passando (12/12):
- [x] **T080** — T01 Listagem, T02 Filtro, T03 Criar OS, T04 Ficha, T05 Margens
- [x] **T081** — T06 Checklist, T07 Transição, T08 LGPD nome, T09 LGPD serial
- [x] **T082** — T10 Timeline, T11 WhatsApp link, T12 Segurança de dados

### Novos testes para o portal (pendentes):
- [ ] **T083** — T13: Portal exibe `os_number` no cabeçalho no formato `#OS-YYYY-NNNN`. **S**
- [ ] **T084** — T14: `public_notes` aparecem na timeline quando cadastradas. **S**
- [ ] **T085** — T15: Grid Custom PC renderiza com `is_custom_pc = true` (mock de payload). **M**
- [ ] **T086** — T16: Lista clássica de peças renderiza com `is_custom_pc = false`. **S**
- [ ] **T087** — T17: Código de garantia exibido e botão de cópia funciona. **S**
- [ ] **T088** — T18: Badge `payment_status` exibe texto correto para `pendente`, `parcial` e `pago`. **S**

---

## 8. Critério de Pronto

- [x] Migrations base e tracking upgrade aplicadas no banco
- [x] Triggers PL/pgSQL de status, garantia, `os_number` e `digital_warranty_code`
- [x] View pública `view_public_os_tracking` com RLS anônimo SELECT
- [x] APIs `index.js`, `status.js`, `tracking.js` implementadas e validadas
- [x] UI admin completa: listagem, ficha, upgrade (Custom PC, payment_status, public_notes)
- [x] Playwright admin (T01–T12) passando 12/12
- [x] Portal público `/rastrear` completo com glassmorphism HSL premium
- [ ] Playwright portal (T13–T18) passando 6/6
- [ ] Deploy em produção (iflcosta.tech/rastrear?token=...) validado
- [ ] ROADMAP.md atualizado para 006 = 100% pronto
