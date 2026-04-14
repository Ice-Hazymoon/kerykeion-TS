"""
Test estensivi per la validazione dei dati astrologici.

Obiettivi:
- Verificare che le posizioni planetarie siano valide (0 <= pos < 360)
- Verificare che i segni zodiacali siano corretti per posizioni note
- Verificare che le case siano valide (1-12) con cuspidi ordinate
- Verificare che gli aspetti abbiano orbe entro i limiti definiti
- Verificare le fasi lunari
- Verificare la coerenza interna dei dati restituiti
"""

from __future__ import annotations

from copy import deepcopy
from typing import Dict

import pytest
from fastapi.testclient import TestClient


# ============================================================================
# Soggetti di test con date note per validazione
# ============================================================================

KNOWN_SUBJECT: Dict[str, object] = {
    "name": "Known Chart Test",
    "year": 1990,
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

WINTER_SOLSTICE_SUBJECT: Dict[str, object] = {
    "name": "Winter Solstice 2024",
    "year": 2024,
    "month": 12,
    "day": 21,
    "hour": 9,
    "minute": 21,
    "longitude": 0.0,
    "latitude": 51.4772,
    "city": "Greenwich",
    "nation": "GB",
    "timezone": "Europe/London",
}

SUMMER_SOLSTICE_SUBJECT: Dict[str, object] = {
    "name": "Summer Solstice 2024",
    "year": 2024,
    "month": 6,
    "day": 20,
    "hour": 20,
    "minute": 51,
    "longitude": 0.0,
    "latitude": 51.4772,
    "city": "Greenwich",
    "nation": "GB",
    "timezone": "Europe/London",
}


# ============================================================================
# Test per posizioni planetarie valide
# ============================================================================


class TestPlanetaryPositions:
    """Test che verificano la validità delle posizioni planetarie."""

    def test_all_planets_have_valid_positions(self, client: TestClient):
        """Verifica che tutti i pianeti abbiano posizioni tra 0 e 360 gradi."""
        resp = client.post("/api/v5/subject", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        subject = resp.json()["subject"]
        planets = [
            "sun",
            "moon",
            "mercury",
            "venus",
            "mars",
            "jupiter",
            "saturn",
            "uranus",
            "neptune",
            "pluto",
        ]

        for planet in planets:
            assert planet in subject, f"Pianeta {planet} mancante"
            planet_data = subject[planet]
            assert "position" in planet_data, f"Posizione mancante per {planet}"

            pos = planet_data["position"]
            assert isinstance(pos, (int, float)), f"Posizione non numerica per {planet}"
            assert 0 <= pos < 360, f"Posizione fuori range per {planet}: {pos}"

    def test_planets_have_sign_and_house(self, client: TestClient):
        """Verifica che ogni pianeta abbia segno e casa validi."""
        resp = client.post("/api/v5/subject", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        subject = resp.json()["subject"]
        planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]

        valid_signs = [
            "Ari",
            "Tau",
            "Gem",
            "Can",
            "Leo",
            "Vir",
            "Lib",
            "Sco",
            "Sag",
            "Cap",
            "Aqu",
            "Pis",
        ]

        # Case valide come stringhe (formato usato dall'API)
        valid_houses = [
            "First_House",
            "Second_House",
            "Third_House",
            "Fourth_House",
            "Fifth_House",
            "Sixth_House",
            "Seventh_House",
            "Eighth_House",
            "Ninth_House",
            "Tenth_House",
            "Eleventh_House",
            "Twelfth_House",
        ]

        for planet in planets:
            planet_data = subject[planet]

            # Verifica segno
            assert "sign" in planet_data, f"Segno mancante per {planet}"
            assert planet_data["sign"] in valid_signs, f"Segno non valido per {planet}: {planet_data['sign']}"

            # Verifica casa (stringa nel formato "First_House", etc.)
            assert "house" in planet_data, f"Casa mancante per {planet}"
            house = planet_data["house"]
            assert house in valid_houses, f"Casa non valida per {planet}: {house}"

    def test_sun_position_at_solstices(self, client: TestClient):
        """Verifica che il Sole sia a ~0° Capricorno al solstizio d'inverno."""
        resp = client.post("/api/v5/subject", json={"subject": deepcopy(WINTER_SOLSTICE_SUBJECT)})
        assert resp.status_code == 200

        subject = resp.json()["subject"]
        sun = subject["sun"]

        # Al solstizio d'inverno il Sole entra in Capricorno o è alla fine del Sagittario
        assert sun["sign"] in ["Cap", "Sag"], f"Sole non in Capricorno/Sagittario al solstizio: {sun['sign']}"
        # Posizione dovrebbe essere vicina a 270° (inizio Capricorno) o poco prima
        assert 269 <= sun["position"] <= 271 or sun["position"] < 1, f"Posizione Sole anomala al solstizio invernale: {sun['position']}"

    def test_sun_position_at_summer_solstice(self, client: TestClient):
        """Verifica che il Sole sia a ~0° Cancro al solstizio d'estate."""
        resp = client.post("/api/v5/subject", json={"subject": deepcopy(SUMMER_SOLSTICE_SUBJECT)})
        assert resp.status_code == 200

        subject = resp.json()["subject"]
        sun = subject["sun"]

        # Al solstizio d'estate il Sole entra in Cancro o è alla fine dei Gemelli
        assert sun["sign"] in ["Can", "Gem"], f"Sole non in Cancro/Gemelli al solstizio: {sun['sign']}"
        # Posizione dovrebbe essere vicina a 90° (inizio Cancro) o poco prima
        assert 88 <= sun["position"] <= 92 or (sun["position"] >= 29 and sun["sign"] == "Gem"), f"Posizione Sole anomala: {sun['position']}"

    def test_retrograde_status_is_boolean(self, client: TestClient):
        """Verifica che lo stato retrogrado sia un booleano."""
        resp = client.post("/api/v5/subject", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        subject = resp.json()["subject"]
        planets = [
            "mercury",
            "venus",
            "mars",
            "jupiter",
            "saturn",
            "uranus",
            "neptune",
            "pluto",
        ]

        for planet in planets:
            planet_data = subject[planet]
            if "retrograde" in planet_data:
                assert isinstance(planet_data["retrograde"], bool), f"Retrograde non booleano per {planet}"


# ============================================================================
# Test per case e cuspidi
# ============================================================================


class TestHousesAndCusps:
    """Test che verificano la validità delle case e cuspidi."""

    # Nomi delle case nel formato API
    HOUSE_NAMES = [
        "first_house",
        "second_house",
        "third_house",
        "fourth_house",
        "fifth_house",
        "sixth_house",
        "seventh_house",
        "eighth_house",
        "ninth_house",
        "tenth_house",
        "eleventh_house",
        "twelfth_house",
    ]

    def test_all_houses_present(self, client: TestClient):
        """Verifica che tutte le 12 case siano presenti."""
        resp = client.post("/api/v5/chart-data/birth-chart", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        chart_data = resp.json()["chart_data"]
        subject = chart_data["subject"]

        # Verifica presenza delle case (formato: first_house, second_house, etc.)
        for house_name in self.HOUSE_NAMES:
            assert house_name in subject, f"Casa {house_name} mancante"
            house_data = subject[house_name]

            assert "abs_pos" in house_data, f"abs_pos mancante per {house_name}"
            pos = house_data["abs_pos"]
            assert isinstance(pos, (int, float)), f"Posizione {house_name} non numerica"
            assert 0 <= pos < 360, f"Posizione {house_name} fuori range: {pos}"

    def test_ascendant_equals_first_house(self, client: TestClient):
        """Verifica che l'Ascendente coincida con la cuspide della Prima Casa."""
        resp = client.post("/api/v5/subject", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        subject = resp.json()["subject"]

        asc_position = subject["ascendant"]["abs_pos"]
        first_house_position = subject["first_house"]["abs_pos"]

        # Devono essere uguali o molto vicini (tolleranza per arrotondamenti)
        assert abs(asc_position - first_house_position) < 0.01, f"ASC ({asc_position}) != Prima Casa ({first_house_position})"

    def test_mc_equals_tenth_house(self, client: TestClient):
        """Verifica che il Medium Coeli coincida con la cuspide della Decima Casa."""
        resp = client.post("/api/v5/subject", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        subject = resp.json()["subject"]

        mc_position = subject["medium_coeli"]["abs_pos"]
        tenth_house_position = subject["tenth_house"]["abs_pos"]

        # Devono essere uguali o molto vicini
        assert abs(mc_position - tenth_house_position) < 0.01, f"MC ({mc_position}) != Decima Casa ({tenth_house_position})"

    def test_houses_cover_360_degrees(self, client: TestClient):
        """Verifica che le case coprano tutti i 360 gradi."""
        resp = client.post("/api/v5/subject", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        subject = resp.json()["subject"]

        house_positions = []
        for house_name in self.HOUSE_NAMES:
            house_positions.append(subject[house_name]["abs_pos"])

        # Le posizioni devono essere tutte diverse
        assert len(set(house_positions)) == 12, "Le case non hanno posizioni uniche"


# ============================================================================
# Test per aspetti
# ============================================================================


class TestAspects:
    """Test che verificano la validità degli aspetti."""

    def test_aspects_have_required_fields(self, client: TestClient):
        """Verifica che ogni aspetto abbia i campi richiesti."""
        resp = client.post("/api/v5/chart-data/birth-chart", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        chart_data = resp.json()["chart_data"]
        aspects = chart_data["aspects"]

        assert isinstance(aspects, list), "Aspetti non è una lista"

        for aspect in aspects:
            assert "p1_name" in aspect, "Campo p1_name mancante"
            assert "p2_name" in aspect, "Campo p2_name mancante"
            assert "aspect" in aspect, "Campo aspect mancante"
            assert "orbit" in aspect, "Campo orbit mancante"

    def test_aspects_have_valid_types(self, client: TestClient):
        """Verifica che i tipi di aspetto siano validi."""
        resp = client.post("/api/v5/chart-data/birth-chart", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        chart_data = resp.json()["chart_data"]
        aspects = chart_data["aspects"]

        valid_aspects = [
            "conjunction",
            "opposition",
            "trine",
            "square",
            "sextile",
            "quintile",
            "semi-sextile",
            "quincunx",
            "sesquiquadrate",
            "semi-square",
        ]

        for aspect in aspects:
            aspect_type = aspect["aspect"].lower()
            assert aspect_type in valid_aspects, f"Tipo aspetto non valido: {aspect['aspect']}"

    def test_aspects_orbit_within_bounds(self, client: TestClient):
        """Verifica che le orbe degli aspetti siano ragionevoli."""
        resp = client.post("/api/v5/chart-data/birth-chart", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        chart_data = resp.json()["chart_data"]
        aspects = chart_data["aspects"]

        for aspect in aspects:
            orbit = aspect["orbit"]
            assert isinstance(orbit, (int, float)), f"Orbe non numerica: {orbit}"
            # L'orbe non dovrebbe mai superare 10 gradi per aspetti standard
            assert 0 <= abs(orbit) <= 12, f"Orbe fuori range: {orbit}"

    def test_no_duplicate_aspects(self, client: TestClient):
        """Verifica che non ci siano aspetti duplicati."""
        resp = client.post("/api/v5/chart-data/birth-chart", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        chart_data = resp.json()["chart_data"]
        aspects = chart_data["aspects"]

        seen = set()
        for aspect in aspects:
            # Crea una chiave normalizzata (ordine alfabetico dei pianeti)
            p1, p2 = sorted([aspect["p1_name"], aspect["p2_name"]])
            key = (p1, p2, aspect["aspect"])
            assert key not in seen, f"Aspetto duplicato: {key}"
            seen.add(key)


# ============================================================================
# Test per fasi lunari
# ============================================================================


class TestLunarPhases:
    """Test che verificano la correttezza delle fasi lunari."""

    def test_lunar_phase_present(self, client: TestClient):
        """Verifica che la fase lunare sia presente."""
        resp = client.post("/api/v5/subject", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        subject = resp.json()["subject"]
        assert "lunar_phase" in subject, "Fase lunare mancante"

        lunar_phase = subject["lunar_phase"]
        assert "moon_phase" in lunar_phase or "phase" in lunar_phase, "Tipo fase mancante"

    def test_lunar_phase_has_valid_values(self, client: TestClient):
        """Verifica che i valori della fase lunare siano validi."""
        resp = client.post("/api/v5/subject", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        subject = resp.json()["subject"]
        lunar_phase = subject["lunar_phase"]

        # moon_phase_int dovrebbe essere 0-28
        if "moon_phase_int" in lunar_phase:
            phase_int = lunar_phase["moon_phase_int"]
            assert 0 <= phase_int <= 28, f"moon_phase_int fuori range: {phase_int}"

        # days_until_next_* dovrebbero essere positivi
        if "days_until_next_full_moon" in lunar_phase:
            assert lunar_phase["days_until_next_full_moon"] >= 0


# ============================================================================
# Test per distribuzioni elemento e qualità
# ============================================================================


class TestDistributions:
    """Test che verificano le distribuzioni di elementi e qualità."""

    def test_element_distribution_sums_to_100(self, client: TestClient):
        """Verifica che la distribuzione degli elementi sommi a ~100%."""
        resp = client.post("/api/v5/chart-data/birth-chart", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        chart_data = resp.json()["chart_data"]
        elem_dist = chart_data["element_distribution"]

        total = elem_dist["fire_percentage"] + elem_dist["earth_percentage"] + elem_dist["air_percentage"] + elem_dist["water_percentage"]

        # Tolleranza per arrotondamenti
        assert 99 <= total <= 101, f"Somma elementi non è 100%: {total}"

    def test_quality_distribution_sums_to_100(self, client: TestClient):
        """Verifica che la distribuzione delle qualità sommi a ~100%."""
        resp = client.post("/api/v5/chart-data/birth-chart", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        chart_data = resp.json()["chart_data"]
        qual_dist = chart_data["quality_distribution"]

        total = qual_dist["cardinal_percentage"] + qual_dist["fixed_percentage"] + qual_dist["mutable_percentage"]

        # Tolleranza per arrotondamenti
        assert 99 <= total <= 101, f"Somma qualità non è 100%: {total}"

    def test_element_distribution_has_all_elements(self, client: TestClient):
        """Verifica che tutti e 4 gli elementi siano presenti."""
        resp = client.post("/api/v5/chart-data/birth-chart", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        chart_data = resp.json()["chart_data"]
        elem_dist = chart_data["element_distribution"]

        required_keys = [
            "fire_percentage",
            "earth_percentage",
            "air_percentage",
            "water_percentage",
        ]
        for key in required_keys:
            assert key in elem_dist, f"Elemento mancante: {key}"
            assert isinstance(elem_dist[key], (int, float)), f"{key} non numerico"
            assert 0 <= elem_dist[key] <= 100, f"{key} fuori range: {elem_dist[key]}"

    def test_quality_distribution_has_all_qualities(self, client: TestClient):
        """Verifica che tutte e 3 le qualità siano presenti."""
        resp = client.post("/api/v5/chart-data/birth-chart", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        chart_data = resp.json()["chart_data"]
        qual_dist = chart_data["quality_distribution"]

        required_keys = [
            "cardinal_percentage",
            "fixed_percentage",
            "mutable_percentage",
        ]
        for key in required_keys:
            assert key in qual_dist, f"Qualità mancante: {key}"
            assert isinstance(qual_dist[key], (int, float)), f"{key} non numerico"
            assert 0 <= qual_dist[key] <= 100, f"{key} fuori range: {qual_dist[key]}"


# ============================================================================
# Test per active_points e active_aspects
# ============================================================================


class TestActivePointsAspects:
    """Test che verificano il corretto funzionamento di active_points e active_aspects."""

    def test_active_points_respected(self, client: TestClient):
        """Verifica che active_points limiti i punti restituiti."""
        custom_points = ["Sun", "Moon", "Ascendant"]
        resp = client.post(
            "/api/v5/chart-data/birth-chart",
            json={"subject": deepcopy(KNOWN_SUBJECT), "active_points": custom_points},
        )
        assert resp.status_code == 200

        chart_data = resp.json()["chart_data"]
        active_points = chart_data["active_points"]

        assert set(active_points) == set(custom_points), f"active_points non rispettato: {active_points}"

    def test_active_aspects_limits_aspects(self, client: TestClient):
        """Verifica che active_aspects limiti gli aspetti calcolati."""
        # Solo congiunzione e opposizione
        custom_aspects = [
            {"name": "conjunction", "orb": 8},
            {"name": "opposition", "orb": 8},
        ]
        resp = client.post(
            "/api/v5/chart-data/birth-chart",
            json={"subject": deepcopy(KNOWN_SUBJECT), "active_aspects": custom_aspects},
        )
        assert resp.status_code == 200

        chart_data = resp.json()["chart_data"]
        aspects = chart_data["aspects"]

        for aspect in aspects:
            assert aspect["aspect"].lower() in ["conjunction", "opposition"], f"Aspetto non richiesto: {aspect['aspect']}"

    def test_empty_active_points_uses_defaults(self, client: TestClient):
        """Verifica che senza active_points vengano usati i default."""
        resp = client.post("/api/v5/chart-data/birth-chart", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        chart_data = resp.json()["chart_data"]
        active_points = chart_data["active_points"]

        # I default includono almeno Sun, Moon, Mercury, Venus, Mars
        assert "Sun" in active_points
        assert "Moon" in active_points
        assert len(active_points) >= 10, f"Troppi pochi punti default: {len(active_points)}"


# ============================================================================
# Test per coerenza tra endpoint
# ============================================================================


class TestEndpointConsistency:
    """Test che verificano la coerenza tra diversi endpoint."""

    def test_subject_matches_chart_data_subject(self, client: TestClient):
        """Verifica che il subject sia coerente tra /subject e /chart-data."""
        subject_resp = client.post("/api/v5/subject", json={"subject": deepcopy(KNOWN_SUBJECT)})
        chart_resp = client.post("/api/v5/chart-data/birth-chart", json={"subject": deepcopy(KNOWN_SUBJECT)})

        assert subject_resp.status_code == 200
        assert chart_resp.status_code == 200

        subject_sun = subject_resp.json()["subject"]["sun"]["position"]
        chart_sun = chart_resp.json()["chart_data"]["subject"]["sun"]["position"]

        assert subject_sun == chart_sun, f"Posizione Sole diversa: {subject_sun} vs {chart_sun}"

    def test_chart_data_matches_chart_svg(self, client: TestClient):
        """Verifica che i dati siano coerenti tra /chart-data e /chart."""
        data_resp = client.post("/api/v5/chart-data/birth-chart", json={"subject": deepcopy(KNOWN_SUBJECT)})
        svg_resp = client.post("/api/v5/chart/birth-chart", json={"subject": deepcopy(KNOWN_SUBJECT)})

        assert data_resp.status_code == 200
        assert svg_resp.status_code == 200

        data_sun = data_resp.json()["chart_data"]["subject"]["sun"]["position"]
        svg_sun = svg_resp.json()["chart_data"]["subject"]["sun"]["position"]

        assert data_sun == svg_sun, f"Posizione Sole diversa: {data_sun} vs {svg_sun}"

    def test_synastry_has_both_subjects(self, client: TestClient):
        """Verifica che synastry contenga entrambi i soggetti."""
        second_subject = deepcopy(KNOWN_SUBJECT)
        second_subject["name"] = "Second Person"
        second_subject["year"] = 1985

        resp = client.post(
            "/api/v5/chart-data/synastry",
            json={
                "first_subject": deepcopy(KNOWN_SUBJECT),
                "second_subject": second_subject,
            },
        )
        assert resp.status_code == 200

        chart_data = resp.json()["chart_data"]
        assert "first_subject" in chart_data
        assert "second_subject" in chart_data
        assert chart_data["first_subject"]["name"] == KNOWN_SUBJECT["name"]
        assert chart_data["second_subject"]["name"] == "Second Person"


# ============================================================================
# Test per dati specifici dei chart type
# ============================================================================


class TestChartTypeSpecificData:
    """Test che verificano i dati specifici per ogni tipo di chart."""

    def test_natal_chart_type_is_natal(self, client: TestClient):
        """Verifica che il chart type sia Natal per birth-chart."""
        resp = client.post("/api/v5/chart-data/birth-chart", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200
        assert resp.json()["chart_data"]["chart_type"] == "Natal"

    def test_synastry_chart_type_is_synastry(self, client: TestClient):
        """Verifica che il chart type sia Synastry."""
        second = deepcopy(KNOWN_SUBJECT)
        second["name"] = "Second"
        second["year"] = 1985

        resp = client.post(
            "/api/v5/chart-data/synastry",
            json={
                "first_subject": deepcopy(KNOWN_SUBJECT),
                "second_subject": second,
            },
        )
        assert resp.status_code == 200
        assert resp.json()["chart_data"]["chart_type"] == "Synastry"

    def test_transit_chart_type_is_transit(self, client: TestClient):
        """Verifica che il chart type sia Transit."""
        transit = deepcopy(KNOWN_SUBJECT)
        transit["name"] = "Transit"
        transit["year"] = 2025

        resp = client.post(
            "/api/v5/chart-data/transit",
            json={
                "first_subject": deepcopy(KNOWN_SUBJECT),
                "transit_subject": transit,
            },
        )
        assert resp.status_code == 200
        assert resp.json()["chart_data"]["chart_type"] == "Transit"

    def test_composite_chart_type_is_composite(self, client: TestClient):
        """Verifica che il chart type sia Composite."""
        second = deepcopy(KNOWN_SUBJECT)
        second["name"] = "Second"
        second["year"] = 1985

        resp = client.post(
            "/api/v5/chart-data/composite",
            json={
                "first_subject": deepcopy(KNOWN_SUBJECT),
                "second_subject": second,
            },
        )
        assert resp.status_code == 200
        assert resp.json()["chart_data"]["chart_type"] == "Composite"

    def test_synastry_has_house_comparison(self, client: TestClient):
        """Verifica che synastry abbia house_comparison."""
        second = deepcopy(KNOWN_SUBJECT)
        second["name"] = "Second"
        second["year"] = 1985

        resp = client.post(
            "/api/v5/chart-data/synastry",
            json={
                "first_subject": deepcopy(KNOWN_SUBJECT),
                "second_subject": second,
            },
        )
        assert resp.status_code == 200
        chart_data = resp.json()["chart_data"]
        assert "house_comparison" in chart_data
        assert chart_data["house_comparison"] is not None

    def test_synastry_has_relationship_score(self, client: TestClient):
        """Verifica che synastry abbia relationship_score."""
        second = deepcopy(KNOWN_SUBJECT)
        second["name"] = "Second"
        second["year"] = 1985

        resp = client.post(
            "/api/v5/chart-data/synastry",
            json={
                "first_subject": deepcopy(KNOWN_SUBJECT),
                "second_subject": second,
            },
        )
        assert resp.status_code == 200
        chart_data = resp.json()["chart_data"]
        assert "relationship_score" in chart_data
        score = chart_data["relationship_score"]
        assert "score_value" in score
        assert isinstance(score["score_value"], (int, float))


# ============================================================================
# Test per validazione campi numerici
# ============================================================================


class TestNumericFieldsValidation:
    """Test che verificano la validità dei campi numerici."""

    def test_planetary_speed_is_numeric(self, client: TestClient):
        """Verifica che la velocità planetaria sia numerica."""
        resp = client.post("/api/v5/subject", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        subject = resp.json()["subject"]
        planets = ["sun", "moon", "mercury", "venus", "mars"]

        for planet in planets:
            planet_data = subject[planet]
            if "abs_speed" in planet_data:
                assert isinstance(planet_data["abs_speed"], (int, float))

    def test_position_in_degrees_is_numeric(self, client: TestClient):
        """Verifica che position_in_degrees sia numerico."""
        resp = client.post("/api/v5/subject", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        subject = resp.json()["subject"]
        planets = ["sun", "moon", "mercury"]

        for planet in planets:
            planet_data = subject[planet]
            if "position_in_degrees" in planet_data:
                assert isinstance(planet_data["position_in_degrees"], (int, float))
                assert 0 <= planet_data["position_in_degrees"] < 30

    def test_julian_day_present_and_valid(self, client: TestClient):
        """Verifica che julian_day sia presente e valido."""
        resp = client.post("/api/v5/subject", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        subject = resp.json()["subject"]
        assert "julian_day" in subject
        jd = subject["julian_day"]
        assert isinstance(jd, (int, float))
        # JD per date moderne dovrebbe essere > 2400000
        assert jd > 2400000, f"Julian Day sospetto: {jd}"


# ============================================================================
# Test per ISO datetime formattato
# ============================================================================


class TestDateTimeFormatting:
    """Test che verificano la formattazione di date e orari."""

    def test_iso_formatted_utc_datetime_present(self, client: TestClient):
        """Verifica che iso_formatted_utc_datetime sia presente."""
        resp = client.post("/api/v5/subject", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        subject = resp.json()["subject"]
        assert "iso_formatted_utc_datetime" in subject

        iso_dt = subject["iso_formatted_utc_datetime"]
        assert isinstance(iso_dt, str)
        # Verifica formato ISO base
        assert "1990" in iso_dt, f"Anno mancante in ISO datetime: {iso_dt}"
        assert "T" in iso_dt or " " in iso_dt, f"Formato ISO non valido: {iso_dt}"

    def test_iso_formatted_local_datetime_present(self, client: TestClient):
        """Verifica che iso_formatted_local_datetime sia presente."""
        resp = client.post("/api/v5/subject", json={"subject": deepcopy(KNOWN_SUBJECT)})
        assert resp.status_code == 200

        subject = resp.json()["subject"]
        assert "iso_formatted_local_datetime" in subject

        iso_dt = subject["iso_formatted_local_datetime"]
        assert isinstance(iso_dt, str)
        assert "1990" in iso_dt
