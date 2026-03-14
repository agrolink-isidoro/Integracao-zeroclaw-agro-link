# WeasyPrint Server-Side PDF Export Implementation

## ✅ Implementado

### 1. **Backend - Django Endpoint**
- **Arquivo**: `backend/apps/actions/views.py`
- **Nova Classe**: `ChatPDFExportView` com `ChatPDFExportSerializer`
- **Endpoint**: `POST /api/actions/chat-pdf-export/`
- **Payload**:
  ```json
  {
    "html_content": "<div>...</div>",
    "title": "Relatório Isidoro"  // opcional
  }
  ```
- **Resposta**: PDF binário com `Content-Disposition: attachment`
- **Características**:
  - ✓ Texto selecionável (não é imagem)
  - ✓ Múltiplas páginas com paginação automática
  - ✓ Styling profissional (A4, margens, fontes)
  - ✓ Cabeçalho com título e data
  - ✓ Rodapé com número de página
  - ✓ Suporte a tabelas, listas, código e blockquotes
  - ✓ Autenticação JWT requerida

### 2. **Docker - Dependências Instaladas**
- **Arquivo**: `backend/Dockerfile`
- **Mudanças**:
  - ✓ Adicionado `libcairo2`, `libcairo2-dev` (gráficos)
  - ✓ Adicionado `libpango-1.0-0`, `libpango1.0-dev` (texto)
  - ✓ Adicionado `libpangoft2-1.0-0` (fonte)
  - ✓ Adicionado `libffi-dev` (FFI)
  - ✓ Adicionado `fonts-dejavu-core` (fonte padrão)

### 3. **Python Dependencies**
- **Arquivo**: `backend/requirements.txt`
- **Adicionado**: `WeasyPrint==60.1`
- **Status**: ✓ Instalado e verificado no container

### 4. **URL Configuration**
- **Arquivo**: `backend/apps/actions/urls.py`
- **Mudança**: Importado `ChatPDFExportView` e registrado em `urlpatterns`
- **Rota**: `/api/actions/chat-pdf-export/`

### 5. **Frontend - Chat Widget**
- **Arquivo**: `frontend/src/components/actions/ChatWidget.tsx`
- **Novas Funções**:
  - `exportMessageToPdfServer()`: Envia HTML para o servidor via POST
  - `exportMessageToPdfClient()`: Fallback client-side com html2canvas+jsPDF
  - `exportMessageToPdf()`: Wrapper que chama server-side com fallback

- **Comportamento**:
  - Tenta servidor primeiro (WeasyPrint → texto selecionável)
  - Se falhar, usa fallback client-side (html2canvas → imagem)
  - Mantém compatibilidade com browsers antigos

## 🚀 Como Usar

### No Chat Widget (Frontend)
1. Usuário clica no botão **Exportar PDF** (já existente)
2. Frontend captura HTML da mensagem
3. Envia para `POST /api/actions/chat-pdf-export/`
4. Backend gera PDF com WeasyPrint
5. PDF é baixado automaticamente com texto **selecionável**

### Exemplo cURL (com autenticação):
```bash
curl -X POST http://localhost:8001/api/actions/chat-pdf-export/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "html_content": "<h1>Análise de Produtos</h1>...",
    "title": "Cotação Agrícola"
  }' \
  -o relatório.pdf
```

## 📊 Status dos Containers

```
CONTAINER                          STATUS
sistema-agropecuario-backend-1    Up (healthy)      ← WeasyPrint 60.1 ✓
sistema-agropecuario-worker-1     Up
sistema-agropecuario-frontend-1   Up (health: starting)
sistema-agropecuario-db-1         Up (healthy)
sistema-agropecuario-redis-1      Up
```

## 🔧 Diferenças: WeasyPrint vs html2canvas+jsPDF

| Aspecto | WeasyPrint (Novo) | html2canvas+jsPDF (Antigo) |
|---------|-------------------|---------------------------|
| **Tipo de PDF** | Texto (vetorial) | Imagem (rasterizado) |
| **Seleção de Texto** | ✅ Sim, 100% selecionável | ❌ Não (é imagem) |
| **Copiar/Colar** | ✅ Funcionamento completo | ❌ Não funciona |
| **Tamanho do Arquivo** | Menor (~50-100 KB) | Maior (~2-5 MB) |
| **Qualidade** | Excelente em qualquer zoom | Pixelada em zoom alto |
| **Processamento** | Servidor | Navegador (cliente) |
| **Compatibilidade** | Requer backend | Funciona offline |
| **Fallback** | Cliente-side disponível | N/A |

## 🛠️ Troubleshooting

### "WeasyPrint não encontrado"
```bash
docker exec sistema-agropecuario-backend-1 python -m pip install WeasyPrint==60.1
```

### "Erro ao gerar PDF"
Verifique logs do backend:
```bash
docker logs sistema-agropecuario-backend-1
```

### "Fallback para client-side"
Significa que a chamada ao servidor falhou. Verifique:
1. Backend está rodando: `docker ps`
2. Autenticação JWT válida
3. Firewall ou CORS bloqueando requisição

## 📝 Commits

- **Commit**: `911d5c6`
- **Mensagem**: "feat: Add WeasyPrint server-side PDF export for selectable text PDFs"
- **Branch**: `main`
- **Status**: ✅ Pushed to remote

## 🎯 Próximos Passos (Opcional)

1. **Testes de Performance**
   - Medir tempo de geração para PDFs grandes (100+ páginas)
   - Monitorar uso de memória no container

2. **Customizações Visuais**
   - Adicionar logo da empresa no cabeçalho
   - Tema de cores personalizável
   - Assinatura digital

3. **Export Alternativo**
   - Adicionar opção de HTML também
   - Exportar como Excel com WeasyPrint+openpyxl
   - Webhooks para armazenar PDFs automaticamente

## ✨ Visão Geral da Integração

```
ChatWidget (Frontend)
    ↓
[Botão "Exportar PDF"]
    ↓
exportMessageToPdfServer()
    ↓
POST /api/actions/chat-pdf-export/
    ↓
ChatPDFExportView (Backend)
    ↓
WeasyPrint.HTML().write_pdf()
    ↓
PDF binário com texto selecionável
    ↓
Response → Browser download
    ↓
Arquivo: "Relatório_Isidoro_2026-03-12.pdf"
```

## ✅ Checklist de Integração

- [x] WeasyPrint adicionado ao requirements.txt
- [x] Dependências nativas instaladas no Dockerfile
- [x] Endpoint REST implementado e testado
- [x] Frontend integrado com comando POST
- [x] Fallback client-side implementado
- [x] Autenticação JWT requerida
- [x] Docker container reconstruído
- [x] Migrations aplicadas
- [x] Verificação de funcionalidade confirmada

---

**Data**: 12 de março de 2026  
**Status**: ✅ Pronto para Produção  
**Testado em**: Docker Compose (5 containers)
