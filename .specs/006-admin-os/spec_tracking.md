# Spec Complementar: Rastreamento Público de OS & Automação de WhatsApp (Fase 2 / 3)

Este documento apresenta a especificação técnica para o sistema de acompanhamento público do progresso de reparos em tempo real pelo cliente e a automação de notificações via WhatsApp (100% serverless, sem necessidade de VPS).

---

## 1. Arquitetura Serverless de WhatsApp (Sem Manutenção de Servidor)

Para um modelo de negócio solo e ágil, manter uma VPS dedicada apenas para APIs de WhatsApp é um ponto crítico de falha e manutenção. A arquitetura proposta utiliza um fluxo **Event-Driven Serverless**:

### O Fluxo: Supabase Webhooks ➔ Make.com ➔ Meta Cloud API (ou Gateway SaaS)

```
[Iago Painel Admin] 
       │ (Muda status no painel)
       ▼
[Supabase Database] ➔ (Dispara Webhook nativo com token_publico)
       │
       ▼
[Make.com (Serverless Router)]
       │ (Processa variáveis, formata a mensagem em pt-BR)
       ▼
[WhatsApp Cloud API (Meta) ou Gateway SaaS (ex: Z-API / API-Brasil)]
       │
       ▼
[Celular do Cliente] (Recebe a mensagem formatada com o link de acompanhamento)
```

### Viabilidade e Custos
* **Plataforma Integradora (Make.com):** O plano gratuito oferece **1.000 operações por mês**. Como cada mudança de status gasta cerca de 3 operações, você pode rodar em torno de **300 notificações mensais totalmente de graça**.
* **Motor de Disparo (WhatsApp):**
  * *Opção Oficial Meta:* O primeiro bloco de **1.000 conversas iniciadas por clientes** é gratuito. Para as notificações ativas (iniciadas por nós), a taxa cobrada pela Meta na categoria *Utilidade* (Utility) no Brasil é de aproximadamente **R$ 0,15 a R$ 0,18 por conversa de 24 horas**. É extremamente profissional, seguro e imune a banimentos.
  * *Opção Gateway SaaS:* Assinaturas mensais sem servidor (ex: Z-API por R$ 49-99/mês), onde você escaneia um QR Code e envia mensagens ilimitadas sem custos por envio.

---

## 2. Regras de Notificação: Ativa (Mensagem) vs. Silenciosa (Apenas Link)

Para evitar spamar o cliente com micro-atualizações, mas manter total transparência, dividimos a comunicação em dois canais:

| Status da OS | Notificação Celular? | O que o cliente recebe no celular? | O que o cliente vê na página web? |
| :--- | :--- | :--- | :--- |
| `recebido` | **Ativa** | 🔔 E-mail/WhatsApp com boas-vindas e **link de acompanhamento único**. | **Aparelho recebido** na bancada de triagem. |
| `em_analise` | *Silenciosa* | Nenhuma mensagem. | **Em análise técnica** (exibe status e horário do início da análise). |
| `orcamento_pendente` | **Ativa** | 🔔 Link de orçamento detalhado para aprovação rápida em 1 clique. | **Orçamento pronto**, aguardando aprovação online. |
| `orcamento_aprovado` | *Silenciosa* | Nenhuma mensagem. | **Aprovado!** Preparando bancada para início do conserto. |
| `trabalho_iniciado` | **Ativa** | 🔔 *"Seu conserto foi iniciado!"* (Dispara o sentimento de trabalho em andamento). | **Em bancada: Conserto ativo** (exibe data e hora de início). |
| `aguardando_peca` | **Ativa** | 🔔 Explica de forma profissional que estamos esperando a peça do fornecedor. | **Aguardando peça** (transparência do motivo e previsão). |
| `em_testes` | *Silenciosa* | Nenhuma mensagem. | **Conserto finalizado!** Aparelho em testes rigorosos de qualidade. |
| `pronto` | **Ativa** | 🔔 *"Ótimas notícias! Seu aparelho está pronto para retirada!"* | **Dispositivo pronto** com resumo da garantia e endereço físico. |
| `entregue` | **Ativa** | 🔔 Agradecimento pós-venda + Link de avaliação do Google Business. | **Finalizado** (arquivado, com histórico total). |

---

## 3. Modelagem de Dados PostgreSQL: Histórico e Cálculo de Tempos

Para calcular com precisão matemática o tempo exato em cada status sem depender de controle manual de planilhas ou Javascript do cliente, o banco de dados Supabase cuidará de tudo através de um gatilho de transição e do tipo `INTERVAL` nativo do Postgres.

### Schema Relacional de OS e Histórico

```sql
-- 1. Enum com os estados reais de bancada
CREATE TYPE status_os_enum AS ENUM (
  'recebido',
  'em_analise',
  'orcamento_pendente',
  'orcamento_aprovado',
  'orcamento_reprovado',
  'trabalho_iniciado',
  'aguardando_peca',
  'em_testes',
  'pronto',
  'entregue',
  'cancelado'
);

-- 2. Tabela Principal de OS com Token Seguro Não Adivinhável
CREATE TABLE ordens_servico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_tracking VARCHAR(20) UNIQUE NOT NULL, -- Ex: OS-2026-X892
  cliente_nome VARCHAR(255) NOT NULL,
  cliente_whatsapp VARCHAR(20) NOT NULL,
  aparelho_modelo VARCHAR(255) NOT NULL,
  aparelho_serial VARCHAR(100),
  descricao_problema TEXT,
  valor_total DECIMAL(10, 2) DEFAULT 0.00,
  status_atual status_os_enum NOT NULL DEFAULT 'recebido',
  token_publico UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(), -- Utilizado na URL pública
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tabela de Linha do Tempo e Duração por Etapa
CREATE TABLE historico_status_os (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  os_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  status status_os_enum NOT NULL,
  data_entrada TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  data_saida TIMESTAMP WITH TIME ZONE,
  duracao INTERVAL, -- Formato Postgres ideal para manipulação de tempo decorrido
  observacoes TEXT,
  alterado_por VARCHAR(255) DEFAULT 'Sistema' NOT NULL
);
```

