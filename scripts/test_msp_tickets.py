import urllib.request
import json
from db_exec import get_env

def main():
    env = get_env()
    url = f"{env['SUPABASE_URL']}/rest/v1/msp_tickets"
    token = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_ANON_KEY")
    headers = {
        "apikey": token,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    test_ticket = {
        "ticket_number": "TK-TEST-999",
        "title": "Chamado Teste Integracao",
        "description": "Validando gravacao de tickets MSP no Supabase",
        "priority": "Alta",
        "status": "Aberto",
        "origin": "Portal_Cliente"
    }

    req = urllib.request.Request(url, data=json.dumps(test_ticket).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        print("Ticket creation status:", resp.status)

    # Verify
    req_get = urllib.request.Request(f"{url}?ticket_number=eq.TK-TEST-999", headers=headers, method="GET")
    with urllib.request.urlopen(req_get) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print("Ticket verified in DB:", data[0]["ticket_number"], "-", data[0]["title"])

    # Cleanup
    req_del = urllib.request.Request(f"{url}?ticket_number=eq.TK-TEST-999", headers=headers, method="DELETE")
    with urllib.request.urlopen(req_del) as resp:
        print("Ticket cleanup status:", resp.status)

    print("MSP Tickets integration verified successfully!")

if __name__ == "__main__":
    main()
