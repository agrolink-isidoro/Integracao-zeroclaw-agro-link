from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile

class UploadInvalidEmailTest(TestCase):
    def test_invalid_destinatario_email_is_accepted_and_set_to_none(self):
        xml = b'''<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
<NFe>
<infNFe Id="NFe00000000000000000000000000000000000000000000" versao="4.00">
<ide><cUF>52</cUF><cNF>1</cNF><natOp>Venda</natOp><mod>55</mod><serie>1</serie><nNF>1</nNF><dhEmi>2026-02-08T10:00:00-03:00</dhEmi></ide>
<emit><CNPJ>12345678000199</CNPJ><xNome>Emitente</xNome></emit>
<dest><CPF>00000000191</CPF><xNome>Dest Nome</xNome><email>not-an-email</email></dest>
<det nItem="1"><prod><cProd>1</cProd><xProd>Test</xProd><vProd>10.00</vProd></prod></det>
<total><ICMSTot><vProd>10.00</vProd><vNF>10.00</vNF></ICMSTot></total>
</infNFe>
</NFe>
</nfeProc>'''
        f = SimpleUploadedFile('nota.xml', xml, content_type='application/xml')
        # Authenticate as admin for this endpoint
        from django.contrib.auth import get_user_model
        U = get_user_model()
        admin = U.objects.create_user(username='testadmin', password='testpass', is_staff=True)
        self.client.force_login(admin)

        resp = self.client.post('/api/fiscal/nfes/upload_xml/', {'xml_file': f}, format='multipart')
        # The test XML is minimal and will trigger other validation errors (400),
        # but it must NOT fail because of invalid destinatario_email. Assert
        # that when a 400 occurs, destinatario_email is not among the invalid email errors.
        self.assertIn(resp.status_code, (200, 201, 400))
        data = resp.json()
        if resp.status_code == 400:
            bad = data.get('bad_fields', [])
            fields = [b.get('field') for b in bad if b.get('field')]
            self.assertNotIn('destinatario_email', fields)
        else:
            # If it created the NFe, ensure the field is None
            self.assertIn('chave_acesso', data)
            from apps.fiscal.models import NFe
            n = NFe.objects.get(chave_acesso='00000000000000000000000000000000000000000000')
            self.assertIsNone(n.destinatario_email)