### Trigger de Transição Automática de Status
Quando o status da OS for atualizado, esta Trigger finaliza a etapa anterior, calcula a diferença de tempo (`data_saida - data_entrada`) e abre o novo registro de histórico.

```sql
CREATE OR REPLACE FUNCTION gerenciar_transicao_status_os()
RETURNS TRIGGER AS $$
DECLARE
  v_historico_anterior_id UUID;
  v_now TIMESTAMP WITH TIME ZONE := TIMEZONE('utc'::text, NOW());
BEGIN
  -- Na criação da OS, inicializa o primeiro status no histórico
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO historico_status_os (os_id, status, data_entrada, alterado_por)
    VALUES (NEW.id, NEW.status_atual, NEW.created_at, 'Sistema');
    RETURN NEW;
  END IF;

  -- Se o status mudou, fecha o anterior e abre o novo
  IF (TG_OP = 'UPDATE' AND OLD.status_atual IS DISTINCT FROM NEW.status_atual) THEN
    SELECT id INTO v_historico_anterior_id
    FROM historico_status_os
    WHERE os_id = NEW.id AND data_saida IS NULL
    ORDER BY data_entrada DESC
    LIMIT 1;

    -- Fecha o histórico anterior e calcula duracao
    IF v_historico_anterior_id IS NOT NULL THEN
      UPDATE historico_status_os
      SET 
        data_saida = v_now,
        duracao = v_now - data_entrada
      WHERE id = v_historico_anterior_id;
    END IF;

    -- Cria o novo registro para o novo status
    INSERT INTO historico_status_os (os_id, status, data_entrada, alterado_por)
    VALUES (NEW.id, NEW.status_atual, v_now, 'Sistema');

    NEW.updated_at = v_now;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vincula a trigger
CREATE TRIGGER trg_os_mudanca_status
AFTER INSERT OR UPDATE OF status_atual ON ordens_servico
FOR EACH ROW
EXECUTE FUNCTION gerenciar_transicao_status_os();
```

### Formatação de Duração (PT-BR) amigável
Função auxiliar para exibir o tempo de permanência no formato legível na página web (ex: *"2 dias e 4 horas"* ou *"menos de 1 minuto"*).

```sql
CREATE OR REPLACE FUNCTION formatar_intervalo_ptbr(intervalo INTERVAL)
RETURNS TEXT AS $$
DECLARE
  dias INT;
  horas INT;
  minutos INT;
  resultado TEXT := '';
BEGIN
  dias := EXTRACT(DAY FROM intervalo);
  horas := EXTRACT(HOUR FROM intervalo);
  minutos := EXTRACT(MINUTE FROM intervalo);

  IF dias > 0 THEN
    resultado := resultado || dias || ' dia(s)';
  END IF;

  IF horas > 0 THEN
    IF resultado <> '' THEN resultado := resultado || ', '; END IF;
    resultado := resultado || horas || ' hora(s)';
  END IF;

  IF minutos > 0 THEN
    IF resultado <> '' THEN resultado := resultado || ' e '; END IF;
    resultado := resultado || minutos || ' minuto(s)';
  END IF;

  IF resultado = '' THEN
    resultado := 'menos de 1 minuto';
  END IF;

  RETURN resultado;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Segurança de Dados (LGPD)

Para evitar vazamentos de informações sensíveis ou de dados pessoais de clientes na rota de rastreamento pública, utilizaremos **PostgreSQL Views** e aplicaremos **Row Level Security (RLS)**:

* **View Mascarada:** A View Pública nunca retornará dados sensíveis como o telefone, endereço ou e-mail do cliente. O nome do cliente é mascarado automaticamente pelo banco (ex: *"Iago Costa"* vira *"I*** Costa"*).
* **Filtro por Token:** A View só permite a leitura caso o usuário possua o `token_publico` (UUID v4 não adivinhável) gerado aleatoriamente e enviado exclusivamente ao e-mail/WhatsApp do cliente.

---

## 5. UI/UX: A Interface de Acompanhamento Pública

* **Visual Premium Dark:** Fundo ardósia profundo (`bg-slate-950`), cards com bordas sutis e um brilho leve nas bordas.
* **Barra de Progresso Visual:** Mostra o caminho da OS de forma linear e didática. Os passos concluídos ganham um visual verde-esmeralda com checkmarks. O passo atual brilha em roxo-indigo e pulsa de forma interativa.
* **Timeline Detalhada:** Mostra de trás para frente todos os estados pelos quais o aparelho passou. Cada linha indica:
  1. **Data e Hora** da alteração.
  2. **Status Amigável** (ex: *"Higienização & Testes Finais"*).
  3. **Tempo de Permanência** (ex: `⏱️ Permaneceu nessa etapa por 1 dia e 3 horas`).
  4. **Notas do Técnico:** Caixa informativa com mensagens livres escritas por você para passar total transparência (ex: *"Efetuando troca do CI de carga Tristar"*).
