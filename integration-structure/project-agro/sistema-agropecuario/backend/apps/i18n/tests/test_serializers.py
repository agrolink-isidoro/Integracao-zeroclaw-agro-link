import pytest

from apps.i18n.serializers import LanguageSerializer


@pytest.mark.django_db
def test_language_serializer_valid():
    data = {"code": "pt-BR", "name": "Português (Brasil)", "is_active": True}
    serializer = LanguageSerializer(data=data)
    assert serializer.is_valid(), serializer.errors
