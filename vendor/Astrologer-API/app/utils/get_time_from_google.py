import logging
import requests
from datetime import datetime

logger = logging.getLogger(__name__)

# Reliable providers with Date header
TIME_PROVIDERS = [
    "https://www.cloudflare.com",
    "https://www.google.com",
    "https://www.apple.com",
]


def get_time_from_google():
    """Fetch current UTC time from external HTTP headers with fallback providers."""
    for url in TIME_PROVIDERS:
        try:
            response = requests.head(url, timeout=2)
            date_header = response.headers.get("Date")
            if date_header:
                logger.debug(f"Got time from {url}: {date_header}")
                return datetime.strptime(date_header, "%a, %d %b %Y %H:%M:%S GMT")
        except Exception as e:
            logger.warning(f"Failed to get time from {url}: {e}")
            continue

    logger.error("All time providers failed")
    raise ValueError("All time providers failed")


if __name__ == "__main__":
    current_time = get_time_from_google()
    print("Ora corrente:", current_time)
