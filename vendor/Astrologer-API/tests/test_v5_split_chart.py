"""Test split_chart functionality for all chart endpoints."""

from starlette.testclient import TestClient


def test_natal_chart_split(client: TestClient):
    """Test split_chart returns separate wheel and grid SVGs."""
    payload = {
        "subject": {
            "name": "John Doe",
            "year": 1990,
            "month": 1,
            "day": 1,
            "hour": 12,
            "minute": 0,
            "city": "London",
            "nation": "GB",
            "longitude": -0.1278,
            "latitude": 51.5074,
            "timezone": "Europe/London",
        },
        "split_chart": True,
    }

    resp = client.post("/api/v5/chart/birth-chart", json=payload)
    assert resp.status_code == 200

    data = resp.json()
    assert "chart_wheel" in data
    assert "chart_grid" in data
    assert "chart" not in data
    assert "<!---" in data["chart_wheel"] or data["chart_wheel"].startswith("<svg")
    assert "<!---" in data["chart_grid"] or data["chart_grid"].startswith("<svg")
    assert "chart_data" in data


def test_natal_chart_normal(client: TestClient):
    """Test normal mode returns single complete chart."""
    payload = {
        "subject": {
            "name": "John Doe",
            "year": 1990,
            "month": 1,
            "day": 1,
            "hour": 12,
            "minute": 0,
            "city": "London",
            "nation": "GB",
            "longitude": -0.1278,
            "latitude": 51.5074,
            "timezone": "Europe/London",
        },
        "split_chart": False,
    }

    resp = client.post("/api/v5/chart/birth-chart", json=payload)
    assert resp.status_code == 200

    data = resp.json()
    assert "chart" in data
    assert "chart_wheel" not in data
    assert "chart_grid" not in data
    assert "<!---" in data["chart"] or data["chart"].startswith("<svg")


def test_synastry_chart_split(client: TestClient):
    """Test split_chart works for synastry charts."""
    payload = {
        "first_subject": {
            "name": "Person A",
            "year": 1990,
            "month": 1,
            "day": 1,
            "hour": 12,
            "minute": 0,
            "city": "London",
            "nation": "GB",
            "longitude": -0.1278,
            "latitude": 51.5074,
            "timezone": "Europe/London",
        },
        "second_subject": {
            "name": "Person B",
            "year": 1992,
            "month": 6,
            "day": 15,
            "hour": 18,
            "minute": 30,
            "city": "Paris",
            "nation": "FR",
            "longitude": 2.3522,
            "latitude": 48.8566,
            "timezone": "Europe/Paris",
        },
        "split_chart": True,
    }

    resp = client.post("/api/v5/chart/synastry", json=payload)
    assert resp.status_code == 200

    data = resp.json()
    assert "chart_wheel" in data
    assert "chart_grid" in data
    assert "chart" not in data


def test_transit_chart_split(client: TestClient):
    """Test split_chart works for transit charts."""
    payload = {
        "first_subject": {
            "name": "John Doe",
            "year": 1990,
            "month": 1,
            "day": 1,
            "hour": 12,
            "minute": 0,
            "city": "London",
            "nation": "GB",
            "longitude": -0.1278,
            "latitude": 51.5074,
            "timezone": "Europe/London",
        },
        "transit_subject": {
            "name": "Transit",
            "year": 2025,
            "month": 1,
            "day": 1,
            "hour": 0,
            "minute": 0,
            "city": "London",
            "nation": "GB",
            "longitude": -0.1278,
            "latitude": 51.5074,
            "timezone": "Europe/London",
        },
        "split_chart": True,
    }

    resp = client.post("/api/v5/chart/transit", json=payload)
    assert resp.status_code == 200

    data = resp.json()
    assert "chart_wheel" in data
    assert "chart_grid" in data
    assert "chart" not in data


def test_composite_chart_split(client: TestClient):
    """Test split_chart works for composite charts."""
    payload = {
        "first_subject": {
            "name": "Person A",
            "year": 1990,
            "month": 1,
            "day": 1,
            "hour": 12,
            "minute": 0,
            "city": "London",
            "nation": "GB",
            "longitude": -0.1278,
            "latitude": 51.5074,
            "timezone": "Europe/London",
        },
        "second_subject": {
            "name": "Person B",
            "year": 1992,
            "month": 6,
            "day": 15,
            "hour": 18,
            "minute": 30,
            "city": "Paris",
            "nation": "FR",
            "longitude": 2.3522,
            "latitude": 48.8566,
            "timezone": "Europe/Paris",
        },
        "split_chart": True,
    }

    resp = client.post("/api/v5/chart/composite", json=payload)
    assert resp.status_code == 200

    data = resp.json()
    assert "chart_wheel" in data
    assert "chart_grid" in data
    assert "chart" not in data


def test_solar_return_split(client: TestClient):
    """Test split_chart works for solar return charts."""
    payload = {
        "subject": {
            "name": "John Doe",
            "year": 1990,
            "month": 1,
            "day": 1,
            "hour": 12,
            "minute": 0,
            "city": "London",
            "nation": "GB",
            "longitude": -0.1278,
            "latitude": 51.5074,
            "timezone": "Europe/London",
        },
        "year": 2025,
        "split_chart": True,
    }

    resp = client.post("/api/v5/chart/solar-return", json=payload)
    assert resp.status_code == 200

    data = resp.json()
    assert "chart_wheel" in data
    assert "chart_grid" in data
    assert "chart" not in data
    assert data["return_type"] == "Solar"


def test_lunar_return_split(client: TestClient):
    """Test split_chart works for lunar return charts."""
    payload = {
        "subject": {
            "name": "John Doe",
            "year": 1990,
            "month": 1,
            "day": 1,
            "hour": 12,
            "minute": 0,
            "city": "London",
            "nation": "GB",
            "longitude": -0.1278,
            "latitude": 51.5074,
            "timezone": "Europe/London",
        },
        "year": 2025,
        "month": 6,
        "split_chart": True,
    }

    resp = client.post("/api/v5/chart/lunar-return", json=payload)
    assert resp.status_code == 200

    data = resp.json()
    assert "chart_wheel" in data
    assert "chart_grid" in data
    assert "chart" not in data
    assert data["return_type"] == "Lunar"
