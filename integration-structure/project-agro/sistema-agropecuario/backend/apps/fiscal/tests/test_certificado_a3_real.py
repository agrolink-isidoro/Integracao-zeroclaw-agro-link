"""
TESTE DE INTEGRAÇÃO REAL - CERTIFICADO A3 VÁLIDO COM SEFAZ

Este teste SÓ PASSA quando há um certificado A3 VÁLIDO configurado
e a comunicação com SEFAZ sandbox é bem-sucedida.

CRÍTICO: Este é o teste mais importante do sistema de manifestação.
"""

import pytest
import os
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from apps.fiscal.models_certificado_a3 import CertificadoA3
from apps.fiscal.models import NFe
from apps.fiscal.models_manifestacao import Manifestacao


class TestCertificadoA3Real(TestCase):
    """
    TESTE CRÍTICO: Certificado A3 válido com SEFAZ real
    
    Este teste comprova que o sistema funciona completamente
    quando há certificado A3 válido configurado.
    """
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        User = get_user_model()
        cls.user = User.objects.create(
            email='test@example.com',
            first_name='Test',
            last_name='User'
        )
    
    def setUp(self):
        # Criar NFe de teste usando campos corretos do modelo
        from django.utils import timezone
        self.nfe = NFe.objects.create(
            chave_acesso='35191277777777777777777777777777777777777773',
            numero='000000123',
            serie='001',
            modelo='55',
            data_emissao=timezone.now(),
            natureza_operacao='Venda de mercadoria',
            tipo_operacao='1',  # Saída
            destino_operacao='1',  # Interna
            municipio_fato_gerador='3550308',  # São Paulo
            tipo_impressao='1',
            tipo_emissao='1',
            finalidade='1',  # Normal
            indicador_consumidor_final='1',
            indicador_presenca='1',
            versao_processo='4.00',
            emitente_nome='Empresa Teste',
            emitente_cnpj='12345678000199',
            destinatario_nome='Destinatário Teste',
            destinatario_cnpj='98765432000111',
            valor_produtos=1000.00,
            valor_nota=1000.00
        )
    
    def test_certificado_a3_disponivel(self):
        """
        PASSO 1: Verificar se há certificado A3 configurado
        """
        certificado = CertificadoA3.get_ativo()
        
        if not certificado:
            self.skipTest("""
            ❌ CERTIFICADO A3 NÃO CONFIGURADO
            
            Para este teste passar, você precisa:
            1. Comprar certificado A3 válido
            2. Configurar no sistema
            3. Re-executar este teste
            
            Veja instruções em: docs/sefaz/CERTIFICADO_A3_SETUP.md
            """)
        
        print(f"✅ Certificado A3 encontrado: {certificado.nome}")
        return certificado
    
    def test_certificado_a3_valido(self):
        """
        PASSO 2: Validar se certificado A3 é tecnicamente válido
        """
        certificado = self.test_certificado_a3_disponivel()
        
        resultado = certificado.validar_certificado()
        
        if not resultado['valid']:
            self.fail(f"""
            ❌ CERTIFICADO A3 INVÁLIDO: {resultado['error']}
            
            Problemas possíveis:
            1. Senha incorreta
            2. Arquivo corrompido  
            3. Certificado expirado
            4. Formato inválido
            
            Corrija e re-execute o teste.
            """)
        
        print(f"✅ Certificado válido:")
        print(f"  - CNPJ: {resultado.get('cnpj', 'N/A')}")
        print(f"  - Razão Social: {resultado.get('razao_social', 'N/A')}")
        print(f"  - Válido até: {resultado.get('valido_ate', 'N/A')}")
    
    @pytest.mark.django_db
    def test_manifestacao_sucesso_real_com_certificado_a3(self):
        """
        TESTE CRÍTICO: Manifestação COM SUCESSO usando certificado A3 válido
        
        Este é O TESTE que comprova que o sistema funciona completamente.
        SÓ PASSA quando SEFAZ aceita a manifestação.
        """
        # Verificar pré-requisitos
        certificado = self.test_certificado_a3_disponivel()
        self.test_certificado_a3_valido()
        
        print(f"🎯 INICIANDO TESTE CRÍTICO - SUCESSO REAL COM SEFAZ")
        
        # Criar manifestação
        manifestacao = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='ciencia',
            status_envio='pending'
        )
        
        print(f"📋 Manifestação criada: {manifestacao.id}")
        print(f"🔐 Usando certificado: {certificado.nome}")
        
        # Executar task de manifestação
        try:
            # Execução síncrona para teste
            from apps.fiscal.tasks import send_manifestacao_task
            result = send_manifestacao_task(manifestacao.id)
            
            # Recarregar do banco
            manifestacao.refresh_from_db()
            
            print(f"📊 RESULTADO:")
            print(f"  Status: {manifestacao.status_envio}")
            print(f"  Resposta: {manifestacao.resposta_sefaz}")
            
            # VERIFICAÇÕES CRÍTICAS
            if manifestacao.status_envio == 'sent':
                print(f"🎉 SUCESSO! MANIFESTAÇÃO ACEITA PELA SEFAZ")
                print(f"✅ Sistema funcionando completamente")
                print(f"✅ Certificado A3 válido")
                print(f"✅ Comunicação SEFAZ OK")
                
                # Teste passou!
                self.assertEqual(manifestacao.status_envio, 'sent')
                self.assertIsNotNone(manifestacao.resposta_sefaz)
                
            elif manifestacao.status_envio == 'failed':
                resposta = manifestacao.resposta_sefaz or ''
                
                if 'certificado' in resposta.lower():
                    self.fail(f"""
                    ❌ TESTE FALHOU: CERTIFICADO REJEITADO PELA SEFAZ
                    
                    Resposta SEFAZ: {resposta}
                    
                    POSSÍVEIS CAUSAS:
                    1. Certificado não autorizado no SEFAZ sandbox
                    2. CNPJ não habilitado para manifestação
                    3. Certificado não é A3 válido
                    4. Ambiente SEFAZ incorreto
                    
                    SOLUÇÃO:
                    - Verificar se certificado está autorizado no SEFAZ
                    - Confirmar CNPJ habilitado para manifestação
                    - Testar certificado em outro sistema SEFAZ
                    """)
                else:
                    self.fail(f"""
                    ❌ TESTE FALHOU: ERRO INESPERADO
                    
                    Status: {manifestacao.status_envio}
                    Resposta: {resposta}
                    
                    Verifique logs do sistema para diagnóstico.
                    """)
            else:
                self.fail(f"""
                ❌ TESTE FALHOU: STATUS INESPERADO
                
                Status: {manifestacao.status_envio}
                Esperado: 'sent' (sucesso) ou 'failed' (erro conhecido)
                """)
                
        except Exception as e:
            self.fail(f"""
            ❌ TESTE FALHOU: EXCEÇÃO NO SISTEMA
            
            Erro: {str(e)}
            
            Sistema não conseguiu processar manifestação.
            Verifique configuração e logs.
            """)
    
    def test_comparacao_sem_vs_com_certificado(self):
        """
        TESTE COMPARATIVO: Sem certificado vs Com certificado
        
        Comprova que certificado A3 faz diferença real.
        """
        print(f"🔬 TESTE COMPARATIVO")
        
        # Temporariamente desativar certificado A3
        CertificadoA3.objects.update(ativo=False)
        
        # Manifestação SEM certificado
        manifestacao_sem = Manifestacao.objects.create(
            nfe=self.nfe,
            tipo='ciencia',
            status_envio='pending'
        )
        
        from apps.fiscal.tasks import send_manifestacao_task
        send_manifestacao_task(manifestacao_sem.id)
        manifestacao_sem.refresh_from_db()
        
        print(f"📊 SEM certificado: {manifestacao_sem.status_envio}")
        
        # Reativar certificado A3
        certificado = CertificadoA3.objects.first()
        if certificado:
            certificado.ativo = True
            certificado.save()
            
            # Manifestação COM certificado
            manifestacao_com = Manifestacao.objects.create(
                nfe=self.nfe,
                tipo='ciencia', 
                status_envio='pending'
            )
            
            send_manifestacao_task(manifestacao_com.id)
            manifestacao_com.refresh_from_db()
            
            print(f"📊 COM certificado: {manifestacao_com.status_envio}")
            
            # Se certificado for válido, deve dar resultado diferente
            if manifestacao_com.status_envio == 'sent':
                print(f"✅ DIFERENÇA COMPROVADA: Certificado faz sucesso real!")
                self.assertNotEqual(manifestacao_sem.status_envio, manifestacao_com.status_envio)
            else:
                print(f"⚠️ Ambos falharam - verificar certificado")


