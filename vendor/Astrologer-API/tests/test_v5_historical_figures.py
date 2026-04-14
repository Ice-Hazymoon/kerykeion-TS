"""
Test per figure storiche con date di nascita antiche.

Obiettivi:
- Verificare che l'API gestisca correttamente date storiche pre-1900.
- Verificare che date BCE (negative) vengano rifiutate con errore 422.
- Coprire il range esteso 1 CE a 3000 CE.

Nota: Python datetime non supporta anni negativi (BCE), quindi il range
è limitato a 1 CE - 3000 CE nonostante la Swiss Ephemeris supporti date antecedenti.
"""

from __future__ import annotations

from typing import Dict

import pytest
from fastapi.testclient import TestClient


# ============================================================================
# Soggetti storici (tutti CE - dopo Cristo)
# ============================================================================

THOMAS_JEFFERSON: Dict[str, object] = {
    "name": "Thomas Jefferson",
    "year": 1743,
    "month": 4,
    "day": 13,
    "hour": 12,
    "minute": 0,
    "longitude": -78.4767,
    "latitude": 37.2707,
    "city": "Shadwell",
    "nation": "US",
    "timezone": "America/New_York",
}

LEONARDO_DA_VINCI: Dict[str, object] = {
    "name": "Leonardo da Vinci",
    "year": 1452,
    "month": 4,
    "day": 15,
    "hour": 21,
    "minute": 40,
    "longitude": 10.9203,
    "latitude": 43.7833,
    "city": "Vinci",
    "nation": "IT",
    "timezone": "Europe/Rome",
}

CHARLEMAGNE: Dict[str, object] = {
    "name": "Charlemagne",
    "year": 747,  # 747 CE
    "month": 4,
    "day": 2,
    "hour": 12,
    "minute": 0,
    "longitude": 6.0833,
    "latitude": 50.7683,
    "city": "Aachen",
    "nation": "DE",
    "timezone": "Europe/Berlin",
}

CONSTANTINE_THE_GREAT: Dict[str, object] = {
    "name": "Constantine the Great",
    "year": 272,  # 272 CE
    "month": 2,
    "day": 27,
    "hour": 12,
    "minute": 0,
    "longitude": 21.9453,
    "latitude": 43.3209,
    "city": "Naissus",
    "nation": "RS",
    "timezone": "Europe/Belgrade",
}


# ============================================================================
# Test functions
# ============================================================================


def test_thomas_jefferson_1743(client: TestClient):
    """Verifica che Thomas Jefferson (1743) funzioni correttamente."""
    resp = client.post("/api/v5/subject", json={"subject": THOMAS_JEFFERSON})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.json()}"

    payload = resp.json()
    assert payload["status"] == "OK"

    subject = payload["subject"]
    assert subject["name"] == "Thomas Jefferson"

    # Verifica che i pianeti siano calcolati
    for planet in ("sun", "moon", "mercury", "venus", "mars"):
        assert planet in subject
        assert isinstance(subject[planet], dict)
        assert "position" in subject[planet]
        assert subject[planet]["position"] is not None


def test_leonardo_da_vinci_1452(client: TestClient):
    """Verifica che Leonardo da Vinci (1452) funzioni correttamente."""
    resp = client.post("/api/v5/subject", json={"subject": LEONARDO_DA_VINCI})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.json()}"

    payload = resp.json()
    assert payload["status"] == "OK"

    subject = payload["subject"]
    assert subject["name"] == "Leonardo da Vinci"

    # Verifica che i pianeti siano calcolati
    assert "sun" in subject
    assert isinstance(subject["sun"]["position"], (int, float))
    assert 0 <= subject["sun"]["position"] < 360


def test_charlemagne_747(client: TestClient):
    """Verifica che Carlo Magno (747 CE) funzioni correttamente."""
    resp = client.post("/api/v5/subject", json={"subject": CHARLEMAGNE})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.json()}"

    payload = resp.json()
    assert payload["status"] == "OK"

    subject = payload["subject"]
    assert subject["name"] == "Charlemagne"

    # Verifica che i pianeti siano calcolati anche per date medievali
    assert "sun" in subject
    assert isinstance(subject["sun"]["position"], (int, float))
    assert "moon" in subject
    assert isinstance(subject["moon"]["position"], (int, float))


def test_constantine_272(client: TestClient):
    """Verifica che Costantino il Grande (272 CE) funzioni correttamente.

    Questo test verifica il funzionamento con date molto antiche,
    vicine all'inizio dell'era volgare.
    """
    resp = client.post("/api/v5/subject", json={"subject": CONSTANTINE_THE_GREAT})
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.json()}"

    payload = resp.json()
    assert payload["status"] == "OK"

    subject = payload["subject"]
    assert subject["name"] == "Constantine the Great"

    # Verifica che le posizioni planetarie siano valide
    assert "sun" in subject
    assert "moon" in subject
    sun_pos = subject["sun"]["position"]
    moon_pos = subject["moon"]["position"]

    # Posizioni devono essere tra 0 e 360 gradi
    assert isinstance(sun_pos, (int, float)) and 0 <= sun_pos < 360
    assert isinstance(moon_pos, (int, float)) and 0 <= moon_pos < 360


def test_bce_dates_rejected_with_422(client: TestClient):
    """Verifica che le date BCE (anni negativi) vengano rifiutate con errore 422.

    Python datetime non supporta anni negativi, quindi l'API
    deve restituire un errore di validazione per queste richieste.
    """
    julius_caesar = {
        "name": "Gaius Julius Caesar",
        "year": -100,  # 100 BCE - non supportato
        "month": 7,
        "day": 12,
        "hour": 12,
        "minute": 0,
        "longitude": 12.4964,
        "latitude": 41.9028,
        "city": "Roma",
        "nation": "IT",
        "timezone": "Europe/Rome",
    }

    resp = client.post("/api/v5/subject", json={"subject": julius_caesar})
    assert resp.status_code == 422, f"Expected 422, got {resp.status_code}: {resp.json()}"

    body = resp.json()
    # Verifica messaggio di errore chiaro
    assert "errors" in body
    assert len(body["errors"]) > 0
    # L'errore deve riguardare il campo year
    error_locs = [str(e.get("loc", [])) for e in body["errors"]]
    assert any("year" in loc for loc in error_locs)
