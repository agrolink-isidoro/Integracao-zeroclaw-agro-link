# Leiaute SEFAZ (Anexo I) — Guia de Implementação (referência para desenvolvedores)

**Objetivo:** documento técnico orientado ao desenvolvimento que resume os pontos do Anexo I (Leiaute e Regras de Validação da NF-e / NFC-e) relevantes para o `project-agro`, mapeando para as entidades do código e propondo validações, testes e decisões de implementação.

Arquivo de referência (originais):
- PDF oficial SEFAZ (salvo em): `docs/04-Modulos/Fiscal/reference_files/ANEXO I - Leiaute e Regra de Validação - NF-e e NFC-e.pdf`
- Extração de texto para busca: `docs/04-Modulos/Fiscal/reference_files/sefaz_leiaute.txt`

---

## 1. Escopo deste documento
- Prioridade: **Campos de itens (Grupo I / I01 / I10 / I11 / I14)** e totals (Grupo W). Essas regras impactam diretamente integração com Estoque, Comercial e Financeiro.
- Inclui: formatos (tamanhos/precisão), regras de consistência (por exemplo, vProd vs qCom*vUnCom), campos críticos (cProd, cEAN, CFOP, NCM, indTot, cProdANP para combustíveis) e recomendações práticas para o nosso sistema.

---

## 2. Principais especificações relevantes (trecho do Anexo I)
- qCom (tag `qCom`) — formato: **11v0-4** → até 11 dígitos totais, 4 decimais. (ex.: `9999999.9999`)
- vUnCom (tag `vUnCom`) — formato: **11v0-10** → até 11 dígitos totais, 10 decimais. (ex.: `9.1234567890`)
- vProd (tag `vProd`) — formato: **13v2** → até 13 dígitos totais, 2 decimais. (ex.: `99999999999.99`)
- qTrib / vUnTrib — análogos a qCom / vUnCom para escala tributária (mesmas precisões conforme leiaute).
- Regras de consistência: por exemplo, **vProd ≈ qCom * vUnCom** (o Anexo lista rejeições quando diferença supera tolerância mecânica); também comparar com `vUnTrib * qTrib` se aplicável.
- Campo `indTot` (I17b): indica se o valor do item compõe o total da NFe (W07). Devem ser considerados apenas itens com `indTot=1` para somatórios.
- Campos de identificação: `cProd` (até 60 caracteres tipicamente), `cEAN` (14), `CFOP` (4), `NCM` (8), `CEST` (7). Para combustíveis: `cProdANP` e campos complementares (pBio, qTemp) com regras próprias.
- Observações de regra: existem regras especiais (NTs) para combustíveis, exportação, veículos e medicamentos (veja seções específicas do Anexo).

---

## 3. Mapeamento com o código atual (estado e decisões já tomadas)
- Modelos relevantes:
  - `apps.fiscal.models.ItemNFe`:
    - `quantidade_comercial` ↔ `qCom`
    - `valor_unitario_comercial` ↔ `vUnCom`
    - `valor_produto` ↔ `vProd`
    - `quantidade_tributaria`, `valor_unitario_tributario` ↔ `qTrib`, `vUnTrib`
  - `apps.fiscal.models.NFe`:
    - `valor_produtos` ↔ `W07` (Total dos produtos e serviços)

- Alterações já aplicadas (commit: `4e02ae24`): ajustamos *precisões* conforme SEFAZ para itens:
  - `quantidade_comercial`: **max_digits=11, decimal_places=4**
  - `valor_unitario_comercial`: **max_digits=13, decimal_places=2 (currency precision)**
  - `valor_produto`: **max_digits=13, decimal_places=2**
  - `quantidade_tributaria` e `valor_unitario_tributario` ajustados analogamente
  - `NFe.valor_produtos` e `valor_nota` alterados para **max_digits=13, decimal_places=2**

- Feature relacionada: `ItemNFeOverride` (overrides) e `apply_item_override` (serviço) — afetando como `confirmar_estoque` usa valores efetivos (`effective_*`) para criar movimentações.

---

## 4. Regras de validação e onde aplicá-las (práticas recomendadas)
1. **Validações na importação XML (primeiro ponto):**
   - Ao parsear XML (ponto: `apps.fiscal.views.NFeRemoteImportView` / `serializers_import`), validar e normalizar formatos:
     - Converter `qCom` para Decimal com quantize apropriado (4 decimais) e checar max_digits.
     - Converter `vUnCom` para Decimal com 10 decimais.
     - Calcular `calc_vProd = (vUnCom * qCom).quantize(Decimal('0.01'))` e comparar com `vProd`. Se diferente além de tolerância aceitável, **registrar aviso** e dependendo do modo (strict import config) rejeitar ou ajustar com log.
   - Preferir falhar rápido quando dados essenciais estiverem fora de bounds (ex.: inteiro de `qCom` excede 7 dígitos inteiros), para evitar gravação de dados inválidos.

