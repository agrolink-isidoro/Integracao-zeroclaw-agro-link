import pytest
from rest_framework.test import APIClient

from apps.i18n.models import Language


@pytest.mark.django_db
def test_list_languages():
    Language.objects.create(code="en", name="English", is_active=True)
    client = APIClient()
    resp = client.get("/api/languages/")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(item.get("code") == "en" for item in data)
