# Dossiê Executivo: Projeto E-Bike DIY Bafang BBSHD 1000W & Logística Leva-e-Traz

## 1. Resumo Executivo e Contexto Estratégico
- **Objetivo Central:** Aquisição planejada, montagem e gestão contínua de uma bicicleta elétrica de tração central de alta performance (conversão DIY) para deslocamento urbano e operação do serviço "Leva-e-Traz" de manutenção e hardware de computadores da IF Tech.
- **Localização de Operação:** Bragança Paulista/SP — topografia severa com rampas contínuas de 15% a 25%, asfalto com remendos e calçamento em paralelepípedos.
- **Decisão Logística de Compra:** O projeto será executado **100% com componentes adquiridos no Brasil** (sem importação pessoal de bagagem da China).
- **Data de Referência Atual:** Setembro de 2026.
- **Início dos Aportes:** Outubro de 2026.
- **Prazo de Montagem:** **Março de 2027** (~6 meses de planejamento e aportes programados).

---

## 2. Perfil Ergonômico, Chassi e Protocolo de Carga Crítica
- **Condutor:** Peso corporal de 65 kg; altura de 1,69 m a 1,70 m.
- **Quadro da Bicicleta:** 
  - Mountain Bike Aro 29 em Alumínio Hidroformado.
  - **Tamanho obrigatório: 17" (M)**.
  - **Movimento Central:** BSA 68-73 mm rosqueado (compatibilidade nativa e perfeita com o eixo do motor Bafang BBSHD).
  - Freios a disco hidráulicos (modelos de referência: *Caloi Explorer Expert* ou *Oggi Big Wheel 7.0*).
- **Carga Máxima de Trabalho:**
  - Mochila técnica de 59 x 59 x 25 cm para transporte nas costas.
  - Carga útil: notebooks (2 a 3 kg) até gabinetes **PC Full Tower extremos** com placas de vídeo pesadas (3 fans) e radiadores 360 mm (massa entre 18 kg e 25 kg).
  - Peso total do conjunto em movimento (condutor + bike + motor/bateria + carga): **~115 kg**.
- **Regra Operacional de Risco (SOP Hardware):**
  - **Remoção obrigatória da placa de vídeo (GPU) do slot PCIe** antes do trajeto, transportando-a em compartimento interno acolchoado e antiestático, prevenindo quebra de conectores ou PCB em buracos e paralelepípedos.
- **Ergonomia e Condução:**
  - Banco regulado 1 a 3 cm mais baixo para estabilidade e parada firme com os pés no chão em aclives acentuados (ou instalação de canote retrátil / *dropper post* acionado por alavanca no guidão).
  - Pilotagem com cadência assistida constante (60-75 RPM), mitigando correntes de partida excessivas (*inrush current*) e poupando os 12 MOSFETs da controladora.

---

## 3. Especificações Técnicas do Powertrain & Conformidade Legal
- **Motor Central:** Bafang BBSHD 1000W Mid-Drive (160 Nm de torque bruto, controlador integrado 48V/52V 30A com 12 MOSFETs robustos).
- **Bateria:** Pack de Lítio Li-ion NMC (células 18650 ou 21700) **48V ou 52V de 20Ah (960 Wh a 1.040 Wh)**, case Hailong reforçado com trava mecânica por chave e carregador inteligente 3A/4A.
- **Periféricos & Segurança:**
  - Display DPC-18 Colorido com porta USB e protocolo UART.
  - Bafang Gear Sensor (corte eletrônico ultrarrápido de potência na troca de marcha para proteger a corrente e o cassete).
  - Sensores de corte magnético para manetes hidráulicos.
  - Corrente reforçada específica para e-bike (KMC e-Glide, e9 ou e10).
  - Pastilhas de freio metálicas/sinterizadas e rotores de 180 mm.
- **Conformidade Legal (Resolução CONTRAN 996/2023):**
  - Limitação eletrônica de assistência a **32 km/h**.
  - Operação com pedal assistido (PAS).
  - Retrovisor esquerdo instalado.
  - Farol dianteiro de alta potência (800 a 1000 lúmens).
  - Lanterna traseira vermelha com sinalização.
  - Campainha sonora.
  - **Dispensa de CNH, IPVA e emplacamento** por cumprir estritamente os parâmetros de bicicleta elétrica autopropelida.

---

## 4. Planejamento Financeiro de Aquisição (CAPEX: R$ 11.000,00)
- **Meta de Investimento Total:** **R$ 11.000,00**
- **Plano de Aporte Mensal:** **R$ 1.833,00 / mês** por 6 meses (Outubro/2026 a Março/2027), mantidos em reserva com liquidez diária (100% CDI).

### Cronograma de Compras em 2 Fases

#### Fase 1: Meses 1 a 4 (Outubro/2026 a Janeiro/2027)
*Estratégia:* Compras graduais de componentes mecânicos, consumíveis, ferramental e kit de segurança aproveitando promoções como Black Friday:
1. Corrente reforçada de e-bike (KMC e-Glide/e9/e10): ~R$ 180,00
2. Pastilhas de freio metálicas/sinterizadas + fluído: ~R$ 160,00
3. Kit Legal CONTRAN 996 (farol 1000lm, lanterna, retrovisor, campainha): ~R$ 220,00
4. Ferramentas específicas (chave BBSHD, extrator pedivela, alicate elo): ~R$ 140,00
5. *Opcional:* Canote Retrátil mecânico com trava no guidão: ~R$ 350,00
*Subtotal Fase 1:* ~R$ 1.050,00

