"""
FASE 5: Service para conciliação bancária com suporte a múltiplos bancos.

Suporta importação e conciliação de extratos bancários nos formatos:
- CSV: Banco do Brasil, Itaú, Bradesco, Caixa, Sicoob
- OFX: Padrão universal (futuro)

Algoritmos de matching automático baseado em:
- Data (± 3 dias de tolerância)
- Valor (exato ou com pequena diferença)
- Descrição (similaridade)
"""
import csv
import io
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Tuple
from difflib import SequenceMatcher

from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model

from ..models import (
    ItemExtratoBancario,
    ContaBancaria,
    Vencimento,
    Transferencia
)

User = get_user_model()


class BankStatementParser:
    """Classe base para parsers de extratos bancários."""
    
    def parse(self, file_content: str, conta: ContaBancaria) -> List[Dict]:
        """
        Parseia o conteúdo do arquivo e retorna lista de transações.
        
        Returns:
            List[Dict]: Lista com dicts contendo:
                - data: datetime.date
                - descricao: str
                - valor: Decimal
                - tipo: 'DEBITO' ou 'CREDITO'
        """
        raise NotImplementedError
    
    def detect_encoding(self, file_bytes: bytes) -> str:
        """Detecta encoding do arquivo (UTF-8, ISO-8859-1, etc.)."""
        encodings = ['utf-8', 'iso-8859-1', 'cp1252']
        for encoding in encodings:
            try:
                file_bytes.decode(encoding)
                return encoding
            except UnicodeDecodeError:
                continue
        return 'utf-8'  # fallback


class BancoDoBrasilParser(BankStatementParser):
    """
    Parser para extratos CSV do Banco do Brasil.
    
    Formato esperado (separado por vírgulas):
    Data,Histórico,Débito,Crédito,Saldo
    01/01/2024,PIX TRANSFERENCIA,-100.50,,1500.00
    02/01/2024,DEPOSITO EM DINHEIRO,,500.00,2000.00
    """
    
    def parse(self, file_content: str, conta: ContaBancaria) -> List[Dict]:
        transacoes = []
        reader = csv.DictReader(io.StringIO(file_content))
        
        for row in reader:
            try:
                data_str = row.get('Data', '').strip()
                if not data_str:
                    continue
                
                data = datetime.strptime(data_str, '%d/%m/%Y').date()
                descricao = row.get('Histórico', row.get('Historico', '')).strip()
                
                debito_str = row.get('Débito', row.get('Debito', '')).strip().replace('.', '').replace(',', '.')
                credito_str = row.get('Crédito', row.get('Credito', '')).strip().replace('.', '').replace(',', '.')
                
                if debito_str:
                    valor = Decimal(debito_str)
                    tipo = 'DEBITO'
                elif credito_str:
                    valor = Decimal(credito_str)
                    tipo = 'CREDITO'
                else:
                    continue
                
                transacoes.append({
                    'data': data,
                    'descricao': descricao,
                    'valor': abs(valor),
                    'tipo': tipo
                })
            except (ValueError, KeyError) as e:
                # Log error but continue processing
                continue
        
        return transacoes


class ItauParser(BankStatementParser):
    """
    Parser para extratos CSV do Itaú.
    
    Formato esperado (separado por ponto-e-vírgula):
    data;lançamento;valor;saldo
    01/01/2024;PIX ENVIADO;-100,50;1500,00
    02/01/2024;DEPOSITO;500,00;2000,00
    """
    
    def parse(self, file_content: str, conta: ContaBancaria) -> List[Dict]:
        transacoes = []
        reader = csv.DictReader(io.StringIO(file_content), delimiter=';')
        
        for row in reader:
            try:
                data_str = row.get('data', '').strip()
                if not data_str:
                    continue
                
                data = datetime.strptime(data_str, '%d/%m/%Y').date()
                descricao = row.get('lançamento', row.get('lancamento', '')).strip()
                
                valor_str = row.get('valor', '').strip().replace('.', '').replace(',', '.')
                if not valor_str:
                    continue
                
                valor = Decimal(valor_str)
                tipo = 'DEBITO' if valor < 0 else 'CREDITO'
                
                transacoes.append({
                    'data': data,
                    'descricao': descricao,
                    'valor': abs(valor),
                    'tipo': tipo
                })
            except (ValueError, KeyError):
                continue
        
        return transacoes


