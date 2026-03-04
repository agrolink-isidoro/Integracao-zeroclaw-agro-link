"""
Celery tasks para o módulo actions.

Task principal: parse_upload_task
  - Lê UploadedFile do banco
  - Chama o parser correto por module/mime_type
  - Cria Action com status=pending_approval para cada draft extraído
  - Atualiza UploadedFile.status (completed/failed)
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    name="apps.actions.tasks.parse_upload_task",
)
def parse_upload_task(self, upload_id: str) -> dict:
    """
    Processa um UploadedFile e gera Actions em draft.

    Args:
        upload_id: UUID str do UploadedFile

    Returns:
        dict com {"actions_criadas": N, "erros": [...]}
    """
    from .models import UploadedFile, Action, UploadStatus, ActionStatus

    try:
        upload = UploadedFile.objects.select_related("criado_por", "tenant").get(id=upload_id)
    except UploadedFile.DoesNotExist:
        logger.error("UploadedFile %s não encontrado", upload_id)
        return {"actions_criadas": 0, "erros": ["Upload não encontrado"]}

    # Marca como processing
    upload.status = UploadStatus.PROCESSING
    upload.save(update_fields=["status", "atualizado_em"])

    try:
        file_bytes = _read_file(upload)
        drafts = _dispatch_parser(upload, file_bytes)

        actions_criadas = 0
        erros = []

        for draft in drafts:
            try:
                action_type = draft.get("action_type") or _default_action_type(upload.module)
                draft_data = draft.get("draft_data") or draft
                Action.objects.create(
                    tenant=upload.tenant,
                    criado_por=upload.criado_por,
                    module=upload.module,
                    action_type=action_type,
                    draft_data=draft_data,
                    status=ActionStatus.PENDING_APPROVAL,
                    upload=upload,
                    meta={"origem": "upload_parse", "upload_id": str(upload.id)},
                )
                actions_criadas += 1
            except Exception as exc:
                logger.warning("Erro ao criar Action de draft: %s", exc)
                erros.append(str(exc))

        resultado = {"actions_criadas": actions_criadas, "erros": erros}
        upload.status = UploadStatus.COMPLETED
        upload.resultado_parse = resultado
        upload.save(update_fields=["status", "resultado_parse", "atualizado_em"])

        logger.info(
            "parse_upload_task: upload=%s module=%s → %d actions criadas",
            upload_id, upload.module, actions_criadas,
        )
        return resultado

    except Exception as exc:
        logger.exception("Falha no parse do upload %s: %s", upload_id, exc)
        upload.status = UploadStatus.FAILED
        upload.mensagem_erro = str(exc)
        upload.save(update_fields=["status", "mensagem_erro", "atualizado_em"])

        try:
            raise self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            return {"actions_criadas": 0, "erros": [str(exc)]}


def _read_file(upload) -> bytes:
    """Lê o arquivo do disco."""
    import os
    path = upload.caminho_arquivo
    if not path or not os.path.exists(path):
        raise FileNotFoundError(f"Arquivo não encontrado: {path}")
    with open(path, "rb") as f:
        return f.read()


def _dispatch_parser(upload, file_bytes: bytes) -> list[dict]:
    """Seleciona e executa o parser correto baseado no módulo."""
    module = upload.module
    mime_type = upload.mime_type or ""
    filename = upload.nome_original or ""

    if module == "agricultura":
        from .parsers.agricultura_parser import parse
    elif module == "maquinas":
        from .parsers.maquinas_parser import parse
    elif module == "estoque":
        from .parsers.estoque_parser import parse
    elif module == "fazendas":
        from .parsers.fazendas_parser import parse
    else:
        raise ValueError(f"Módulo '{module}' não tem parser configurado")

    return parse(file_bytes, mime_type, filename)


def _default_action_type(module: str) -> str:
    """Action type padrão quando o parser não retorna action_type."""
    defaults = {
        "agricultura": "operacao_agricola",
        "maquinas": "manutencao_maquina",
        "estoque": "entrada_estoque",
        "fazendas": "criar_talhao",
    }
    return defaults.get(module, "operacao_agricola")
