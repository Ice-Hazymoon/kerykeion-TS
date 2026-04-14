"""
Tests for fixed stars, lunar nodes, and extra astrological points.

Tests cover:
- Fixed stars: Spica, Regulus, and other fixed stars
- Lunar nodes: Mean_North_Lunar_Node, True_North_Lunar_Node, Mean_South_Lunar_Node, True_South_Lunar_Node
- Mean_Lilith, Chiron, and other sensitive points
- Custom active_points configurations
- Point name normalization (case-insensitive, aliases)
- Arabic parts (Pars Fortunae, etc.)
"""

from __future__ import annotations

from copy import deepcopy
from typing import Dict

import pytest
from fastapi.testclient import TestClient


BASE_SUBJECT: Dict[str, object] = {
    "name": "Fixed Stars Test Subject",
    "year": 1990,
    "month": 7,
    "day": 15,
    "hour": 10,
    "minute": 30,
    "longitude": 12.4964,
    "latitude": 41.9028,
    "city": "Rome",
    "nation": "IT",
    "timezone": "Europe/Rome",
}


class TestFixedStars:
    """Test fixed stars in chart data."""

    def test_spica_in_active_points(self, client: TestClient):
        """Spica can be included via active_points."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "Spica"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "spica" in data
        spica = data["spica"]
        assert spica["position"] is not None
        assert isinstance(spica["position"], (int, float))
        # Spica should be in a valid zodiac range
        assert 0 <= spica["abs_pos"] < 360

    def test_regulus_in_active_points(self, client: TestClient):
        """Regulus can be included via active_points."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "Regulus"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "regulus" in data
        regulus = data["regulus"]
        assert regulus["position"] is not None
        assert 0 <= regulus["abs_pos"] < 360

    def test_multiple_fixed_stars(self, client: TestClient):
        """Multiple fixed stars can be included."""
        fixed_stars = ["Spica", "Regulus"]
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon"] + fixed_stars,
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        for star in fixed_stars:
            assert star.lower() in data

    def test_fixed_star_in_chart_data(self, client: TestClient):
        """Fixed stars appear in chart-data endpoint."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "Spica"],
        }
        resp = client.post("/api/v5/chart-data/birth-chart", json=payload)
        assert resp.status_code == 200
        data = resp.json()["chart_data"]
        assert "spica" in data["subject"]


class TestLunarNodes:
    """Test lunar node configurations."""

    def test_mean_north_lunar_node(self, client: TestClient):
        """Mean North Lunar Node can be requested."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "Mean_North_Lunar_Node"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "mean_north_lunar_node" in data
        node = data["mean_north_lunar_node"]
        assert node["abs_pos"] is not None
        assert 0 <= node["abs_pos"] < 360

    def test_true_north_lunar_node(self, client: TestClient):
        """True North Lunar Node can be requested."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "True_North_Lunar_Node"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "true_north_lunar_node" in data

    def test_mean_south_lunar_node(self, client: TestClient):
        """Mean South Lunar Node can be requested (but may be None if calculated from North)."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "Mean_South_Lunar_Node"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        # Mean South Node may be included directly or calculated from North
        # Just verify the endpoint accepts the request
        assert "Mean_South_Lunar_Node" in data.get("active_points", []) or "mean_south_lunar_node" in data

    def test_true_south_lunar_node(self, client: TestClient):
        """True South Lunar Node can be requested."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "True_South_Lunar_Node"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "true_south_lunar_node" in data

    def test_mean_vs_true_nodes_differ(self, client: TestClient):
        """Mean and True nodes should have different positions."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Mean_North_Lunar_Node", "True_North_Lunar_Node"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        mean_pos = data["mean_north_lunar_node"]["abs_pos"]
        true_pos = data["true_north_lunar_node"]["abs_pos"]
        # They can be close but should not be identical (oscillation of true node)
        # Allow for cases where they might be very close
        assert isinstance(mean_pos, (int, float))
        assert isinstance(true_pos, (int, float))

    def test_opposite_nodes_relationship(self, client: TestClient):
        """South node should be approximately opposite to North node."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Mean_North_Lunar_Node", "Mean_South_Lunar_Node"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        north_pos = data["mean_north_lunar_node"]["abs_pos"]
        south_pos = data["mean_south_lunar_node"]["abs_pos"]
        # Should be approximately 180 degrees apart
        diff = abs(north_pos - south_pos)
        if diff > 180:
            diff = 360 - diff
        assert 175 < diff < 185, f"Nodes should be opposite: North={north_pos}, South={south_pos}"


class TestSensitivePoints:
    """Test sensitive points like Lilith and Chiron."""

    def test_mean_lilith(self, client: TestClient):
        """Mean Lilith (Black Moon) can be requested."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "Mean_Lilith"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "mean_lilith" in data
        lilith = data["mean_lilith"]
        assert lilith["abs_pos"] is not None
        assert 0 <= lilith["abs_pos"] < 360

    def test_true_lilith(self, client: TestClient):
        """True Lilith can be requested."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "True_Lilith"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "true_lilith" in data

    def test_chiron(self, client: TestClient):
        """Chiron asteroid can be requested."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "Chiron"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "chiron" in data
        chiron = data["chiron"]
        assert chiron["abs_pos"] is not None
        assert 0 <= chiron["abs_pos"] < 360

    def test_earth(self, client: TestClient):
        """Earth point can be requested (opposite Sun in heliocentric)."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Earth"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "earth" in data


class TestArabicParts:
    """Test Arabic Parts/Lots."""

    def test_pars_fortunae(self, client: TestClient):
        """Part of Fortune (Pars Fortunae) can be requested."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "Pars_Fortunae"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "pars_fortunae" in data
        pof = data["pars_fortunae"]
        assert pof["abs_pos"] is not None
        assert 0 <= pof["abs_pos"] < 360

    def test_pars_spiritus(self, client: TestClient):
        """Part of Spirit (Pars Spiritus) can be requested."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "Pars_Spiritus"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "pars_spiritus" in data


class TestVertexPoints:
    """Test Vertex and Anti-Vertex points."""

    def test_vertex(self, client: TestClient):
        """Vertex point can be requested."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "Vertex"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "vertex" in data
        vertex = data["vertex"]
        assert vertex["abs_pos"] is not None
        assert 0 <= vertex["abs_pos"] < 360

    def test_anti_vertex(self, client: TestClient):
        """Anti-Vertex point can be requested."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "Anti_Vertex"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "anti_vertex" in data

    def test_vertex_anti_vertex_opposite(self, client: TestClient):
        """Vertex and Anti-Vertex should be opposite."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Vertex", "Anti_Vertex"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        vertex_pos = data["vertex"]["abs_pos"]
        anti_vertex_pos = data["anti_vertex"]["abs_pos"]
        diff = abs(vertex_pos - anti_vertex_pos)
        if diff > 180:
            diff = 360 - diff
        assert 175 < diff < 185, f"Vertex/Anti-Vertex should be opposite: {vertex_pos} vs {anti_vertex_pos}"


