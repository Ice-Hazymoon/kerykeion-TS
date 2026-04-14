## Endpoint

/api/v5/compatibility-score

## Name

Compatibility Score

## Description

Calculates the Ciro Discepolo compatibility score between two subjects. Returns a numerical score, a description, and whether it's a "destiny sign". Also returns the full synastry data.

### Parameters

-   `first_subject` (JSON object, required): The first subject's birth data.
-   `second_subject` (JSON object, required): The second subject's birth data.
-   `active_points` (array, optional): Points to include.
-   `active_aspects` (array, optional): Aspects to include.

## Request Body Example

```json
{
    "first_subject": {
        "name": "Partner A",
        "year": 1990,
        "month": 1,
        "day": 1,
        "hour": 12,
        "minute": 0,
        "city": "New York",
        "nation": "US",
        "longitude": -74.006,
        "latitude": 40.7128,
        "timezone": "America/New_York"
    },
    "second_subject": {
        "name": "Partner B",
        "year": 1992,
        "month": 5,
        "day": 20,
        "hour": 18,
        "minute": 30,
        "city": "Los Angeles",
        "nation": "US",
        "longitude": -118.2437,
        "latitude": 34.0522,
        "timezone": "America/Los_Angeles"
    }
}
```

## Response Body Example

```json
{
    "status": "OK",
    "score": 11,
    "score_description": "Very Important",
    "is_destiny_sign": true,
    "score_breakdown": [
        {
            "rule": "sun_moon_conjunction",
            "description": "Sun-Moon conjunction (high precision)",
            "points": 11,
            "details": "Sun-Moon conjunction (orbit: 1.34°)"
        }
    ],
    "aspects": [
        {
            "p1_name": "Sun",
            "p2_name": "Moon",
            "aspect": "conjunction",
            "orbit": 1.34
        }
    ]
}
```
