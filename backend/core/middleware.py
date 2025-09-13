import logging

logger = logging.getLogger('sandy.middleware')

class DebugHeadersMiddleware:
    """Debug middleware to log all incoming headers for troubleshooting"""
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only debug /api/auth/me/ requests to avoid spam
        if '/api/auth/me/' in request.path:
            logger.info(f"DEBUG MIDDLEWARE: Request to {request.path}")
            logger.info(f"DEBUG MIDDLEWARE: Method: {request.method}")
            logger.info(f"DEBUG MIDDLEWARE: Headers:")
            
            # Log all HTTP headers
            for key, value in request.META.items():
                if key.startswith('HTTP_'):
                    header_name = key[5:].replace('_', '-')
                    # Truncate auth token for security
                    if 'AUTHORIZATION' in key.upper():
                        value = value[:50] + '...' if len(value) > 50 else value
                    logger.info(f"  {header_name}: {value}")
            
            # Check if Authorization header is present
            auth_header = request.META.get('HTTP_AUTHORIZATION')
            if auth_header:
                logger.info(f"DEBUG MIDDLEWARE: Authorization header found: {auth_header[:50]}...")
            else:
                logger.info("DEBUG MIDDLEWARE: No Authorization header found!")
                
            # Check if X-Auth-Token header is present
            x_auth_header = request.META.get('HTTP_X_AUTH_TOKEN')
            if x_auth_header:
                logger.info(f"DEBUG MIDDLEWARE: X-Auth-Token header found: {x_auth_header[:50]}...")
            else:
                logger.info("DEBUG MIDDLEWARE: No X-Auth-Token header found!")
                
            # Check Content-Type
            content_type = request.META.get('CONTENT_TYPE')
            logger.info(f"DEBUG MIDDLEWARE: Content-Type: {content_type}")
            
            # Check Origin
            origin = request.META.get('HTTP_ORIGIN')
            logger.info(f"DEBUG MIDDLEWARE: Origin: {origin}")

        response = self.get_response(request)
        return response