#!/bin/bash

# Script para aplicar migrações pendentes
# Executa em um novo processo bash independente

cd /home/felip/projeto-agro/sistema-agropecuario/backend

export DATABASE_URL=postgresql://agro_user:secret_password@localhost:5435/agro_db

echo "========================================="
echo "Verificando migrações pendentes..."
echo "========================================="
python3 manage.py showmigrations

echo ""
echo "========================================="
echo "Aplicando migrações..."
echo "========================================="
python3 manage.py migrate

echo ""
echo "========================================="
echo "Status final das migrações:"
echo "========================================="
python3 manage.py showmigrations comercial
python3 manage.py showmigrations agricultura
python3 manage.py showmigrations estoque

echo ""
echo "========================================="
echo "Migrações aplicadas com sucesso!"
echo "========================================="
