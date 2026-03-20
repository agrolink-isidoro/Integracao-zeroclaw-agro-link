# 🎯 Guia de Sequência de Criação de Fazendas - Isidoro

## Objetivo

Instruir a IA (Isidoro) sobre a ordem obrigatória de criação de estruturas de fazenda:
**Proprietário → Fazenda → Área → Talhão**

---

## 1️⃣ PASSO 1: CRIAR PROPRIETÁRIO

**Quando?** Sempre que o usuário quiser registrar uma nova propriedade ou proprietário.

**O que a IA deve fazer:**
1. Perguntar nome do proprietário (obrigatório)
2. Perguntar CPF ou CNPJ (obrigatório)
3. Oferecer campos opcionais: telefone, email, endereço
4. Ao usuário confirmar → **CHAMAR IMEDIATAMENTE** `criar_proprietario()`

**Exemplo de diálogo esperado:**
```
Usuário: "Preciso cadastrar uma nova propriedade"
Isidoro: "Ótimo! Vamos começar pelo proprietário. Qual é o nome completo?"
Usuário: "João Carlos da Silva"
Isidoro: "E qual o CPF ou CNPJ?"
Usuário: "123.456.789-00"
Isidoro: "Perfeito! Quer informar também telefone, email ou endereço?"
Usuário: "Sim, telefone é 65 99999-9999"
Isidoro: "Tudo certo então: Nome: João Carlos da Silva, CPF: 123.456.789-00, Telefone: 65 99999-9999. Posso registrar?"
Usuário: "Sim, pode criar"
Isidoro: [CHAMA criar_proprietario IMEDIATAMENTE]
→ "✓ Proprietário registrado! Próximo passo: criar a fazenda."
```

---

## 2️⃣ PASSO 2: CRIAR FAZENDA

**Depende de:** Proprietário DEVE existir do Passo 1

**O que a IA deve fazer:**
1. Validar que o proprietário existe (ou oferecer criar)
2. Perguntar nome da fazenda (obrigatório)
3. Perguntar matrícula/registro (obrigatório)
4. Confirmation → **CHAMAR IMEDIATAMENTE** `criar_fazenda()`

**Exemplo de diálogo esperado:**
```
Isidoro: "Proprietário criado! Agora vamos criar a fazenda. Qual é o nome da fazenda?"
Usuário: "Fazenda Santa Maria"
Isidoro: "E qual a matrícula ou registro dessa fazenda?"
Usuário: "MAT-2024-001"
Isidoro: "Resumo: Nome: Fazenda Santa Maria, Matrícula: MAT-2024-001, Proprietário: João Carlos da Silva. Confirmado?"
Usuário: "Confirma"
Isidoro: [CHAMA criar_fazenda IMEDIATAMENTE]
→ "✓ Fazenda registrada! Próximo passo: criar as áreas."
```

**O que NÃO deve acontecer:**
```
❌ Isidoro: "Qual proprietário quer usar?" (pede para escolher de lista — propriário não existe)
❌ Isidoro vai direto para "de qual fazenda quer informar talhões?" (pulou área)
❌ Isidoro: "Quer criar também talhões agora?" (talhoes requer area)
```

---

## 3️⃣ PASSO 3: CRIAR ÁREA

**Depende de:** Fazenda DEVE existir do Passo 2

**O que a IA deve fazer:**
1. Perguntar nome da área (obrigatório)
2. Validar se fazenda existe (ou oferecer criar)
3. Perguntar tipo: 'propria' ou 'arrendada' (obrigatório)
4. Se arrendada → perguntar custo em sacas/hectare
5. Confirmation → **CHAMAR IMEDIATAMENTE** `criar_area()`

**Exemplo de diálogo esperado:**
```
Isidoro: "Fazenda criada! Agora vamos criar as áreas. Qual o nome da primeira área?"
Usuário: "Gleba Norte"
Isidoro: "E qual o tipo de posse: Própria ou Arrendada?"
Usuário: "Própria"
Isidoro: "Resumo: Nome: Gleba Norte, Fazenda: Fazenda Santa Maria, Tipo: Própria. Confirmado?"
Usuário: "Sim"
Isidoro: [CHAMA criar_area IMEDIATAMENTE]
→ "✓ Área criada! Vamos agora registrar os talhões dessa área?"
```

---

## 4️⃣ PASSO 4: CRIAR TALHÃO

**Depende de:** Área DEVE existir do Passo 3

**O que a IA deve fazer:**
1. Perguntar nome do talhão (obrigatório)
2. Perguntar área em hectares (obrigatório)
3. Validar se área existe (ou oferecer criar)
4. Oferecer campos opcionais: código, custo de arrendamento
5. Confirmation → **CHAMAR IMEDIATAMENTE** `criar_talhao()`

**Exemplo de diálogo esperado:**
```
Isidoro: "Vamos criar um talhão. Qual é o nome ou código?"
Usuário: "Talhão A1"
Isidoro: "E qual a área desse talhão em hectares?"
Usuário: "50.5"
Isidoro: "Resumo: Nome: Talhão A1, Área: 50.5 hectares, Área pai: Gleba Norte. Confirmado?"
Usuário: "Confirmado"
Isidoro: [CHAMA criar_talhao IMEDIATAMENTE]
→ "✓ Talhão registrado!"
```

---

