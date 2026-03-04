import pytest
from django.core.management import call_command
from django.apps import apps


@pytest.mark.django_db
def test_seed_dev_creates_superuser(monkeypatch):
    monkeypatch.setenv("DEV_SUPERUSER_USERNAME", "seed_test_user")
    monkeypatch.setenv("DEV_SUPERUSER_EMAIL", "seed@test.local")
    monkeypatch.setenv("DEV_SUPERUSER_PASSWORD", "seedpass")

    # Run command
    call_command("seed_dev")

    User = apps.get_model("core", "CustomUser")
    assert User.objects.filter(username="seed_test_user").exists()


@pytest.mark.django_db
def test_seed_dev_creates_demo_data(monkeypatch):
    # Enable demo data creation
    monkeypatch.setenv("DEV_SUPERUSER_USERNAME", "seed_test_user2")
    monkeypatch.setenv("DEV_CREATE_DEMO_DATA", "true")

    call_command("seed_dev")

    # Verificar se demo proprietario/fazenda/area foram criados se app disponível
    try:
        Proprietario = apps.get_model("fazendas", "Proprietario")
        Fazenda = apps.get_model("fazendas", "Fazenda")
        Area = apps.get_model("fazendas", "Area")

        assert Proprietario.objects.filter(nome="Proprietario Demo").exists()
        assert Fazenda.objects.filter(name="Fazenda Demo").exists()
        assert Area.objects.filter(name="Area Demo").exists()
    except LookupError:
        pytest.skip("App 'fazendas' não está disponível neste ambiente de teste")
