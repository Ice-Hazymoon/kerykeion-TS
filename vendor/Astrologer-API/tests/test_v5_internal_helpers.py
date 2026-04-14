"""
Explicit tests on internal router helpers to cover simple branches
without introducing abstractions. Goal: reach 100% coverage.
"""

from __future__ import annotations

import pytest


def test_internal_helpers_branches():
    # Import locale per accedere agli helper
    from app.utils import router_utils as r

    # normalize_coordinate: None, piccoli valori e valori normali
    assert r.normalize_coordinate(None) is None
    assert r.normalize_coordinate(0.0) == 1e-6
    assert r.normalize_coordinate(-1e-7) == -1e-6
    assert r.normalize_coordinate(0.123) == 0.123

    # dump: lista, tupla, oggetto qualsiasi
    class Dummy:
        def model_dump(self):  # pragma: no cover - banale
            return {"ok": True}

    assert r.dump([1, 2, 3]) == [1, 2, 3]
    assert r.dump((1, 2)) == (1, 2)
    assert r.dump(Dummy()) == {"ok": True}
    assert r.dump(42) == 42

    # resolve_nation: None/null e valore valido
    assert r.resolve_nation(None) is None
    assert r.resolve_nation("null") is None
    assert r.resolve_nation("it") == "IT"

    # resolve_active_points: ramo con lista fornita
    assert r.resolve_active_points(["Sun"]) == ["Sun"]

    # resolve_active_aspects: ramo con aspects forniti
    aspects = r.resolve_active_aspects(({"name": "trine", "orb": 8},))
    assert aspects == [{"name": "trine", "orb": 8}]


def test_build_return_factory_variants(monkeypatch: pytest.MonkeyPatch):
    """Copre i rami di build_return_factory (online/offline/default)."""
    from app.utils import router_utils as r

    class DummyFactory:
        pass

    monkeypatch.setattr(r, "PlanetaryReturnFactory", lambda *a, **kw: DummyFactory(), raising=True)  # type: ignore

    natal = type(
        "Natal",
        (),
        {"city": "London", "nation": "GB", "lng": 0.0, "lat": 51.5, "tz_str": "Europe/London", "altitude": None},
    )()

    # Default path (nessuna return_location): offline sul natal stesso
    req_default = type("ReqD", (), {"return_location": None})()
    assert isinstance(r.build_return_factory(natal, req_default), DummyFactory)

    # Online path (geonames_username presente)
    req_online = type(
        "ReqO",
        (),
        {
            "return_location": type(
                "LocO",
                (),
                {
                    "city": "Paris",
                    "nation": "FR",
                    "geonames_username": "any",
                    "latitude": None,
                    "longitude": None,
                    "timezone": None,
                    "altitude": None,
                },
            )()
        },
    )()
    assert isinstance(r.build_return_factory(natal, req_online), DummyFactory)

    # Offline path (coordinate e tz specificati)
    req_offline = type(
        "ReqF",
        (),
        {
            "return_location": type(
                "LocF",
                (),
                {
                    "city": "Paris",
                    "nation": "FR",
                    "geonames_username": None,
                    "latitude": 48.8566,
                    "longitude": 2.3522,
                    "timezone": "Europe/Paris",
                    "altitude": None,
                    "altitude": None,
                },
            )()
        },
    )()
    assert isinstance(r.build_return_factory(natal, req_offline), DummyFactory)


def test_calculate_return_chart_data_branches(monkeypatch: pytest.MonkeyPatch):
    """Copre i rami iso_datetime e month+year di calculate_return_chart_data."""
    from app.utils import router_utils as r

    class Natal:
        city = "London"
        nation = "GB"
        lng = 0.0
        lat = 51.5
        tz_str = "Europe/London"

    class Factory:
        def next_return_from_iso_formatted_time(self, iso, return_type):
            return object()

        def next_return_from_date(self, year, month, day=1, *, return_type):
            return object()

    class ChartData:
        pass

    # Patchiamo per evitare calcoli reali
    monkeypatch.setattr(r, "build_subject", lambda *a, **k: Natal(), raising=True)  # type: ignore
    monkeypatch.setattr(r, "build_return_factory", lambda natal, body: Factory(), raising=True)  # type: ignore
    monkeypatch.setattr(r.ChartDataFactory, "create_single_wheel_return_chart_data", lambda *a, **k: ChartData(), raising=True)
    monkeypatch.setattr(r.ChartDataFactory, "create_return_chart_data", lambda *a, **k: ChartData(), raising=True)

    # Ramo iso_datetime + single wheel
    req_iso = type(
        "ReqIso",
        (),
        {
            "subject": object(),
            "active_points": None,
            "active_aspects": None,
            "include_house_comparison": True,
            "distribution_method": "weighted",
            "custom_distribution_weights": None,
            "iso_datetime": "2024-01-01T00:00:00Z",
            "month": None,
            "year": None,
            "wheel_type": "single",
        },
    )()
    assert isinstance(r.calculate_return_chart_data(req_iso, "Solar"), ChartData)

    # Ramo month+year + dual wheel
    req_my = type(
        "ReqMY",
        (),
        {
            "subject": object(),
            "active_points": None,
            "active_aspects": None,
            "include_house_comparison": True,
            "distribution_method": "weighted",
            "custom_distribution_weights": None,
            "iso_datetime": None,
            "month": 6,
            "day": 15,
            "year": 2024,
            "wheel_type": "dual",
        },
    )()
    assert isinstance(r.calculate_return_chart_data(req_my, "Lunar"), ChartData)
