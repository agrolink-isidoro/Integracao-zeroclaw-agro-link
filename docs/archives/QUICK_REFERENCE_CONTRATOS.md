# ⚡ Quick Reference - Contratos Project-Agro

**Guia Rápido para Desenvolvedores | 14/03/2026**

---

## 🔗 Links Rápidos para Documentos Completos

1. **Mapa Completo** - [MAPA_COMPLETO_ESTRUTURA_CONTRATOS_PROJECT_AGRO.md]
   - Overview da arquitetura completa
   - Tipos e interfaces detalhados
   - Padrões de nomenclatura
   - Dependências

2. **Índice Visual** - [INDICE_VISUAL_CAMINHOS_ARQUIVOS_CONTRATOS.md]
   - Árvore completa de arquivos com caminhos
   - Código-fonte comentado
   - Roteamento e endpoints

3. **Diagramas Técnicos** - [DIAGRAMAS_RESUMO_TECNICO_CONTRATOS.md]
   - ER diagrams
   - Fluxos de estado
   - Validações implementadas
   - Checklists

---

## 📁 Arquivos PRINCIPAIS

### Frontend (React/TypeScript)

```
frontend/src/
├── pages/comercial/
│   ├── ContratoForm.tsx              ✅ Página com abas
│   ├── ContratoCreate.tsx            ✅ Criação com wizard
│   ├── ContratosList.tsx             ✅ Listagem + paginação
│   └── ContratoDetalhes.tsx          ✅ Detalhe
│
├── components/comercial/
│   └── ContratoForm.tsx              ✅ Modal reutilizável
│
├── types/
│   ├── comercial.ts                  ✅ ContratoComercial, ParteContrato, ItemContrato
│   └── estoque_maquinas.ts           ✅ VendaContrato, ParcelaContrato
│
└── services/
    └── contratos.ts                  ✅ contratosService
```

### Backend (Django)

```
backend/apps/comercial/
├── models.py                         ✅ Contrato, VendaContrato, ParcelaContrato
├── serializers.py                    ✅ Serializers + Validações
├── views.py                          ✅ ViewSets e Actions
├── urls.py                           ✅ Endpoints registrados
└── tests/
    ├── test_api_contratos_vendas.py  ✅ Testes da API
    └── test_contrato_types.py        ✅ Testes de tipos
```

---

## 📊 Tipos/Models - Referência Rápida

### VendaContrato (Fase 2)

```python
class VendaContrato(TenantModel):
    numero_contrato: CharField (UNIQUE)
    cliente: ForeignKey(Cliente)
    produto: ForeignKey(Produto)
    quantidade_total: DecimalField
    preco_unitario: DecimalField
    valor_total: DecimalField
    
    TIPO_CHOICES = [
        ('A_VISTA', 'À Vista'),
        ('PARCELADO', 'Parcelado'),
        ('ANTECIPADO', 'Antecipado'),
        ('FUTURO', 'Contrato Futuro'),
    ]
    tipo: CharField(choices=TIPO_CHOICES)
    
    STATUS_CHOICES = [
        ('RASCUNHO', 'Rascunho'),
        ('ATIVO', 'Ativo'),
        ('ENCERRADO', 'Encerrado'),
        ('CANCELADO', 'Cancelado'),
    ]
    status: CharField(choices=STATUS_CHOICES, default='RASCUNHO')
    
    data_contrato: DateField
    data_entrega_prevista: DateField (nullable)
    numero_parcelas: PositiveIntegerField (default=1)
    periodicidade_parcelas: CharField (MENSAL|BIMESTRAL|TRIMESTRAL)
    
    Relações:
    - parcelas: 1:N com ParcelaContrato (reverse FK)
```

### ParcelaContrato

```python
class ParcelaContrato(models.Model):
    contrato: ForeignKey(VendaContrato, related_name='parcelas', CASCADE)
    numero_parcela: PositiveIntegerField
    valor: DecimalField
    data_vencimento: DateField
    vencimento: ForeignKey(Vencimento, nullable)  # Integração com Financeiro
    
    Constraints:
    - UNIQUE: (contrato, numero_parcela)
    - Ordering: numero_parcela
```

