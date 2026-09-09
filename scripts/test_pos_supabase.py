import urllib.request
import json
import os
from db_exec import get_env

def run_supabase_rest(endpoint, method="GET", payload=None, query_params=""):
    env = get_env()
    token = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_ANON_KEY")
    url = f"{env['SUPABASE_URL']}/rest/v1/{endpoint}{query_params}"
    headers = {
        "apikey": token,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    data = json.dumps(payload).encode("utf-8") if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        return e.code, err_body

def main():
    print("=== TESTE DE INTEGRACAO SUPABASE: ESTOQUE & PDV ===")
    
    # 1. Listar produtos reais cadastrados
    print("\n1. Consultando catalogo de produtos no Supabase...")
    st, prods = run_supabase_rest("products", "GET", query_params="?select=*&order=name.asc")
    print(f"Status HTTP: {st}")
    print(f"Total de produtos retornados: {len(prods) if isinstance(prods, list) else 0}")
    if isinstance(prods, list) and len(prods) > 0:
        for p in prods[:3]:
            print(f"  - [{p['sku']}] {p['name']} | Estoque: {p['current_stock']} | R$ {p['selling_price']}")

    # 2. Criar produto de teste
    test_sku = "TEST-SSD-PRO-999"
    print(f"\n2. Criando produto de teste ({test_sku})...")
    test_prod = {
        "sku": test_sku,
        "name": "SSD Teste Integracao 500GB PCIe NVMe",
        "category": "armazenamento",
        "brand": "IF Tech Lab",
        "cost_price": 150.00,
        "selling_price": 280.00,
        "current_stock": 10,
        "reserved_stock": 0,
        "min_stock": 2,
        "ean": "7890000000999"
    }
    st, res_prod = run_supabase_rest("products", "POST", payload=test_prod)
    print(f"Status criacao produto: {st}")
    assert st in [200, 201], f"Erro ao criar produto: {res_prod}"
    print(f"Produto criado com sucesso! Estoque inicial: 10")

    # 3. Simular Venda no PDV (2 unidades vendidas)
    sale_num = "PDV-TEST-9999"
    print(f"\n3. Simulando venda no PDV ({sale_num})...")
    qty_sold = 2
    subtotal = test_prod["selling_price"] * qty_sold
    cost_total = test_prod["cost_price"] * qty_sold
    profit = subtotal - cost_total
    
    sale_payload = {
        "sale_number": sale_num,
        "payment_method": "Pix",
        "subtotal": subtotal,
        "discount": 0.00,
        "total_amount": subtotal,
        "total_cost": cost_total,
        "profit": profit,
        "items": [
            {
                "sku": test_sku,
                "name": test_prod["name"],
                "price": test_prod["selling_price"],
                "cost": test_prod["cost_price"],
                "qty": qty_sold
            }
        ]
    }
    st, res_sale = run_supabase_rest("pos_sales", "POST", payload=sale_payload)
    print(f"Status venda pos_sales: {st}")
    assert st in [200, 201], f"Erro ao registrar venda: {res_sale}"

    # 4. Atualizar estoque de produtos e registrar Kardex
    new_stock = test_prod["current_stock"] - qty_sold
    print(f"Atualizando estoque de {test_sku} para {new_stock}...")
    st, res_update = run_supabase_rest("products", "PATCH", payload={"current_stock": new_stock}, query_params=f"?sku=eq.{test_sku}")
    print(f"Status atualizacao estoque: {st}")

    kardex_payload = {
        "product_sku": test_sku,
        "product_name": test_prod["name"],
        "movement_type": "Saida_PDV_Balcao",
        "quantity": -qty_sold,
        "total_cost": cost_total,
        "doc_ref": f"Cupom {sale_num}",
        "operator": "Teste Automatizado"
    }
    st, res_kardex = run_supabase_rest("inventory_movements", "POST", payload=kardex_payload)
    print(f"Status registro Kardex: {st}")
    assert st in [200, 201], f"Erro ao registrar Kardex: {res_kardex}"

    # 5. Registrar na DRE (financial_ledger)
    ledger_payload = {
        "entry_type": "Entrada",
        "category": "Venda_PDV_Balcao",
        "amount": subtotal,
        "description": f"Venda Balcao PDV {sale_num} (Pix)"
    }
    st, res_ledger = run_supabase_rest("financial_ledger", "POST", payload=ledger_payload)
    print(f"Status registro DRE: {st}")
    assert st in [200, 201], f"Erro ao registrar na DRE: {res_ledger}"

    # 6. Validar consultas
    print("\n4. Verificando consistencia pos-venda...")
    st, updated_prod = run_supabase_rest("products", "GET", query_params=f"?sku=eq.{test_sku}")
    print(f"Estoque verificado no banco: {updated_prod[0]['current_stock']} (esperado: 8)")
    assert updated_prod[0]['current_stock'] == 8, "Divergencia no estoque!"

    # 7. Limpeza dos dados de teste
    print("\n5. Limpeza dos registros de teste...")
    run_supabase_rest("inventory_movements", "DELETE", query_params=f"?product_sku=eq.{test_sku}")
    run_supabase_rest("pos_sales", "DELETE", query_params=f"?sale_number=eq.{sale_num}")
    run_supabase_rest("financial_ledger", "DELETE", query_params=f"?description=like.*{sale_num}*")
    run_supabase_rest("products", "DELETE", query_params=f"?sku=eq.{test_sku}")
    print("[OK] Teste e limpeza de Estoque & PDV concluidos com 100% de sucesso!")

if __name__ == "__main__":
    main()
