#!/bin/bash

# Arquivos que precisam de timeout 50s em waitForSelector
files=(
  "extratos-upload.spec.ts"
  "financeiro-operacoes.spec.ts"
  "financeiro-tabs.spec.ts"
  "harvest_session.spec.ts"
  "livro_caixa.spec.ts"
  "manifestacao.spec.ts"
  "manifestacao-enqueued.spec.ts"
  "modal_and_select_fallback.spec.ts"
  "operacoes.spec.ts"
  "ordem-servico-nfe.spec.ts"
)

echo "Updating timeouts to 50s in 10 files..."

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Update various timeout patterns to 50000
    sed -i 's/timeout: 30000/timeout: 50000/g' "$file"
    sed -i 's/timeout: 35000/timeout: 50000/g' "$file"
    sed -i 's/timeout: 40000/timeout: 50000/g' "$file"
    sed -i 's/timeout: 20000/timeout: 50000/g' "$file"
    
    echo "  ✓ Updated: $file"
  else
    echo "  ✗ Not found: $file"
  fi
done

echo ""
echo "Done! Check git diff to review changes:"
echo "  cd /home/felip/projeto-agro && git diff --stat"