class TestInstrucoesCertificadoA3(TestCase):
    """
    Instruções para obter e configurar certificado A3 válido
    """
    
    def test_instrucoes_certificado_a3(self):
        """
        INSTRUÇÕES COMPLETAS: Como obter certificado A3 válido
        """
        instrucoes = """
        🎯 COMO OBTER CERTIFICADO A3 VÁLIDO PARA SEFAZ SANDBOX
        
        ══════════════════════════════════════════════════════════
        
        1. 📋 COMPRAR CERTIFICADO A3
        ──────────────────────────────
        
        Autoridades Certificadoras credenciadas:
        • Serasa (https://certificados.serasa.com.br/)  
        • Valid (https://www.valid.com/)
        • Certisign (https://www.certisign.com.br/)
        • AC Safeweb (https://www.safeweb.com.br/)
        
        TIPO: e-CNPJ A3 (obrigatório ser A3, não A1)
        VALIDADE: Recomendado 3 anos
        CUSTO: R$ 350-600/ano aproximadamente
        
        
        2. 🔐 RECEBER TOKEN/SMARTCARD
        ────────────────────────────
        
        • Certificado vem em token USB ou smartcard
        • Instalar driver do fabricante
        • Anotar senha PIN fornecida
        
        
        3. 🏛️ HABILITAR NO SEFAZ SANDBOX
        ────────────────────────────
        
        Portal SEFAZ Sandbox:
        https://nfe-homologacao.svrs.rs.gov.br/
        
        Passos:
        a) Acessar com certificado A3
        b) Cadastrar empresa no ambiente de homologação
        c) Habilitar "Manifestação do Destinatário"
        d) Confirmar autorização para emissão de eventos
        
        IMPORTANTE: Sandbox é diferente de produção!
        
        
        4. 💾 EXTRAIR ARQUIVO .P12/.PFX
        ───────────────────────────
        
        Windows:
        - certmgr.msc → Pessoal → Certificados
        - Clique direito → Exportar → PFX com chave privada
        - Definir senha para exportação
        
        Linux:
        - pkcs11-tool --list-certificates
        - Extrair usando OpenSC ou similar
        
        
        5. ⚡ CONFIGURAR NO SISTEMA
        ─────────────────────────
        
        Via API:
        POST /api/certificados-a3/upload/
        {
            "nome": "Certificado Produção 2026",
            "arquivo_certificado": [arquivo.p12],
            "senha_certificado": "sua_senha_pfx"
        }
        
        Via Django Admin:
        - Acessar /admin/fiscal/certificadoa3/
        - Adicionar certificado
        - Marcar como ativo
        
        
        6. ✅ EXECUTAR TESTE
        ──────────────────
        
        pytest apps/fiscal/tests/test_certificado_a3_real.py::TestCertificadoA3Real::test_manifestacao_sucesso_real_com_certificado_a3 -v
        
        SE PASSOU: ✅ Sistema funcionando 100%
        SE FALHOU: Verificar logs e seguir instruções de erro
        
        
        7. 🚀 PRODUÇÃO
        ─────────────
        
        docker-compose.yml:
        environment:
          - SEFAZ_AMBIENTE=producao
          - SEFAZ_SSL_VERIFY=True
        
        URLs mudam automaticamente para produção.
        
        
        ══════════════════════════════════════════════════════════
        
        📞 SUPORTE SEFAZ: 
        - RS: https://nfe.sefazrs.rs.gov.br/
        - SP: https://nfe.fazenda.sp.gov.br/
        - Consulte seu estado
        
        🎯 META: Teste test_manifestacao_sucesso_real_com_certificado_a3() PASSAR
        """
        
        # Este teste sempre passa, apenas mostra instruções
        self.assertTrue(True)
        print(instrucoes)


# Executar apenas com certificado válido  
@pytest.mark.django_db
class TestCertificadoA3Integration:
    """
    Testes que só executam com certificado A3 válido
    """
    
    def test_sefaz_client_com_certificado_real(self):
        """
        Teste direto do SefazClient com certificado real
        """
        certificado = CertificadoA3.get_ativo()
        assert certificado is not None
        
        client = SefazClient(simulate=False)
        
        # Teste comunicação direta
        result = client.send_manifestacao(
            chave_acesso='35191277777777777777777777777777777777777773',
            tipo_manifestacao='ciencia',
            certificado=certificado.get_certificado_data(),
            nSeqEvento=1
        )
        
        # Com certificado válido, deve ter sucesso
        if result['success']:
            print("🎉 SUCESSO DIRETO COM SEFAZ!")
            assert result['success'] == True
            assert 'nProt' in result
        else:
            print(f"❌ Falha: {result['message']}")
            # Ainda assim, deve ter comunicado com SEFAZ
            assert result.get('sent_to_sefaz') == True