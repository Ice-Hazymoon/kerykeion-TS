"""
Validation helpers for input validation and error message enrichment.

This module provides utilities to generate helpful error messages when users
send incorrect field names in their requests.
"""

from __future__ import annotations

from typing import Any

# Mapping of common incorrect field names to their correct alternatives
FIELD_CORRECTIONS: dict[str, str] = {
    "country": "nation",
    "state": "city (include state in city field, e.g. 'Amherst, Massachusetts')",
    "house_system": "houses_system_identifier",
    "lat": "latitude",
    "lng": "longitude",
    "lon": "longitude",
    "tz": "timezone",
    "name_first": "name",
    "first_name": "name",
    "last_name": "name",
    "birth_year": "year",
    "birth_month": "month",
    "birth_day": "day",
    "birth_hour": "hour",
    "birth_minute": "minute",
    "dob": "year, month, day (use separate fields)",
    "date_of_birth": "year, month, day (use separate fields)",
    "time_of_birth": "hour, minute (use separate fields)",
    "location": "latitude, longitude, timezone (use separate fields)",
    "coordinates": "latitude, longitude (use separate fields)",
    "zodiac": "zodiac_type",
    "sidereal": "sidereal_mode",
    "ayanamsha": "sidereal_mode",
    "perspective": "perspective_type",
    "house_sys": "houses_system_identifier",
    "houses": "houses_system_identifier",
}


def get_field_correction(field_name: str) -> str | None:
    """
    Get the correction suggestion for an incorrect field name.

    Args:
        field_name: The incorrect field name from the request.

    Returns:
        A correction message if a known correction exists, None otherwise.
    """
    normalized = field_name.lower().strip()
    return FIELD_CORRECTIONS.get(normalized)


def format_extra_field_error(field_name: str, location: list[Any]) -> str:
    """
    Format an error message for an extra field, including correction if available.

    Args:
        field_name: The extra field name that was sent.
        location: The path location of the field in the request body.

    Returns:
        A formatted error message with optional correction suggestion.
    """
    correction = get_field_correction(field_name)
    location_str = ".".join(str(loc) for loc in location if loc != "body")

    if correction:
        return f"Extra field '{field_name}' is not allowed in '{location_str}'. " f"Did you mean '{correction}'?"
    return f"Extra field '{field_name}' is not allowed in '{location_str}'."
