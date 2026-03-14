// ========================================
// CONTRATO DE PRODUTOS FINANCEIROS - COMPONENTE FORM
// ========================================

import React, { useState } from 'react';
import { useForm, Controller, FieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ContratoFinanceiro, TipoProdutoFinanceiro } from '@/types/contratosSplit';
import { schemaContratoFinanceiro } from '@/validations/contratoFinanceiro';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Plus, Trash2, DollarSign, FileUp, BarChart3, Lock } from 'lucide-react';
import { formatCPF, formatCNPJ, formatCurrency } from '@/lib/formatters';

interface ContratoFinanceiroFormProps {
  initialData?: ContratoFinanceiro;
  onSubmit: (data: ContratoFinanceiro) => Promise<void>;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

export const ContratoFinanceiroForm: React.FC<ContratoFinanceiroFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  mode = 'create',
}) => {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('geral');

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    getValues,
  } = useForm<ContratoFinanceiro>({
    resolver: yupResolver(schemaContratoFinanceiro),
    defaultValues: initialData,
    mode: 'onChange',
  });

  const tipoProdutoFinanceiro = watch('tipo_produto_financeiro');
  const tipoBeneficiario = watch('beneficiario.tipo_beneficiario');
  const instituicaoFinanceira = watch('instituicao_financeira');

  const handleFormSubmit = async (data: ContratoFinanceiro) => {
    try {
      setSubmitError(null);
      setLoading(true);
      await onSubmit(data);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Erro ao salvar contrato');
    } finally {
      setLoading(false);
    }
  };

  const isEditable = mode !== 'view';

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Contrato - Produtos Financeiros</h1>
        <p className="text-muted-foreground">
          {mode === 'create' ? 'Criar novo contrato financeiro' : `Editar contrato ${initialData?.numero_contrato}`}
        </p>
      </div>

      {/* Erro */}
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="geral">Investidor</TabsTrigger>
            <TabsTrigger value="produto">Produto</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
          </TabsList>

          {/* ABA 1: GERAL + BENEFICIÁRIO */}
          <TabsContent value="geral" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados do Contrato</CardTitle>
                <CardDescription>Informações básicas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Número e Título */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Número do Contrato *</label>
                    <Input
                      {...register('numero_contrato')}
                      placeholder="FIN-2026-001"
                      readOnly={mode !== 'create'}
                      disabled={!isEditable}
                    />
                    {errors.numero_contrato && (
                      <p className="text-sm text-red-500">{errors.numero_contrato.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Título *</label>
                    <Input
                      {...register('titulo')}
                      placeholder="Ex: Investimento em Consórcio Agrícola"
                      disabled={!isEditable}
                    />
                    {errors.titulo && <p className="text-sm text-red-500">{errors.titulo.message}</p>}
                  </div>
                </div>

                {/* Tipo de Produto Financeiro */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Produto Financeiro *</label>
                  <Controller
                    name="tipo_produto_financeiro"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CONSORCIO">Consórcio</SelectItem>
                          <SelectItem value="SEGURO">Seguro</SelectItem>
                          <SelectItem value="APLICACAO_FINANCEIRA">Aplicação Financeira</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.tipo_produto_financeiro && (
                    <p className="text-sm text-red-500">{errors.tipo_produto_financeiro.message}</p>
                  )}
                </div>

                {/* Datas */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Assinatura *</label>
                    <Input
                      type="date"
                      {...register('data_assinatura')}
                      disabled={!isEditable}
                    />
                    {errors.data_assinatura && (
                      <p className="text-sm text-red-500">{errors.data_assinatura.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Vigência Inicial *</label>
                    <Input
                      type="date"
                      {...register('data_vigencia_inicial')}
                      disabled={!isEditable}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Vigência Final</label>
                    <Input
                      type="date"
                      {...register('data_vigencia_final')}
                      disabled={!isEditable}
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status *</label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rascunho">Rascunho</SelectItem>
                          <SelectItem value="em_analise">Em Análise</SelectItem>
                          <SelectItem value="aprovado">Aprovado</SelectItem>
                          <SelectItem value="assinado">Assinado</SelectItem>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="suspenso">Suspenso</SelectItem>
                          <SelectItem value="finalizado">Finalizado</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dados do Beneficiário */}
            <Card>
              <CardHeader>
                <CardTitle>Dados do Investidor/Beneficiário</CardTitle>
                <CardDescription>Informações pessoais ou jurídicas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Pessoa *</label>
                    <Controller
                      name="beneficiario.tipo_beneficiario"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                            <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {tipoBeneficiario === 'pessoa_fisica' ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">CPF *</label>
                        <Input
                          {...register('beneficiario.cpf_beneficiario')}
                          placeholder="000.000.000-00"
                          disabled={!isEditable}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Data de Nascimento</label>
                        <Input
                          type="date"
                          {...register('beneficiario.data_nascimento')}
                          disabled={!isEditable}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">CNPJ *</label>
                        <Input
                          {...register('beneficiario.cnpj_beneficiario')}
                          placeholder="00.000.000/0000-00"
                          disabled={!isEditable}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Inscrição Estadual</label>
                        <Input
                          {...register('beneficiario.inscricao_estadual')}
                          disabled={!isEditable}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome/Razão Social *</label>
                  <Input
                    {...register('beneficiario.nome_beneficiario')}
                    placeholder="Nome completo ou razão social"
                    disabled={!isEditable}
                  />
                  {errors.beneficiario?.nome_beneficiario && (
                    <p className="text-sm text-red-500">{errors.beneficiario.nome_beneficiario.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefone</label>
                    <Input
                      {...register('beneficiario.telefone')}
                      placeholder="(00) 00000-0000"
                      disabled={!isEditable}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      {...register('beneficiario.email')}
                      disabled={!isEditable}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Endereço</label>
                  <Textarea
                    {...register('beneficiario.endereco')}
                    placeholder="Rua, número, complemento, bairro, cidade, estado, CEP"
                    rows={2}
                    disabled={!isEditable}
                  />
                </div>

                {/* Propriedade Agrícola */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Área de Propriedade (hectares)</label>
                  <Input
                    type="number"
                    {...register('beneficiario.area_propriedade_hectares')}
                    step="0.01"
                    disabled={!isEditable}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Instituição Financeira */}
            <Card>
              <CardHeader>
                <CardTitle>Instituição Financeira</CardTitle>
                <CardDescription>Dados da instituição responsável</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome da Instituição *</label>
                    <Input
                      {...register('instituicao_financeira.nome_instituicao')}
                      placeholder="Nome do banco ou instituição"
                      disabled={!isEditable}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">CNPJ</label>
                    <Input
                      {...register('instituicao_financeira.cnpj')}
                      disabled={!isEditable}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Agência</label>
                    <Input
                      {...register('instituicao_financeira.agencia')}
                      disabled={!isEditable}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Conta</label>
                    <Input
                      {...register('instituicao_financeira.conta')}
                      disabled={!isEditable}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Conta</label>
                    <Controller
                      name="instituicao_financeira.tipo_conta"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="corrente">Corrente</SelectItem>
                            <SelectItem value="poupanca">Poupança</SelectItem>
                            <SelectItem value="investimento">Investimento</SelectItem>
                            <SelectItem value="aplicacao">Aplicação</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 2: PRODUTO FINANCEIRO (CONDICIONAL) */}
          <TabsContent value="produto" className="space-y-6">
            {tipoProdutoFinanceiro === 'CONSORCIO' && (
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Consórcio</CardTitle>
                  <CardDescription>Informações sobre o plano consortivo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Número de Cotas *</label>
                      <Input
                        type="number"
                        {...register('dados_consorcio.numero_cotas')}
                        step="1"
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Valor da Cota *</label>
                      <Input
                        type="number"
                        {...register('dados_consorcio.valor_cota')}
                        step="0.01"
                        disabled={!isEditable}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Número de Meses (12-180) *</label>
                      <Input
                        type="number"
                        {...register('dados_consorcio.numero_meses')}
                        min={12}
                        max={180}
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ordem no Consórcio *</label>
                      <Input
                        type="number"
                        {...register('dados_consorcio.ordem_consorcio')}
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Sorteios Anuais *</label>
                      <Input
                        type="number"
                        {...register('dados_consorcio.numero_sorteios_anuais')}
                        disabled={!isEditable}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Taxa Administração (%) *</label>
                      <Input
                        type="number"
                        {...register('dados_consorcio.taxa_administracao')}
                        step="0.01"
                        min={0}
                        max={5}
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Fundo de Rateio (%) *</label>
                      <Input
                        type="number"
                        {...register('dados_consorcio.fundo_rateio')}
                        step="0.01"
                        min={0}
                        max={10}
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Seguro Obrigatório?</label>
                      <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                          {...register('dados_consorcio.seguro_obrigatorio')}
                          id="seguro_obrigatorio"
                          disabled={!isEditable}
                        />
                        <label htmlFor="seguro_obrigatorio" className="text-sm">
                          Sim
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Observações</label>
                    <Textarea
                      {...register('dados_consorcio.observacoes_consorcio')}
                      rows={3}
                      disabled={!isEditable}
                    />
                  </div>

                  {/* Cálculo Total */}
                  <Card className="bg-muted p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Investimento Total</p>
                        <p className="text-lg font-bold">
                          {formatCurrency((getValues('dados_consorcio.numero_cotas') || 0) * (getValues('dados_consorcio.valor_cota') || 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duração</p>
                        <p className="text-lg font-bold">{getValues('dados_consorcio.numero_meses') || 0} meses</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Posição</p>
                        <p className="text-lg font-bold">#{getValues('dados_consorcio.ordem_consorcio') || 0}</p>
                      </div>
                    </div>
                  </Card>
                </CardContent>
              </Card>
            )}

            {tipoProdutoFinanceiro === 'SEGURO' && (
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Seguro</CardTitle>
                  <CardDescription>Informações sobre a apólice de seguro</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tipo de Seguro *</label>
                      <Controller
                        name="dados_seguro.tipo_seguro"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SEGURO_SAFRA">Seguro de Safra</SelectItem>
                              <SelectItem value="SEGURO_VIDA">Seguro de Vida</SelectItem>
                              <SelectItem value="SEGURO_PROPRIEDADE">Seguro de Propriedade</SelectItem>
                              <SelectItem value="SEGURO_RESPONSABILIDADE">Seguro de Responsabilidade</SelectItem>
                              <SelectItem value="SEGURO_OUTRO">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Número da Apólice *</label>
                      <Input
                        {...register('dados_seguro.numero_apolice')}
                        placeholder="N. apólice"
                        disabled={!isEditable}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Objeto Segurado *</label>
                    <Input
                      {...register('dados_seguro.objeto_segurado')}
                      placeholder="O que está sendo segurado (safra, máquinas, etc.)"
                      disabled={!isEditable}
                    />
                  </div>

                  {getValues('dados_seguro.tipo_seguro') === 'SEGURO_SAFRA' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Área Segurada (hectares)</label>
                      <Input
                        type="number"
                        {...register('dados_seguro.area_segurada')}
                        step="0.01"
                        disabled={!isEditable}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Valor de Cobertura *</label>
                      <Input
                        type="number"
                        {...register('dados_seguro.valor_cobertura')}
                        step="0.01"
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Franquia (%)</label>
                      <Input
                        type="number"
                        {...register('dados_seguro.franquia_percentual')}
                        step="0.01"
                        min={0}
                        max={100}
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Prêmio (R$)</label>
                      <Input
                        type="number"
                        {...register('dados_seguro.premio_anual')}
                        step="0.01"
                        disabled={!isEditable}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data de Início de Vigência</label>
                      <Input
                        type="date"
                        {...register('dados_seguro.data_inicio_vigencia')}
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data de Término de Vigência</label>
                      <Input
                        type="date"
                        {...register('dados_seguro.data_fim_vigencia')}
                        disabled={!isEditable}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Observações</label>
                    <Textarea
                      {...register('dados_seguro.observacoes_seguro')}
                      rows={3}
                      disabled={!isEditable}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {tipoProdutoFinanceiro === 'APLICACAO_FINANCEIRA' && (
              <Card>
                <CardHeader>
                  <CardTitle>Dados da Aplicação Financeira</CardTitle>
                  <CardDescription>Informações sobre rendimento e prazos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Valor Aplicado *</label>
                      <Input
                        type="number"
                        {...register('dados_aplicacao_financeira.valor_aplicado')}
                        step="0.01"
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Taxa de Remuneração Anual (%) *</label>
                      <Input
                        type="number"
                        {...register('dados_aplicacao_financeira.taxa_remuneracao_anual')}
                        step="0.01"
                        disabled={!isEditable}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tipo de Taxa *</label>
                      <Controller
                        name="dados_aplicacao_financeira.taxa_remuneracao_tipo"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PREFIXADA">Prefixada</SelectItem>
                              <SelectItem value="POSPIXADA">Pós-fixada</SelectItem>
                              <SelectItem value="FLUTUANTE">Flutuante</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {getValues('dados_aplicacao_financeira.taxa_remuneracao_tipo') === 'FLUTUANTE' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Índice de Correção *</label>
                        <Controller
                          name="dados_aplicacao_financeira.indice_correcao"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="IPCA">IPCA</SelectItem>
                                <SelectItem value="TR">TR</SelectItem>
                                <SelectItem value="SELIC">SELIC</SelectItem>
                                <SelectItem value="CDI">CDI</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  {getValues('dados_aplicacao_financeira.taxa_remuneracao_tipo') === 'FLUTUANTE' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Percentual sobre Índice (%) 0-100</label>
                      <Input
                        type="number"
                        {...register('dados_aplicacao_financeira.percentual_indice')}
                        step="0.01"
                        min={0}
                        max={100}
                        disabled={!isEditable}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Prazo Mínimo (dias) *</label>
                      <Input
                        type="number"
                        {...register('dados_aplicacao_financeira.prazo_minimo_dias')}
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Carência (dias)</label>
                      <Input
                        type="number"
                        {...register('dados_aplicacao_financeira.carencia_dias')}
                        min={0}
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Liquidação</label>
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            {...register('dados_aplicacao_financeira.liquido_resgate_parcial')}
                            id="resgate_parcial"
                            disabled={!isEditable}
                          />
                          <label htmlFor="resgate_parcial" className="text-sm">
                            Resgate Parcial
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            {...register('dados_aplicacao_financeira.liquidacao_automatica')}
                            id="liquidacao_automatica"
                            disabled={!isEditable}
                          />
                          <label htmlFor="liquidacao_automatica" className="text-sm">
                            Automática na Maturidade
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Observações</label>
                    <Textarea
                      {...register('dados_aplicacao_financeira.observacoes_aplicacao')}
                      rows={3}
                      disabled={!isEditable}
                    />
                  </div>

                  {/* Simulação de Rendimento */}
                  <Card className="bg-muted p-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Aplicação</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(getValues('dados_aplicacao_financeira.valor_aplicado') || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Taxa Anual</p>
                        <p className="text-lg font-bold">{getValues('dados_aplicacao_financeira.taxa_remuneracao_anual') || 0}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Prazo Mínimo</p>
                        <p className="text-lg font-bold">
                          {getValues('dados_aplicacao_financeira.prazo_minimo_dias') || 0} dias
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Rendimento Estimado</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(
                            ((getValues('dados_aplicacao_financeira.valor_aplicado') || 0) *
                              (getValues('dados_aplicacao_financeira.taxa_remuneracao_anual') || 0) *
                              (getValues('dados_aplicacao_financeira.prazo_minimo_dias') || 0)) /
                            36500
                          )}
                        </p>
                      </div>
                    </div>
                  </Card>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ABA 3: CONDIÇÕES FINANCEIRAS */}
          <TabsContent value="financeiro" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Condições Financeiras Gerais</CardTitle>
                <CardDescription>Impuestos, taxas e despesas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">IR/IOF (%)</label>
                    <Input
                      type="number"
                      {...register('taxa_ir_iof')}
                      step="0.01"
                      disabled={!isEditable}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Taxas Administrativas (R$)</label>
                    <Input
                      type="number"
                      {...register('valor_taxa_administrativa')}
                      step="0.01"
                      disabled={!isEditable}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Custas Cartório (R$)</label>
                    <Input
                      type="number"
                      {...register('valor_custas_cartorio')}
                      step="0.01"
                      disabled={!isEditable}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Observações Financeiras</label>
                  <Textarea
                    {...register('observacoes_financeiras')}
                    placeholder="Termos e condições financeiras especiais"
                    rows={3}
                    disabled={!isEditable}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 4: DOCUMENTOS */}
          <TabsContent value="documentos" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Documentos Adicionais</CardTitle>
                  <CardDescription>Upload de arquivos relacionados</CardDescription>
                </div>
                {isEditable && (
                  <Button
                    type="button"
                    onClick={() => {
                      const currentDocs = getValues('documentos_adicionais') || [];
                      setValue('documentos_adicionais', [
                        ...currentDocs,
                        {
                          id: Math.random().toString(),
                          tipo_documento: '',
                          descricao: '',
                          nome_arquivo: '',
                          url: '',
                          data_upload: new Date().toISOString().split('T')[0],
                        },
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Documento
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {getValues('documentos_adicionais') && getValues('documentos_adicionais')!.length > 0 ? (
                  <FieldArray name="documentos_adicionais" control={control}>
                    {({ fields, remove }) => (
                      <div className="space-y-4">
                        {fields.map((field, index) => (
                          <Card key={field.id} className="p-4">
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Tipo de Documento *</label>
                                  <Controller
                                    name={`documentos_adicionais.${index}.tipo_documento`}
                                    control={control}
                                    render={({ field }) => (
                                      <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="contrato_assinado">Contrato Assinado</SelectItem>
                                          <SelectItem value="comprovante_endereco">Comprovante de Endereço</SelectItem>
                                          <SelectItem value="ext_bancaria">Extrato Bancário</SelectItem>
                                          <SelectItem value="procuracao">Procuração</SelectItem>
                                          <SelectItem value="apolice">Apólice/Título</SelectItem>
                                          <SelectItem value="outro">Outro</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Descrição</label>
                                  <Input
                                    {...register(`documentos_adicionais.${index}.descricao`)}
                                    placeholder="Breve descrição"
                                    disabled={!isEditable}
                                  />
                                </div>
                              </div>

                              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer transition">
                                <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Clique para fazer upload do arquivo</p>
                                <Input
                                  type="file"
                                  className="hidden"
                                  disabled={!isEditable}
                                />
                              </div>

                              {isEditable && (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => remove(index)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remover
                                </Button>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </FieldArray>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum documento adicionado.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 5: RESUMO */}
          <TabsContent value="resumo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Contrato</CardTitle>
                <CardDescription>Visão geral de todas as informações</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Investidor */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Investidor
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Nome</p>
                        <p className="font-medium">{getValues('beneficiario.nome_beneficiario') || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          {tipoBeneficiario === 'pessoa_fisica' ? 'CPF' : 'CNPJ'}
                        </p>
                        <p className="font-medium">
                          {tipoBeneficiario === 'pessoa_fisica'
                            ? getValues('beneficiario.cpf_beneficiario') || '-'
                            : getValues('beneficiario.cnpj_beneficiario') || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Produto */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Produto Financeiro
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Tipo</p>
                        <p className="font-medium">{tipoProdutoFinanceiro || '-'}</p>
                      </div>
                      {tipoProdutoFinanceiro === 'CONSORCIO' && (
                        <>
                          <div>
                            <p className="text-muted-foreground">Investimento Total</p>
                            <p className="font-medium">
                              {formatCurrency((getValues('dados_consorcio.numero_cotas') || 0) * (getValues('dados_consorcio.valor_cota') || 0))}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Duração</p>
                            <p className="font-medium">{getValues('dados_consorcio.numero_meses') || 0} meses</p>
                          </div>
                        </>
                      )}
                      {tipoProdutoFinanceiro === 'SEGURO' && (
                        <>
                          <div>
                            <p className="text-muted-foreground">Cobertura</p>
                            <p className="font-medium">
                              {formatCurrency(getValues('dados_seguro.valor_cobertura') || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Prêmio</p>
                            <p className="font-medium">
                              {formatCurrency(getValues('dados_seguro.premio_anual') || 0)}/ano
                            </p>
                          </div>
                        </>
                      )}
                      {tipoProdutoFinanceiro === 'APLICACAO_FINANCEIRA' && (
                        <>
                          <div>
                            <p className="text-muted-foreground">Valor Aplicado</p>
                            <p className="font-medium">
                              {formatCurrency(getValues('dados_aplicacao_financeira.valor_aplicado') || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Taxa Anual</p>
                            <p className="font-medium">{getValues('dados_aplicacao_financeira.taxa_remuneracao_anual') || 0}%</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Vigência */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Vigência
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Assinatura</p>
                        <p className="font-medium">{getValues('data_assinatura') || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Início</p>
                        <p className="font-medium">{getValues('data_vigencia_inicial') || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fim</p>
                        <p className="font-medium">{getValues('data_vigencia_final') || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Botões de Ação */}
        {isEditable && (
          <div className="flex gap-2 justify-end mt-8">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : mode === 'create' ? 'Criar Contrato' : 'Salvar Alterações'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ContratoFinanceiroForm;
