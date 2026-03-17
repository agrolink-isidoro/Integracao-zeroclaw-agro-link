"""
Views para o Action Queue — fila de aprovação de ações do ZeroClaw/Isidoro.

Fluxo:
  1. Isidoro (via API) cria Action com status=pending_approval
  2. Humano lista, aprova ou rejeita
  3. Worker executa ação aprovada e atualiza status
  4. Uploads disparam parse async → geram N Actions em draft
"""
import logging
from django.db import transaction
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.mixins import TenantQuerySetMixin
from apps.core.permissions import RBACViewPermission

from .models import Action, UploadedFile, ActionStatus
from .serializers import (
    ActionSerializer,
    ActionCreateSerializer,
    ActionApproveSerializer,
    ActionRejectSerializer,
    BulkApproveSerializer,
    UploadedFileSerializer,
)
import requests
from rest_framework.views import APIView
from rest_framework import serializers
from django.conf import settings

logger = logging.getLogger(__name__)


class ActionViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """
    CRUD + transições de estado para Actions (fila de aprovação).

    Permissões:
    - Isidoro (API key / JWT) pode criar (POST) em qualquer módulo.
    - Usuário humano pode listar, detalhar, aprovar, rejeitar — restrito a seus módulos via RBAC.
    - Apenas pending_approval pode ser aprovada/rejeitada.
    - Apenas pending_approval pode ser editada (PATCH).
    """

    rbac_module = "actions"
    queryset = Action.objects.select_related(
        "criado_por", "aprovado_por", "upload"
    ).order_by("-criado_em")
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "module", "action_type", "criado_por"]
    search_fields = ["draft_data", "meta"]
    ordering_fields = ["criado_em", "atualizado_em", "status", "module"]
    ordering = ["-criado_em"]

    def get_serializer_class(self):
        if self.action == "create":
            return ActionCreateSerializer
        if self.action == "approve":
            return ActionApproveSerializer
        if self.action == "reject":
            return ActionRejectSerializer
        if self.action == "bulk_approve":
            return BulkApproveSerializer
        return ActionSerializer

    def perform_create(self, serializer):
        serializer.save(
            criado_por=self.request.user,
            **self._get_tenant_kwargs(),
        )

    def update(self, request, *args, **kwargs):
        """Apenas editar se ainda estiver pending_approval."""
        instance = self.get_object()
        if instance.status != ActionStatus.PENDING_APPROVAL:
            return Response(
                {"detail": "Somente ações com status pending_approval podem ser editadas."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        kwargs["partial"] = True
        return super().update(request, *args, **kwargs)

    # ------------------------------------------------------------------ #
    #  Transitions                                                         #
    # ------------------------------------------------------------------ #

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        """Aprova e executa uma action pendente. Status: pending_approval → approved → executed."""
        obj = self.get_object()
        try:
            obj.approve(request.user)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        logger.info("Action %s aprovada por %s", obj.id, request.user)

        # Executa imediatamente após aprovação
        try:
            from .executors import execute_action
            execute_action(obj)
        except Exception as exc:  # execute_action já chama mark_failed internamente
            logger.error("execute_action falhou silenciosamente: action=%s erro=%s", obj.id, exc)

        # Re-fetch para garantir status atualizado (executed ou failed)
        obj.refresh_from_db()
        return Response(ActionSerializer(obj, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        """Rejeita uma action pendente. Status: pending_approval → rejected."""
        obj = self.get_object()
        serializer = ActionRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        motivo = serializer.validated_data.get("motivo", "")
        try:
            obj.reject(request.user, motivo)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        logger.info("Action %s rejeitada por %s", obj.id, request.user)
        return Response(ActionSerializer(obj, context={"request": request}).data)

    @action(detail=False, methods=["post"], url_path="bulk-approve")
    def bulk_approve(self, request):
        """
        Aprova múltiplas actions de uma vez.

        Body: { "action_ids": ["uuid1", "uuid2", ...] }
        Resposta: { "aprovadas": N, "erros": [...] }
        """
        serializer = BulkApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data["action_ids"]

        tenant = getattr(request, "tenant", None)
        qs = Action.objects.filter(
            id__in=ids,
            status=ActionStatus.PENDING_APPROVAL,
        )
        if tenant:
            qs = qs.filter(tenant=tenant)

        aprovadas = 0
        erros = []
        approved_objects = []

        with transaction.atomic():
            for obj in qs.select_for_update():
                try:
                    obj.approve(request.user)
                    approved_objects.append(obj)
                    aprovadas += 1
                except Exception as exc:
                    erros.append({"id": str(obj.id), "erro": str(exc)})

        # Executa ações após o commit do atomic (fora do lock)
        from .executors import execute_action
        for obj in approved_objects:
            try:
                execute_action(obj)
            except Exception as exc:
                logger.error("bulk_approve execute falhou: action=%s erro=%s", obj.id, exc)

        logger.info(
            "Bulk approve: %d aprovadas, %d erros — por %s",
            aprovadas, len(erros), request.user,
        )
        return Response({"aprovadas": aprovadas, "erros": erros})

    @action(detail=False, methods=["get"], url_path="pendentes",
           permission_classes=[permissions.IsAuthenticated, RBACViewPermission])
    def pendentes(self, request):
        """Atalho: lista apenas actions com status=pending_approval."""
        qs = self.get_queryset().filter(status=ActionStatus.PENDING_APPROVAL)
        serializer = ActionSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)


# ---------------------------------------------------------------------------#
#  Upload                                                                     #
# ---------------------------------------------------------------------------#

class UploadedFileViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """
    Upload de arquivos para parse → geração de Actions em draft.

    POST /api/actions/uploads/{module}/
    GET  /api/actions/uploads/{id}/status/   ← polling do parse
    """

    rbac_module = "actions"
    queryset = UploadedFile.objects.select_related("criado_por").order_by("-criado_em")
    serializer_class = UploadedFileSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["module", "status"]
    ordering_fields = ["criado_em", "status"]
    ordering = ["-criado_em"]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def perform_create(self, serializer):
        instance = serializer.save(
            criado_por=self.request.user,
            **self._get_tenant_kwargs(),
        )
        # Dispara parse assíncrono (Celery task)
        self._dispatch_parse_task(instance)

    def _dispatch_parse_task(self, upload_instance: UploadedFile) -> None:
        """Tenta enfileirar task Celery; se Celery não estiver disponível, loga."""
        try:
            from .tasks import parse_upload_task
            parse_upload_task.delay(str(upload_instance.id))
        except Exception as exc:
            logger.warning(
                "Não foi possível despachar parse_upload_task para %s: %s",
                upload_instance.id, exc,
            )

    @action(detail=True, methods=["get"], url_path="status")
    def file_status(self, request, pk=None):
        """Retorna status do parse + drafts gerados (se houver)."""
        obj = self.get_object()
        data = UploadedFileSerializer(obj, context={"request": request}).data
        # Inclui actions geradas a partir deste upload
        actions = Action.objects.filter(upload=obj).values(
            "id", "action_type", "status", "criado_em"
        )
        data["actions_geradas"] = list(actions)
        return Response(data)


# ---------------------------------------------------------------------------#
#  Isidoro — Análise Inteligente via Google CSE + RAG (LLM)                  #
# ---------------------------------------------------------------------------#

_RAG_SYSTEM_PROMPT = """Você é o Isidoro, assistente agrícola especialista em agronomia e manejo.
Sua tarefa é analisar produtos fitossanitários, defensivos agrícolas ou insumos e ajudar o
usuário a tomar a melhor decisão de custo-eficiência, sempre respeitando a recomendação
técnica do agrônomo responsável.

Ao analisar produtos você deve:
1. Identificar diferenças técnicas relevantes (princípio ativo, concentração, modo de ação,
   classe toxicológica, intervalo de segurança, compatibilidade de calda, custo/ha).
2. Apontar vantagens e desvantagens de cada opção.
3. Propor uma recomendação intermediária custo-eficiente quando houver substitutos.
4. Sempre alertar que a decisão final deve ser validada pelo AGRÔNOMO RESPONSÁVEL,
   pois pode envolver registro do produto, restrições de uso e receituário agronômico.
5. Incluir citações numeradas no formato [N] para cada informação baseada em fonte.
6. Responda em Português do Brasil, de forma técnica mas acessível.

Formato da resposta (JSON válido):
{
  "resumo": "análise executiva em 2-3 frases",
  "comparativo": [
    {
      "produto": "nome do produto",
      "pontos_fortes": ["..."],
      "pontos_fracos": ["..."],
      "custo_relativo": "alto|médio|baixo",
      "adequacao": "recomendado|substituto aceitável|não recomendado"
    }
  ],
  "recomendacao": "texto com a recomendação custo-eficiente, citando fontes com [N]",
  "avisos": ["lista de ressalvas importantes"],
  "advisory": "⚠️ Esta análise é informativa. Consulte o agrônomo responsável antes de substituir ou alterar qualquer produto recomendado tecnicamente."
}"""

_RAG_USER_TEMPLATE = """Consulta do usuário: {query}

Contexto adicional:
- Cultura/safra: {cultura}
- Produtos em análise: {produtos}

Fontes de referência encontradas na web (use para embasar a análise com citações [N]):
{snippets}

Responda com o JSON solicitado."""


class _ProductAnalysisSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=1024, help_text="Pergunta ou contexto da busca")
    produtos = serializers.ListField(
        child=serializers.CharField(max_length=200),
        required=False, default=list,
        help_text="Lista de produtos a comparar (nomes/marcas/princípios ativos)",
    )
    cultura = serializers.CharField(max_length=200, required=False, default="")
    max_results = serializers.IntegerField(default=5, min_value=1, max_value=10)


def _run_google_cse(query: str, max_results: int):
    """Chama Google Custom Search JSON API. Retorna lista de {title, link, snippet}."""
    api_key = getattr(settings, 'GOOGLE_CSE_API_KEY', '')
    cse_cx = getattr(settings, 'GOOGLE_CSE_CX', '')
    if not api_key or not cse_cx:
        raise RuntimeError(
            'Google CSE não configurado. Defina GOOGLE_CSE_API_KEY e GOOGLE_CSE_CX no .env'
        )
    resp = requests.get(
        'https://www.googleapis.com/customsearch/v1',
        params={'key': api_key, 'cx': cse_cx, 'q': query, 'num': max_results},
        timeout=10,
    )
    resp.raise_for_status()
    return [
        {'title': it.get('title', ''), 'link': it.get('link', ''), 'snippet': it.get('snippet', '')}
        for it in resp.json().get('items', [])
    ]


def _call_llm_rag(query: str, produtos: list, cultura: str, cse_items: list) -> dict:
    """Monta o prompt RAG e chama o LLM (Gemini/OpenAI-compat). Retorna dict."""
    snippets_text = "\n".join(
        f"[{i+1}] {it['title']}\n    URL: {it['link']}\n    {it['snippet']}"
        for i, it in enumerate(cse_items)
    )
    user_msg = _RAG_USER_TEMPLATE.format(
        query=query,
        cultura=cultura or "não informada",
        produtos=", ".join(produtos) if produtos else "não especificados",
        snippets=snippets_text or "Nenhuma fonte encontrada — baseie-se no seu conhecimento agrícola.",
    )

    api_key = getattr(settings, 'ISIDORO_API_KEY', '')
    base_url = getattr(settings, 'ISIDORO_LLM_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai/')
    model = getattr(settings, 'ISIDORO_LLM_MODEL', 'gemini-2.5-flash')

    import json as _json
    resp = requests.post(
        base_url.rstrip('/') + '/chat/completions',
        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
        json={
            'model': model,
            'temperature': 0.2,
            'messages': [
                {'role': 'system', 'content': _RAG_SYSTEM_PROMPT},
                {'role': 'user', 'content': user_msg},
            ],
            'response_format': {'type': 'json_object'},
        },
        timeout=45,
    )
    resp.raise_for_status()
    content = resp.json()['choices'][0]['message']['content']
    try:
        return _json.loads(content)
    except Exception:
        # Fallback: wrap raw string
        return {'resumo': content, 'comparativo': [], 'recomendacao': content,
                'avisos': [], 'advisory': _RAG_SYSTEM_PROMPT.split('\n')[-1]}


class GoogleSearchAPIView(APIView):
    """
    POST /api/actions/isidoro-search/

    Executa busca no Google CSE e alimenta o LLM (Isidoro/Gemini) para produzir
    análise agronômica custo-eficiente com citações e aviso de agrônomo.

    Body:
      {
        "query": "texto livre da dúvida ou produto",
        "produtos": ["Roundup", "Glifosato 480", "Glifazin"],   // opcional
        "cultura": "soja",                                       // opcional
        "max_results": 5
      }

    Response:
      {
        "resumo": "...",
        "comparativo": [...],
        "recomendacao": "...",
        "avisos": [...],
        "advisory": "⚠️ Consulte o agrônomo...",
        "citations": [{"id":1, "title":"...", "url":"...", "snippet":"..."}],
        "search_query": "..."
      }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = _ProductAnalysisSerializer(data=request.data or {})
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        query = d['query']
        produtos = d['produtos']
        cultura = d['cultura']
        max_results = d['max_results']

        # Enriquece a query com nomes dos produtos se fornecidos
        search_query = query
        if produtos:
            search_query = f"{query} {' '.join(produtos[:3])} agronomia"

        try:
            cse_items = _run_google_cse(search_query, max_results)
        except RuntimeError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as exc:
            logger.exception('Google CSE error: %s', exc)
            return Response({'detail': f'Erro na busca: {exc}'}, status=status.HTTP_502_BAD_GATEWAY)

        try:
            analysis = _call_llm_rag(query, produtos, cultura, cse_items)
        except Exception as exc:
            logger.exception('LLM RAG error: %s', exc)
            return Response({'detail': f'Erro na análise LLM: {exc}'}, status=status.HTTP_502_BAD_GATEWAY)

        citations = [
            {'id': i + 1, 'title': it['title'], 'url': it['link'], 'snippet': it['snippet']}
            for i, it in enumerate(cse_items)
        ]

        logger.info(
            'isidoro-search: user=%s query=%r produtos=%r citations=%d',
            request.user, query, produtos, len(citations),
        )

        return Response({**analysis, 'citations': citations, 'search_query': search_query})


# ---------------------------------------------------------------------------#
#  Chat PDF Export — WeasyPrint (selectable text)                            #
# ---------------------------------------------------------------------------#

class ChatPDFExportSerializer(serializers.Serializer):
    """Serializer para /api/actions/chat-pdf-export/"""
    html_content = serializers.CharField(
        help_text="HTML content of the chat (usually from ChatWidget innerHTML)"
    )
    title = serializers.CharField(
        max_length=200,
        default="Relatório Isidoro",
        help_text="PDF title and filename (will append date)"
    )


class ChatPDFExportView(APIView):
    """
    POST /api/actions/chat-pdf-export/

    Converte HTML do chat para PDF com texto selecionável via WeasyPrint.
    Retorna PDF binary (Content-Disposition: attachment).

    Body:
      {
        "html_content": "<div>...</div>",
        "title": "Relatório Isidoro"  // opcional
      }

    Response:
      - Content-Type: application/pdf
      - Content-Disposition: attachment; filename="Relatório_Isidoro_2026-03-12.pdf"
      - Binary PDF data (selectable text, not image-based)
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from weasyprint import HTML, CSS
        from io import BytesIO
        from datetime import date
        import base64

        ser = ChatPDFExportSerializer(data=request.data or {})
        ser.is_valid(raise_exception=True)
        
        html_content = ser.validated_data['html_content']
        title = ser.validated_data.get('title', 'Relatório Isidoro')

        try:
            import os
            now_str = __import__('datetime').datetime.now().strftime('%H:%M')

            # Load logo PNG as base64 data URI (transparent background)
            logo_html = ''
            logo_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                'static', 'img', 'logo-agrolink.png'
            )
            if os.path.isfile(logo_path):
                with open(logo_path, 'rb') as f:
                    logo_b64 = base64.b64encode(f.read()).decode('ascii')
                logo_html = f'<img class="brand-logo" src="data:image/png;base64,{logo_b64}" alt="Agro-Link" />'
            # If no logo file, just text (no icon)

            # Wrap HTML content with Agro-Link themed styling for PDF
            html_str = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    @page {{
                        size: A4;
                        margin: 15mm 15mm 20mm 15mm;
                        @bottom-center {{
                            content: "Agro-Link | Página " counter(page);
                            font-size: 8pt;
                            color: #94a3b8;
                        }}
                    }}
                    body {{
                        font-family: 'DejaVu Sans', 'Segoe UI', Arial, sans-serif;
                        font-size: 10.5pt;
                        line-height: 1.65;
                        color: #1e293b;
                        margin: 0;
                        padding: 0;
                    }}

                    /* ── Header branding ─────────────────────────── */
                    .pdf-header {{
                        background: linear-gradient(135deg, #166534 0%, #198754 100%);
                        color: #ffffff;
                        padding: 14pt 18pt;
                        border-radius: 8px;
                        margin-bottom: 18pt;
                    }}
                    .pdf-header .brand {{
                        font-size: 14pt;
                        font-weight: 700;
                        letter-spacing: 0.3pt;
                        display: flex;
                        align-items: center;
                        gap: 8pt;
                    }}
                    .pdf-header .brand-logo {{
                        height: 36pt;
                        width: auto;
                    }}
                    .pdf-header .subtitle {{
                        font-size: 8.5pt;
                        color: #bbf7d0;
                        margin-top: 2pt;
                    }}
                    .pdf-header .report-title {{
                        font-size: 13pt;
                        font-weight: 700;
                        margin-top: 10pt;
                        padding-top: 8pt;
                        border-top: 1px solid rgba(255,255,255,0.3);
                    }}
                    .pdf-header .report-date {{
                        font-size: 8.5pt;
                        color: #bbf7d0;
                        margin-top: 2pt;
                    }}

                    /* ── Typography ──────────────────────────────── */
                    h1, h2, h3, h4, h5, h6 {{
                        color: #0f172a;
                        margin-top: 14pt;
                        margin-bottom: 6pt;
                        page-break-after: avoid;
                        font-weight: 700;
                        line-height: 1.3;
                    }}
                    h1 {{ font-size: 15pt; }}
                    h2 {{ font-size: 13pt; border-bottom: 1.5px solid #198754; padding-bottom: 3pt; }}
                    h3 {{ font-size: 11.5pt; color: #166534; }}
                    h4 {{ font-size: 10.5pt; }}
                    p {{
                        margin: 5pt 0;
                    }}
                    p:last-child {{
                        margin-bottom: 0;
                    }}
                    strong {{ font-weight: 700; color: #0f172a; }}

                    /* ── Lists ───────────────────────────────────── */
                    ul, ol {{
                        margin: 4pt 0 8pt 18pt;
                        padding: 0;
                    }}
                    li {{
                        margin-bottom: 3pt;
                        line-height: 1.55;
                    }}

                    /* ── Tables ──────────────────────────────────── */
                    table {{
                        width: 100%;
                        border-collapse: collapse;
                        margin: 8pt 0;
                        font-size: 9.5pt;
                    }}
                    th {{
                        background-color: #f0fdf4;
                        font-weight: 700;
                        text-align: left;
                        padding: 5pt 7pt;
                        border-bottom: 2px solid #198754;
                        color: #166534;
                    }}
                    td {{
                        padding: 4pt 7pt;
                        border-bottom: 1px solid #e2e8f0;
                    }}
                    tr:nth-child(even) td {{
                        background-color: #f8fafc;
                    }}

                    /* ── Code ────────────────────────────────────── */
                    code {{
                        background: #f1f5f9;
                        padding: 1.5pt 4pt;
                        border-radius: 3px;
                        font-family: 'DejaVu Sans Mono', 'Courier New', monospace;
                        font-size: 9pt;
                        color: #be185d;
                    }}
                    pre {{
                        background: #1e293b;
                        color: #e2e8f0;
                        padding: 10pt 12pt;
                        border-radius: 6px;
                        margin: 6pt 0;
                        font-size: 9pt;
                        line-height: 1.5;
                        page-break-inside: avoid;
                    }}
                    pre code {{
                        background: transparent;
                        color: inherit;
                        padding: 0;
                        font-size: inherit;
                    }}

                    /* ── Blockquote ──────────────────────────────── */
                    blockquote {{
                        border-left: 3px solid #198754;
                        margin: 6pt 0;
                        padding: 4pt 0 4pt 10pt;
                        color: #475569;
                        background: #f0fdf4;
                        border-radius: 0 6px 6px 0;
                    }}

                    /* ── Horizontal rule ─────────────────────────── */
                    hr {{
                        border: 0;
                        border-top: 1px solid #e2e8f0;
                        margin: 8pt 0;
                    }}

                    /* ── Footer ──────────────────────────────────── */
                    .pdf-footer {{
                        border-top: 1.5px solid #198754;
                        padding-top: 8pt;
                        margin-top: 24pt;
                        font-size: 8pt;
                        color: #94a3b8;
                        text-align: center;
                    }}
                    .pdf-footer .footer-brand {{
                        color: #198754;
                        font-weight: 700;
                    }}
                </style>
            </head>
            <body>
                <div class="pdf-header">
                    <div class="brand">{logo_html} Agro-Link</div>
                    <div class="subtitle">Sua gestão otimizada via inteligência artificial</div>
                    <div class="report-title">{title}</div>
                    <div class="report-date">Gerado em {date.today().strftime('%d/%m/%Y')} às {now_str}</div>
                </div>
                <div class="pdf-content">
                    {html_content}
                </div>
                <div class="pdf-footer">
                    <p><span class="footer-brand">Agro-Link</span> — Sistema Agrícola Inteligente | Relatório confidencial para uso interno</p>
                </div>
            </body>
            </html>
            """

            # Generate PDF via WeasyPrint
            pdf_bytes = HTML(string=html_str).write_pdf()

            # Return as file download (use Django HttpResponse for binary data)
            from django.http import HttpResponse as DjangoHttpResponse
            response = DjangoHttpResponse(
                pdf_bytes,
                content_type='application/pdf',
            )
            response['Content-Disposition'] = f'attachment; filename="{title.replace(" ", "_")}_{date.today().isoformat()}.pdf"'
            
            logger.info(
                'chat-pdf-export: user=%s title=%r size=%d bytes',
                request.user, title, len(pdf_bytes),
            )
            
            return response

        except Exception as exc:
            logger.exception('WeasyPrint PDF generation error: %s', exc)
            return Response(
                {'detail': f'Erro ao gerar PDF: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class ActionSchemaView(APIView):
    """
    API REST para introspection de schema de actions.
    
    Permite que Isidoro (e qualquer cliente AI) consulte quais campos são obrigatórios
    e quais são opcionais para cada ação, sem precisar ter hardcoded a lógica.
    
    É um intermediário legado que expõe a definição de campos já existente no sistema
    manual (ACTION_FIELDS_SCHEMA) via REST API.
    
    Endpoints:
    - GET /api/actions/schema/                    → Lista todos action_types disponíveis
    - GET /api/actions/schema/{action_type}/      → Schema completo de um action_type
    - GET /api/actions/schema/{action_type}/      → Com query ?format=required|optional|all
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, action_type=None):
        """
        Retorna schema de campos para action_type.
        
        Query params:
        - format: required|optional|all|complete (default: complete)
          - required: apenas lista campos obrigatórios (nomes)
          - optional: apenas lista campos opcionais (nomes)
          - all: lista obrigatórios + opcionais (nomes)
          - complete: estrutura completa com metadata (padrão)
        """
        from .ACTION_FIELDS_SCHEMA import ACTION_FIELDS_SCHEMA, get_required_fields, get_optional_fields, get_all_action_types
        
        format_param = request.query_params.get('format', 'complete')
        
        # Case 1: List all action_types (GET /api/actions/schema/)
        if action_type is None:
            all_types = get_all_action_types()
            return Response({
                'action_types': all_types,
                'count': len(all_types),
                'modules': self._group_by_module(all_types)
            })
        
        # Case 2: Get schema for specific action_type
        schema = ACTION_FIELDS_SCHEMA.get(action_type)
        if not schema:
            return Response(
                {'error': f'action_type "{action_type}" não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Format response based on query param
        if format_param == 'required':
            return Response({
                'action_type': action_type,
                'required_fields': get_required_fields(action_type)
            })
        elif format_param == 'optional':
            return Response({
                'action_type': action_type,
                'optional_fields': get_optional_fields(action_type)
            })
        elif format_param == 'all':
            return Response({
                'action_type': action_type,
                'required_fields': get_required_fields(action_type),
                'optional_fields': get_optional_fields(action_type)
            })
        else:  # complete (default)
            return Response(schema)
    
    def _group_by_module(self, action_types):
        """Agrupa action_types por módulo."""
        from .ACTION_FIELDS_SCHEMA import ACTION_FIELDS_SCHEMA
        
        by_module = {}
        for action_type in action_types:
            schema = ACTION_FIELDS_SCHEMA.get(action_type, {})
            module = schema.get('module', 'unknown')
            if module not in by_module:
                by_module[module] = []
            by_module[module].append(action_type)
        return by_module