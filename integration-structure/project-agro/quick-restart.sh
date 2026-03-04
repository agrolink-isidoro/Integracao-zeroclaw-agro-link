#!/bin/bash
set -e

echo "🛑 Killing existing processes..."
pkill -9 python3 2>/dev/null || true
pkill -9 npm 2>/dev/null || true
sleep 3

echo "✅ Starting Django on 8001..."
cd /home/felip/projeto-agro/sistema-agropecuario/backend
python3 manage.py runserver 0.0.0.0:8001 > /tmp/django.log 2>&1 &
DJANGO_PID=$!
echo "Django PID: $DJANGO_PID"

sleep 5

echo "✅ Starting Vite on 5173..."
cd /home/felip/projeto-agro/sistema-agropecuario/frontend
npm run dev > /tmp/vite.log 2>&1 &
VITE_PID=$!
echo "Vite PID: $VITE_PID"

sleep 4

echo "🎯 Servers ready!"
echo "Backend: http://localhost:8001"
echo "Frontend: http://localhost:5173"
