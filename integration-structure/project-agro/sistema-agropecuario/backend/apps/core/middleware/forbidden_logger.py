import logging
from typing import Any

logger = logging.getLogger('django.request')

class ResponseForbiddenMiddleware:
    """Middleware that detects responses with payloads like {"code": 403}
    returned with HTTP 200 and logs them for investigation.

    This middleware is intentionally conservative: it only logs and tags the
    response with a header for easier correlation in request traces. It does
    not alter the body or status code.
    """

    def __init__(self, get_response: Any):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        try:
            # Only inspect JSON-like responses
            content_type = response.get('Content-Type', '')
            if 'application/json' in content_type:
                # try to access .data (DRF Response) or .content
                data = None
                if hasattr(response, 'data'):
                    data = getattr(response, 'data')
                else:
                    # response.content may be bytes
                    import json
                    try:
                        content = response.content
                        if isinstance(content, bytes):
                            content = content.decode('utf-8')
                        data = json.loads(content) if content else None
                    except Exception:
                        data = None

                if data and isinstance(data, dict) and data.get('code') == 403 and response.status_code == 200:
                    logger.warning(
                        'Detected 200-with-403 payload on %s user=%s payload=%s',
                        request.path, getattr(request, 'user', None), data
                    )
                    # Add a short header to responses in dev to make detection easier
                    try:
                        response['X-Forbidden-Payload'] = '1'
                    except Exception:
                        pass
        except Exception as exc:
            logger.exception('Error while inspecting response for forbidden payloads: %s', exc)

        return response