## ⚠️ ERROS COMUNS A EVITAR

### ❌ Erro 1: Pular etapas
```
Usuário: "Quero criar um talhão no meu sítio"
Isidoro: "Quantos hectares tem esse talhão?"
→❌ ERRADO — não pediu para criar proprietário, fazenda, ou área
```

**Correto:**
```
Isidoro: "Claro! Primeiro preciso saber sobre o proprietário. Qual é o seu nome?"
```

### ❌ Erro 2: Não validar pré-requisitos
```
Usuário: "Cria uma area no talhão ABC"
Isidoro: [tenta criar_area sem validar se a fazenda existe]
→❌ ERRADO — vai falhar porque talhão não existência
```

**Correto:**
```
Isidoro: "Qual é a fazenda onde essa área vai ficar?"
[valida se fazenda existe, se não, oferece criar]
→ "Quer criar a fazenda primeiro?"
```

### ❌ Erro 3: Repetir confirmação
```
Usuário: "Pode criar"
Isidoro: "Você tem certeza que quer criar?"
Usuário: "SIM, pode criar!"
Isidoro: "E você tem certeza mesmo?"
→ ❌ ERRADO — usuário já confirmou!
```

**Correto:**
```
Usuário: "Pode criar"
Isidoro: [CHAMA A FERRAMENTA IMEDIATAMENTE]
→ "✓ Registrado!"
```

### ❌ Erro 4: Criar múltiplos rascunhos fora de ordem
```
Usuário: "Cria tudo: proprietário, fazenda, área, talhão"
Isidoro: [cria 4 rascunhos ao mesmo tempo]
→ ❌ ERRADO — usuário precisa aprovar cada um em ordem
```

**Correto:**
```
Isidoro: "Vou ajudar! Vamos criar tudo na ordem correta. Primeiro, o proprietário. Qual o nome?"
[cria 1 rascunho de proprietário]
"Propriétário criado! Agora a fazenda. Qual o nome?"
[cria 1 rascunho de fazenda]
"Fazenda criada! Vamos aos outros em ordem..."
```

---

## 📋 Checklist para Isidoro

Antes de chamar cada ferramenta, a IA deve verificar:

### ✅ criar_proprietario
- [ ] Perguntou nome (obrigatório)
- [ ] Perguntou CPF/CNPJ (obrigatório)
- [ ] Ofertou opcionais (telefone, email, endereço)
- [ ] Aguardou confirmação do usuário
- [ ] Chamou a ferramenta SEM fazer mais perguntas

### ✅ criar_fazenda
- [ ] Validou que proprietário existe (ou ofereceu criar)
- [ ] Perguntou nome (obrigatório)
- [ ] Perguntou matrícula (obrigatório)
- [ ] Aguardou confirmação do usuário
- [ ] Chamou a ferramenta SEM fazer mais perguntas

### ✅ criar_area
- [ ] Validou que fazenda existe (ou ofereceu criar)
- [ ] Perguntou nome (obrigatório)
- [ ] Perguntou tipo: propria/arrendada (obrigatório)
- [ ] Se arrendada: perguntou custo em sacas/hectare
- [ ] Aguardou confirmação do usuário
- [ ] Chamou a ferramenta SEM fazer mais perguntas

### ✅ criar_talhao
- [ ] Validou que área existe (ou ofereceu criar)
- [ ] Perguntou nome (obrigatório)
- [ ] Perguntou área em hectares (obrigatório)
- [ ] Ofertou opcionais (código, custo, observações)
- [ ] Aguardou confirmação do usuário
- [ ] Chamou a ferramenta SEM fazer mais perguntas

---

## 🔍 Como Testar

Para verificar se Isidoro está seguindo a sequência corretamente:

1. **Inicie uma conversa nova** com o chatbot Isidoro
2. **Teste a sequência completa**, ex:
   - "Preciso cadastrar uma nova propriedade completa com proprietário, fazenda, áreas e talhões"
3. **Verifique** se:
   - ✓ Pergunta nome do proprietário ANTES de fazenda
   - ✓ Cria rascunho de proprietário e aguarda aprovação
   - ✓ Pergunta fazenda APÓS proprietário
   - ✓ Cria rascunho de fazenda e aguarda aprovação
   - ✓ Pergunta área APÓS fazenda
   - ✓ Cria rascunho de área e aguarda aprovação
   - ✓ Pergunta talhão APÓS área
   - ✓ Cria rascunho de talhão e aguarda aprovação
4. **Se desviou da sequência**, relatar nos logs

---

## 📚 Arquivos Modificados

- `/zeroclaw_tools/integrations/agrolink.py` — System prompt com nova seção "SEQUÊNCIA OBRIGATÓRIA"
- `/zeroclaw_tools/tools/agrolink_tools.py` — Docstrings melhorados para criar_proprietario, criar_fazenda, criar_area, criar_talhao

**Commit:** `bf5277a`

---

## 🎯 Resultado Esperado

Com essas mudanças, Isidoro deve:
1. ✅ Guiar o usuário na sequência correta
2. ✅ Validar pré-requisitos antes de criar
3. ✅ Não pular etapas
4. ✅ Criar rascunhos em ordem aprovável
5. ✅ Responder rapidamente ao usuário confirmar (sem mais perguntas)

---

**Última atualização:** 13 de março de 2026
