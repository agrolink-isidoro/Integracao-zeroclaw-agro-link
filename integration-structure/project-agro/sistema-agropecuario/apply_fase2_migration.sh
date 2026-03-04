#!/bin/bash
cd /home/felip/projeto-agro/sistema-agropecuario
export DATABASE_URL=postgresql://agro_user:secret_password@localhost:5435/agro_db
python backend/manage.py migrate comercial
