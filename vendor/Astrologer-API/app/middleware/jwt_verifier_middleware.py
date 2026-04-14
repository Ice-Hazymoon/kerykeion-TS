"""
This is part of Astrologer API (C) 2023 Giacomo Battaglia
"""

from starlette.datastructures import Headers
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send
import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError, InvalidSignatureError
import logging
from typing import Union


class AsymmetricJWTVerifierMiddleware:
    def __init__(self, app: ASGIApp, public_key: str, algorithm: str = "RS256", token_header_name: str = "Authorization", bearer_prefix: str = "Bearer ") -> None:
        """
        Middleware for verifying asymmetric JWT tokens.

        Args:
            app: The ASGI application
            public_key: The public key to verify the JWT
            algorithm: The algorithm used (default: RS256)
            token_header_name: Name of the header containing the token (default: Authorization)
            bearer_prefix: Token prefix (default: "Bearer ")
        """
        self.app = app
        self.public_key = public_key
        self.algorithm = algorithm
        self.token_header_name = token_header_name
        self.bearer_prefix = bearer_prefix

        if not self.public_key:
            logging.critical("Public key not set. The middleware will let all requests pass through!")

    def _extract_token_from_header(self, header_value: str) -> Union[str, None]:
        """
        Extracts the token from the header by removing the Bearer prefix.

        Args:
            header_value: The Authorization header value

        Returns:
            The JWT token without prefix, or None if invalid
        """
        if not header_value:
            return None

        if header_value.startswith(self.bearer_prefix):
            return header_value[len(self.bearer_prefix) :].strip()

        return None

    def _verify_jwt_token(self, token: str) -> bool:
        """
        Verifies the validity of the JWT token.

        Args:
            token: The JWT token to verify

        Returns:
            True if the token is valid, False otherwise
        """
        if not token:
            return False

        try:
            # Verify the token using the public key
            jwt.decode(token, self.public_key, algorithms=[self.algorithm], options={"verify_exp": True, "verify_signature": True})
            return True

        except ExpiredSignatureError:
            logging.warning("JWT token has expired")
            return False
        except InvalidSignatureError:
            logging.warning("JWT token has invalid signature")
            return False
        except InvalidTokenError as e:
            logging.warning(f"JWT token is invalid: {str(e)}")
            return False
        except Exception as e:
            logging.error(f"Unexpected error during JWT verification: {str(e)}")
            return False

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """
        ASGI middleware that verifies JWT tokens in requests.
        """
        # Extract headers from the request
        headers = Headers(scope=scope)
        auth_header = headers.get(self.token_header_name, "")

        # Extract the token from the header
        token = self._extract_token_from_header(auth_header)

        # Verify the token (only if token is present)
        if token and self._verify_jwt_token(token):
            # Valid token, proceed with the request
            await self.app(scope, receive, send)
        else:
            # Invalid token, return 401 error
            response = JSONResponse(status_code=401, content={"status": "KO", "message": "Unauthorized - Invalid or missing JWT token"})
            await response(scope, receive, send)
