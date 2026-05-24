"""Testes adversariais de outbound/auditoria_pagespeed.py — @SkepticalQA."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import Mock, patch

import pytest
import requests

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from outbound.auditoria_pagespeed import (  # noqa: E402
    PageSpeedError,
    extract_metrics,
    fetch_pagespeed,
    generate_report,
    render_cold_message,
)

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def psi_ok() -> dict:
    return json.loads((FIXTURES / "psi_response_ok.json").read_text())


# ---------- extract_metrics ----------

def test_extract_metrics_valid_payload(psi_ok):
    m = extract_metrics(psi_ok)
    assert m["performance_score"] == 42
    assert m["lcp_seconds"] == 4.3
    assert m["cls"] == 0.18
    assert m["speed_index_seconds"] == 5.1


def test_extract_metrics_missing_fields_raises():
    with pytest.raises(PageSpeedError):
        extract_metrics({"lighthouseResult": {}})


def test_extract_metrics_payload_completamente_vazio():
    with pytest.raises(PageSpeedError):
        extract_metrics({})


# ---------- fetch_pagespeed ----------

@patch("outbound.auditoria_pagespeed.requests.get")
def test_fetch_pagespeed_timeout(mock_get):
    mock_get.side_effect = requests.exceptions.Timeout()
    with pytest.raises(PageSpeedError, match="timeout"):
        fetch_pagespeed("exemplo.com.br")


@patch("outbound.auditoria_pagespeed.requests.get")
def test_fetch_pagespeed_status_429(mock_get):
    mock_get.return_value = Mock(status_code=429, text="Rate limit")
    with pytest.raises(PageSpeedError, match="429"):
        fetch_pagespeed("exemplo.com.br")


@patch("outbound.auditoria_pagespeed.requests.get")
def test_fetch_pagespeed_status_500(mock_get):
    mock_get.return_value = Mock(status_code=500, text="erro")
    with pytest.raises(PageSpeedError, match="500"):
        fetch_pagespeed("exemplo.com.br")


@patch("outbound.auditoria_pagespeed.requests.get")
def test_fetch_pagespeed_erro_de_rede(mock_get):
    mock_get.side_effect = requests.exceptions.ConnectionError("dns falhou")
    with pytest.raises(PageSpeedError, match="rede"):
        fetch_pagespeed("nao.existe.localhost")


@patch("outbound.auditoria_pagespeed.requests.get")
def test_fetch_pagespeed_prefixa_https(mock_get, psi_ok):
    mock_get.return_value = Mock(status_code=200, json=Mock(return_value=psi_ok))
    fetch_pagespeed("exemplo.com.br")
    params = mock_get.call_args.kwargs["params"]
    assert params["url"] == "https://exemplo.com.br"
    assert params["strategy"] == "mobile"


@patch("outbound.auditoria_pagespeed.requests.get")
def test_fetch_pagespeed_inclui_api_key_se_fornecida(mock_get, psi_ok):
    mock_get.return_value = Mock(status_code=200, json=Mock(return_value=psi_ok))
    fetch_pagespeed("exemplo.com.br", api_key="ABC123")
    params = mock_get.call_args.kwargs["params"]
    assert params["key"] == "ABC123"


# ---------- render_cold_message ----------

@pytest.mark.parametrize("vertical", ["imobiliaria", "clinica", "comercio", "outras"])
def test_render_cold_message_contem_dominio_lcp_score(vertical):
    metrics = {
        "lcp_seconds": 4.3,
        "cls": 0.18,
        "speed_index_seconds": 5.1,
        "performance_score": 42,
    }
    msg = render_cold_message(metrics, vertical, "exemplo.com.br")
    assert "exemplo.com.br" in msg
    assert "4,3" in msg
    assert "42" in msg


def test_render_cold_message_vertical_invalida():
    with pytest.raises(PageSpeedError, match="vertical"):
        render_cold_message(
            {"lcp_seconds": 3, "performance_score": 50},
            "academia",
            "exemplo.com.br",
        )


def test_render_cold_message_imobiliaria_menciona_portal_ou_imovel():
    msg = render_cold_message(
        {"lcp_seconds": 4.3, "performance_score": 42},
        "imobiliaria",
        "x.com.br",
    ).lower()
    assert any(t in msg for t in ("zap", "olx", "imóvel", "imovel"))


def test_render_cold_message_clinica_menciona_paciente_ou_agendamento():
    msg = render_cold_message(
        {"lcp_seconds": 4.3, "performance_score": 42},
        "clinica",
        "x.com.br",
    ).lower()
    assert any(t in msg for t in ("paciente", "agendamento", "consulta", "no-show"))


# ---------- generate_report ----------

@patch("outbound.auditoria_pagespeed.fetch_pagespeed")
def test_generate_report_estrutura_completa(mock_fetch, psi_ok):
    mock_fetch.return_value = psi_ok
    report = generate_report("exemplo.com.br", vertical="clinica")
    assert report["domain"] == "exemplo.com.br"
    assert report["vertical"] == "clinica"
    assert "timestamp" in report
    assert report["metrics"]["lcp_seconds"] == 4.3
    assert report["metrics"]["performance_score"] == 42
    assert "exemplo.com.br" in report["message"]


@patch("outbound.auditoria_pagespeed.fetch_pagespeed")
def test_generate_report_propaga_erro_de_rede(mock_fetch):
    mock_fetch.side_effect = PageSpeedError("timeout")
    with pytest.raises(PageSpeedError):
        generate_report("exemplo.com.br")
