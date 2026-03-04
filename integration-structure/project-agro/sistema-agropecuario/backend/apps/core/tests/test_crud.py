import pytest
from rest_framework.test import APIClient

from apps.core.models import CustomUser


@pytest.mark.django_db
def test_create_retrieve_update_delete_user():
    # create admin to authenticate for unsafe actions
    admin = CustomUser.objects.create_superuser(
        username="admin", email="adm@example.com", password="adminpass"
    )
    client = APIClient()
    client.force_authenticate(admin)

    # Create
    payload = {"username": "bob", "email": "bob@example.com", "password": "bobpass"}
    resp = client.post("/api/users/", payload, format="json")
    assert resp.status_code == 201
    data = resp.json()
    user_id = data.get("id")
    assert data.get("username") == "bob"

    # Retrieve
    resp = client.get(f"/api/users/{user_id}/")
    assert resp.status_code == 200
    assert resp.json().get("username") == "bob"

    # Update (change username and password)
    resp = client.patch(
        f"/api/users/{user_id}/",
        {"username": "bobby", "password": "newpass"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.json().get("username") == "bobby"

    # Verify password changed through ORM
    u = CustomUser.objects.get(pk=user_id)
    assert u.check_password("newpass")

    # Delete
    resp = client.delete(f"/api/users/{user_id}/")
    assert resp.status_code in (204, 200, 202)

    # Ensure not found
    resp = client.get(f"/api/users/{user_id}/")
    assert resp.status_code == 404
