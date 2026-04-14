"""Verifies that errors are correctly exposed in API responses."""

from __future__ import annotations

from copy import deepcopy

import pytest
from fastapi.testclient import TestClient
from kerykeion.schemas import KerykeionException


SUBJECT_TEMPLATE = {
    "name": "Error Handling Test",
    "year": 1985,
    "month": 7,
    "day": 3,
    "hour": 9,
    "minute": 15,
    "longitude": 12.4963655,
    "latitude": 41.9027835,
    "city": "Rome",
    "nation": "IT",
    "timezone": "Europe/Rome",
}


def _build_subject_payload() -> dict[str, object]:
    return deepcopy(SUBJECT_TEMPLATE)


def _build_lunar_return_payload() -> dict[str, object]:
    return {
        "subject": _build_subject_payload(),
        "year": 2024,
        "wheel_type": "single",
    }


def _build_natal_chart_payload() -> dict[str, object]:
    return {"subject": _build_subject_payload()}


def test_lunar_return_domain_error_exposes_message(monkeypatch: pytest.MonkeyPatch, client: TestClient) -> None:
    error_message = "Moon position is required for Lunar return but is not available in the subject."

    def raise_domain_error(*_: object, **__: object) -> None:
        raise KerykeionException(error_message)

    monkeypatch.setattr(
        "app.routers.charts.calculate_return_chart_data",
        raise_domain_error,
    )

    response = client.post("/api/v5/chart/lunar-return", json=_build_lunar_return_payload())

    assert response.status_code == 400
    body = response.json()
    assert body["status"] == "ERROR"
    assert body["message"] == error_message
    assert body["error_type"] == "KerykeionException"


def test_natal_chart_unexpected_error_exposes_message(monkeypatch: pytest.MonkeyPatch, client: TestClient) -> None:
    error_message = "Unexpected failure"

    def raise_generic_error(*_: object, **__: object) -> None:
        raise RuntimeError(error_message)

    monkeypatch.setattr(
        "app.routers.data.create_natal_chart_data",
        raise_generic_error,
    )

    response = client.post("/api/v5/chart-data/birth-chart", json=_build_natal_chart_payload())

    assert response.status_code == 500
    body = response.json()
    assert body["status"] == "ERROR"
    assert body["message"] == error_message
    assert body["error_type"] == "RuntimeError"
