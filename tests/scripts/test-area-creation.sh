#!/bin/bash

# Script de teste para validar a correção de criar_area

BASE_URL="http://localhost:8000/api"
# Token genérico - assumindo que já existe usuário autenticado
JWT_TOKEN="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiaXNpZG9ybyIsInRlbmFudCI6ImFncm9saW5rIn0.test"

# Use token real se disponível
read -p "Token JWT (deixe vazio para usar padrão): " INPUT_TOKEN
if [ -n "$INPUT_TOKEN" ]; then
    JWT_TOKEN="$INPUT_TOKEN"
fi

echo "Testing Area Creation Fix..."
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Criar Proprietário (pré-requisito)
echo "1️⃣  Creating Proprietário..."
PROP_RESPONSE=$(curl -s -X POST "$BASE_URL/actions/" \
  -H "Authorization: $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "module": "fazendas",
    "action_type": "criar_proprietario",
    "draft_data": {
      "nome": "Test Proprietário",
      "cpf_cnpj": "999.999.999-99"
    }
  }')

echo "Response: $PROP_RESPONSE"
echo ""

# Test 2: Criar Fazenda (pré-requisito)
echo "2️⃣  Creating Fazenda..."
FAZENDA_RESPONSE=$(curl -s -X POST "$BASE_URL/actions/" \
  -H "Authorization: $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "module": "fazendas",
    "action_type": "criar_fazenda",
    "draft_data": {
      "name": "Test Fazenda",
      "matricula": "TEST-2026-001",
      "proprietario": "Test Proprietário"
    }
  }')

echo "Response: $FAZENDA_RESPONSE"
echo ""

# Test 3: Criar Área (TESTE PRINCIPAL)
echo "3️⃣  Creating Área (MAIN TEST)..."
AREA_RESPONSE=$(curl -s -X POST "$BASE_URL/actions/" \
  -H "Authorization: $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "module": "fazendas",
    "action_type": "criar_area",
    "draft_data": {
      "name": "Test Gleba",
      "fazenda": "Test Fazenda",
      "proprietario": "Test Proprietário",
      "tipo": "propria"
    }
  }')

echo "Response: $AREA_RESPONSE"
echo ""

# Check for success
if echo "$AREA_RESPONSE" | grep -q '"sucesso": true'; then
    echo "✅ SUCCESS! Area creation is working!"
elif echo "$AREA_RESPONSE" | grep -q 'Nome da área é obrigatório'; then
    echo "❌ FAILED! Still getting 'Nome da área é obrigatório' error"
    echo "This means the fix didn't work."
else
    echo "⚠️  Unexpected response - check manually"
fi
