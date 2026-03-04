"""
Parser de Estoque (NF-e XML SEFAZ 4.00 / PDF NF / xlsx / csv).

Tipos de Action gerados:
  - entrada_estoque (NF de entrada)
  - saida_estoque   (NF de saída)
  - ajuste_estoque  (xlsx/csv sem NF)
  - criar_item_estoque (novo produto detectado no arquivo)

Para NF-e XML:
  - Usa lxml para ler o leiaute SEFAZ 4.00
  - Detecta se é NF de entrada ou saída pelo campo <tpNF>
  - Gera um Action por produto (det/prod)

Para PDF:
  - Usa pdfplumber para extrair texto
  - Regex para capturar linhas de item

Para xlsx/csv:
  - Colunas: codigo_produto, nome, quantidade, unidade, valor_unitario,
             tipo_movimentacao, data, fornecedor, numero_nf, observacoes
"""

import io
import logging
import re
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

# Namespace NF-e SEFAZ 4.00
NFE_NS = {"nfe": "http://www.portalfiscal.inf.br/nfe"}

COLUMN_MAP = {
    "codigo": "codigo_produto", "codigo_produto": "codigo_produto",
    "cod": "codigo_produto", "sku": "codigo_produto",
    "nome": "nome_produto", "produto": "nome_produto",
    "descricao": "nome_produto", "descrição": "nome_produto", "description": "nome_produto",
    "quantidade": "quantidade", "qtd": "quantidade", "qtde": "quantidade",
    "quant": "quantidade", "qty": "quantidade",
    "unidade": "unidade", "un": "unidade", "unit": "unidade", "und": "unidade",
    "valor_unitario": "valor_unitario", "preco": "valor_unitario",
    "preco_unitario": "valor_unitario", "valor": "valor_unitario",
    "tipo": "tipo_movimentacao", "movimentacao": "tipo_movimentacao",
    "tipo_mov": "tipo_movimentacao", "operacao": "tipo_movimentacao",
    "data": "data", "date": "data", "dt": "data",
    "fornecedor": "fornecedor", "supplier": "fornecedor", "emitente": "fornecedor",
    "nf": "numero_nf", "numero_nf": "numero_nf", "nota_fiscal": "numero_nf",
    "observacoes": "observacoes", "obs": "observacoes", "notas": "observacoes",
}


def _norm_col(col: str) -> str:
    col = col.strip().lower().replace(" ", "_").replace("-", "_")
    return COLUMN_MAP.get(col, col)


def _parse_float(v: Any) -> float | None:
    if v is None or v == "":
        return None
    try:
        return float(str(v).replace(",", "."))
    except (ValueError, TypeError):
        return None


def _parse_date(v: Any) -> str | None:
    if not v:
        return None
    if hasattr(v, "strftime"):
        return v.strftime("%Y-%m-%d")
    s = str(v).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(s[:10], fmt[:10]).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return s[:10]


def _inferir_tipo(tipo_raw: str) -> str:
    t = tipo_raw.strip().lower()
    if t in ("entrada", "compra", "recebimento", "0"):
        return "entrada_estoque"
    if t in ("saida", "saída", "venda", "consumo", "1"):
        return "saida_estoque"
    return "ajuste_estoque"


def _row_to_draft(row: dict) -> dict:
    tipo_raw = row.get("tipo_movimentacao") or "entrada"
    return {
        "action_type": _inferir_tipo(tipo_raw),
        "draft_data": {
            "codigo_produto": row.get("codigo_produto") or "",
            "nome_produto": row.get("nome_produto") or "",
            "quantidade": _parse_float(row.get("quantidade")),
            "unidade": row.get("unidade") or "un",
            "valor_unitario": _parse_float(row.get("valor_unitario")),
            "data": _parse_date(row.get("data")) or "",
            "fornecedor": row.get("fornecedor") or "",
            "numero_nf": row.get("numero_nf") or "",
            "observacoes": row.get("observacoes") or "",
        },
    }


# ── NF-e XML SEFAZ 4.00 ──────────────────────────────────────────────────────

