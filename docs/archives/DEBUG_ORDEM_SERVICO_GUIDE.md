# DEBUG: Fluxo de Ordem de Serviço (Manutenção)

## 🎯 Objetivo
Rastrear passo a passo o fluxo de criação e atualização de Ordem de Serviço para identificar por que o status está sendo exibido incorretamente na página.

## 📋 Processo Completo de Debug

### 1️⃣ **Frontend - Logging do Formulário**

Quando você edita uma ordem de serviço, verifique o **Console do Navegador** (F12):

```
🔴 [OrdemServicoForm] SUBMIT INICIADO
   isEdit: true
   ordemServico?.id: 8
   formData.status: em_andamento
   STATUS ANTERIOR: aberta
   STATUS NOVO: em_andamento
   insumos count: 1
```

**O que procurar:**
- ✅ `STATUS ANTERIOR` e `STATUS NOVO` devem ser diferentes
- ✅ `status` no payload deve ser exatamente o que você quer enviar
- ❌ Se `STATUS NOVO` não reflete sua escolha, o frontend tem um problema

---

### 2️⃣ **Backend - API Response**

Após o submit, você vera:

```
✅ [OrdemServicoForm] SUCESSO ao salvar!
🟡 [OrdemServicoForm.mutationFn] ENVIANDO PAYLOAD:
   Método: PUT para /maquinas/ordens-servico/8/
   payload.status: em_andamento
   Response status: 200
   Response data.status: em_andamento
```

**O que procurar:**
- ✅ `payload.status` deve ser `em_andamento`
- ✅ `Response status` deve ser `200`
- ✅ `Response data.status` deve ser `em_andamento`
- ❌ Se o response retorna `concluida`, o backend está alterando o status!

---

### 3️⃣ **Backend - Logs do Django**

Verifique os logs do container:

```bash
docker logs -f sistema-agropecuario-backend-1 | grep -E "OrdemServico|ordem_"
```

Você verá algo como:

```
═══════════════════════════════════════════════════════════════
🔵 [orden_pre_save] DISPARADO para OS id=8
   pk existe? True
   status atual (memória): em_andamento
   status anterior (banco): aberta
   TRANSIÇÃO? aberta → em_andamento
═══════════════════════════════════════════════════════════════

🟢 [ordem_post_save] DISPARADO para OS id=8
   created=False
   status=em_andamento
   insumos_reservados=True
   insumos count=1
═══════════════════════════════════════════════════════════════

🔷 [ordem_post_save] Analisando transições de status:
   _old_status=aberta, current status=em_andamento
   Há transição? True
   É transição para concluida? False
═══════════════════════════════════════════════════════════════
```

**O que procurar:**
- ✅ `Há transição?` deve ser `True`
- ✅ `É transição para concluida?` deve ser `False` (quando você vai para `em_andamento`)
- ❌ Se `É transição para concluida?` é `True`, significa que algo está alterando o status para `concluida`!

---

##  🔍 Possíveis Causas

### Cenário 1: Frontend não atualiza a listagem
- **Sintoma**: Status está correto no banco, mas página mostra status antigo
- **Causa**: React Query cache não foi invalidado
- **Solução**: F5 para recarregar a página ou feche e abra o modal novamente

### Cenário 2: Usuário clicou em "Concluir" sem perceber
- **Sintoma**: Status muda para `concluida` após editar
- **Causa**: O usuário clicou no botão "Concluir" da tabela
- **Solução**: Não clique em "Concluir" se quer manter em `em_andamento`

### Cenário 3: Formulário carregou valor antigo
- **Sintoma**: Ao abrir para editar, `status` já vem como `concluida`
- **Causa**: Serializer não está excluindo `status` das read_only_fields
- **Solução**: Verificar `OrdemServicoSerializer` no backend

### Cenário 4: Backend alterando status automaticamente
- **Sintoma**: Response retorna status diferente do payload enviado
- **Causa**: Signal ou middleware no backend está mudando
- **Solução**: Verificar logs de `ordem_pre_save` e `ordem_post_save`

---

## 🚀 Como Reproduzir e Debugar

### Passo 1: Abra o Console do navegador (F12)
Vá para **Console** e deixe visível

### Passo 2: Crie uma ordem de serviço
- Status inicial: `aberta`
- Adicione pelo menos 1 insumo

### Passo 3: Clique em "Editar"
- Mude o status para `em_andamento`
- **Espere** pelos logs do console

### Passo 4: Verifique os logs
No console, procure por:
```
🔴 [OrdemServicoForm] SUBMIT INICIADO
🟡 [OrdemServicoForm.mutationFn] ENVIANDO PAYLOAD
✅ [OrdemServicoForm] SUCESSO ao salvar!
```

### Passo 5: Abra os logs do Django
```bash
docker logs -f sistema-agropecuario-backend-1 2>&1 | grep -E "OrdemServico|ordem_"
```

Procure por:
```
🔵 [orden_pre_save]
🟢 [ordem_post_save]
🔷 [ordem_post_save] Analisando transições
```

---

## 📊 Fluxo de Status Esperado

```
[CRIAR] → status = "aberta"
  ↓
[EDITAR] → status = "em_andamento" 
  ↓
[CONCLUIR] → status = "concluida" (saídas criadas)
```

Se você pular direto para `concluida` sem passar por `em_andamento`, algo está errado!

---

## 🔧 Checklist de Debug

- [ ] Console mostra `payload.status = em_andamento`?
- [ ] API Response mostra `status = em_andamento`?
- [ ] Logs do Django mostram transição correta?
- [ ] Banco de dados tem `status = em_andamento`?
- [ ] Página mostra `em_andamento` após F5?
- [ ] Sistema criou **1 movimentação** (reserva)?
- [ ] Não criou **2 movimentações** (é sinal que foi para concluida)?

Se todos os itens acima estão ✅, o sistema está funcionando corretamente!

---

## 🚨 Erros Conhecidos

### Erro: `Não é possível criar registros sem um tenant ativo`
- **Solução**: Usuário não tem tenant atribuído. Execute:
```bash
docker exec sistema-agropecuario-backend-1 python manage.py shell -c "
from apps.core.models import CustomUser, Tenant
user = CustomUser.objects.get(username='isidoro_agent')
user.tenant = Tenant.objects.get(nome='Fazenda Admin')
user.save()
"
```

---

## 📝 Logs Adicionados (v2.0)

### Frontend
- ✅ Logs detalhados no `handleSubmit()`
- ✅ Logs no `mutationFn()` com payload completo
- ✅ Logs no `onSuccess()` e `onError()`

### Backend Serializer
- ✅ Logs no `OrdemServicoSerializer.update()`
- ✅ Status antes e depois do `super().update()`
- ✅ Detalhes de nfes e insumos

### Backend Signals
- ✅ Logs no `ordem_pre_save()`
- ✅ Logs no `ordem_post_save()`
- ✅ Detecção de transições de status
- ✅ Rastreamento de insumos reservados

---

## 🎯 Próximas Ações

1. Reproduza o problema seguindo o fluxo acima
2. Copie todos os logs (console + docker logs)
3. Envie para análise com:
   - Qual era o status esperado
   - Qual era o status que você viu
   - Os logs completos do console
   - Os logs completos do docker

---

**Versão**: 2.0 - Debug Extensivo  
**Data**: 2026-03-17  
**Status**: Sistema de logging implementado e testado ✅