class BradescoParser(BankStatementParser):
    """
    Parser para extratos CSV do Bradesco.
    
    Formato similar ao BB.
    """
    
    def parse(self, file_content: str, conta: ContaBancaria) -> List[Dict]:
        # Usa mesmo formato do BB
        return BancoDoBrasilParser().parse(file_content, conta)


class CaixaParser(BankStatementParser):
    """
    Parser para extratos CSV da Caixa Econômica Federal.
    
    Formato: Data;Descrição;Valor;Tipo
    """
    
    def parse(self, file_content: str, conta: ContaBancaria) -> List[Dict]:
        transacoes = []
        reader = csv.DictReader(io.StringIO(file_content), delimiter=';')
        
        for row in reader:
            try:
                data_str = row.get('Data', '').strip()
                if not data_str:
                    continue
                
                data = datetime.strptime(data_str, '%d/%m/%Y').date()
                descricao = row.get('Descrição', row.get('Descricao', '')).strip()
                
                valor_str = row.get('Valor', '').strip().replace('.', '').replace(',', '.')
                tipo_str = row.get('Tipo', '').strip().upper()
                
                valor = Decimal(valor_str)
                tipo = 'DEBITO' if tipo_str in ['D', 'DEBITO', 'DÉBITO'] else 'CREDITO'
                
                transacoes.append({
                    'data': data,
                    'descricao': descricao,
                    'valor': abs(valor),
                    'tipo': tipo
                })
            except (ValueError, KeyError):
                continue
        
        return transacoes


class SicoobParser(BankStatementParser):
    """Parser para extratos CSV do Sicoob."""
    
    def parse(self, file_content: str, conta: ContaBancaria) -> List[Dict]:
        # Formato similar ao Itaú
        return ItauParser().parse(file_content, conta)