2. **Model-level validation (`ItemNFe.clean()` / `full_clean()`):**
   - Implementar validações robustas que executem em `full_clean()` para garantir integridade em persitência e testes unitários:
     - Checar `quantidade_comercial.as_tuple()` e digits vs `max_digits - decimal_places`.
     - Checar `valor_produto == round(vUnCom * qCom, 2)` ou produzir `ValidationError` com motivo claro (ex: `vProd_mismatch`).
   - Benefício: garante que quaisquer criações via admin/tests/fixtures também sejam validadas.

3. **Regra de totais (NFe):**
   - Ao confirmar NFe (endpoint `confirmar_estoque`), validar que `NFe.valor_produtos` corresponde ao somatório dos `ItemNFe.valor_produto` (considerar indTot=1). Se divergência, emitir erro ou aviso (configurável), registrar causa (ex.: ajuste por desconto/serviços).

4. **Casos especiais:**
   - Combustíveis (`cProdANP`, `pBio`, etc.) têm regras extras (códigos válidos, soma de percentuais quando GLP, etc.). Implementar checagens suplementares quando campos estiverem presentes.

---

## 5. Riscos e decisões de implementação
- Re-**não** sobrescrever campos extraídos do XML sem registrar origem. Sempre armazenar origem (XML) e manter histórico (decidimos manter valores originais em `ItemNFe` e adicionar `ItemNFeOverride` para alterações manuais).
- Precisão versus cálculos: multiplicação `vUnCom*qCom` com 10+4 decimais exige uso de Decimal com contexto apropriado. Sempre quantize para 2 casas em `vProd` conforme SEFAZ.
- Tolerâncias: SEFAZ pode aceitar pequenas variações por arredondamento; definir tolerância de comparação (ex.: 0.01 BRL) ou utilizar regras do Anexo (NTs) quando explicitadas.

---

## 6. Testes recomendados (P0/P1 conforme política de testes)
- P0 (essencial):
  - Importa NF-e com vários items e valida: `qCom`, `vUnCom` são aceitos nas precisões definidas; `vProd` calculado e validado; sum W07 == sum I11 para indTot=1.
  - Teste de overflow: rejeitar `qCom` com parte inteira maior que permitida.
- P1 (essencial operacional):
  - Quando `ItemNFeOverride` criado com `aplicado=True` antes da confirmação, confirmar que `confirmar_estoque` usa `effective_*`.
  - Quando override aplicado após confirmação: criar `MovimentacaoEstoque` de ajuste (entrada/saída) e `ProdutoAuditoria` conforme delta.
- P2 (suporte): casos de combustíveis, exportação, múltiplos CFOP e interações com impostos.

---

## 7. Tarefas práticas (prioritárias, pequenas e testáveis)
1. Implementar `ItemNFe.clean()` com validações acima e adicionar testes que chamam `full_clean()` (já temos testes de compliance básicos; ampliar para edge cases).
2. Validar `NFe.valor_produtos` em `NFeViewSet.confirmar_estoque` antes de criar movimentos — decidir política (erro vs aviso configurável).
3. Adicionar validações específicas para combustíveis (quando `cProdANP` presente) seguindo as regras do Anexo.
4. Documentar comportamento exacto de tolerância de arredondamento em `docs/FISCAL_TEMP/RUNBOOK_OVERRIDES.md` e no novo arquivo de implementação (este documento).
5. Implementar permissão granular `fiscal:apply_override` para endpoint `apply` e testes de autorização (P0).

---

## 8. Exemplos práticos (cálculo e validações)
- Exemplo: qCom=5.0000, vUnCom=2.3456789012 → calc_vProd = quantize(5.0000 * 2.3456789012, '0.01') = 11.73
- Se XML declara `vProd=11.72` e diferença > 0.01 → levantar `ValidationError('vProd_mismatch')` ou sinalizar dependendo do modo de importação.

---

## 9. Referências internas e commits relevantes
- Implementação de precisões (commit): `4e02ae24` — ajusta `ItemNFe` / `ItemNFeOverride` para qCom/vUnCom/vProd
- Feature overrides: `78da765f` — `ItemNFeOverride`, serviço `apply_item_override`, testes e migrations
- Documentos: este arquivo e `docs/04-Modulos/Fiscal/NOTA_FISCAL_OVERRIDES.md` (runbook)

---

## 10. Observações finais rápidas para desenvolvedores
- Este documento é a fonte primária de decisão para implementação de validadores e testes para NF-e no projeto. Para qualquer dúvida sobre uma regra específica do Anexo I, consulte o PDF original salvo em `docs/04-Modulos/Fiscal/reference_files/`.
- Se quiser, posso abrir PRs pequenos para cada tarefa listada em (7) com testes e migrações — diga qual tarefa priorizar.

---
*Documento gerado automaticamente a partir do Anexo I (SEFAZ) e do estado atual do código em 2026-02-09.*
