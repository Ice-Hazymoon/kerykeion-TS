"""
Miscellaneous endpoints.

Health check and status probes only.
"""

from logging import getLogger
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ..config.settings import settings
from ..types.response_models import (
    StatusResponseModel,
    ApiStatusResponseModel,
)
from ..utils.logging_utils import log_request

logger = getLogger(__name__)
router = APIRouter()


@router.get(
    "/health",
    response_description="Health check",
    include_in_schema=False,
    response_model=StatusResponseModel,
)
async def health() -> JSONResponse:
    """
    **GET** `/health`

    Public liveness probe for load balancers and monitoring.
    This endpoint is excluded from authentication.

    **Returns:**
    - `status`: "OK"
    """
    return JSONResponse(content={"status": "OK"}, status_code=200)


@router.get(
    "/",
    response_description="Status of the API",
    include_in_schema=False,
    response_model=ApiStatusResponseModel,
)
async def status(request: Request) -> JSONResponse:
    """
    **GET** `/`

    Returns basic API status and environment information. Not included in the public schema.

    **Returns:**
    - `status`: "OK"
    - `environment`: deployment environment name
    - `debug`: whether debug mode is enabled
    """
    log_request(logger, request, "API status check")
    response_dict = {
        "status": "OK",
        "environment": settings.env_type,
        "debug": settings.debug,
    }
    return JSONResponse(content=response_dict, status_code=200)