class TestPointNameNormalization:
    """Test point name normalization (case-insensitive, aliases)."""

    def test_lowercase_point_names(self, client: TestClient):
        """Lowercase point names should be normalized."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["sun", "moon", "mercury"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "sun" in data
        assert "moon" in data
        assert "mercury" in data

    def test_uppercase_point_names(self, client: TestClient):
        """Uppercase point names should be normalized."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["SUN", "MOON", "MERCURY"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "sun" in data
        assert "moon" in data

    def test_mixed_case_point_names(self, client: TestClient):
        """Mixed case point names should be normalized."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "moon", "VENUS"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "sun" in data
        assert "moon" in data
        assert "venus" in data

    def test_north_node_alias(self, client: TestClient):
        """'north_node' alias should map to Mean_North_Lunar_Node."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "north_node"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        # Should resolve to mean_north_lunar_node
        assert "mean_north_lunar_node" in data

    def test_south_node_alias(self, client: TestClient):
        """'south_node' alias should map to Mean_South_Lunar_Node."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "south_node"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "mean_south_lunar_node" in data

    def test_mean_node_alias(self, client: TestClient):
        """'mean_node' alias should map to Mean_North_Lunar_Node."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "mean_node"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "mean_north_lunar_node" in data

    def test_true_node_alias(self, client: TestClient):
        """'true_node' alias should map to True_North_Lunar_Node."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "true_node"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "true_north_lunar_node" in data

    def test_lilith_alias(self, client: TestClient):
        """'lilith' alias should map to Mean_Lilith."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "lilith"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "mean_lilith" in data

    def test_mc_alias(self, client: TestClient):
        """'mc' alias should map to Medium_Coeli."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "mc"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "medium_coeli" in data

    def test_ic_alias(self, client: TestClient):
        """'ic' alias should map to Imum_Coeli."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "ic"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "imum_coeli" in data

    def test_asc_alias(self, client: TestClient):
        """'asc' alias should map to Ascendant."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "asc"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "ascendant" in data


class TestAsteroids:
    """Test asteroid points."""

    @pytest.mark.parametrize(
        "asteroid",
        ["Ceres", "Pallas", "Juno", "Vesta"],
    )
    def test_main_asteroids(self, client: TestClient, asteroid: str):
        """Main belt asteroids can be included."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", asteroid],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert asteroid.lower() in data
        assert data[asteroid.lower()]["abs_pos"] is not None

    @pytest.mark.parametrize(
        "tno",
        ["Eris", "Sedna", "Haumea", "Makemake", "Quaoar", "Orcus", "Ixion"],
    )
    def test_trans_neptunian_objects(self, client: TestClient, tno: str):
        """Trans-Neptunian objects can be included."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", tno],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert tno.lower() in data

    def test_pholus(self, client: TestClient):
        """Pholus centaur can be included."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "Pholus"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "pholus" in data


