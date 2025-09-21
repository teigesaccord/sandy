from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework import exceptions
from django.contrib.auth import get_user_model
import logging

User = get_user_model()
logger = logging.getLogger('sandy.authentication')


class CustomJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication that supports:
    1. Authorization header
    2. X-Auth-Token header  
    3. Query parameter 'token' (bypasses CORS entirely)
    """
    
    def authenticate(self, request):
        """
        First try query parameter (no CORS issues), then cookies, then headers
        """
        logger.info(f"CustomJWT: Authenticating request to {request.path}")
        
        # Try query parameter first (no CORS preflight)
        token = request.GET.get('token')
        if token:
            logger.info(f"CustomJWT: Found token in query parameter: {token[:50]}...")
            try:
                validated_token = AccessToken(token)
                user = self.get_user(validated_token)
                logger.info(f"CustomJWT: Successfully authenticated user {user.id} via query param")
                return (user, validated_token)
            except (InvalidToken, TokenError) as e:
                logger.warning(f"CustomJWT: Query param token validation failed: {e}")
                pass
        else:
            logger.info("CustomJWT: No token found in query parameters")
        
        # Try HTTP-only auth-token cookie
        cookie_token = request.COOKIES.get('auth-token')
        if cookie_token:
            logger.info(f"CustomJWT: Found token in cookie: {cookie_token[:50]}...")
            try:
                validated_token = AccessToken(cookie_token)
                user = self.get_user(validated_token)
                logger.info(f"CustomJWT: Successfully authenticated user {user.id} via cookie")
                return (user, validated_token)
            except (InvalidToken, TokenError) as e:
                logger.warning(f"CustomJWT: Cookie token validation failed: {e}")
                pass
        else:
            logger.info("CustomJWT: No token found in cookies")
        
        # Fall back to standard header-based authentication
        logger.info("CustomJWT: Falling back to header-based authentication")
        result = super().authenticate(request)
        if result:
            logger.info(f"CustomJWT: Header auth successful for user {result[0].id}")
        else:
            logger.info("CustomJWT: Header auth failed or no headers found")
        return result
    
    def get_header(self, request):
        """
        Extracts the header containing the JSON web token from the given request.
        First tries Authorization header, then falls back to X-Auth-Token header.
        """
        # Try standard Authorization header first
        header = request.META.get('HTTP_AUTHORIZATION')
        if header is not None:
            return header.encode('iso-8859-1')
        
        # Fall back to custom X-Auth-Token header to bypass CORS preflight
        custom_header = request.META.get('HTTP_X_AUTH_TOKEN')
        if custom_header is not None:
            # Add Bearer prefix if not present
            if not custom_header.startswith('Bearer '):
                custom_header = f'Bearer {custom_header}'
            return custom_header.encode('iso-8859-1')
        
        return None

    def get_raw_token(self, header):
        """
        Extracts an unvalidated JSON web token from the given "Authorization"
        HTTP header value or from X-Auth-Token header.
        """
        parts = header.split()

        if len(parts) == 0:
            # Empty header sent
            return None

        if parts[0].decode('iso-8859-1') != 'Bearer':
            # Assume the header does not contain a JSON web token
            return None

        if len(parts) != 2:
            raise exceptions.AuthenticationFailed(
                'Authorization header must contain two space-delimited values',
                code='bad_authorization_header',
            )

        return parts[1]