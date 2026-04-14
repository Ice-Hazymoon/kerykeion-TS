"""
Test per l'endpoint `compatibility-score`.

Verifiche:
- Risposta 200 con struttura semplice (status, score, aspects, chart_data).
- `score` numerico, `aspects` lista non vuota con campi minimi.
- `chart_data` coerente con Synastry e contiene house_comparison e relationship_score.
"""

from __future__ import annotations

from copy import deepcopy
from typing import Dict

from fastapi.testclient import TestClient


ROME_SUBJECT: Dict[str, object] = {
    "name": "FastAPI Unit Test",
    "year": 1946,
    "month": 6,
    "day": 16,
    "hour": 10,
    "minute": 10,
    "longitude": 12.4963655,
    "latitude": 41.9027835,
    "city": "Roma",
    "nation": "IT",
    "timezone": "Europe/Rome",
}


def test_compatibility_score(client: TestClient):
    payload = {"first_subject": deepcopy(ROME_SUBJECT), "second_subject": deepcopy(ROME_SUBJECT)}
    resp = client.post("/api/v5/compatibility-score", json=payload)
    assert resp.status_code == 200
    body = resp.json()

    assert body["status"] == "OK"
    assert isinstance(body["score"], (int, float))

    # Aspects minimi
    aspects = body["aspects"]
    assert isinstance(aspects, list) and aspects
    for asp in aspects:
        assert {"p1_name", "p2_name", "aspect"} <= asp.keys()

    # Score breakdown
    score_breakdown = body["score_breakdown"]
    assert isinstance(score_breakdown, list)
    if score_breakdown:
        for item in score_breakdown:
            assert {"rule", "description", "points", "details"} <= item.keys()

    # Chart data coerenti
    data = body["chart_data"]
    assert data["chart_type"] == "Synastry"
    assert data.get("house_comparison") not in (None, [], {})
    score = data.get("relationship_score")
    assert isinstance(score, dict)
    assert score.get("score_value") is not None
