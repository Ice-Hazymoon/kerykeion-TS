## Endpoint
/api/v5/now/subject

## Name

Current UTC Date Time Subject Data

## Description

Returns astrological data for the current moment (Now) at Greenwich (UTC).

### Parameters

-   `name` (string, optional): Name for the subject (default "Now").
-   `zodiac_type` (string, optional): "Tropical" or "Sidereal".
-   `sidereal_mode` (string, optional): Sidereal mode.
-   `perspective_type` (string, optional): "Apparent Geocentric" or "Heliocentric".
-   `houses_system_identifier` (string, optional): House system code.

## Request Body Example

```json
{
    "name": "Now",
    "zodiac_type": "Tropical"
}
```

## Response Body Example

```json
{
    "status": "OK",
    "subject": {
        "name": "Now",
        "city": "Greenwich",
        "nation": "GB",
        "sun": {
            "name": "Sun",
            "sign": "Scorpio",
            "house": 1
        }
    }
}
```
