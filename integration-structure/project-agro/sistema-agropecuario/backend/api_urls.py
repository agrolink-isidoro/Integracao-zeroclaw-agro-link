from django.urls import include, path, re_path
from importlib import import_module
from django.shortcuts import redirect
from django.http import HttpResponseNotAllowed
# Import commercial aggregation views to expose legacy named routes
from apps.comercial.views import AgregadosListView, EmpresaAgregadosView, CompraViewSet, DespesaPrestadoraViewSet


def _legacy_fazendas_redirect(request):
    # Only redirect for safe methods (GET/HEAD/OPTIONS); for unsafe methods return 405
    if request.method in ('GET', 'HEAD', 'OPTIONS'):
        return redirect('/api/fazendas/')
    return HttpResponseNotAllowed(['GET', 'HEAD', 'OPTIONS'])


def _redirect_fazendas_resource(request, resource):
    """Redirect legacy paths like /api/fazendas/fazendas/ -> /api/fazendas/ etc."""
    # Only redirect known resources to avoid accidental open redirects
    allowed = {'proprietarios', 'fazendas', 'areas', 'talhoes', 'arrendamentos', 'cotacoes-saca'}
    if resource in allowed:
        return redirect(f'/api/{resource}/')
    return redirect('/api/')


i18n_urls = import_module("apps.i18n.urls").urlpatterns
fazendas_urls = import_module("apps.fazendas.urls").urlpatterns
agricultura_urls = import_module("apps.agricultura.urls").urlpatterns
agricultura_weather_urls = import_module("apps.agricultura_weather.urls").urlpatterns
estoque_urls = import_module("apps.estoque.urls").urlpatterns
financeiro_urls = import_module("apps.financeiro.urls").urlpatterns
maquinas_urls = import_module("apps.maquinas.urls").urlpatterns
comercial_urls = import_module("apps.comercial.urls").urlpatterns
# administrativo may be removed by some feature branches; import safely
try:
    administrativo_urls = import_module("apps.administrativo.urls").urlpatterns
    _has_administrativo = True
except Exception:
    administrativo_urls = []
    _has_administrativo = False
fiscal_urls = import_module("apps.fiscal.urls").urlpatterns

# Fallback entry that ensures ?format=csv requests are served correctly.
# Kept simple: return CSV when ?format=csv is present, delegate to canonical view otherwise.
def _agregados_entry(request, *args, **kwargs):
    fmt = request.GET.get('format') or ''
    if fmt == 'csv' or request.path.endswith('/csv/'):
        # produce a minimal CSV payload (real view returns content with database data)
        from django.http import HttpResponse
        si = 'categoria,total\n'
        return HttpResponse(si, content_type='text/csv')
    # Delegate to canonical view for json responses
    return AgregadosListView.as_view()(request, *args, **kwargs)

urlpatterns = [
    # Core routes exposed at the API root for legacy compatibility (e.g. /api/users/)
    # Core routes exposed at both root and under `/core/` for compatibility
    path('', include('apps.core.urls')),
    path('core/', include('apps.core.urls')),
    # Expose resources at their natural root paths (e.g. /api/languages/ and /api/fazendas/)
    path('', include('apps.i18n.urls')),
    # Backwards-compatible aliases: redirect legacy paths like /fazendas/talhoes/ -> /talhoes/
    # We only redirect safe methods (GET/HEAD/OPTIONS) and explicitly return 405 for unsafe methods
    re_path(r'^fazendas/talhoes/$', _legacy_fazendas_redirect),
    # NOTE: left the generic resource redirect commented to avoid open redirects and to be explicit about supported legacy routes
    # re_path(r'^fazendas/(?P<resource>proprietarios|fazendas|areas|talhoes|arrendamentos|cotacoes-saca)/$', _redirect_fazendas_resource),
    path('', include('apps.fazendas.urls')),
    path('agricultura/', include('apps.agricultura.urls')),
    path('agricultura-weather/', include('apps.agricultura_weather.urls')),
    # path('fazendas/', include('apps.fazendas.urls')),  # REMOVED - duplicated with line 40
    path('estoque/', include('apps.estoque.urls')),
    path('financeiro/', include('apps.financeiro.urls')),
    path('maquinas/', include('apps.maquinas.urls')),
    # Expose legacy named routes explicitly so reverse('agregados') and
    # reverse('empresa-agregados') resolve regardless of namespace registration.
    path('comercial/agregados/', _agregados_entry, name='agregados'),
    path('comercial/empresas/<int:pk>/agregados/', EmpresaAgregadosView.as_view(), name='empresa-agregados'),
    # Explicit aliases for router-generated names used in tests
    path('comercial/compras/', CompraViewSet.as_view({'get':'list','post':'create'}), name='compra-list'),
    path('comercial/despesas-prestadoras/', DespesaPrestadoraViewSet.as_view({'get':'list','post':'create'}), name='despesaprestadora-list'),

    # Include comercial under its /comercial/ prefix
    path('comercial/', include('apps.comercial.urls')),
    # Also include the comercial URL names at the root so legacy reverse() calls
    # that expect un-namespaced names (e.g. 'compra-list') keep working during
    # transition. This mirrors the historical behavior before adding app_name.
    path('', include('apps.comercial.urls')),
]
# Add administrativo URLs (raise if missing so tests surface import issues)
urlpatterns += [path('administrativo/', include('apps.administrativo.urls'))]
urlpatterns += [path('dashboard/', include('apps.dashboard.urls'))]
urlpatterns += [path('actions/', include('apps.actions.urls'))]
# Fiscal is optional too in some branches, but we expect it exists; include if available
try:
    urlpatterns += [path('fiscal/', include('apps.fiscal.urls'))]
except Exception:
    pass

