import json
import pytest
from django.test import RequestFactory
from . import health as health_module
from .health import health_check

@pytest.mark.django_db
def test_health_check_db_ok_no_redis_env(monkeypatch):
    monkeypatch.delenv("REDIS_URL", raising=False)
    # Ensure no REDIS_URL in environment
    monkeypatch.delenv("REDIS_URL", raising=False)

    rf = RequestFactory()
    request = rf.get("/health")
    response = health_check(request)

    assert response.status_code == 200
    data = json.loads(response.content.decode())
    assert data["db"] == "ok"
    assert data["redis"] == "skipped"


@pytest.mark.django_db
def test_health_check_db_error(monkeypatch):
    monkeypatch.delenv("REDIS_URL", raising=False)
    # Simulate DB cursor raising on enter
    class BadCursor:
        def __enter__(self):
            raise Exception("db failure")
        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(health_module.connection, "cursor", lambda: BadCursor())

    rf = RequestFactory()
    request = rf.get("/health")
    response = health_check(request)

    assert response.status_code == 503
    data = json.loads(response.content.decode())
    assert data["db"].startswith("error:")
    # If REDIS_URL not set, redis should remain skipped
    assert data["redis"] == "skipped"


def test_health_check_redis_ok(monkeypatch):
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")

    class DummyRedis:
        @classmethod
        def from_url(cls, url):
            return cls()
        def ping(self):
            return True
        def close(self):
            pass

    monkeypatch.setattr(health_module, "Redis", DummyRedis)

    rf = RequestFactory()
    request = rf.get("/health")
    response = health_check(request)

    assert response.status_code == 200
    data = json.loads(response.content.decode())
    assert data["db"] == "ok"
    assert data["redis"] == "ok"


def test_health_check_redis_error(monkeypatch):
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")

    class DummyRedisErr:
        @classmethod
        def from_url(cls, url):
            return cls()
        def ping(self):
            raise Exception("redis down")
        def close(self):
            pass

    monkeypatch.setattr(health_module, "Redis", DummyRedisErr)

    rf = RequestFactory()
    request = rf.get("/health")
    response = health_check(request)

    assert response.status_code == 200
    data = json.loads(response.content.decode())
    assert data["redis"].startswith("error:")


def test_health_check_redis_missing_lib(monkeypatch):
    # Simulate REDIS_URL present but redis library missing
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setattr(health_module, "Redis", None)

    rf = RequestFactory()
    request = rf.get("/health")
    response = health_check(request)

    assert response.status_code == 200
    data = json.loads(response.content.decode())
"""
This module is intentionally empty.

Health-check tests for the core app should live under:

    backend/apps/core/tests/test_health.py

in accordance with the project's test organization pattern.
"""