"""Test that chart-data endpoints properly reject rendering parameters."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_natal_chart_data_rejects_theme():
    """Verify /chart-data/birth-chart rejects 'theme' parameter."""
    payload = {
        "subject": {
            "name": "Test Subject",
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
        "theme": "dark",  # This should NOT be accepted
    }

    response = client.post("/api/v5/chart-data/birth-chart", json=payload)

    # Should return 422 Unprocessable Entity due to unexpected field
    assert response.status_code == 422
    errors = response.json()["errors"]
    assert any("theme" in str(error).lower() for error in errors)


def test_natal_chart_data_rejects_split_chart():
    """Verify /chart-data/birth-chart rejects 'split_chart' parameter."""
    payload = {
        "subject": {
            "name": "Test Subject",
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
        "split_chart": True,  # This should NOT be accepted
    }

    response = client.post("/api/v5/chart-data/birth-chart", json=payload)

    # Should return 422 Unprocessable Entity due to unexpected field
    assert response.status_code == 422
    errors = response.json()["errors"]
    assert any("split_chart" in str(error).lower() for error in errors)


def test_natal_chart_data_rejects_transparent_background():
    """Verify /chart-data/birth-chart rejects 'transparent_background' parameter."""
    payload = {
        "subject": {
            "name": "Test Subject",
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
        "transparent_background": True,  # This should NOT be accepted
    }

    response = client.post("/api/v5/chart-data/birth-chart", json=payload)

    # Should return 422 Unprocessable Entity due to unexpected field
    assert response.status_code == 422
    errors = response.json()["errors"]
    assert any("transparent_background" in str(error).lower() for error in errors)


def test_natal_chart_data_rejects_show_house_toggle():
    """Verify /chart-data/birth-chart rejects 'show_house_position_comparison'."""
    payload = {
        "subject": {
            "name": "Test Subject",
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
        "show_house_position_comparison": False,
    }

    response = client.post("/api/v5/chart-data/birth-chart", json=payload)

    assert response.status_code == 422
    errors = response.json()["errors"]
    assert any("show_house_position_comparison" in str(error).lower() for error in errors)


def test_natal_chart_data_rejects_custom_title():
    """Verify /chart-data/birth-chart rejects 'custom_title'."""
    payload = {
        "subject": {
            "name": "Test Subject",
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
        "custom_title": "Temporary override",
    }

    response = client.post("/api/v5/chart-data/birth-chart", json=payload)

    assert response.status_code == 422
    errors = response.json()["errors"]
    assert any("custom_title" in str(error).lower() for error in errors)


def test_natal_chart_accepts_active_points():
    """Verify /chart-data/birth-chart DOES accept computation params like 'active_points'."""
    payload = {
        "subject": {
            "name": "Test Subject",
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
        "active_points": ["Sun", "Moon"],  # This SHOULD be accepted
    }

    response = client.post("/api/v5/chart-data/birth-chart", json=payload)

    # Should succeed
    assert response.status_code == 200
    data = response.json()
    assert "chart_data" in data
    assert "status" in data


def test_natal_chart_svg_accepts_theme():
    """Verify /chart/birth-chart DOES accept 'theme' parameter."""
    payload = {
        "subject": {
            "name": "Test Subject",
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
        "theme": "dark",  # This SHOULD be accepted here
        "custom_title": "Test chart",
        "show_house_position_comparison": False,
    }

    response = client.post("/api/v5/chart/birth-chart", json=payload)

    # Should succeed
    assert response.status_code == 200
    data = response.json()
    assert "chart" in data or ("chart_wheel" in data and "chart_grid" in data)
    assert "chart_data" in data
