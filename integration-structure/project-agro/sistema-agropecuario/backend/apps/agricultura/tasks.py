from celery import shared_task
import requests


@shared_task
def sync_sefaz():
    # Placeholder para sync com API SEFAZ
    # Buscar notas fiscais pendentes
    # Salvar no banco
    pass


@shared_task
def send_daily_notifications():
    # Enviar notificações diárias por e-mail
    pass