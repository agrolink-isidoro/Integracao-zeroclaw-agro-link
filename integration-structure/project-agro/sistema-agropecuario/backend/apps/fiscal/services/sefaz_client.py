import os
import requests
import xml.etree.ElementTree as ET
from django.conf import settings

class SefazService:
    """Mock/Stub de Desacoplamento para comunicação com a SEFAZ."""
    @staticmethod
    def get_sefaz_url(uf):
        return settings.SEFAZ_DISTRIB_ENDPOINT
