"""
apps/actions/utilities.py — utilitários para gerenciamento de sessões e compressão de contexto.
"""

import json
from typing import Any


def compactar_contexto(
    conteudo_original: str,
    registros_processados: int,
    total_registros: int,
    resumo_progresso: dict,
    notas: list,
) -> str:
    """
    Compacta o contexto de um arquivo para economizar tokens do LLM.
    
    Reduz 50KB de arquivo completo para ~500 caracteres de resumo.
    
    Args:
        conteudo_original: Conteúdo original do arquivo (pode ser N/A)
        registros_processados: Quantos registros foram processados
        total_registros: Total de registros
        resumo_progresso: Dicionário com resumo por item (ex: {"mat_21": "✓ 2 áreas"})
        notas: Lista de notas anexadas durante processamento
    
    Returns:
        String compactada do contexto
    """
    
    # Calcula percentual
    percentual = (registros_processados / total_registros * 100) if total_registros > 0 else 0
    
    # Constrói resumo compactado
    linhas = [
        "📋 RESUMO COMPACTADO DO CONTEXTO",
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        f"Processados: {registros_processados}/{total_registros} ({percentual:.1f}%)",
        "",
    ]
    
    # Adiciona notas com símbolos visuais
    if notas:
        linhas.append("📝 Notas:")
        for nota in notas[-10:]:  # Últimas 10 notas
            linhas.append(f"  {nota}")
        linhas.append("")
    
    # Adiciona resumo de progresso por item
    if resumo_progresso:
        linhas.append("📊 Progresso por item:")
        for chave, valor in list(resumo_progresso.items())[-15:]:  # Últimas 15 chaves
            linhas.append(f"  {chave}: {valor}")
        linhas.append("")
    
    # Orientações para continuação
    if registros_processados < total_registros:
        pendentes = total_registros - registros_processados
        linhas.append(f"⏳ Ainda faltam {pendentes} registros para processar.")
    else:
        linhas.append("✅ Análise concluída!")
    
    return "\n".join(linhas)


def gerar_prompt_contexto(
    upload_session: "UploadSession",
    arquivo_original_conteudo: str = "",
) -> str:
    """
    Gera prompt com contexto compactado para Isidoro retomar análise.
    
    Usa o context_summary já salvo para economizar tokens.
    Se arquivo_original for fornecido, pode fazer análise mais completa.
    
    Args:
        upload_session: Instância de UploadSession
        arquivo_original_conteudo: Conteúdo original do arquivo (opcional)
    
    Returns:
        Prompt pronto para o Isidoro
    """
    
    # Usa context_summary salvo (compactado) ou gera novo
    if upload_session.context_summary:
        contexto = upload_session.context_summary
    else:
        contexto = compactar_contexto(
            arquivo_original_conteudo,
            upload_session.registros_processados,
            upload_session.total_registros,
            upload_session.resumo_progresso,
            upload_session.notas,
        )
        # Salva para futuro reuso
        upload_session.context_summary = contexto
        upload_session.save(update_fields=["context_summary"])
    
    # Monta prompt para Isidoro
    prompt = f"""
Você estava analisando o arquivo "{upload_session.upload.nome_original}".

{contexto}

Continue de onde parou. Processe os registros pendentes e crie as ações correspondentes.

Se tiver dúvidas sobre o formato dos dados, peça clarificação ao usuário.
"""
    
    return prompt.strip()


def calcular_economia_tokens(
    arquivo_size_bytes: int,
    usando_resumo: bool = True,
) -> dict:
    """
    Calcula economia de tokens ao usar context_summary vs arquivo completo.
    
    Estimativa: ~1 token por 4 caracteres (OpenAI).
    
    Args:
        arquivo_size_bytes: Tamanho do arquivo original em bytes
        usando_resumo: Se True, calcula economia com resumo
    
    Returns:
        Dicionário com estatísticas
    """
    
    # Estimativa: 1 token ~ 4 caracteres
    tokens_arquivo_completo = arquivo_size_bytes / 4
    
    # Resumo típico: ~500 caracteres = ~125 tokens
    tokens_resumo = 500 / 4
    
    if usando_resumo:
        economia = tokens_arquivo_completo - tokens_resumo
        percentual_economia = (economia / tokens_arquivo_completo) * 100 if tokens_arquivo_completo > 0 else 0
        
        return {
            "tokens_arquivo_completo": int(tokens_arquivo_completo),
            "tokens_resumo": int(tokens_resumo),
            "economia_tokens": int(economia),
            "percentual_economia": round(percentual_economia, 1),
        }
    else:
        return {
            "tokens_arquivo_completo": int(tokens_arquivo_completo),
            "tokens_resumo": None,
            "economia_tokens": None,
            "percentual_economia": None,
        }