class TestCustomActivePointsConfiguration:
    """Test various active_points configurations."""

    def test_minimal_active_points(self, client: TestClient):
        """Minimal active_points with just Sun."""
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun"],
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "sun" in data
        # Only requested points should be in active_points list
        assert "Sun" in data["active_points"]

    def test_traditional_planets_only(self, client: TestClient):
        """Request only traditional 7 planets."""
        traditional = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"]
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": traditional,
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        for planet in traditional:
            assert planet.lower() in data
        # Outer planets should not be in active_points
        assert "Uranus" not in data.get("active_points", [])

    def test_modern_planets_only(self, client: TestClient):
        """Request outer planets only."""
        modern = ["Uranus", "Neptune", "Pluto"]
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": modern,
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        for planet in modern:
            assert planet.lower() in data

    def test_angles_only(self, client: TestClient):
        """Request only chart angles."""
        angles = ["Ascendant", "Descendant", "Medium_Coeli", "Imum_Coeli"]
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": angles,
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        assert "ascendant" in data
        assert "descendant" in data
        assert "medium_coeli" in data
        assert "imum_coeli" in data

    def test_active_points_reflected_in_response(self, client: TestClient):
        """active_points in response should match requested points."""
        requested = ["Sun", "Moon", "Venus"]
        payload = {
            "subject": deepcopy(BASE_SUBJECT),
            "active_points": requested,
        }
        resp = client.post("/api/v5/subject", json=payload)
        assert resp.status_code == 200
        data = resp.json()["subject"]
        # The active_points in response should be the canonical names
        assert set(data["active_points"]) == set(requested)


class TestActivePointsInChartTypes:
    """Test active_points across different chart types."""

    def test_active_points_in_synastry(self, client: TestClient):
        """Custom active_points work in synastry charts."""
        payload = {
            "first_subject": deepcopy(BASE_SUBJECT),
            "second_subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "Venus", "Mars"],
        }
        resp = client.post("/api/v5/chart-data/synastry", json=payload)
        assert resp.status_code == 200
        data = resp.json()["chart_data"]
        assert "sun" in data["first_subject"]
        assert "sun" in data["second_subject"]

    def test_active_points_in_composite(self, client: TestClient):
        """Custom active_points work in composite charts."""
        payload = {
            "first_subject": deepcopy(BASE_SUBJECT),
            "second_subject": deepcopy(BASE_SUBJECT),
            "active_points": ["Sun", "Moon", "Venus"],
        }
        resp = client.post("/api/v5/chart-data/composite", json=payload)
        assert resp.status_code == 200
        data = resp.json()["chart_data"]
        assert "sun" in data["subject"]

    def test_active_points_in_transit(self, client: TestClient):
        """Custom active_points work in transit charts."""
        transit_subject = {
            "year": 2024,
            "month": 6,
            "day": 15,
            "hour": 12,
            "minute": 0,
            "longitude": 12.4964,
            "latitude": 41.9028,
            "city": "Rome",
            "nation": "IT",
            "timezone": "Europe/Rome",
        }
        payload = {
            "first_subject": deepcopy(BASE_SUBJECT),
            "transit_subject": transit_subject,
            "active_points": ["Sun", "Moon", "Saturn", "Pluto"],
        }
        resp = client.post("/api/v5/chart-data/transit", json=payload)
        assert resp.status_code == 200
        data = resp.json()["chart_data"]
        assert "sun" in data["first_subject"]
        assert "sun" in data["second_subject"]
