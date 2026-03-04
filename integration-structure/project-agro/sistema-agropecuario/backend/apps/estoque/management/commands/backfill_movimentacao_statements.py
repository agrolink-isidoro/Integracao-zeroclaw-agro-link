from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.estoque.models import MovimentacaoEstoque, MovimentacaoStatement, ProdutoAuditoria


class Command(BaseCommand):
    help = 'Backfill MovimentacaoStatement records from existing MovimentacaoEstoque rows.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Do not write to DB, only report counts')
        parser.add_argument('--batch', type=int, default=500, help='Number of rows to log progress for')
        parser.add_argument('--start-id', type=int, default=0, help='Starting MovimentacaoEstoque id')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        batch = options['batch']
        start_id = options['start_id']

        qs = MovimentacaoEstoque.objects.filter(id__gte=start_id).order_by('id')
        total = qs.count()
        self.stdout.write(f'Found {total} movimentacoes to process (start_id={start_id})')

        processed = 0
        created = 0
        skipped = 0

        for mov in qs.iterator():
            processed += 1
            if mov.statements.exists():
                skipped += 1
                continue

            if dry_run:
                created += 1
            else:
                try:
                    with transaction.atomic():
                        stmt = MovimentacaoStatement.objects.create(
                            movimentacao=mov,
                            produto=mov.produto,
                            tipo=mov.tipo,
                            quantidade=mov.quantidade,
                            unidade=getattr(mov.produto, 'unidade', None),
                            valor_unitario=mov.valor_unitario,
                            valor_total=mov.valor_total,
                            data_movimentacao=mov.data_movimentacao,
                            documento_referencia=mov.documento_referencia,
                            motivo=mov.motivo,
                            observacoes=f'Backfilled from movimentacao id={mov.id}',
                            lote=mov.lote,
                            fazenda=mov.fazenda,
                            talhao=mov.talhao,
                            local_armazenamento=mov.local_armazenamento,
                            saldo_resultante=getattr(mov.produto, 'quantidade_estoque', None),
                            metadata={'backfilled': True, 'backfill_timestamp': timezone.now().isoformat(), 'movimentacao_id': mov.id},
                            criado_por=mov.criado_por,
                        )

                        # Ensure there's a ProdutoAuditoria entry for the movimentacao
                        aud_exists = ProdutoAuditoria.objects.filter(
                            produto=mov.produto,
                            acao='movimentacao',
                            quantidade=mov.quantidade,
                            documento_referencia=mov.documento_referencia,
                        ).exists()
                        if not aud_exists:
                            ProdutoAuditoria.objects.create(
                                produto=mov.produto,
                                acao='movimentacao',
                                origem=mov.origem or 'manual',
                                produto_codigo=mov.produto.codigo,
                                produto_nome=mov.produto.nome,
                                produto_categoria=mov.produto.categoria,
                                produto_unidade=mov.produto.unidade,
                                quantidade=mov.quantidade,
                                valor_unitario=mov.valor_unitario,
                                documento_referencia=mov.documento_referencia,
                                observacoes='Backfilled audit for movimentacao',
                                criado_por=mov.criado_por,
                            )

                        created += 1
                except Exception as e:
                    self.stderr.write(f'Error processing movimentacao id={mov.id}: {e}')

            if processed % batch == 0:
                self.stdout.write(f'Processed {processed}/{total} - created {created}, skipped {skipped}')

        self.stdout.write(self.style.SUCCESS(f'Done. Processed {processed}. Created {created}. Skipped {skipped}'))