### Contrato (Genérico)

```python
class Contrato(TenantModel):
    numero_contrato: CharField (UNIQUE)
    titulo: CharField(max_length=200)
    
    TIPO_CONTRATO_CHOICES = [
        ('compra', 'Compra'),
        ('venda', 'Venda'),
        ('venda_futura', 'Venda Futura'),
        ('venda_spot', 'Venda Spot'),
        ('bater', 'Barter'),
        ('servico', 'Serviço'),
        ('fornecimento', 'Fornecimento'),
        ('parceria', 'Parceria'),
        ('outros', 'Outros'),
    ]
    tipo_contrato: CharField(choices=TIPO_CONTRATO_CHOICES)
    categoria: CharField(max_length=50, nullable)
    status: CharField(default='rascunho')
    valor_total: DecimalField
    data_inicio: DateField
    data_fim: DateField (nullable)
    prazo_execucao_dias: IntegerField (nullable)
    
    # JSON fields (estruturas complexas)
    partes: JSONField (ParteContrato[])
    itens: JSONField (ItemContrato[])
    condicoes: JSONField (CondicaoContrato[])
    
    documento: FileField (upload_to='contratos/')
```

---

## 🔌 Endpoints da API

### VendaContrato

```bash
# LISTAR com filtros e paginação
GET /api/comercial/vendas-contrato/
    ?page=1&status=ATIVO&tipo=PARCELADO&search=CTR-001

# CRIAR novo contrato
POST /api/comercial/vendas-contrato/
    {
      "numero_contrato": "CTR-001",
      "cliente": 1,
      "produto": 5,
      "quantidade_total": 100,
      "preco_unitario": 50.00,
      "valor_total": 5000.00,
      "tipo": "PARCELADO",
      "data_contrato": "2026-03-14",
      "data_entrega_prevista": "2026-06-14",
      "numero_parcelas": 3,
      "periodicidade_parcelas": "MENSAL"
    }

# CRIAR COM PARCELAS (ação customizada)
POST /api/comercial/vendas-contrato/criar_com_parcelas/
    # Mesmo payload acima - cria ParcelaContrato automaticamente

# DETALHE
GET /api/comercial/vendas-contrato/{id}/

# ATUALIZAR
PATCH /api/comercial/vendas-contrato/{id}/
    { "status": "ATIVO", "observacoes": "..." }

# DELETAR (apenas RASCUNHO)
DELETE /api/comercial/vendas-contrato/{id}/

# CANCELAR (ação customizada)
POST /api/comercial/vendas-contrato/{id}/cancelar/
```

### ParcelaContrato

```bash
# LISTAR
GET /api/comercial/parcelas-contrato/
    ?contrato=1&page=1

# DETALHE
GET /api/comercial/parcelas-contrato/{id}/

# ATUALIZAR
PATCH /api/comercial/parcelas-contrato/{id}/
    { "valor": 1666.67, "data_vencimento": "2026-04-14" }
```

### Contrato (Genérico)

```bash
GET /api/comercial/contratos/
POST /api/comercial/contratos/
GET /api/comercial/contratos/{id}/
PATCH /api/comercial/contratos/{id}/
DELETE /api/comercial/contratos/{id}/
```

---

## 🧪 Validações Rápidas

### Frontend (Yup)

```typescript
// ContratoForm.tsx
const schema = yup.object().shape({
  numero_contrato: yup.string().required(),
  titulo: yup.string().required(),
  tipo_contrato: yup.string().required(),
  categoria: yup.string().required(),
  status: yup.string().required(),
  valor_total: yup.number().required(),
  data_inicio: yup.string().required(),
  condicoes: yup.array().of(yup.object())
});
```

### Backend (DRF)

```python
# CriarContratoSerializer.validate()
✅ valor_total == quantidade_total × preco_unitario (tolerância 0.01)
✅ tipo A_VISTA → numero_parcelas == 1
✅ Cliente exists
✅ Produto exists
```

---

## 🔄 Fluxo Completo (Exemplo Prático)

### 1️⃣ Usuário clica "Criar Contrato"

