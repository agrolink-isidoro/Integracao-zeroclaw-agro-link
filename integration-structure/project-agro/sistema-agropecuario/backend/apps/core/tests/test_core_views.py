import pytest
from rest_framework.test import APIClient

from apps.core.models import CustomUser


@pytest.mark.django_db
def test_list_users():
    alice = CustomUser.objects.create_superuser(
        username="alice", email="alice@example.com", password="pass"
    )
    client = APIClient()
    client.force_authenticate(user=alice)
    resp = client.get("/api/users/")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(u.get("username") == "alice" for u in data)
