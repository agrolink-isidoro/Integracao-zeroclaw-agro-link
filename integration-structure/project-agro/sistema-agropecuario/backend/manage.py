#!/usr/bin/env python
import os
import sys

# Carregar variáveis de ambiente do .env
from dotenv import load_dotenv
load_dotenv()

# Adicionar o diretório backend ao path
sys.path.insert(0, os.path.dirname(__file__))
# Adicionar o diretório do projeto ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def main():
	os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sistema_agropecuario.settings.base")
	try:
		from django.core.management import execute_from_command_line
	except ImportError:
		raise
	execute_from_command_line(sys.argv)


if __name__ == "__main__":
	main()