```
ContratoCreate.tsx → useForm(resolver=yupResolver(schema))
```

### 2️⃣ Form carrega com InitialValues

```typescript
defaultValues: {
  numero_contrato: '',
  titulo: '',
  tipo_contrato: 'PARCELADO',
  data_contrato: new Date().toISOString().split('T')[0],
  numero_parcelas: 1,
  periodicidade_parcelas: 'MENSAL'
}
```

### 3️⃣ Usuário preenche e clica "Salvar"

```
Validação Yup → Passa ✅ ou Falha ❌
```

### 4️⃣ Se validou, envia para API

```typescript
contratosService.criarComParcelas({
  numero_contrato: "CTR-2026031401",
  cliente: 1,
  produto: 5,
  quantidade_total: 100,
  preco_unitario: 50.00,
  valor_total: 5000.00,
  tipo: "PARCELADO",
  data_contrato: "2026-03-14",
  data_entrega_prevista: "2026-06-14",
  numero_parcelas: 3,
  periodicidade_parcelas: "MENSAL"
})
│
axios.post('/api/comercial/vendas-contrato/criar_com_parcelas/', dados)
```

### 5️⃣ Backend processa

```python
VendaContratoViewSet.criar_com_parcelas(request)
└─ CriarContratoSerializer.validate() [Validações]
└─ VendaContrato.objects.create() [Cria contrato]
└─ ParcelaContrato.objects.bulk_create() [Cria 3 parcelas]
└─ VendaContratoSerializer.to_representation() [Resposta]
```

### 6️⃣ Frontend recebe resposta

```json
{
  "id": 42,
  "numero_contrato": "CTR-2026031401",
  "status": "RASCUNHO",
  "parcelas": [
    {"numero_parcela": 1, "valor": 1666.67, "data_vencimento": "2026-04-14"},
    {"numero_parcela": 2, "valor": 1666.67, "data_vencimento": "2026-05-14"},
    {"numero_parcela": 3, "valor": 1666.66, "data_vencimento": "2026-06-14"}
  ]
}
```

### 7️⃣ React Query cache atualiza

```typescript
queryClient.invalidateQueries(['contratos'])
// ou
useQuery(['contratos', page]) // Re-fetch automático
```

### 8️⃣ Página redireciona

```typescript
navigate(`/comercial/contratos/${response.id}`)
```

---

## 🧪 Testes Rápidos

### No Backend

```bash
# Rodar testes de contratos
pytest backend/apps/comercial/tests/test_api_contratos_vendas.py -v

# Rodar testes de tipos
pytest backend/apps/comercial/tests/test_contrato_types.py -v

# Teste específico
pytest backend/apps/comercial/tests/test_api_contratos_vendas.py::test_create_and_list_contrato -v
```

### No Frontend

```bash
# Rodar todos os testes
npm test

# Teste específico
npm test -- ContratoForm.test.tsx

# E2E com Playwright
npm run test:e2e
```

---

## 🔍 Debugging

### Frontend

```typescript
// Adicionar logs
console.log('Dados do formulário:', formData);
console.log('Erros de validação:', errors);
console.log('Resposta da API:', response);

// Inspecionar React Query
import { useQueryClient } from '@tanstack/react-query';
const queryClient = useQueryClient();
console.log(queryClient.getQueryData(['contratos']));

// DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
<ReactQueryDevtools initialIsOpen={false} />
```

### Backend

```python
# Django Shell
python manage.py shell

from apps.comercial.models import VendaContrato, ParcelaContrato
VendaContrato.objects.all()
contrato = VendaContrato.objects.get(id=42)
contrato.parcelas.all()

# Logs
import logging
logger = logging.getLogger(__name__)
logger.debug(f"Criando contrato: {dados}")
```

---

## 🚀 Deploy Checklist

```bash
# Frontend
❌ [ ] npm run build - Build production
❌ [ ] npm run test - Todos testes passam
❌ [ ] npm run lint - Sem erros de linting
❌ [ ] Testar em staging

# Backend
❌ [ ] python manage.py collectstatic - Collect static files
❌ [ ] python manage.py migrate - Migrations atualizadas
❌ [ ] python manage.py test - Testes passam
❌ [ ] Coverage > 80%
❌ [ ] Documentação atualizada
❌ [ ] Testar em staging

# Geral
❌ [ ] CORS configurado
❌ [ ] JWT secrets configurados
❌ [ ] Database backups
❌ [ ] Monitoring ativo
```

