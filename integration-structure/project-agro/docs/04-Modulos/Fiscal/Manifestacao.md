````markdown
# Fluxo de Manifestação do Destinatário e Entrada em Estoque

**Última Revisão:** 2026-02-05  
**Autor:** Sistema Fiscal

## 🆕 Novidades (2026-02)

### ✨ Seleção de Certificado Digital
- **Escolha manual** do certificado para cada manifestação
- **Auto-seleção** quando apenas 1 certificado disponível
- **Validação**: certificado válido (não expirado) e ownership
- **Prioridade**: `manifestacao.certificado` → CertificadoA3 → nfe.certificado_digital → primeiro disponível

### 🛡️ Validações Preventivas (Client-Side)
- **Ciência bloqueada** após manifestação conclusiva
- **Limite de 2 retificações** por tipo conclusivo (NT 2020.001)
- **Prazos SEFAZ**: Ciência 10 dias, Conclusivas 180 dias
- **UI inteligente**: Opções inválidas desabilitadas com tooltip explicativo

### 🔄 Sincronização com SEFAZ
- **Botão "Sincronizar"** consulta manifestações feitas em outros sistemas
- **NFeDistribuicaoDFe**: Busca eventos oficiais da SEFAZ
- **Auto-refresh**: Atualiza histórico local automaticamente
- **Transparência**: Exibe timestamp da última sincronização

## Visibilidade do Botão de Manifestação

**Doc técnica:** Para a especificação técnica do contrato de API, modelos e runbook operacional, consulte `docs/FISCAL_TEMP/MANIFESTACAO.md`.


### ✅ REGRA OFICIAL (NT 2012.002 e Ajuste SINIEF 07/2005)

**O botão de manifestação DEVE estar SEMPRE VISÍVEL para o usuário quando:**

| Situação da NFe | Botão Visível? | Justificativa Legal |
|----------------|----------------|---------------------|
| **Sem manifestação** | ✅ **SIM - SEMPRE** | Destinatário DEVE manifestar (obrigação legal) |
| **Ciência registrada** | ✅ **SIM** | Pode evoluir para Confirmação após conferência |
| **Confirmação enviada** | ✅ **SIM** | Pode precisar registrar Desconhecimento se fraude detectada |
| **Desconhecimento/Não Realizada** | ✅ **SIM** | Pode precisar retificar manifestação incorreta |
| **Qualquer status** | ✅ **SIM** | Manifestação é direito/dever do destinatário |

### 📍 Localização no Sistema

O botão/formulário de manifestação está localizado:

1. **Dentro do Detalhe da NFe** ([NfeDetail.tsx](../../../sistema-agropecuario/frontend/src/components/fiscal/NfeDetail.tsx))
   - Componente: `ManifestacaoNota`
   - Seção destacada com borda azul e chip "OBRIGATÓRIO"
   - Sempre visível quando o detalhe está aberto

2. **Alertas na Lista** ([NfeList.tsx](../../../sistema-agropecuario/frontend/src/components/fiscal/NfeList.tsx), [NfeListImpostos.tsx](../../../sistema-agropecuario/frontend/src/components/fiscal/NfeListImpostos.tsx))
   - Alert de warning quando há NFes sem manifestação
   - Contagem de NFes pendentes
   - Instrução para clicar e manifestar

### 🎯 Fluxo de Acesso

```
┌────────────────────────────────────────┐
│ Lista de NFes                          │
│ ⚠️ Alert: "X NFes sem manifestação"   │
│                                        │
│ [Clique em uma NFe] ──────────────┐   │
└────────────────────────────────────│───┘
                                     │
                                     ↓
┌────────────────────────────────────────┐
│ Detalhe da NFe                         │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 📋 Manifestação do Destinatário    │ │
│ │ [OBRIGATÓRIO]                      │ │
│ │                                    │ │
│ │ ⚠️ ATENÇÃO FISCAL: A manifestação │ │
│ │ é OBRIGAÇÃO LEGAL junto à SEFAZ   │ │
│ │                                    │ │
│ │ [Tipo: Ciência ▼]  [Manifestar]   │ │
│ └────────────────────────────────────┘ │
│                                        │
│ [Confirmar Entrada em Estoque]         │
└────────────────────────────────────────┘
```

[... conteúdo preservado ...]

## Regras de Negócio (SEFAZ)

### 🔒 Restrições de Tipos

**Regra 1: Ciência após Conclusiva**
- Ciência **NÃO pode** ser registrada após Confirmação, Desconhecimento ou Operação Não Realizada
- Fundamento: Ajuste SINIEF 07/2005
- Validação: Backend + Frontend (preventiva)

**Regra 2: Limite de Retificações**
- Máximo de **2 ocorrências** por tipo conclusivo (210200, 210220, 210240)
- Fundamento: NT 2020.001 - retificações permitidas
- Validação: Backend + Frontend (contador visual)

[... conteúdo preservado ...]

---

**Nota:** Este documento foi movido para `docs/04-Modulos/Fiscal/Manifestacao.md` para maior organização (subpastas semânticas).