#### Fase 2: Meses 5 e 6 (Fevereiro a Março/2027)
*Estratégia:* Compra dos componentes centrais **exclusivamente na semana da montagem**. Isso preserva os 3 a 6 meses de garantia legal de fábrica contra defeitos de lote e garante que o pack de lítio chegue fresco e pronto para uso, sem degradação por armazenamento inativo:
1. Kit Motor Bafang BBSHD 1000W completo com display DPC-18 e sensores: ~R$ 7.800,00
2. Bateria de Lítio 48V/52V 20Ah Hailong com Carregador: ~R$ 2.700,00
*Subtotal Fase 2:* ~R$ 10.500,00

---

## 5. Engenharia de Custos Operacionais (OPEX)
Custo Quilométrico Total (CPK): **R$ 0,234 / km rodado**, decomposto em 5 pilares:

| Pilar de Custo | Valor / km | Base Técnica de Cálculo |
| :--- | :---: | :--- |
| **1. Energia Elétrica (CPFL)** | R$ 0,017 | Consumo médio de 15 Wh/km a R$ 1,00/kWh residencial |
| **2. Amortização da Bateria** | R$ 0,082 | Pack de R$ 2.800 durando 800 a 1.000 ciclos (~34.000 km) |
| **3. Desgaste de Transmissão** | R$ 0,075 | Corrente KMC e-bike a cada 3.000 km + Cassete a cada 6.000 km |
| **4. Freios e Pneus** | R$ 0,045 | Pastilhas a cada 2.500 km + pneus aro 29 a cada 6.000 km |
| **5. Manutenção Preventiva** | R$ 0,015 | Graxa especial para engrenagens Bafang, ceras de corrente e fluídos |
| **CPK TOTAL** | **R$ 0,234** | Custo operacional real e transparente |

---

## 6. Modelo de Negócio Leva-e-Traz e Segregação de Caixa
- **Tarifa Cobrada do Cliente:** **R$ 0,89 por km total rodado** (ida e volta calculada via Google Maps).
- **Taxa Mínima de Saída (Despacho):** **R$ 6,50** para trajetos curtos (até 7,3 km).
- **Margem Líquida Logística:** R$ 0,89 - R$ 0,234 = **R$ 0,656 / km (~74% de margem)**.

### Segregação Automática das Taxas Recebidas
Toda receita proveniente da taxa de logística é segregada matematicamente no aplicativo em 3 contas:
1. **26% (~R$ 0,23/km): Caixa de Manutenção Imediata** (`ebike_manutencao`): liquidez rápida para recarga, lubrificação, ajustes e trocas de pastilhas.
2. **35% (~R$ 0,31/km): Fundo de Reposição da Bateria** (`ebike_bateria`): reserva acumulada em CDI para compra de um novo pack de lítio aos 30.000-34.000 km.
3. **39% (~R$ 0,35/km): Amortização do CAPEX** (`ebike_capex`): amortização do investimento inicial de R$ 11.000,00 ou retorno líquido acelerado.

---

## 7. Métricas de Volume, Retorno e Custo Evitado
- **Volume Base Estimado:** 5 manutenções concluídas por semana (10 saídas entre coletas e devoluções).
- **Distância Média:** ~13 km por saída (ida e volta) → ~130 km/semana → **~560 km/mês**.
- **Faturamento Mensal da Logística:** ~R$ 498,40 / mês.
- **Custo Operacional Efetivo:** - R$ 128,80 / mês.
- **Saldo Líquido Gerado:** **~R$ 369,60 / mês**.
- **Economia Indireta (Custo Evitado vs Uber/Motoboy):**
  - 10 saídas/semana x 4 semanas = 40 corridas/mês.
  - Custo médio de Uber/motoboy em Bragança Paulista: R$ 23,00 / viagem.
  - Custo terceirizado evitado: **R$ 920,00 / mês**.
  - **Economia Líquida Real:** R$ 920,00 - R$ 128,80 = **~R$ 791,20 / mês economizados**.

---

## 8. Arquitetura de Software Implementada (`apps/life-ops`)
- **`database.py`:**
  - Criação das tabelas `ebike_procurement` e `ebike_trips`.
  - Potes configurados: `ebike_capex`, `ebike_bateria`, `ebike_manutencao`.
  - Configurações globais persistidas no SQLite.
- **`engine_ebike.py`:**
  - `calculate_route_fee()`: cálculo dinâmico com piso de R$ 6,50 e decomposição de CPK.
  - `get_ebike_savings_metrics()`: acompanhamento do aporte de R$ 1.833,00/mês e progresso da meta.
  - `get_ebike_procurement_summary()`: agrupamento por Fase 1 e Fase 2.
  - `record_logistics_trip_and_distribute()`: gravação da saída e distribuição automática nos potes.
- **`ui_app.py`:**
  - Aba interativa `🚲 E-Bike Logística` com acompanhamento visual da meta, calculadora de rotas em tempo real, checklist de compras e histórico de saídas.
- **`test_ebike.py`:**
  - 100% de aprovação nos testes automatizados de modelos, cálculos e segregação.
