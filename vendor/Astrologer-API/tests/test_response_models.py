"""
Unit test per i modelli di risposta che sfruttano direttamente le strutture
Pydantic fornite da kerykeion. Verifichiamo che i payload generati dalle factory
native vengano accettati e tipizzati correttamente.
"""

from __future__ import annotations

from typing import Iterable

import pytest

from kerykeion import AstrologicalSubjectFactory, ChartDataFactory
from kerykeion.schemas.kr_models import (
    AstrologicalSubjectModel,
    DualChartDataModel,
    RelationshipScoreAspectModel,
    SingleChartDataModel,
    ScoreBreakdownItemModel,
)
from kerykeion.settings.config_constants import DEFAULT_ACTIVE_ASPECTS, DEFAULT_ACTIVE_POINTS

from app.types import response_models as rm


def _active_aspects_payload() -> list[dict]:
    """Replica la trasformazione applicata dal router principale."""
    return [dict(aspect) for aspect in DEFAULT_ACTIVE_ASPECTS]


def _active_points_payload(points: Iterable[str] | None = None) -> list[str]:
    if points:
        return list(points)
    return list(DEFAULT_ACTIVE_POINTS)


def _build_subject(name: str, *, year: int, month: int, day: int, hour: int, minute: int, city: str, lat: float, lng: float) -> object:
    """Crea un soggetto astrologico inattivo (offline)."""
    return AstrologicalSubjectFactory.from_birth_data(
        name=name,
        year=year,
        month=month,
        day=day,
        hour=hour,
        minute=minute,
        seconds=0,
        city=city,
        nation="IT",
        lng=lng,
        lat=lat,
        tz_str="Europe/Rome",
        online=False,
        active_points=_active_points_payload(),
        suppress_geonames_warning=True,
    )


@pytest.fixture(scope="module")
def single_chart_dump() -> dict:
    subject = _build_subject("Giulia", year=1990, month=1, day=1, hour=12, minute=30, city="Rome", lat=41.9, lng=12.5)
    chart_data = ChartDataFactory.create_natal_chart_data(
        subject,
        active_points=_active_points_payload(),
        active_aspects=_active_aspects_payload(),
    )
    return chart_data.model_dump(mode="json")


@pytest.fixture(scope="module")
def dual_chart_dump() -> dict:
    first = _build_subject("Marco", year=1988, month=5, day=10, hour=10, minute=10, city="Florence", lat=43.77, lng=11.25)
    second = _build_subject("Lucia", year=1992, month=9, day=25, hour=8, minute=5, city="Milan", lat=45.46, lng=9.19)
    chart_data = ChartDataFactory.create_synastry_chart_data(
        first,
        second,
        active_points=_active_points_payload(),
        active_aspects=_active_aspects_payload(),
        include_relationship_score=True,
        include_house_comparison=True,
    )
    return chart_data.model_dump(mode="json")


def test_status_response_model_accepts_minimal_payload():
    payload = {"status": "OK"}
    model = rm.StatusResponseModel.model_validate(payload)
    assert model.status == "OK"


def test_api_status_response_model_includes_environment_flags():
    payload = {"status": "OK", "environment": "test", "debug": True}
    model = rm.ApiStatusResponseModel.model_validate(payload)
    assert model.environment == "test"
    assert model.debug is True


def test_subject_response_model_parses_subject_dict(single_chart_dump: dict):
    subject_payload = single_chart_dump["subject"]
    model = rm.SubjectResponseModel.model_validate({"status": "OK", "subject": subject_payload})
    assert isinstance(model.subject, AstrologicalSubjectModel)
    assert model.subject.name == "Giulia"


def test_chart_data_response_model_accepts_single_chart(single_chart_dump: dict):
    payload = {"status": "OK", "chart_data": single_chart_dump}
    model = rm.ChartDataResponseModel.model_validate(payload)
    assert isinstance(model.chart_data, SingleChartDataModel)
    assert model.chart_data.chart_type == "Natal"


def test_chart_response_model_accepts_single_chart_with_svg(single_chart_dump: dict):
    payload = {
        "status": "OK",
        "chart_data": single_chart_dump,
        "chart": "<svg>mock</svg>",
    }
    model = rm.ChartResponseModel.model_validate(payload)
    assert isinstance(model.chart_data, SingleChartDataModel)
    assert model.chart == "<svg>mock</svg>"
    assert model.chart_wheel is None
    assert model.chart_grid is None


def test_chart_response_model_handles_split_variant(single_chart_dump: dict):
    payload = {
        "status": "OK",
        "chart_data": single_chart_dump,
        "chart_wheel": "<svg>wheel</svg>",
        "chart_grid": "<svg>grid</svg>",
    }
    model = rm.ChartResponseModel.model_validate(payload)
    assert isinstance(model.chart_data, SingleChartDataModel)
    assert model.chart is None
    assert model.chart_wheel == "<svg>wheel</svg>"
    assert model.chart_grid == "<svg>grid</svg>"


def test_return_chart_response_model_extends_chart_payload(single_chart_dump: dict):
    payload = {
        "status": "OK",
        "chart_data": single_chart_dump,
        "chart": "<svg>return</svg>",
        "return_type": "Solar",
        "wheel_type": "dual",
    }
    model = rm.ReturnChartResponseModel.model_validate(payload)
    assert isinstance(model.chart_data, SingleChartDataModel)
    assert model.return_type == "Solar"
    assert model.wheel_type == "dual"


def test_compatibility_score_response_model_parses_dual_chart(dual_chart_dump: dict):
    relationship_score = dual_chart_dump.get("relationship_score")
    assert relationship_score, "Relationship score atteso nei payload di synastry"

    aspects_dump = relationship_score["aspects"]
    payload = {
        "status": "OK",
        "chart_data": dual_chart_dump,
        "aspects": aspects_dump,
        "score": relationship_score["score_value"],
        "score_description": relationship_score["score_description"],
        "is_destiny_sign": relationship_score["is_destiny_sign"],
        "score_breakdown": relationship_score.get("score_breakdown", []),
    }
    model = rm.CompatibilityScoreResponseModel.model_validate(payload)
    assert isinstance(model.chart_data, DualChartDataModel)
    assert isinstance(model.aspects[0], RelationshipScoreAspectModel)
    assert model.score is not None
    assert model.score_description
    assert isinstance(model.score_breakdown, list)
