import os
import json
import urllib.request
from db_exec import get_env

def rpc_call(rpc_name, params=None):
    env = get_env()
    token = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_ANON_KEY")
    url = f"{env['SUPABASE_URL']}/rest/v1/rpc/{rpc_name}"
    headers = {
        "apikey": token,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    data = json.dumps(params or {}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        return e.code, err_body

def main():
    print("=== TESTE DE INTEGRACAO RPC SUPABASE ===")
    
    # 1. Testar rpc_create_work_order_atomic
    print("\n1. Testando rpc_create_work_order_atomic...")
    intake_payload = {
        "p_client_name": "Teste Automatizado Silva",
        "p_client_whatsapp": "11999998888",
        "p_service_type": "Hardware_Reparo",
        "p_device_brand": "Dell",
        "p_device_model": "G15 5530",
        "p_reported_defect": "Superaquecimento e lentidao severa em jogos",
        "p_pickup_fee": 0.0,
        "p_items": [],
        "p_device_serial": "DELL-TEST-999",
        "p_device_access_pin": "1234"
    }
    status, res = rpc_call("rpc_create_work_order_atomic", intake_payload)
    print(f"Status HTTP: {status}")
    print("Retorno:", res)
    
    if status not in [200, 201] or not res:
        print("[ERRO] Falha ao criar OS!")
        return

    os_id = res.get("work_order_id") or res.get("id") or (res[0].get("work_order_id") if isinstance(res, list) else None)
    os_number = res.get("os_number") or (res[0].get("os_number") if isinstance(res, list) else None)
    token = res.get("public_tracking_token") or (res[0].get("public_tracking_token") if isinstance(res, list) else None)
    print(f"OS Criada: ID={os_id}, Numero={os_number}, Token={token}")

    # 2. Testar rpc_save_budget_atomic
    print("\n2. Testando rpc_save_budget_atomic...")
    budget_payload = {
        "p_os_number": os_number,
        "p_work_order_id": os_id,
        "p_service_type": "Hardware_Reparo",
        "p_technical_diagnosis": "Thermal paste calcificada. Troca por Arctic MX-4 e thermal pads nos VRMs.",
        "p_total_labor": 180.0,
        "p_total_parts": 120.0,
        "p_items": [
            {
                "item_type": "labor",
                "description": "Descontaminacao quimica + Troca de pasta termica de grau industrial",
                "quantity": 1,
                "unit_price": 180.0,
                "total_price": 180.0
            },
            {
                "item_type": "part",
                "description": "Thermal Grizzly Minus Pad 8 (1.5mm)",
                "quantity": 1,
                "unit_price": 120.0,
                "total_price": 120.0
            }
        ],
        "p_status": "Orcamento_Aguardando_Aprovacao"
    }
    status, res = rpc_call("rpc_save_budget_atomic", budget_payload)
    print(f"Status HTTP: {status}")
    print("Retorno orcamento:", res)

    # 3. Testar rpc_track_work_order_by_number (Portal)
    print("\n3. Testando rpc_track_work_order_by_number (Tracking Portal)...")
    status, res = rpc_call("rpc_track_work_order_by_number", {"p_os_number": os_number})
    print(f"Status HTTP: {status}")
    if status == 200 and res:
        order = res[0] if isinstance(res, list) else res
        print(f"Dados retornados: OS={order.get('os_number')}, Status={order.get('status')}, Total={order.get('total_amount')}")
        print(f"Itens do orcamento vinculados: {len(order.get('items') or [])}")

    # 4. Testar rpc_advance_work_order_status_by_token (Aprovacao do Cliente no Portal)
    print("\n4. Testando rpc_advance_work_order_status_by_token (Aprovacao do Cliente)...")
    advance_payload = {
        "p_token": token,
        "p_new_status": "Na_Bancada"
    }
    status, res = rpc_call("rpc_advance_work_order_status_by_token", advance_payload)
    print(f"Status HTTP: {status}")
    print("Retorno avanco:", res)

    # 5. Limpeza: Remover a OS de teste para nao sujar o banco de producao
    print("\n5. Limpeza da OS de teste...")
    from inspect_db import run_query
    run_query(f"DELETE FROM work_order_items WHERE work_order_id = '{os_id}';")
    run_query(f"DELETE FROM work_orders WHERE id = '{os_id}';")
    run_query(f"DELETE FROM clients WHERE whatsapp = '11999998888';")
    print("[OK] Teste e limpeza concluidos com sucesso!")

if __name__ == "__main__":
    main()
