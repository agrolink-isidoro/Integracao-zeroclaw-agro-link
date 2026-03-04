import pytest
from django.test import RequestFactory
from rest_framework.response import Response

from apps.core.middleware.forbidden_logger import ResponseForbiddenMiddleware


def test_middleware_sets_header_on_200_with_code_403():
    rf = RequestFactory()
    req = rf.get("/")

    def get_response(request):
        r = Response({"code": 403, "detail": "Forbidden"}, status=200)
        # Simulate rendered JSON response
        r['Content-Type'] = 'application/json'
        return r

    mw = ResponseForbiddenMiddleware(get_response)
    resp = mw(req)

    # DRF Response maps headers into resp._headers or resp.headers depending on version; check via __contains__
    assert resp.status_code == 200
    # Ensure header added
    assert resp.get('X-Forbidden-Payload') == '1'
