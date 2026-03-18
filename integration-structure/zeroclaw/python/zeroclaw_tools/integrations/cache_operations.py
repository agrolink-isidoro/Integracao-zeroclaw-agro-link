"""
Cache de Operações Agrícolas — Atualizado a Cada Login.

Sistema que:
  1. Consulta TODAS as operações do sistema (sem filtros)
  2. Armazena em cache JSON local
  3. Atualiza automaticamente quando o usuário faz LOGIN
  4. Fornece lookup rápido por tipo, safra, data, etc.

Uso:
    from cache_operations import OperationsCache
    
    cache = OperationsCache(
        base_url="http://localhost:8001",
        jwt_token="token_here",
        tenant_id="tenant_uuid"
    )
    
    # Atualizar cache quando usuário faz login
    cache.refresh_on_login(user_id="user_123")
    
    # Obter operações
    ops = cache.get_all()
    ops_planejadas = cache.filter(status="planejada")
    operacao = cache.find_by_tipo("subsolagem")
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any
import hashlib
import httpx

logger = logging.getLogger(__name__)


class OperationsCache:
    """Cache de operações agrícolas com atualização ao fazer login."""
    
    CACHE_DIR = Path("/tmp/agrolink_cache")
    CACHE_FILE = CACHE_DIR / "operacoes_agricolas.json"
    CACHE_METADATA = CACHE_DIR / "operacoes_metadata.json"
    LOGIN_TRACKER = CACHE_DIR / "login_tracker.json"  # Rastreia logins por usuário
    
    def __init__(self, base_url: str, jwt_token: str, tenant_id: str):
        """
        Inicializa o cache.
        
        Args:
            base_url: URL da API (ex: http://localhost:8001)
            jwt_token: Token JWT para autenticação
            tenant_id: ID do tenant/fazenda
        """
        self.base_url = base_url.rstrip("/")
        self.jwt_token = jwt_token
        self.tenant_id = tenant_id
        self.operations: List[Dict[str, Any]] = []
        
        # Criar diretório de cache se não existir
        self.CACHE_DIR.mkdir(parents=True, exist_ok=True)
        
        # Carregar cache existente
        self._load_from_disk()
    
    def _load_from_disk(self) -> None:
        """Carrega operações do cache local."""
        if not self.CACHE_FILE.exists():
            logger.info("🔄 Cache não existe ainda. Será criado no próximo login.")
            return
        
        try:
            with open(self.CACHE_FILE, "r", encoding="utf-8") as f:
                self.operations = json.load(f)
            logger.info(f"✅ Cache carregado: {len(self.operations)} operações")
        except Exception as e:
            logger.error(f"❌ Erro ao carregar cache: {e}")
            self.operations = []
    
    def _save_to_disk(self) -> None:
        """Salva operações no cache local."""
        try:
            with open(self.CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(self.operations, f, indent=2, ensure_ascii=False)
            
            # Salvar metadata
            metadata = {
                "updated_at": datetime.now().isoformat(),
                "total_operations": len(self.operations),
                "tenant_id": self.tenant_id,
                "cache_type": "login_based"
            }
            with open(self.CACHE_METADATA, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"💾 Cache salvo: {len(self.operations)} operações")
        except Exception as e:
            logger.error(f"❌ Erro ao salvar cache: {e}")
    
    def _record_login(self, user_id: str) -> None:
        """Registra o login do usuário para rastreamento."""
        try:
            tracker = {}
            if self.LOGIN_TRACKER.exists():
                with open(self.LOGIN_TRACKER, "r", encoding="utf-8") as f:
                    tracker = json.load(f)
            
            tracker[user_id] = datetime.now().isoformat()
            
            with open(self.LOGIN_TRACKER, "w", encoding="utf-8") as f:
                json.dump(tracker, f, indent=2)
        except Exception as e:
            logger.warning(f"⚠️ Erro ao registrar login: {e}")
    
    def refresh_on_login(self, user_id: str, force: bool = False) -> bool:
        """
        Atualiza o cache quando o usuário faz LOGIN.
        
        🔄 Esta função DEVE ser chamada no início de cada conversa do usuário.
        
        Args:
            user_id: ID do usuário (para rastreamento)
            force: Se True, força atualização mesmo se cache é válido
        
        Returns:
            True se atualizado com sucesso, False caso contrário
        """
        logger.info(f"🔐 Login detectado: user_id={user_id}")
        logger.info("🔄 Atualizando cache de operações...")
        
        try:
            # Endpoint: /agricultura/operacoes/ (SEM filtros)
            url = f"{self.base_url}/agricultura/operacoes/"
            headers = {"Authorization": f"Bearer {self.jwt_token}"}
            
            with httpx.Client(timeout=30) as client:
                response = client.get(url, headers=headers)
                response.raise_for_status()
            
            data = response.json()
            
            # Esperado: {"results": [...]} ou lista direta
            if isinstance(data, dict) and "results" in data:
                self.operations = data["results"]
            elif isinstance(data, list):
                self.operations = data
            else:
                logger.warning(f"⚠️ Formato inesperado da API: {type(data)}")
                return False
            
            self._save_to_disk()
            self._record_login(user_id)
            logger.info(f"✅ Cache atualizado no login! {len(self.operations)} operações")
            return True
        
        except httpx.HTTPError as e:
            logger.error(f"❌ Erro HTTP ao consultar API: {e}")
            logger.warning("⚠️ Usando cache anterior...")
            return False
        except Exception as e:
            logger.error(f"❌ Erro ao atualizar cache: {e}")
            logger.warning("⚠️ Usando cache anterior...")
            return False
    
    # ─────────────────────────────────────────────────────────────────────
    # APIs de Consulta
    # ─────────────────────────────────────────────────────────────────────
    
    def get_all(self) -> List[Dict[str, Any]]:
        """Retorna todas as operações armazenadas."""
        return self.operations.copy()
    
    def filter(self, **kwargs) -> List[Dict[str, Any]]:
        """
        Filtra operações por atributos.
        
        Exemplos:
            cache.filter(status="planejada")
            cache.filter(tipo="subsolagem")
            cache.filter(categoria="preparacao")
            cache.filter(status="planejada", tipo="subsolagem")
        
        Returns:
            Lista de operações que correspondem aos filtros
        """
        results = self.operations.copy()
        
        for key, value in kwargs.items():
            results = [
                op for op in results
                if op.get(key, "").lower() == str(value).lower()
            ]
        
        return results
    
    def find_by_tipo(self, tipo_nome: str) -> Optional[Dict[str, Any]]:
        """
        Busca uma operação pelo tipo (icontains).
        
        Args:
            tipo_nome: Nome ou parte do tipo (ex: "subsolagem", "plantio")
        
        Returns:
            Primeira operação encontrada ou None
        """
        tipo_lower = tipo_nome.lower()
        for op in self.operations:
            if tipo_lower in op.get("tipo", "").lower():
                return op
        return None
    
    def find_by_data(self, data: str) -> List[Dict[str, Any]]:
        """
        Busca operações por data.
        
        Args:
            data: Data no formato "DD/MM/YYYY" ou "YYYY-MM-DD"
        
        Returns:
            Lista de operações nessa data
        """
        results = []
        for op in self.operations:
            op_data = op.get("data_operacao", "")
            if data in op_data or op_data in data:
                results.append(op)
        return results
    
    def find_planejadas_apos(self, data: str) -> List[Dict[str, Any]]:
        """
        Busca operações planejadas APÓS uma data.
        
        Útil para: "Qual operação vem depois de 21/03?"
        
        Args:
            data: Data no formato "DD/MM/YYYY"
        
        Returns:
            Operações planejadas com data_operacao > data
        """
        try:
            # Parse input date
            day, month, year = map(int, data.split("/"))
            reference_date = datetime(year, month, day)
        except ValueError:
            logger.error(f"Data inválida: {data}")
            return []
        
        results = []
        for op in self.operations:
            if op.get("status", "").lower() != "planejada":
                continue
            
            try:
                op_data_str = op.get("data_operacao", "")
                # Tenta parsear diferentes formatos
                for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d/%m/%Y %H:%M"):
                    try:
                        op_date = datetime.strptime(op_data_str, fmt)
                        if op_date > reference_date:
                            results.append(op)
                        break
                    except ValueError:
                        continue
            except Exception as e:
                logger.warning(f"Erro ao parsear data {op_data_str}: {e}")
                continue
        
        return results
    
    def listar_resumo(self) -> str:
        """
        Retorna um resumo legível de todas as operações.
        
        Útil para: IA mostrar ao usuário "quais operações existem?"
        """
        if not self.operations:
            return "❌ Nenhuma operação cadastrada no sistema."
        
        linhas = [
            f"📋 **Total de {len(self.operations)} operações cadastradas:**\n"
        ]
        
        for i, op in enumerate(self.operations, 1):
            tipo = op.get("tipo", "N/A")
            categoria = op.get("categoria", "N/A")
            data = op.get("data_operacao", "N/A")
            status = op.get("status", "N/A")
            cultura = op.get("cultura", "N/A")
            area = op.get("area", "N/A")
            
            linhas.append(
                f"\n{i}. **{tipo}** ({categoria})\n"
                f"   📅 Data: {data}\n"
                f"   🌾 Cultura: {cultura}\n"
                f"   📐 Área: {area} hectares\n"
                f"   🔔 Status: {status}"
            )
        
        return "\n".join(linhas)
    
    def to_dict(self) -> Dict[str, Any]:
        """Retorna operações como dicionário."""
        return {
            "total": len(self.operations),
            "operacoes": self.operations,
            "atualizado_em": datetime.now().isoformat()
        }


# ── Função auxiliar para uso rápido ───────────────────────────────────────

def get_operations_cache(base_url: str, jwt_token: str, tenant_id: str, user_id: str) -> OperationsCache:
    """
    Factory function para obter instância do cache com atualização no login.
    
    🔐 DEVE ser chamada no início de cada conversa/login do usuário!
    
    Args:
        base_url: URL da API
        jwt_token: Token JWT
        tenant_id: ID do tenant
        user_id: ID do usuário (para rastreamento de logins)
    
    Returns:
        Instância de OperationsCache pronta para usar
    
    Exemplo:
        cache = get_operations_cache("http://localhost:8001", token, tenant_id, user_id)
        ops_planejadas = cache.filter(status="planejada")
        
    Fluxo esperado (em Isidoro):
        1. Usuário inicia conversa (login)
        2. Isidoro chama: cache = get_operations_cache(...)
        3. Cache é atualizado AUTOMATICAMENTE
        4. Consultas posteriores usam dados FRESCOS
    """
    cache = OperationsCache(base_url, jwt_token, tenant_id)
    cache.refresh_on_login(user_id=user_id)
    return cache