def parse_xml_nfe(file_bytes: bytes) -> list[dict]:
    """
    Parseia NF-e XML (leiaute SEFAZ 4.00) e gera 1 draft por produto.

    tpNF: 0=saída, 1=entrada (do emitente — para o dest é o oposto)
    Aqui tratamos do ponto de vista do RECEPTOR (nosso sistema):
      - tpNF == "0" (saída do emitente) → nós estamos COMPRANDO → entrada_estoque
      - tpNF == "1" (entrada do emitente) → devolução → saida_estoque
    """
    from lxml import etree

    try:
        root = etree.fromstring(file_bytes)
    except etree.XMLSyntaxError as exc:
        raise ValueError(f"XML inválido: {exc}") from exc

    # Navega até infNFe (pode estar dentro de nfeProc ou direto)
    inf_nfe = root.find(".//{http://www.portalfiscal.inf.br/nfe}infNFe")
    if inf_nfe is None:
        raise ValueError("Elemento infNFe não encontrado — não é um NF-e válido SEFAZ 4.00")

    # Cabeçalho
    ide = inf_nfe.find("{http://www.portalfiscal.inf.br/nfe}ide")
    emit = inf_nfe.find("{http://www.portalfiscal.inf.br/nfe}emit")

    tp_nf = ide.findtext("{http://www.portalfiscal.inf.br/nfe}tpNF", "0") if ide else "0"
    n_nf = ide.findtext("{http://www.portalfiscal.inf.br/nfe}nNF", "") if ide else ""
    d_emi = ide.findtext("{http://www.portalfiscal.inf.br/nfe}dhEmi", "") if ide else ""
    emit_nome = emit.findtext("{http://www.portalfiscal.inf.br/nfe}xNome", "") if emit else ""

    tipo_action = "entrada_estoque" if tp_nf == "0" else "saida_estoque"

    drafts = []
    for det in inf_nfe.findall("{http://www.portalfiscal.inf.br/nfe}det"):
        prod = det.find("{http://www.portalfiscal.inf.br/nfe}prod")
        if prod is None:
            continue

        c_prod = prod.findtext("{http://www.portalfiscal.inf.br/nfe}cProd", "")
        x_prod = prod.findtext("{http://www.portalfiscal.inf.br/nfe}xProd", "")
        c_ean = prod.findtext("{http://www.portalfiscal.inf.br/nfe}cEAN", "")
        u_com = prod.findtext("{http://www.portalfiscal.inf.br/nfe}uCom", "un")
        q_com = prod.findtext("{http://www.portalfiscal.inf.br/nfe}qCom", "0")
        v_un_com = prod.findtext("{http://www.portalfiscal.inf.br/nfe}vUnCom", "0")
        c_cfop = prod.findtext("{http://www.portalfiscal.inf.br/nfe}CFOP", "")

        drafts.append({
            "action_type": tipo_action,
            "draft_data": {
                "codigo_produto": c_prod,
                "nome_produto": x_prod,
                "ean": c_ean,
                "quantidade": _parse_float(q_com),
                "unidade": u_com,
                "valor_unitario": _parse_float(v_un_com),
                "data": _parse_date(d_emi),
                "fornecedor": emit_nome,
                "numero_nf": n_nf,
                "cfop": c_cfop,
                "observacoes": f"NF-e importada automaticamente",
            },
        })

    logger.info("NF-e %s: %d itens extraídos (tipo=%s)", n_nf, len(drafts), tipo_action)
    return drafts


# ── PDF ──────────────────────────────────────────────────────────────────────

def parse_pdf(file_bytes: bytes) -> list[dict]:
    """Extrai texto de NF em PDF (nota fiscal simples) via pdfplumber."""
    import pdfplumber

    fulltext = ""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            fulltext += (page.extract_text() or "") + "\n"

    return _parse_nf_text(fulltext)


def _parse_nf_text(text: str) -> list[dict]:
    """
    Tenta extrair itens de NF a partir de texto.
    Padrão: código seguido de descrição, quantidade e valor.
    """
    item_pattern = re.compile(
        r"(\d{3,})\s+(.+?)\s+(\d+[.,]?\d*)\s+([\w]+)\s+([\d.,]+)",
        re.IGNORECASE,
    )
    # Extrai número da NF do texto
    nf_match = re.search(r"N[Oo°\.]\s*(\d+)", text)
    n_nf = nf_match.group(1) if nf_match else ""
    # Extrai data
    date_match = re.search(r"(\d{2}/\d{2}/\d{4})", text)
    data = _parse_date(date_match.group(1)) if date_match else ""

    drafts = []
    for m in item_pattern.finditer(text):
        codigo, nome, qtd, un, valor = m.groups()
        drafts.append({
            "action_type": "entrada_estoque",
            "draft_data": {
                "codigo_produto": codigo,
                "nome_produto": nome.strip(),
                "quantidade": _parse_float(qtd),
                "unidade": un,
                "valor_unitario": _parse_float(valor),
                "data": data,
                "numero_nf": n_nf,
                "fornecedor": "",
                "observacoes": "Extraído de PDF",
            },
        })
    return drafts


# ── xlsx ─────────────────────────────────────────────────────────────────────

def parse_xlsx(file_bytes: bytes) -> list[dict]:
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [_norm_col(str(c) if c else "") for c in rows[0]]
    return [
        _row_to_draft(dict(zip(headers, row)))
        for row in rows[1:]
        if any(row)
    ]


# ── csv ──────────────────────────────────────────────────────────────────────

def parse_csv(file_bytes: bytes) -> list[dict]:
    import csv
    content = file_bytes.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(content))
    return [
        _row_to_draft({_norm_col(k): v for k, v in row.items()})
        for row in reader
        if any(row.values())
    ]


# ── interface principal ──────────────────────────────────────────────────────

def parse(file_bytes: bytes, mime_type: str, filename: str) -> list[dict]:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "xml" or mime_type in ("application/xml", "text/xml"):
        return parse_xml_nfe(file_bytes)
    if ext in ("xlsx", "xls") or "spreadsheet" in mime_type:
        return parse_xlsx(file_bytes)
    if ext == "csv" or mime_type == "text/csv":
        return parse_csv(file_bytes)
    if ext == "pdf" or mime_type == "application/pdf":
        return parse_pdf(file_bytes)

    raise ValueError(f"Formato não suportado para Estoque: {ext or mime_type}")
