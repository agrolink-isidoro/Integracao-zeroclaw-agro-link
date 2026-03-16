from apps.core.mixins import TenantQuerySetMixin
from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action, api_view, permission_classes as perm_classes
from rest_framework.response import Response
from apps.core.permissions import RBACViewPermission

from .models import (
    Proprietario, Fazenda, Area, Talhao, Arrendamento, CotacaoSaca,
    DocumentoArrendamento, ParcelaArrendamento
)
from .serializers import (
    ProprietarioSerializer,
    FazendaSerializer,
    AreaSerializer,
    TalhaoSerializer,
    ArrendamentoSerializer,
    CotacaoSacaSerializer,
    DocumentoArrendamentoSerializer,
    ParcelaArrendamentoSerializer,
)
from .services import ArrendamentoService


class ProprietarioViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    rbac_module = 'fazendas'
    queryset = Proprietario.objects.all().order_by("nome")
    serializer_class = ProprietarioSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]

    def destroy(self, request, *args, **kwargs):
        """Override destroy to return friendly error when related objects prevent deletion."""
        try:
            return super().destroy(request, *args, **kwargs)
        except models.ProtectedError as e:
            return Response({'error': 'Não é possível excluir: existem registros relacionados que impedem a exclusão.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception('Erro ao excluir Proprietário: %s', e)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FazendaViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    rbac_module = 'fazendas'
    queryset = Fazenda.objects.all().order_by("name")
    serializer_class = FazendaSerializer
    # Restrict lookup to numeric IDs so reserved subpaths like 'talhoes' don't get
    # interpreted as a Fazenda 'pk' (avoids /fazendas/talhoes/ resolving to fazenda-detail)
    lookup_value_regex = r"\d+"
    # Return raw list (not paginated) in tests / lightweight endpoints
    pagination_class = None
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]


class AreaViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    rbac_module = 'fazendas'
    queryset = Area.objects.select_related('fazenda', 'proprietario').prefetch_related('talhoes').all().order_by("name")
    serializer_class = AreaSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]

    def get_queryset(self):
        # Area does not have a direct tenant field; filter via related Fazenda
        # select_related('fazenda', 'proprietario') to optimize queries for serializer fields
        # prefetch_related('talhoes') to optimize nested serializer
        qs = Area.objects.select_related('fazenda', 'proprietario').prefetch_related('talhoes').all().order_by("name")
        tenant = self._get_request_tenant()
        if tenant is not None:
            qs = qs.filter(fazenda__tenant=tenant)
        elif not (self.request.user and self.request.user.is_superuser):
            return qs.none()
        return qs


class TalhaoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    rbac_module = 'fazendas'
    queryset = Talhao.objects.select_related('area__fazenda').all().order_by("name")
    serializer_class = TalhaoSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    
    def get_queryset(self):
        # Talhao does not have a direct tenant field; filter via related Fazenda
        queryset = Talhao.objects.select_related('area__fazenda').all().order_by("name")
        tenant = self._get_request_tenant()
        if tenant is not None:
            queryset = queryset.filter(area__fazenda__tenant=tenant)
        elif not (self.request.user and self.request.user.is_superuser):
            return queryset.none()

        # Optional query param filters
        fazenda_id = self.request.query_params.get('fazenda', None)
        if fazenda_id:
            queryset = queryset.filter(area__fazenda_id=fazenda_id)

        area_id = self.request.query_params.get('area', None)
        if area_id:
            queryset = queryset.filter(area_id=area_id)

        return queryset

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except models.ProtectedError:
            return Response({'error': 'Não é possível excluir o talhão: existem registros relacionados que impedem a exclusão.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception('Erro ao excluir Talhão: %s', e)
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ArrendamentoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    rbac_module = 'fazendas'
    queryset = Arrendamento.objects.all().order_by("-start_date")
    serializer_class = ArrendamentoSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]


class CotacaoSacaViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    rbac_module = 'fazendas'
    queryset = CotacaoSaca.objects.all().order_by("-data")
    serializer_class = CotacaoSacaSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]


class DocumentoArrendamentoViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    rbac_module = 'fazendas'
    """ViewSet para DocumentoArrendamento com criação automática de parcelas."""
    
    queryset = DocumentoArrendamento.objects.all().order_by('-criado_em')
    serializer_class = DocumentoArrendamentoSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros opcionais
        fazenda_id = self.request.query_params.get('fazenda', None)
        if fazenda_id:
            queryset = queryset.filter(fazenda_id=fazenda_id)
        
        arrendador_id = self.request.query_params.get('arrendador', None)
        if arrendador_id:
            queryset = queryset.filter(arrendador_id=arrendador_id)
        
        arrendatario_id = self.request.query_params.get('arrendatario', None)
        if arrendatario_id:
            queryset = queryset.filter(arrendatario_id=arrendatario_id)
        
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.select_related('fazenda', 'arrendador', 'arrendatario').prefetch_related('talhoes', 'parcelas')
    
    def create(self, request, *args, **kwargs):
        """Cria documento com parcelas automáticas usando ArrendamentoService."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Usar o service para criar com parcelas
            documento = ArrendamentoService.criar_documento_com_parcelas(
                dados_documento=serializer.validated_data,
                usuario=request.user if request.user.is_authenticated else None,
                tenant=getattr(request, 'tenant', None) or getattr(request.user, 'tenant', None),
            )
            
            # Retornar documento criado
            output_serializer = self.get_serializer(documento)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
        
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Erro ao criar documento: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela documento e vencimentos associados."""
        try:
            documento = ArrendamentoService.cancelar_documento(
                documento_id=pk,
                usuario=request.user if request.user.is_authenticated else None
            )
            
            serializer = self.get_serializer(documento)
            return Response(serializer.data)
        
        except DocumentoArrendamento.DoesNotExist:
            return Response(
                {'error': 'Documento não encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Erro ao cancelar documento: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ParcelaArrendamentoViewSet(TenantQuerySetMixin, viewsets.ReadOnlyModelViewSet):
    rbac_module = 'fazendas'
    """ViewSet somente leitura para ParcelaArrendamento."""
    
    queryset = ParcelaArrendamento.objects.all().order_by('documento', 'numero_parcela')
    serializer_class = ParcelaArrendamentoSerializer
    permission_classes = [permissions.IsAuthenticated, RBACViewPermission]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtrar por documento
        documento_id = self.request.query_params.get('documento', None)
        if documento_id:
            queryset = queryset.filter(documento_id=documento_id)
        
        return queryset.select_related('documento', 'vencimento')


# ---------------------------------------------------------------------------
# GeoJSON endpoint  —  GET /api/geo/
# Returns a FeatureCollection with areas and talhões geometry.
# ---------------------------------------------------------------------------
import json
import logging
from django.contrib.gis.geos import GEOSGeometry

logger = logging.getLogger(__name__)


def _geom_to_geojson(geom_text):
    """Convert a geometry stored as WKT or GeoJSON string to a GeoJSON dict."""
    if not geom_text:
        return None
    try:
        # Try parsing as GeoJSON first
        parsed = json.loads(geom_text)
        if isinstance(parsed, dict) and "type" in parsed:
            return parsed
    except (json.JSONDecodeError, TypeError):
        pass
    try:
        # Try parsing as WKT via GEOS
        geos = GEOSGeometry(geom_text, srid=4326)
        return json.loads(geos.geojson)
    except Exception:
        return None


@api_view(["GET"])
@perm_classes([permissions.IsAuthenticated])
def geo_view(request):
    """
    Return a GeoJSON FeatureCollection of all Fazendas/Areas/Talhões.
    Query params:
      - layer: 'areas' | 'talhoes' | 'all' (default 'all')
      - fazenda: filter by fazenda_id
    """
    layer = request.query_params.get("layer", "all")
    fazenda_id = request.query_params.get("fazenda")

    features = []

    # Tenant isolation for views that use raw Model.objects (Area/Talhao have no tenant field)
    _tenant = getattr(request, 'tenant', None) or getattr(request.user, 'tenant', None)

    if layer in ("areas", "all"):
        qs = Area.objects.select_related("fazenda", "proprietario")
        if _tenant:
            qs = qs.filter(fazenda__tenant=_tenant)
        if fazenda_id:
            qs = qs.filter(fazenda_id=fazenda_id)

        for area in qs:
            geojson = _geom_to_geojson(area.geom)
            if geojson:
                features.append(
                    {
                        "type": "Feature",
                        "id": f"area-{area.id}",
                        "geometry": geojson,
                        "properties": {
                            "entity_type": "area",
                            "id": area.id,
                            "name": area.name,
                            "tipo": area.tipo,
                            "fazenda_id": area.fazenda_id,
                            "fazenda_name": area.fazenda.name,
                            "area_hectares": area.area_hectares,
                        },
                    }
                )

    if layer in ("talhoes", "all"):
        qs = Talhao.objects.select_related("area__fazenda")
        if _tenant:
            qs = qs.filter(area__fazenda__tenant=_tenant)
        if fazenda_id:
            qs = qs.filter(area__fazenda_id=fazenda_id)

        for talhao in qs:
            geojson = _geom_to_geojson(talhao.geom)
            if geojson:
                features.append(
                    {
                        "type": "Feature",
                        "id": f"talhao-{talhao.id}",
                        "geometry": geojson,
                        "properties": {
                            "entity_type": "talhao",
                            "id": talhao.id,
                            "name": talhao.name,
                            "area_id": talhao.area_id,
                            "area_name": talhao.area.name,
                            "fazenda_id": talhao.area.fazenda_id,
                            "fazenda_name": talhao.area.fazenda.name,
                            "area_size_ha": float(talhao.area_size) if talhao.area_size else None,
                        },
                    }
                )

    return Response(
        {
            "type": "FeatureCollection",
            "features": features,
        }
    )
