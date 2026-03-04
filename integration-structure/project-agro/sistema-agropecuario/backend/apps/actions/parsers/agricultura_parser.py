"""
Parser de arquivos de Agricultura (xlsx/csv/md).

Responsabilidade: receber UploadedFile e gerar lista de dicts representando
drafts de Actions do tipo operacao_agricola/colheita.

Colunas esperadas (xlsx/csv):
  talhao, cultura, data, area_ha, atividade, insumo, quantidade, unidade,
  custo_unitario, observacoes

Para .md: extrai tabelas Markdown → trata como csv equivalente.
"""

import io
import logging
import re
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

# Mapeamento fuzzy de nomes de coluna → campo canônico
COLUMN_MAP = {
    # talhão
    "talhao": "talhao", "talhão": "talhao", "talhao_nome": "talhao",
    "parcela": "talhao", "quadra": "talhao",
    # cultura
    "cultura": "cultura", "produto": "cultura", "crop": "cultura",
    # data
    "data": "data", "date": "data", "data_operacao": "data", "dt_operacao": "data",
    # área
    "area_ha": "area_ha", "area": "area_ha", "hectares": "area_ha", "ha": "area_ha",
    # atividade
    "atividade": "atividade", "operacao": "atividade", "operação": "atividade",
    "activity": "atividade",
    # insumo
    "insumo": "insumo", "produto_aplicado": "insumo", "defensivo": "insumo",
    "fertilizante": "insumo",
    # quantidade
    "quantidade": "quantidade", "qtd": "quantidade", "qtde": "quantidade",
    "amount": "quantidade",
    # unidade
    "unidade": "unidade", "un": "unidade", "unit": "unidade",
    # custo
    "custo_unitario": "custo_unitario", "custo": "custo_unitario",
    "preco_unitario": "custo_unitario", "valor_unitario": "custo_unitario",
    # obs
    "observacoes": "observacoes", "observações": "observacoes",
    "obs": "observacoes", "notas": "observacoes",
}

EXPECTED_COLUMNS = {"talhao", "cultura", "data", "atividade"}


def normalizar_coluna(col: str) -> str:
    """Normaliza string de coluna para lookup no COLUMN_MAP."""
    col = col.strip().lower().replace(" ", "_").replace("-", "_")
    return COLUMN_MAP.get(col, col)


def _parse_data(value: Any) -> str | None:
    """Tenta converter vários formatos de data para ISO 8601."""
    if not value:
        return None
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%d")
    s = str(value).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return s


def _row_to_draft(row: dict) -> dict:
    """Converte uma linha normalizada em draft_data de Action."""
    return {
        "talhao": row.get("talhao") or "",
        "cultura": row.get("cultura") or "",
        "data_operacao": _parse_data(row.get("data")) or "",
        "area_ha": _parse_float(row.get("area_ha")),
        "atividade": row.get("atividade") or "",
        "insumo": row.get("insumo") or "",
        "quantidade": _parse_float(row.get("quantidade")),
        "unidade": row.get("unidade") or "",
        "custo_unitario": _parse_float(row.get("custo_unitario")),
        "observacoes": row.get("observacoes") or "",
    }


def _parse_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace(",", "."))
    except (ValueError, TypeError):
        return None


def _normalize_headers(headers: list[str]) -> list[str]:
    return [normalizar_coluna(h) for h in headers]


# ── xlsx / csv ──────────────────────────────────────────────────────────────

def parse_xlsx(file_bytes: bytes) -> list[dict]:
    """Parseia arquivo xlsx e retorna lista de draft_data."""
    import openpyxl

    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []

    headers = _normalize_headers([str(c) if c is not None else "" for c in rows[0]])
    drafts = []
    for raw_row in rows[1:]:
        row = dict(zip(headers, raw_row))
        if not any(row.values()):
            continue
        drafts.append(_row_to_draft(row))
    return drafts


def parse_csv(file_bytes: bytes) -> list[dict]:
    """Parseia arquivo csv e retorna lista de draft_data."""
    import csv

    content = file_bytes.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(content))
    headers = _normalize_headers(reader.fieldnames or [])
    drafts = []
    for raw_row in reader:
        row = {normalizar_coluna(k): v for k, v in raw_row.items()}
        if not any(row.values()):
            continue
        drafts.append(_row_to_draft(row))
    return drafts


def parse_markdown(file_bytes: bytes) -> list[dict]:
    """
    Extrai tabelas Markdown e trata como csv equivalente.

    Suporta tabelas no formato GFM:
    | col1 | col2 |
    |------|------|
    | val1 | val2 |
    """
    content = file_bytes.decode("utf-8", errors="replace")
    lines = content.splitlines()
    drafts: list[dict] = []

    table_lines: list[str] = []
    in_table = False

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("|") and stripped.endswith("|"):
            in_table = True
            table_lines.append(stripped)
        else:
            if in_table and table_lines:
                drafts.extend(_md_table_to_drafts(table_lines))
                table_lines = []
            in_table = False

    if table_lines:
        drafts.extend(_md_table_to_drafts(table_lines))

    return drafts


def _md_table_to_drafts(table_lines: list[str]) -> list[dict]:
    """Converte linhas de tabela MD em lista de drafts."""
    # Remove separator line (|---|---|)
    data_lines = [l for l in table_lines if not re.match(r"^\|[-| :]+\|$", l)]
    if len(data_lines) < 2:
        return []

    def split_row(line: str) -> list[str]:
        return [c.strip() for c in line.strip("|").split("|")]

    headers = _normalize_headers(split_row(data_lines[0]))
    drafts = []
    for data_line in data_lines[1:]:
        values = split_row(data_line)
        row = dict(zip(headers, values))
        if any(row.values()):
            drafts.append(_row_to_draft(row))
    return drafts


# ── interface principal ──────────────────────────────────────────────────────

def parse(file_bytes: bytes, mime_type: str, filename: str) -> list[dict]:
    """
    Entry-point principal do parser de agricultura.

    Returns:
        Lista de draft_data prontos para criar Actions.
    Raises:
        ValueError: se o formato não for suportado.
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext in ("xlsx", "xls") or "spreadsheet" in mime_type:
        return parse_xlsx(file_bytes)
    if ext == "csv" or mime_type == "text/csv":
        return parse_csv(file_bytes)
    if ext == "md" or mime_type in ("text/markdown", "text/x-markdown"):
        return parse_markdown(file_bytes)

    raise ValueError(f"Formato não suportado para Agricultura: {ext or mime_type}")
