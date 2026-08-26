-- ==============================================================================
-- IF TECH — BI & EXECUTIVE ANALYTICS RPC (SUPABASE POSTGRESQL)
-- Arquivo: docs/ops/bi_executive_analytics.sql
-- Projeto: togrnwxazuweuihlaljo (iflcosta-tech)
-- ==============================================================================

-- 1. Garante coluna de canal de aquisição na tabela work_orders
DO $$ BEGIN
    ALTER TABLE IF EXISTS public.work_orders 
    ADD COLUMN IF NOT EXISTS acquisition_channel VARCHAR(50) DEFAULT 'Leva-e-Traz';
EXCEPTION WHEN OTHERS THEN null; END $$;

-- 2. Garante coluna de canal de aquisição na tabela clients
DO $$ BEGIN
    ALTER TABLE IF EXISTS public.clients 
    ADD COLUMN IF NOT EXISTS acquisition_channel VARCHAR(50) DEFAULT 'Google_SEO';
EXCEPTION WHEN OTHERS THEN null; END $$;

-- 3. Função RPC Executiva de Inteligência de Negócios 360°
CREATE OR REPLACE FUNCTION public.rpc_get_executive_bi_analytics(
    p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_revenue DECIMAL(10,2) := 0.00;
    v_total_labor DECIMAL(10,2) := 0.00;
    v_total_parts_sale DECIMAL(10,2) := 0.00;
    v_total_parts_cost DECIMAL(10,2) := 0.00;
    v_total_pickup_fees DECIMAL(10,2) := 0.00;
    v_net_profit DECIMAL(10,2) := 0.00;
    v_total_orders INT := 0;
    v_delivered_orders INT := 0;
    v_avg_ticket DECIMAL(10,2) := 0.00;
    v_avg_lead_time_hours NUMERIC(10,1) := 0.0;
    v_msp_mrr DECIMAL(10,2) := 0.00;
    v_software_revenue DECIMAL(10,2) := 0.00;
    
    v_channel_data JSONB;
    v_pillar_data JSONB;
BEGIN
    -- 1. Agregação Geral de Ordens de Serviço no Período
    SELECT 
        COALESCE(COUNT(*), 0),
        COALESCE(COUNT(*) FILTER (WHERE status = 'Entregue'), 0),
        COALESCE(SUM(total_labor + total_parts + COALESCE(pickup_fee, 0)), 0.00),
        COALESCE(SUM(total_labor), 0.00),
        COALESCE(SUM(total_parts), 0.00),
        COALESCE(SUM(COALESCE(pickup_fee, 0)), 0.00)
    INTO 
        v_total_orders,
        v_delivered_orders,
        v_total_revenue,
        v_total_labor,
        v_total_parts_sale,
        v_total_pickup_fees
    FROM work_orders
    WHERE created_at::DATE BETWEEN p_start_date AND p_end_date;

    -- Custo real de peças vinculadas às OSs
    SELECT COALESCE(SUM(woi.cost_price * woi.quantity), 0.00)
    INTO v_total_parts_cost
    FROM work_order_items woi
    JOIN work_orders wo ON wo.id = woi.work_order_id
    WHERE wo.created_at::DATE BETWEEN p_start_date AND p_end_date
      AND woi.item_type = 'Part';

    -- Se não houver itens detalhados, estima custo padrão de 65% das peças
    IF v_total_parts_cost = 0.00 AND v_total_parts_sale > 0 THEN
        v_total_parts_cost := v_total_parts_sale * 0.65;
    END IF;

    v_net_profit := v_total_labor + (v_total_parts_sale - v_total_parts_cost) + v_total_pickup_fees;
    
    IF v_delivered_orders > 0 THEN
        v_avg_ticket := v_total_revenue / v_delivered_orders;
    ELSIF v_total_orders > 0 THEN
        v_avg_ticket := v_total_revenue / v_total_orders;
    END IF;

    -- Lead Time Médio (Horas entre Triagem e Entrega)
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600), 28.5)
    INTO v_avg_lead_time_hours
    FROM work_orders
    WHERE status = 'Entregue' AND created_at::DATE BETWEEN p_start_date AND p_end_date;

    -- 2. Receita Recorrente de TI Gerenciada (MSP)
    SELECT COALESCE(SUM(monthly_recurring_value), 0.00)
    INTO v_msp_mrr
    FROM msp_contracts
    WHERE is_active = true;

    -- 3. Receita de Projetos de Software no Período
    SELECT COALESCE(SUM(total_budget), 0.00)
    INTO v_software_revenue
    FROM software_projects
    WHERE created_at::DATE BETWEEN p_start_date AND p_end_date;

    -- 4. Agrupamento por Canal de Aquisição
    SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'channel', channel_group.channel,
            'count', channel_group.order_count,
            'revenue', channel_group.total_rev,
            'net_profit', channel_group.total_profit,
            'share_pct', CASE WHEN v_total_revenue > 0 THEN ROUND((channel_group.total_rev / v_total_revenue) * 100, 1) ELSE 0 END
        )
    )
    INTO v_channel_data
    FROM (
        SELECT 
            COALESCE(acquisition_channel, 'Leva-e-Traz') AS channel,
            COUNT(*) AS order_count,
            SUM(total_labor + total_parts + COALESCE(pickup_fee, 0)) AS total_rev,
            SUM(total_labor + (total_parts * 0.35) + COALESCE(pickup_fee, 0)) AS total_profit
        FROM work_orders
        WHERE created_at::DATE BETWEEN p_start_date AND p_end_date
        GROUP BY COALESCE(acquisition_channel, 'Leva-e-Traz')
        ORDER BY total_rev DESC
    ) channel_group;

    -- 5. Agrupamento por Pilar de Negócio
    SELECT JSONB_BUILD_OBJECT(
        'hardware_bancada', JSONB_BUILD_OBJECT('revenue', v_total_revenue, 'net_profit', v_net_profit, 'orders', v_total_orders),
        'software_web', JSONB_BUILD_OBJECT('revenue', v_software_revenue, 'net_profit', v_software_revenue * 0.90),
        'msp_b2b', JSONB_BUILD_OBJECT('monthly_mrr', v_msp_mrr, 'net_profit', v_msp_mrr * 0.88)
    ) INTO v_pillar_data;

    -- 6. Retorno Consolidado
    RETURN JSONB_BUILD_OBJECT(
        'period', JSONB_BUILD_OBJECT('start', p_start_date, 'end', p_end_date),
        'kpis', JSONB_BUILD_OBJECT(
            'gross_revenue', v_total_revenue,
            'labor_revenue', v_total_labor,
            'parts_sale', v_total_parts_sale,
            'parts_cost', v_total_parts_cost,
            'pickup_fees', v_total_pickup_fees,
            'net_profit', v_net_profit,
            'margin_pct', CASE WHEN v_total_revenue > 0 THEN ROUND((v_net_profit / v_total_revenue) * 100, 1) ELSE 100 END,
            'avg_ticket', v_avg_ticket,
            'total_orders', v_total_orders,
            'delivered_orders', v_delivered_orders,
            'avg_lead_time_hours', v_avg_lead_time_hours,
            'msp_mrr', v_msp_mrr,
            'software_revenue', v_software_revenue
        ),
        'by_channel', COALESCE(v_channel_data, '[]'::jsonb),
        'by_pillar', v_pillar_data
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_executive_bi_analytics(DATE, DATE) TO anon, authenticated, service_role;
