"""
Test semplici e leggibili per gli endpoint di health e status.

Scelte di stile:
- Niente helper esterni: payload e asserzioni inline e commentate.
- Codice volutamente esplicito per facilitare la lettura.
"""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_health(client: TestClient):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "OK"}


def test_status_root(client: TestClient):
    resp = client.get("/")
    assert resp.status_code == 200
    body = resp.json()
    # Verifica chiara dei campi attesi
    assert body.get("status") == "OK"
    assert "environment" in body
    assert "debug" in body
