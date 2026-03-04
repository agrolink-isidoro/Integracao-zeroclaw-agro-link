from apps.core.mixins import TenantQuerySetMixin

from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.decorators import action
from .models_certificados import CertificadoActionAudit
from rest_framework import serializers


class CertificadoActionAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = CertificadoActionAudit
        fields = '__all__'


class CertificadoActionAuditViewSet(TenantQuerySetMixin, viewsets.ReadOnlyModelViewSet):
    queryset = CertificadoActionAudit.objects.all().order_by('-created_at')
    serializer_class = CertificadoActionAuditSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = super().get_queryset()
        action = self.request.query_params.get('action')
        cert_id = self.request.query_params.get('certificado')
        actor = self.request.query_params.get('performed_by')
        if action:
            qs = qs.filter(action=action)
        if cert_id:
            qs = qs.filter(certificado_id=cert_id)
        if actor:
            qs = qs.filter(performed_by_identifier__icontains=actor)
        return qs

    def list(self, request, *args, **kwargs):
        # Exportação CSV se ?format=csv
        # Suporte a exportação CSV tanto por ?format=csv quanto Accept: text/csv
        wants_csv = (
            request.query_params.get('format') == 'csv' or
            'text/csv' in request.META.get('HTTP_ACCEPT', '')
        )
        if wants_csv:
            import csv
            from django.http import HttpResponse
            qs = self.filter_queryset(self.get_queryset())
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="certificado_audits.csv"'
            fields = ['id', 'action', 'certificado', 'performed_by', 'performed_by_identifier', 'details', 'created_at']
            writer = csv.writer(response)
            writer.writerow(fields)
            for obj in qs:
                writer.writerow([
                    obj.id,
                    obj.action,
                    obj.certificado_id,
                    getattr(obj.performed_by, 'username', None) if obj.performed_by else '',
                    obj.performed_by_identifier,
                    obj.details,
                    obj.created_at.isoformat() if obj.created_at else '',
                ])
            return response

        # Paginação customizada
        page_size = int(request.query_params.get('page_size', 10))
        page = int(request.query_params.get('page', 1))
        qs = self.filter_queryset(self.get_queryset())
        total = qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        page_qs = qs[start:end]
        serializer = self.get_serializer(page_qs, many=True)
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': serializer.data
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def export_csv(self, request):
        """Export audits as CSV (admin only)."""
        import csv
        from django.http import HttpResponse
        qs = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="certificado_audits.csv"'
        fields = ['id', 'action', 'certificado', 'performed_by', 'performed_by_identifier', 'details', 'created_at']
        writer = csv.writer(response)
        writer.writerow(fields)
        for obj in qs:
            writer.writerow([
                obj.id,
                obj.action,
                obj.certificado_id,
                getattr(obj.performed_by, 'username', None) if obj.performed_by else '',
                obj.performed_by_identifier,
                obj.details,
                obj.created_at.isoformat() if obj.created_at else '',
            ])
        return response