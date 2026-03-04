from django.test import SimpleTestCase
from apps.fiscal.utils import validate_chave_acesso


class ValidateChaveAcessoTest(SimpleTestCase):
    def test_valid_chave(self):
        # Chave válida retirada do fixture XML
        chave = '52251004621697000179550010000100511374580195'
        self.assertTrue(validate_chave_acesso(chave))

    def test_invalid_length(self):
        self.assertFalse(validate_chave_acesso('123'))

    def test_non_numeric(self):
        self.assertFalse(validate_chave_acesso('A' * 44))

    def test_invalid_digit(self):
        # Alterar o DV para um dígito incorreto
        chave = '52251004621697000179550010000100511374580194'
        self.assertFalse(validate_chave_acesso(chave))
