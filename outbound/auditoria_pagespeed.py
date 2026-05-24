"""Auditoria de PageSpeed Insights e geração de mensagem fria por vertical.

Uso:
    python outbound/auditoria_pagespeed.py exemplo.com.br --vertical imobiliaria

Saída padrão: JSON com domínio, vertical, timestamp, métricas (LCP, CLS,
Speed Index, score 0-100) e mensagem fria pronta para WhatsApp/email.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import os
import sys
from typing import Any

import requests

PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
TIMEOUT_SECONDS = 30

VERTICAIS_VALIDAS = ("imobiliaria", "clinica", "comercio", "outras")


class PageSpeedError(RuntimeError):
    """Erro ao chamar o PageSpeed Insights ou ao processar seu payload."""


def fetch_pagespeed(domain: str, api_key: str | None = None) -> dict[str, Any]:
    """Chama a API pública do PageSpeed Insights (estratégia mobile)."""
    url = domain if domain.startswith(("http://", "https://")) else f"https://{domain}"
    params: dict[str, str] = {
        "url": url,
        "strategy": "mobile",
        "category": "performance",
    }
    if api_key:
        params["key"] = api_key

    try:
        resp = requests.get(PSI_ENDPOINT, params=params, timeout=TIMEOUT_SECONDS)
    except requests.exceptions.Timeout as exc:
        raise PageSpeedError(f"timeout ao consultar PageSpeed para {domain}") from exc
    except requests.exceptions.RequestException as exc:
        raise PageSpeedError(f"erro de rede ao consultar PageSpeed: {exc}") from exc

    if resp.status_code != 200:
        raise PageSpeedError(
            f"PageSpeed devolveu status {resp.status_code} para {domain}"
        )
    return resp.json()


def extract_metrics(payload: dict[str, Any]) -> dict[str, float | int]:
    """Extrai LCP, CLS, Speed Index e score do payload do Lighthouse."""
    try:
        lh = payload["lighthouseResult"]
        score = lh["categories"]["performance"]["score"]
        audits = lh["audits"]
        lcp_ms = audits["largest-contentful-paint"]["numericValue"]
        cls = audits["cumulative-layout-shift"]["numericValue"]
        si_ms = audits["speed-index"]["numericValue"]
    except KeyError as exc:
        raise PageSpeedError(f"payload do PageSpeed sem o campo {exc}") from exc

    return {
        "performance_score": round(score * 100),
        "lcp_seconds": round(lcp_ms / 1000, 1),
        "cls": round(cls, 2),
        "speed_index_seconds": round(si_ms / 1000, 1),
    }


COLD_TEMPLATES: dict[str, str] = {
    "imobiliaria": (
        "Iago aqui, automação com IA para imobiliárias em Bragança. "
        "Rodei uma auditoria no {domain}: carrega em {lcp}s no celular "
        "(o ideal é < 2,5s) e tirou {score}/100 no PageSpeed do Google. "
        "Cada segundo desses derruba lead que veio do ZAP ou da OLX antes "
        "mesmo de ver o imóvel. Posso te mostrar em 10 minutos como "
        "recuperar isso? Sem compromisso."
    ),
    "clinica": (
        "Iago aqui, automação com IA para clínicas em Bragança. Auditei o "
        "{domain}: carrega em {lcp}s no celular (ideal < 2,5s) e tirou "
        "{score}/100 no PageSpeed. Paciente que espera o site abrir desiste "
        "e busca outra clínica. Posso te mostrar em 10 minutos como reduzir "
        "no-show e ter agendamento e confirmação automática no WhatsApp? "
        "Sem compromisso."
    ),
    "comercio": (
        "Iago aqui, automação com IA para comércios em Bragança. Auditei o "
        "{domain}: {lcp}s pra carregar no celular (ideal < 2,5s), "
        "{score}/100 no PageSpeed. Cliente de carrinho abandonado some por "
        "demora e falta de resposta. Posso te mostrar em 10 minutos como "
        "recuperar essas vendas direto no WhatsApp? Sem compromisso."
    ),
    "outras": (
        "Iago aqui, automação com IA para PMEs em Bragança. Rodei uma "
        "auditoria no {domain}: carrega em {lcp}s no celular (ideal < 2,5s) "
        "e tirou {score}/100 no PageSpeed do Google. Esse atrito custa "
        "cliente todo dia. Posso te mostrar em 10 minutos como fechar essa "
        "porta de saída? Sem compromisso."
    ),
}


def render_cold_message(
    metrics: dict[str, Any], vertical: str, domain: str
) -> str:
    """Renderiza a mensagem fria por vertical, com os números reais da auditoria."""
    if vertical not in COLD_TEMPLATES:
        raise PageSpeedError(
            f"vertical desconhecida: {vertical} (válidas: {VERTICAIS_VALIDAS})"
        )
    return COLD_TEMPLATES[vertical].format(
        domain=domain,
        lcp=_format_seg(metrics["lcp_seconds"]),
        score=metrics["performance_score"],
    )


def _format_seg(value: float) -> str:
    return str(value).replace(".", ",")


def generate_report(
    domain: str,
    vertical: str = "outras",
    api_key: str | None = None,
) -> dict[str, Any]:
    """Orquestra fetch + extract + render e devolve o relatório JSON."""
    payload = fetch_pagespeed(domain, api_key=api_key)
    metrics = extract_metrics(payload)
    message = render_cold_message(metrics, vertical, domain)
    return {
        "domain": domain,
        "vertical": vertical,
        "timestamp": _dt.datetime.now(_dt.UTC).isoformat(timespec="seconds"),
        "metrics": metrics,
        "message": message,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("domain", help="domínio a auditar (ex.: exemplo.com.br)")
    parser.add_argument(
        "--vertical",
        choices=VERTICAIS_VALIDAS,
        default="outras",
        help="vertical para o template da mensagem fria (default: outras)",
    )
    parser.add_argument(
        "--format",
        choices=("json", "message"),
        default="json",
        help="json: relatório completo (default); message: só o cold outreach",
    )
    parser.add_argument(
        "--api-key",
        default=os.getenv("PAGESPEED_API_KEY"),
        help="chave da API do PageSpeed (default: env PAGESPEED_API_KEY)",
    )
    args = parser.parse_args(argv)

    try:
        report = generate_report(args.domain, args.vertical, args.api_key)
    except PageSpeedError as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        return 1

    if args.format == "message":
        print(report["message"])
    else:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
