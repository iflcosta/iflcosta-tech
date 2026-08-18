# Modelagem de Dados & Schema do ERP / OS
**Projeto:** IFLCosta Tech
**Objetivo:** Estrutura relacional para gestão de Clientes, Ordens de Serviço (Hardware/Software), Contratos MSP e Financeiro. Compatível com PostgreSQL / SQLite.

## 1. DDL (Data Definition Language) - SQL

```sql
-- 1. Tabela de Clientes (B2C e B2B)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(3) CHECK (type IN ('B2C', 'B2B')) NOT NULL,
    name VARCHAR(255) NOT NULL,
    document VARCHAR(20) UNIQUE NOT NULL, -- CPF ou CNPJ
    whatsapp VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT, -- Importante para Leva-e-Traz
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ordens de Serviço (Work Orders)
CREATE TYPE os_status AS ENUM (
    'Triagem', 'Aguardando Peca', 'Na Bancada', 
    'Teste de Estresse', 'Pronto', 'Entregue', 'Cancelado'
);

CREATE TYPE os_type AS ENUM ('Hardware', 'Software', 'MSP_Avulso');

CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    type os_type NOT NULL,
    status os_status DEFAULT 'Triagem',
    reported_issue TEXT NOT NULL,
    technical_diag TEXT,
    entry_checklist JSONB, -- Ex: {"scratches": true, "charger_included": false, "photos_url": ["url1", "url2"]}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Itens de Serviço e Peças (Service Items & Parts)
CREATE TABLE service_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    is_part BOOLEAN NOT NULL DEFAULT false, -- True se for peca, False se for mao de obra
    cost_price DECIMAL(10, 2) DEFAULT 0.00,
    selling_price DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    -- Margem Liquida calculada como: (selling_price - cost_price - discount)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Contratos Recorrentes (MSP)
CREATE TABLE msp_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    scope TEXT NOT NULL,
    mrr_value DECIMAL(10, 2) NOT NULL, -- Monthly Recurring Revenue
    due_day INT CHECK (due_day BETWEEN 1 AND 31),
    devices_covered INT DEFAULT 1,
    backup_routine_active BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'Ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Livro Caixa / Financeiro (Financial Ledger)
CREATE TYPE transaction_category AS ENUM ('Peca', 'Mao de Obra', 'Infraestrutura', 'Recorrencia_MSP', 'Despesa_Operacional');
CREATE TYPE payment_method AS ENUM ('Pix', 'Cartao_Credito', 'Cartao_Debito', 'Boleto', 'Dinheiro');
CREATE TYPE payment_status AS ENUM ('Pendente', 'Pago', 'Atrasado', 'Estornado');

CREATE TABLE financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id UUID REFERENCES work_orders(id), -- Nullable se for receita MSP ou despesa
    contract_id UUID REFERENCES msp_contracts(id), -- Nullable
    type VARCHAR(10) CHECK (type IN ('Entrada', 'Saida')) NOT NULL,
    category transaction_category NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    method payment_method,
    status payment_status DEFAULT 'Pendente',
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 2. Estrutura de Dados em JSON (Para integrações via API, Firebase ou NoSQL/Baserow)

```json
// Exemplo de Objeto de Ordem de Serviço Expandida
{
  "os_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "client": {
    "name": "João Silva",
    "type": "B2C",
    "whatsapp": "5511999999999"
  },
  "service_type": "Hardware",
  "status": "Aguardando Peca",
  "entry_checklist": {
    "device_model": "Dell Inspiron 15",
    "serial_number": "BR123456XYZ",
    "charger_included": true,
    "aesthetic_damage": "Risco leve na tampa superior",
    "photos": [
      "https://storage.iflcosta.tech/os/a1b2c3d4/foto1.jpg",
      "https://storage.iflcosta.tech/os/a1b2c3d4/foto2.jpg"
    ]
  },
  "items": [
    {
      "type": "Mao de Obra",
      "description": "Limpeza Interna e Troca de Pasta Térmica",
      "cost": 15.00,
      "sell": 150.00
    },
    {
      "type": "Peca",
      "description": "SSD NVMe 1TB Kingston",
      "cost": 320.00,
      "sell": 450.00
    }
  ],
  "financial_summary": {
    "total_cost": 335.00,
    "total_revenue": 600.00,
    "net_margin": 265.00
  }
}
```
