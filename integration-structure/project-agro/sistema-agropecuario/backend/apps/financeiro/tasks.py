from celery import shared_task
from .services import process_bank_statement_import


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def process_bank_statement_import_task(self, import_id):
    """Celery task wrapper that processes a BankStatementImport by id.

    Retries on exceptions and bubbles errors to Celery so retry/backoff works.
    """
    return process_bank_statement_import(import_id)