class ConciliacaoService:
    """Service principal para conciliação bancária."""
    
    PARSERS = {
        'bb': BancoDoBrasilParser,
        'itau': ItauParser,
        'bradesco': BradescoParser,
        'caixa': CaixaParser,
        'sicoob': SicoobParser,
    }
    
    @classmethod
    def detectar_banco(cls, file_content: str) -> Optional[str]:
        """
        Tenta detectar o banco baseado no conteúdo do arquivo.
        
        Returns:
            str: Código do banco ('bb', 'itau', etc.) ou None
        """
        content_lower = file_content.lower()
        
        if 'banco do brasil' in content_lower or 'bb' in content_lower[:100]:
            return 'bb'
        elif 'itau' in content_lower or 'itaú' in content_lower:
            return 'itau'
        elif 'bradesco' in content_lower:
            return 'bradesco'
        elif 'caixa' in content_lower or 'cef' in content_lower:
            return 'caixa'
        elif 'sicoob' in content_lower:
            return 'sicoob'
        
        return None
    
    @classmethod
    @transaction.atomic
    def importar_extrato(
        cls,
        arquivo: bytes,
        conta_bancaria_id: int,
        banco: Optional[str] = None,
        usuario: Optional[User] = None,
        arquivo_nome: str = 'extrato.csv'
    ) -> Dict:
        """
        Importa extrato bancário e cria ItemExtratoBancario.
        
        Args:
            arquivo: Bytes do arquivo CSV
            conta_bancaria_id: ID da conta bancária
            banco: Código do banco ('bb', 'itau', etc.) ou None para autodetect
            usuario: User que está importando
            arquivo_nome: Nome do arquivo original
            
        Returns:
            Dict com:
                - itens_importados: int
                - itens_duplicados: int
                - erros: List[str]
        """
        conta = ContaBancaria.objects.get(id=conta_bancaria_id)
        
        # Detectar encoding e decodificar
        parser_base = BankStatementParser()
        encoding = parser_base.detect_encoding(arquivo)
        file_content = arquivo.decode(encoding)
        
        # Detectar banco se não especificado
        if not banco:
            banco = cls.detectar_banco(file_content)
            if not banco:
                raise ValueError("Não foi possível detectar o banco automaticamente. Especifique manualmente.")
        
        # Obter parser
        parser_class = cls.PARSERS.get(banco)
        if not parser_class:
            raise ValueError(f"Banco '{banco}' não suportado. Bancos suportados: {list(cls.PARSERS.keys())}")
        
        parser = parser_class()
        transacoes = parser.parse(file_content, conta)
        
        itens_importados = 0
        itens_duplicados = 0
        erros = []
        
        for transacao in transacoes:
            try:
                # Verificar duplicatas (mesma conta, data, valor, descrição)
                existe = ItemExtratoBancario.objects.filter(
                    conta_bancaria=conta,
                    data=transacao['data'],
                    valor=transacao['valor'],
                    descricao=transacao['descricao'][:100]  # Primeiros 100 chars
                ).exists()
                
                if existe:
                    itens_duplicados += 1
                    continue
                
                # Criar item
                ItemExtratoBancario.objects.create(
                    conta_bancaria=conta,
                    data=transacao['data'],
                    descricao=transacao['descricao'],
                    valor=transacao['valor'],
                    tipo=transacao['tipo'],
                    arquivo_origem=arquivo_nome,
                    importado_por=usuario
                )
                itens_importados += 1
            
            except Exception as e:
                erros.append(f"Erro ao processar transação {transacao.get('data')}: {str(e)}")
        
        return {
            'itens_importados': itens_importados,
            'itens_duplicados': itens_duplicados,
            'total_transacoes': len(transacoes),
            'erros': erros
        }
    
    @classmethod
    def calcular_similaridade(cls, texto1: str, texto2: str) -> float:
        """Calcula similaridade entre duas strings (0.0 a 1.0)."""
        return SequenceMatcher(None, texto1.lower(), texto2.lower()).ratio()
    
    @classmethod
    def match_automatico(
        cls,
        conta_bancaria_id: int,
        data_inicio: Optional[datetime.date] = None,
        data_fim: Optional[datetime.date] = None,
        tolerancia_dias: int = 3,
        tolerancia_valor: Decimal = Decimal('0.01'),
        similaridade_minima: float = 0.6
    ) -> Dict:
        """
        Realiza matching automático entre itens de extrato não conciliados e vencimentos.
        
        Args:
            conta_bancaria_id: ID da conta bancária
            data_inicio/fim: Período para conciliação (None = todos)
            tolerancia_dias: Dias de diferença aceita entre datas
            tolerancia_valor: Diferença máxima aceita no valor
            similaridade_minima: Similaridade mínima para match de descrição
            
        Returns:
            Dict com:
                - matches_encontrados: int
                - conciliados: int
                - nao_conciliados: int
                - sugestoes: List[Dict] (para revisão manual)
        """
        conta = ContaBancaria.objects.get(id=conta_bancaria_id)
        
        # Buscar itens não conciliados
        itens_qs = ItemExtratoBancario.objects.filter(
            conta_bancaria=conta,
            conciliado=False
        )
        
        if data_inicio:
            itens_qs = itens_qs.filter(data__gte=data_inicio)
        if data_fim:
            itens_qs = itens_qs.filter(data__lte=data_fim)
        
        matches_encontrados = 0
        conciliados = 0
        nao_conciliados = 0
        sugestoes = []
        
        for item in itens_qs:
            # Buscar vencimentos candidatos
            data_min = item.data - timedelta(days=tolerancia_dias)
            data_max = item.data + timedelta(days=tolerancia_dias)
            
            vencimentos_candidatos = Vencimento.objects.filter(
                conta_bancaria=conta,
                confirmado_extrato=False,
                status='pendente',
                data_vencimento__gte=data_min,
                data_vencimento__lte=data_max,
                valor__gte=item.valor - tolerancia_valor,
                valor__lte=item.valor + tolerancia_valor
            )
            
            # Filtrar por tipo (débito = despesa, crédito = receita)
            if item.tipo == 'DEBITO':
                vencimentos_candidatos = vencimentos_candidatos.filter(tipo='despesa')
            else:
                vencimentos_candidatos = vencimentos_candidatos.filter(tipo='receita')
            
            if not vencimentos_candidatos.exists():
                nao_conciliados += 1
                continue
            
            # Calcular similaridade com cada candidato
            candidatos_com_score = []
            for venc in vencimentos_candidatos:
                similaridade = cls.calcular_similaridade(item.descricao, venc.titulo)
                if similaridade >= similaridade_minima:
                    candidatos_com_score.append({
                        'vencimento': venc,
                        'similaridade': similaridade,
                        'diferenca_dias': abs((item.data - venc.data_vencimento).days),
                        'diferenca_valor': abs(item.valor - venc.valor)
                    })
            
            if not candidatos_com_score:
                nao_conciliados += 1
                continue
            
            # Ordenar por score (similaridade desc, diferenca dias asc, diferenca valor asc)
            candidatos_com_score.sort(
                key=lambda x: (-x['similaridade'], x['diferenca_dias'], x['diferenca_valor'])
            )
            
            melhor_candidato = candidatos_com_score[0]
            matches_encontrados += 1
            
            # Se score muito alto, conciliar automaticamente
            if melhor_candidato['similaridade'] >= 0.9 and melhor_candidato['diferenca_valor'] <= Decimal('0.01'):
                item.conciliar_com_vencimento(melhor_candidato['vencimento'])
                conciliados += 1
            else:
                # Adicionar às sugestões para revisão manual
                sugestoes.append({
                    'item_id': item.id,
                    'item_data': item.data.isoformat(),
                    'item_descricao': item.descricao,
                    'item_valor': float(item.valor),
                    'vencimento_id': melhor_candidato['vencimento'].id,
                    'vencimento_titulo': melhor_candidato['vencimento'].titulo,
                    'vencimento_valor': float(melhor_candidato['vencimento'].valor),
                    'similaridade': melhor_candidato['similaridade'],
                    'diferenca_dias': melhor_candidato['diferenca_dias'],
                    'diferenca_valor': float(melhor_candidato['diferenca_valor'])
                })
        
        return {
            'matches_encontrados': matches_encontrados,
            'conciliados': conciliados,
            'nao_conciliados': nao_conciliados,
            'sugestoes': sugestoes
        }
    
    @classmethod
    @transaction.atomic
    def conciliar_manual(
        cls,
        item_extrato_id: int,
        vencimento_id: int,
        usuario: Optional[User] = None
    ) -> bool:
        """
        Concilia manualmente um item de extrato com um vencimento.
        
        Returns:
            bool: True se conciliado com sucesso
        """
        try:
            item = ItemExtratoBancario.objects.get(id=item_extrato_id)
            vencimento = Vencimento.objects.get(id=vencimento_id)
            
            item.conciliar_com_vencimento(vencimento, usuario=usuario)
            return True
        
        except (ItemExtratoBancario.DoesNotExist, Vencimento.DoesNotExist):
            return False
    
    @classmethod
    @transaction.atomic
    def desconciliar(cls, item_extrato_id: int) -> bool:
        """
        Remove conciliação de um item de extrato.
        
        Returns:
            bool: True se desconciliado com sucesso
        """
        try:
            item = ItemExtratoBancario.objects.get(id=item_extrato_id)
            item.desconciliar()
            return True
        
        except ItemExtratoBancario.DoesNotExist:
            return False
    
    @classmethod
    @transaction.atomic
    def converter_bank_transactions(
        cls, 
        importacao,  # BankStatementImport instance
        usuario: Optional[User] = None
    ) -> Dict:
        """
        INTEGRAÇÃO: Converte BankTransaction → ItemExtratoBancario.
        
        Cria ItemExtratoBancario a partir das transações genéricas do BankStatementImport,
        aplicando detecção de formato bancário quando possível.
        
        Args:
            importacao: Instância de BankStatementImport
            usuario: Usuário que está executando a conversão
        
        Returns:
            Dict com estatísticas da conversão:
                - itens_criados: int
                - itens_duplicados: int
                - erros: List[str]
        """
        from ..models import BankTransaction
        
        itens_criados = 0
        itens_duplicados = 0
        erros = []
        
        transacoes = importacao.transactions.all()
        
        for transacao in transacoes:
            try:
                # Verificar se já existe item para esta transação
                # (baseado em data + valor + descrição na mesma conta)
                existe = ItemExtratoBancario.objects.filter(
                    conta_bancaria=importacao.conta,
                    data=transacao.date,
                    valor=abs(transacao.amount),
                    descricao__icontains=transacao.description[:50] if transacao.description else ''
                ).exists()
                
                if existe:
                    itens_duplicados += 1
                    continue
                
                # Determinar tipo (DEBITO/CREDITO)
                tipo = 'DEBITO' if transacao.amount < 0 else 'CREDITO'
                
                # Criar ItemExtratoBancario
                ItemExtratoBancario.objects.create(
                    conta_bancaria=importacao.conta,
                    data=transacao.date,
                    descricao=transacao.description or '',
                    valor=abs(transacao.amount),
                    tipo=tipo,
                    arquivo_origem=importacao.original_filename,
                    linha_original=str(transacao.raw_payload) if transacao.raw_payload else None,
                    importado_por=usuario
                )
                itens_criados += 1
                
            except Exception as e:
                erros.append(f"Transação {transacao.id}: {str(e)}")
        
        return {
            'itens_criados': itens_criados,
            'itens_duplicados': itens_duplicados,
            'erros': erros,
            'total_transacoes': transacoes.count()
        }

