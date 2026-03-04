Resumo de implementação - INSS e IR 2026

O que foi implementado:

- Adicionado campo `dependentes` ao `Funcionario` (default 0) e migrado o DB.
- Implementado cálculo progressivo de INSS em `backend.apps.administrativo.utils.compute_inss`:
  - Faixas baseadas em múltiplos do Salário Mínimo (SM) (7,5% / 9% / 12% / 14% até teto).
  - Teto default: R$ 8.537,55 (configurável via payload `inss_teto`).
- Implementado cálculo IR em `backend.apps.administrativo.utils.compute_ir` usando o `redutor` (índice 0,133145) para rendas entre R$5.000 e R$7.350 e alíquota 27,5% com parcela a deduzir R$893,66 para rendas acima de R$7.350.
- Integrei os cálculos ao preview da `FolhaPagamento` (endp. `POST /api/administrativo/folha-pagamento/`) retornando por-item: `inss`, `inss_breakdown`, `ir`, `ir_info`, `descontos`, `liquido`.
- Criados comandos Django para extrair texto bruto de PDFs e importar CSV (`extract_funcionarios` e `import_funcionarios`).
- Criadas migrations para o campo `dependentes` e para os campos `inss` e `ir` em `FolhaPagamentoItem` e apliquei-as no ambiente de desenvolvimento.
- Adicionados testes unitários básicos para `compute_inss` e `compute_ir` e atualizado testes da API de folha.

Como extrair os funcionários do PDF (fluxo recomendável):

1. Coloque o PDF na workspace, por exemplo: `project-agro/docs/funcionarios.pdf`.
2. Execute (no container backend):
   python manage.py extract_funcionarios project-agro/docs/funcionarios.pdf --out project-agro/docs/funcionarios_raw.csv
   - O extractor usa `pdfplumber` quando disponível; gera CSV com linhas brutas para revisão.
3. Revise/limpe `funcionarios_raw.csv` e transforme em CSV com cabeçalho:
   nome,cpf,cargo,salario_bruto,dependentes
4. Importe:
   python manage.py import_funcionarios project-agro/docs/funcionarios_clean.csv

Observações e decisões importantes:
- Usei Salário Mínimo padrão de R$1.621,00 conforme sua confirmação. Valores são configuráveis quando necessário via payload (chaves `salario_minimo`, `inss_teto`, `dependente_deducao`).
- A regra do `redutor` para IR entre 5.000 e 7.350 foi implementada aplicando o redutor sobre a base e, quando necessário, aplicando a fórmula de 27,5% - parcela a deduzir; o comportamento corresponde ao descrito no material (isenção parcial via redutor).

Próximos passos que posso executar agora (diga qual prefere):
- Extrair os funcionários do PDF se você colocar o arquivo em `project-agro/docs/` (eu faço a extração, preparo a CSV e executo a importação). ✅
- Gerar uma planilha (CSV/Excel) com todos os funcionários e os resultados de INSS/IR/LIQUIDO usando a nova rotina (preview) para validação. ✅
- Ajustar a UI para mostrar `inss_breakdown` detalhado por faixa no relatório de preview (se desejar). 🔧

Quer que eu extraia o PDF agora (por favor envie/coloque o arquivo em `project-agro/docs/funcionarios.pdf`)?