---

## 📚 Nomenclatura Padrão

```
MODELOS DJANGO:     PascalCase
                    Contrato, VendaContrato, ParcelaContrato

CAMPOS:             snake_case
                    numero_contrato, data_entrega_prevista

COMPONENTES REACT:  PascalCase
                    ContratoForm, ContratosList

PÁGINAS:            PascalCase
                    ContratoCreate, ContratoDetalhes

SERVIÇOS:           camelCase
                    contratosService, comercialService

ENDPOINTS:          kebab-case
                    /vendas-contrato/, /parcelas-contrato/

ENUMS/CHOICES:      UPPER_SNAKE_CASE
                    A_VISTA, PARCELADO, RASCUNHO

TESTES:             test_<entidade>_<funcionalidade>
                    test_contrato_types, test_api_contratos_vendas
```

---

## 🎓 Padrões de Código

### React Hook Form + Yup

```typescript
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object().shape({
  numero_contrato: yup.string().required(),
  // ...
});

const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: yupResolver(schema),
  defaultValues: {}
});

const onSubmit = async (data) => {
  try {
    const response = await contratosService.criarComParcelas(data);
    toast.success('Contrato criado!');
    navigate(`/comercial/contratos/${response.id}`);
  } catch (error) {
    toast.error('Erro ao criar contrato');
  }
};

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    <Controller
      name="numero_contrato"
      control={control}
      render={({ field }) => (
        <input {...field} />
      )}
    />
    {errors.numero_contrato && <span>{errors.numero_contrato.message}</span>}
  </form>
);
```

### DRF Serializer com Validação

```python
class CriarContratoSerializer(serializers.Serializer):
    numero_contrato = serializers.CharField(max_length=50)
    cliente = serializers.PrimaryKeyRelatedField(queryset=Cliente.objects.all())
    # ...
    
    def validate(self, attrs):
        # Validações cross-field
        if attrs['tipo'] == 'A_VISTA' and attrs['numero_parcelas'] > 1:
            raise serializers.ValidationError('A_VISTA deve ter 1 parcela')
        return attrs
    
    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['criado_por'] = request.user
        return VendaContrato.objects.create(**validated_data)
```

---

## 🆘 Troubleshooting Comum

| Problema | Solução |
|----------|---------|
| 400 `numero_contrato` already exists | Usar número único |
| `valor_total` != `qtd × preço` | Recalcular valor_total exatamente |
| A_VISTA com > 1 parcela | Validação falha por design |
| `cliente_id` null | Validação Yup rejeitou antes de enviar |
| CORS error | Verificar django-cors-headers |
| 401 Unauthorized | Token JWT expirou, re-login |
| 403 Forbidden | RBAC permission negado |
| N+1 queries | Backend usando select_related/prefetch_related |

---

## 📞 Contatos/Recursos

### Documentação Completa
- `/home/agrolink/MAPA_COMPLETO_ESTRUTURA_CONTRATOS_PROJECT_AGRO.md`
- `/home/agrolink/INDICE_VISUAL_CAMINHOS_ARQUIVOS_CONTRATOS.md`
- `/home/agrolink/DIAGRAMAS_RESUMO_TECNICO_CONTRATOS.md`

### Repositórios
- Frontend: `/projeto-agro.bak-20260312043346/sistema-agropecuario/frontend/`
- Backend: `/projeto-agro.bak-20260312043346/sistema-agropecuario/backend/`

### Stack Tecnológico
- **Frontend:** React 19, TypeScript, Tailwind CSS, React Hook Form, Yup, React Query
- **Backend:** Django 4.2, DRF, PostgreSQL
- **DevOps:** Docker, Docker Compose

---

**Última atualização:** 14/03/2026  
**Versão:** 1.0  
**Status:** ✅ PRONTO PARA USO
