## Endpoint
/api/v5/chart-data/transit

## Name

Transit Data

## Description

Returns transit analysis data, showing planetary positions for a specific time (transit) in relation to a natal chart. Does not include SVG rendering.

### Parameters

-   `first_subject` (JSON object, required): The natal subject's birth data.
-   `transit_subject` (JSON object, required): The transit time and location data.
-   `include_house_comparison` (boolean, optional): Include house overlay data.
-   `active_points` (array, optional): Points to include.
-   `active_aspects` (array, optional): Aspects to include.
-   `distribution_method` (string, optional): Distribution calculation method.

## Request Body Example

```json
{
    "first_subject": {
        "name": "John Doe",
        "year": 1990,
        "month": 6,
        "day": 15,
        "hour": 12,
        "minute": 30,
        "city": "London",
        "nation": "GB",
        "longitude": -0.1278,
        "latitude": 51.5074,
        "timezone": "Europe/London"
    },
    "transit_subject": {
        "name": "Now",
        "year": 2023,
        "month": 10,
        "day": 27,
        "hour": 9,
        "minute": 0,
        "city": "London",
        "nation": "GB",
        "longitude": -0.1278,
        "latitude": 51.5074,
        "timezone": "Europe/London"
    },
    "include_house_comparison": true
}
```

## Response Body Example

```json
{
    "status": "OK",
    "chart_data": {
        "chart_type": "Transit",
        "first_subject": { "name": "John Doe" },
        "second_subject": { "name": "Now" },
        "aspects": [
            {
                "p1_name": "Sun",
                "p2_name": "Mars",
                "aspect": "square",
                "orb": 1.5
            }
        ],
        "house_comparison": {
            "first_points_in_second_houses": [],
            "second_points_in_first_houses": []
        }
    }
}
```
