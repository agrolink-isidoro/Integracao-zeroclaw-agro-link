// ========================================
// CONTRATO DE VENDA - COMPONENTE FORM
// ========================================

import React, { useState, useCallback } from 'react';
import { useForm, Controller, FieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ContratoVenda, ItemVenda, ParcelaVenda, CondicaoVenda } from '@/types/contratosSplit';
import { schemaContratoVenda } from '@/validations/contratoVenda';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Plus, Trash2, DollarSign, Calendar, FileUp, Copy, BarChart3 } from 'lucide-react';
import { formatCPF, formatCNPJ, formatCurrency } from '@/lib/formatters';
import { gerarParcelas, calcularDataVencimento } from '@/lib/parcelasUtils';

interface ContratoVendaFormProps {
  initialData?: ContratoVenda;
  onSubmit: (data: ContratoVenda) => Promise<void>;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

export const ContratoVendaForm: React.FC<ContratoVendaFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  mode = 'create',
}) => {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('geral');
  const [showParcelasPreview, setShowParcelasPreview] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    getValues,
    reset,
  } = useForm<ContratoVenda>({
    resolver: yupResolver(schemaContratoVenda),
    defaultValues: initialData,
    mode: 'onChange',
  });

  const tipoOperacao = watch('tipo_operacao');
  const tipoPagamento = watch('tipo_pagamento');
  const numeroParcelas = watch('numero_parcelas');
  const periodicidadeParcelas = watch('periodicidade_parcelas');
  const dataEntregaPrevista = watch('data_entrega_prevista');
  const dataInicioProducao = watch('data_inicio_producao');
  const itens = watch('itens');
  const valorTotal = watch('valor_total');
  const descontoTotal = watch('desconto_total');

  // Auto-calcular valor final
  React.useEffect(() => {
    if (valorTotal !== undefined) {
      const desconto = descontoTotal || 0;
      const valorFinal = valorTotal - desconto;
      setValue('valor_final', Math.max(0, valorFinal));
    }
  }, [valorTotal, descontoTotal, setValue]);

  // Auto-gerar parcelas
  const gerarParcelasAutomaticamente = useCallback(() => {
    if (!tipoPagamento || tipoPagamento === 'A_VISTA' || tipoPagamento === 'CONTRA_ENTREGA') {
      return;
    }

    if (!numeroParcelas || !periodicidadeParcelas || !dataEntregaPrevista) {
      setSubmitError('Preencha número de parcelas, periodicidade e data de entrega para gerar parcelas');
      return;
    }

    try {
      const parcelas = gerarParcelas({
        valor_total: getValues('valor_final') || valorTotal,
        numero_parcelas: numeroParcelas,
        periodicidade: periodicidadeParcelas as 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'BIMESTRAL',
        data_inicio: dataEntregaPrevista,
      });

      setValue('parcelas', parcelas);
      setShowParcelasPreview(true);
      setSubmitError(null);
    } catch (error) {
      setSubmitError('Erro ao gerar parcelas');
    }
  }, [tipoPagamento, numeroParcelas, periodicidadeParcelas, dataEntregaPrevista, valorTotal, getValues, setValue]);

  // Auto-calcular valores dos itens
  React.useEffect(() => {
    if (itens && itens.length > 0) {
      const total = itens.reduce((acc, item) => {
        const desconto =
          (item.desconto_item_percentual || 0) > 0
            ? item.valor_unitario * item.quantidade * (item.desconto_item_percentual / 100)
            : item.desconto_item_valor || 0;
        const comDesconto = item.valor_unitario * item.quantidade - desconto;
        return acc + comDesconto;
      }, 0);
      setValue('valor_total', Number(total.toFixed(2)));
    }
  }, [itens, setValue]);

  const handleFormSubmit = async (data: ContratoVenda) => {
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

  const isBarter = tipoOperacao === 'VENDA_BARTER';
  const isParcelado = tipoPagamento === 'PARCELADO' || tipoPagamento === 'ANTECIPADO';
  const isEditable = mode !== 'view';

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Contrato de Venda</h1>
        <p className="text-muted-foreground">
          {mode === 'create' ? 'Criar novo contrato de venda' : `Editar contrato ${initialData?.numero_contrato}`}
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="cliente">Cliente</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="parcelamento">Parcelamento</TabsTrigger>
            <TabsTrigger value="condicoes">Condições</TabsTrigger>
            <TabsTrigger value="entrega">Entrega</TabsTrigger>
          </TabsList>

          {/* ABA 1: DADOS GERAIS */}
          <TabsContent value="geral" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados Gerais do Contrato</CardTitle>
                <CardDescription>Informações básicas e tipo de operação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Número e Título */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Número do Contrato *</label>
                    <Input
                      {...register('numero_contrato')}
                      placeholder="VND-2026-001"
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
                      placeholder="Ex: Venda de Grãos - Safra 2026"
                      disabled={!isEditable}
                    />
                    {errors.titulo && <p className="text-sm text-red-500">{errors.titulo.message}</p>}
                  </div>
                </div>

                {/* Tipo de Operação e Categoria */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Operação *</label>
                    <Controller
                      name="tipo_operacao"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VENDA_DINHEIRO">Venda à Vista</SelectItem>
                            <SelectItem value="VENDA_PARCELADA">Venda Parcelada</SelectItem>
                            <SelectItem value="VENDA_ANTECIPADA">Venda com Antecipação</SelectItem>
                            <SelectItem value="VENDA_FUTURA">Venda Futura</SelectItem>
                            <SelectItem value="VENDA_SPOT">Venda Spot (Mercado Spot)</SelectItem>
                            <SelectItem value="VENDA_BARTER">Venda com Barter</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.tipo_operacao && (
                      <p className="text-sm text-red-500">{errors.tipo_operacao.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Categoria *</label>
                    <Controller
                      name="categoria_venda"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="commodities">Commodities</SelectItem>
                            <SelectItem value="produtos_processados">Produtos Processados</SelectItem>
                            <SelectItem value="servicos_agricolas">Serviços Agrícolas</SelectItem>
                            <SelectItem value="maquinas_usadas">Máquinas Usadas</SelectItem>
                            <SelectItem value="outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.categoria_venda && (
                      <p className="text-sm text-red-500">{errors.categoria_venda.message}</p>
                    )}
                  </div>
                </div>

                {/* Status e Valores */}
                <div className="grid grid-cols-4 gap-4">
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
                            <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                            <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                            <SelectItem value="assinado">Assinado</SelectItem>
                            <SelectItem value="em_execucao">Em Execução</SelectItem>
                            <SelectItem value="pronto_entrega">Pronto para Entrega</SelectItem>
                            <SelectItem value="entregue">Entregue</SelectItem>
                            <SelectItem value="finalizado">Finalizado</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Valor Total *</label>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold">{formatCurrency(valorTotal || 0)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Desconto Total</label>
                    <Input
                      type="number"
                      {...register('desconto_total')}
                      step="0.01"
                      disabled={!isEditable}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Valor Final</label>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded font-semibold">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatCurrency(getValues('valor_final') || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Emissão *</label>
                    <Input
                      type="date"
                      {...register('data_emissao')}
                      disabled={!isEditable}
                    />
                    {errors.data_emissao && (
                      <p className="text-sm text-red-500">{errors.data_emissao.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Início da Produção *</label>
                    <Input
                      type="date"
                      {...register('data_inicio_producao')}
                      disabled={!isEditable}
                    />
                    {errors.data_inicio_producao && (
                      <p className="text-sm text-red-500">{errors.data_inicio_producao.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Entrega Prevista *</label>
                    <Input
                      type="date"
                      {...register('data_entrega_prevista')}
                      disabled={!isEditable}
                    />
                    {errors.data_entrega_prevista && (
                      <p className="text-sm text-red-500">{errors.data_entrega_prevista.message}</p>
                    )}
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Observações Gerais</label>
                  <Textarea
                    {...register('observacoes_gerais')}
                    placeholder="Notas adicionais sobre a venda..."
                    rows={3}
                    disabled={!isEditable}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 2: CLIENTE */}
          <TabsContent value="cliente" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados do Cliente</CardTitle>
                <CardDescription>Informações de contato e histórico de compras</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Cliente */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cliente *</label>
                    <Input
                      {...register('cliente.cliente_nome')}
                      placeholder="Nome do cliente"
                      disabled={!isEditable}
                    />
                    {errors.cliente?.cliente_nome && (
                      <p className="text-sm text-red-500">{errors.cliente.cliente_nome.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">CPF/CNPJ *</label>
                    <Input
                      {...register('cliente.cpf_cnpj')}
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      disabled={!isEditable}
                    />
                    {errors.cliente?.cpf_cnpj && (
                      <p className="text-sm text-red-500">{errors.cliente.cpf_cnpj.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Pessoa *</label>
                    <Controller
                      name="cliente.tipo_pessoa"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pf">Pessoa Física</SelectItem>
                            <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefone</label>
                    <Input
                      {...register('cliente.telefone')}
                      placeholder="(00) 00000-0000"
                      disabled={!isEditable}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      {...register('cliente.email')}
                      placeholder="cliente@email.com"
                      disabled={!isEditable}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Endereço de Entrega *</label>
                  <Textarea
                    {...register('cliente.endereco_entrega')}
                    placeholder="Rua, número, complemento, bairro, cidade, estado, CEP"
                    rows={2}
                    disabled={!isEditable}
                  />
                  {errors.cliente?.endereco_entrega && (
                    <p className="text-sm text-red-500">{errors.cliente.endereco_entrega.message}</p>
                  )}
                </div>

                {/* Histórico de Cliente */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Histórico de Compras
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4 bg-muted">
                      <p className="text-xs text-muted-foreground">Total Já Comprado</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(getValues('cliente.historico_cliente?.total_ja_comprado') || 0)}
                      </p>
                    </Card>

                    <Card className="p-4 bg-muted">
                      <p className="text-xs text-muted-foreground">Primeira Compra</p>
                      <p className="text-sm font-semibold">
                        {getValues('cliente.historico_cliente?.data_primeira_compra') || 'Primeira compra'}
                      </p>
                    </Card>

                    <Card className="p-4 bg-muted">
                      <p className="text-xs text-muted-foreground">Status de Pagamento</p>
                      <p className="text-sm font-semibold">
                        {getValues('cliente.historico_cliente?.status_pagamento') === 'em_dia' && '✓ Em Dia'}
                        {getValues('cliente.historico_cliente?.status_pagamento') === 'atrasado' && '⚠ Atrasado'}
                        {getValues('cliente.historico_cliente?.status_pagamento') === 'vencido' && '✗ Vencido'}
                      </p>
                    </Card>
                  </div>
                </div>

                {/* Representante Legal (opcional) */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold mb-4">Representante Legal (Opcional)</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome</label>
                      <Input
                        {...register('cliente.representante_legal.nome')}
                        placeholder="Nome completo"
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">CPF</label>
                      <Input
                        {...register('cliente.representante_legal.cpf')}
                        placeholder="000.000.000-00"
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cargo</label>
                      <Input
                        {...register('cliente.representante_legal.cargo')}
                        placeholder="Ex: Gerente"
                        disabled={!isEditable}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 3: PRODUTOS */}
          <TabsContent value="produtos" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Produtos e Serviços</CardTitle>
                  <CardDescription>Itens com rastreamento e certificações</CardDescription>
                </div>
                {isEditable && (
                  <Button
                    type="button"
                    onClick={() => {
                      const currentItens = getValues('itens') || [];
                      setValue('itens', [
                        ...currentItens,
                        {
                          id: Math.random().toString(),
                          descricao_produto: '',
                          tipo_produto: 'commodity',
                          categoria_produto: 'graos',
                          quantidade: 1,
                          unidade: 'kg',
                          valor_unitario: 0,
                          valor_total_item: 0,
                        } as ItemVenda,
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Produto
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {itens && itens.length > 0 ? (
                  <FieldArray name="itens" control={control}>
                    {({ fields, remove }) => (
                      <div className="space-y-6">
                        {fields.map((field, index) => (
                          <Card key={field.id} className="p-4">
                            {/* Nome e Tipo */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Descrição do Produto *</label>
                                <Input
                                  {...register(`itens.${index}.descricao_produto`)}
                                  placeholder="Ex: Soja Premium Safra 2026"
                                  disabled={!isEditable}
                                />
                                {errors.itens?.[index]?.descricao_produto && (
                                  <p className="text-sm text-red-500">
                                    {errors.itens[index]?.descricao_produto?.message}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">Tipo de Produto *</label>
                                <Controller
                                  name={`itens.${index}.tipo_produto`}
                                  control={control}
                                  render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="commodity">Commodity</SelectItem>
                                        <SelectItem value="produto_processado">Produto Processado</SelectItem>
                                        <SelectItem value="servico">Serviço</SelectItem>
                                        <SelectItem value="maquina">Máquina</SelectItem>
                                        <SelectItem value="outro">Outro</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">Categoria *</label>
                                <Controller
                                  name={`itens.${index}.categoria_produto`}
                                  control={control}
                                  render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="graos">Grãos</SelectItem>
                                        <SelectItem value="hortifruti">Hortifrutíssima</SelectItem>
                                        <SelectItem value="proteinas">Proteínas</SelectItem>
                                        <SelectItem value="polpas">Polpas</SelectItem>
                                        <SelectItem value="servicos">Serviços</SelectItem>
                                        <SelectItem value="outros">Outros</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </div>
                            </div>

                            {/* Quantidade e Valores */}
                            <div className="grid grid-cols-5 gap-4 mb-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Quantidade *</label>
                                <Input
                                  type="number"
                                  {...register(`itens.${index}.quantidade`)}
                                  step="0.01"
                                  disabled={!isEditable}
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">Unidade *</label>
                                <Controller
                                  name={`itens.${index}.unidade`}
                                  control={control}
                                  render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="kg">kg</SelectItem>
                                        <SelectItem value="saca">Saca</SelectItem>
                                        <SelectItem value="tonelada">Tonelada</SelectItem>
                                        <SelectItem value="L">Litro</SelectItem>
                                        <SelectItem value="un">Unidade</SelectItem>
                                        <SelectItem value="bushel">Bushel</SelectItem>
                                        <SelectItem value="alqueire">Alqueire</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">Valor Unitário *</label>
                                <Input
                                  type="number"
                                  {...register(`itens.${index}.valor_unitario`)}
                                  step="0.01"
                                  disabled={!isEditable}
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">Desconto %</label>
                                <Input
                                  type="number"
                                  {...register(`itens.${index}.desconto_item_percentual`)}
                                  min={0}
                                  max={100}
                                  step="0.01"
                                  disabled={!isEditable}
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">Total</label>
                                <div className="p-2 bg-muted rounded font-semibold">
                                  {formatCurrency(
                                    (itens[index]?.valor_unitario || 0) *
                                    (itens[index]?.quantidade || 0) *
                                    (1 - (itens[index]?.desconto_item_percentual || 0) / 100)
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Rastreamento e Certificações */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Lote/Número de Série</label>
                                <Input
                                  {...register(`itens.${index}.lote_numero`)}
                                  placeholder="Número de rastreamento"
                                  disabled={!isEditable}
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">Data de Colheita/Produção</label>
                                <Input
                                  type="date"
                                  {...register(`itens.${index}.data_colheita_producao`)}
                                  disabled={!isEditable}
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">Certificações</label>
                                <Input
                                  {...register(`itens.${index}.certificacoes`)}
                                  placeholder="Ex: Orgânico, Fair Trade, etc."
                                  disabled={!isEditable}
                                />
                              </div>
                            </div>

                            {/* Observações do Item */}
                            <div className="space-y-2 mb-4">
                              <label className="text-sm font-medium">Condições de Entrega/Observações</label>
                              <Textarea
                                {...register(`itens.${index}.condicoes_entrega_item`)}
                                placeholder="Notas específicas para este produto"
                                rows={2}
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
                          </Card>
                        ))}
                      </div>
                    )}
                  </FieldArray>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhum produto adicionado. Clique em "Adicionar Produto" para começar.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 4: PARCELAMENTO */}
          <TabsContent value="parcelamento" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Condições de Pagamento</CardTitle>
                <CardDescription>Configure o tipo de pagamento e gere as parcelas automáticamente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tipo de Pagamento */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Pagamento *</label>
                    <Controller
                      name="tipo_pagamento"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A_VISTA">À Vista</SelectItem>
                            <SelectItem value="PARCELADO">Parcelado</SelectItem>
                            <SelectItem value="CONTRA_ENTREGA">Contra Entrega</SelectItem>
                            <SelectItem value="ANTECIPADO">Antecipado</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.tipo_pagamento && (
                      <p className="text-sm text-red-500">{errors.tipo_pagamento.message}</p>
                    )}
                  </div>

                  {isParcelado && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Número de Parcelas (1-24) *</label>
                        <Input
                          type="number"
                          {...register('numero_parcelas')}
                          min={1}
                          max={24}
                          disabled={!isEditable}
                        />
                        {errors.numero_parcelas && (
                          <p className="text-sm text-red-500">{errors.numero_parcelas.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Periodicidade *</label>
                        <Controller
                          name="periodicidade_parcelas"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SEMANAL">Semanal</SelectItem>
                                <SelectItem value="QUINZENAL">Quinzenal</SelectItem>
                                <SelectItem value="MENSAL">Mensal</SelectItem>
                                <SelectItem value="BIMESTRAL">Bimestral</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.periodicidade_parcelas && (
                          <p className="text-sm text-red-500">{errors.periodicidade_parcelas.message}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Botão Gerar Parcelas */}
                {isParcelado && isEditable && (
                  <Button
                    type="button"
                    onClick={gerarParcelasAutomaticamente}
                    variant="outline"
                    className="w-full"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Gerar Parcelas Automaticamente
                  </Button>
                )}

                {/* Preview de Parcelas */}
                {showParcelasPreview && getValues('parcelas') && getValues('parcelas')!.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h3 className="text-sm font-semibold mb-4">Parcelas Geradas</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b">
                          <tr className="text-muted-foreground">
                            <th className="text-left py-2">Parcela</th>
                            <th className="text-right pr-4">Vencimento</th>
                            <th className="text-right pr-4">Valor</th>
                            <th className="text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getValues('parcelas')!.map((parcela, idx) => (
                            <tr key={idx} className="border-b hover:bg-muted">
                              <td className="py-2">#{parcela.numero_parcela}</td>
                              <td className="text-right pr-4">{parcela.data_vencimento}</td>
                              <td className="text-right pr-4 font-semibold">{formatCurrency(parcela.valor)}</td>
                              <td className="text-left text-muted-foreground">{parcela.status || 'Pendente'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 5: CONDIÇÕES DE VENDA */}
          <TabsContent value="condicoes" className="space-y-6">
            {/* Barter Section */}
            {isBarter && (
              <Card>
                <CardHeader>
                  <CardTitle>Dados do Barter</CardTitle>
                  <CardDescription>Informações sobre a troca de produtos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Produto Oferecido em Troca *</label>
                      <Input
                        {...register('dados_barter.produto_barter_descricao')}
                        placeholder="Descrição do produto em troca"
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quantidade em Troca *</label>
                      <Input
                        type="number"
                        {...register('dados_barter.quantidade_barter')}
                        step="0.01"
                        disabled={!isEditable}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Valor do Produto em Troca *</label>
                      <Input
                        type="number"
                        {...register('dados_barter.valor_produto_barter')}
                        step="0.01"
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data de Entrega *</label>
                      <Input
                        type="date"
                        {...register('dados_barter.data_entrega_barter')}
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ajuste Financeiro (R$)</label>
                      <Input
                        type="number"
                        {...register('dados_barter.taxa_ajuste_financeira')}
                        step="0.01"
                        disabled={!isEditable}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Ajuste *</label>
                    <Controller
                      name="dados_barter.tipo_ajuste"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SEM_AJUSTE">Sem Ajuste (Valores Iguais)</SelectItem>
                            <SelectItem value="DINHEIRO_AGORA">Dinheiro Agora (Diferença em dinheiro)</SelectItem>
                            <SelectItem value="DESCONTO_PROXIMA">Desconto na Próxima Compra</SelectItem>
                            <SelectItem value="CREDITO_FUTURO">Crédito Futuro</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Observações</label>
                    <Textarea
                      {...register('dados_barter.observacoes_barter')}
                      placeholder="Detalhes da operação de troca"
                      rows={3}
                      disabled={!isEditable}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Condições de Venda */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Condições de Venda</CardTitle>
                  <CardDescription>Juros, multas, direitos de devolução</CardDescription>
                </div>
                {isEditable && (
                  <Button
                    type="button"
                    onClick={() => {
                      const currentCondicoes = getValues('condicoes') || [];
                      setValue('condicoes', [
                        ...currentCondicoes,
                        {
                          id: Math.random().toString(),
                          tipo_condicao: 'pagamento',
                          descricao: '',
                          obrigatoria: false,
                        } as CondicaoVenda,
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Condição
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {getValues('condicoes') && getValues('condicoes')!.length > 0 ? (
                  <FieldArray name="condicoes" control={control}>
                    {({ fields, remove }) => (
                      <div className="space-y-4">
                        {fields.map((field, index) => (
                          <Card key={field.id} className="p-4">
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Tipo de Condição *</label>
                                  <Controller
                                    name={`condicoes.${index}.tipo_condicao`}
                                    control={control}
                                    render={({ field }) => (
                                      <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pagamento">Pagamento</SelectItem>
                                          <SelectItem value="entrega">Entrega</SelectItem>
                                          <SelectItem value="garantia">Garantia</SelectItem>
                                          <SelectItem value="devolucao">Devolução</SelectItem>
                                          <SelectItem value="cancelamento">Cancelamento</SelectItem>
                                          <SelectItem value="multa">Multa</SelectItem>
                                          <SelectItem value="outras">Outras</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                </div>

                                <div className="flex items-center space-x-2 pt-8">
                                  <Checkbox
                                    {...register(`condicoes.${index}.obrigatoria`)}
                                    id={`condicoes.${index}.obrigatoria`}
                                    disabled={!isEditable}
                                  />
                                  <label htmlFor={`condicoes.${index}.obrigatoria`} className="text-sm font-medium">
                                    Obrigatória
                                  </label>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">Descrição *</label>
                                <Textarea
                                  {...register(`condicoes.${index}.descricao`)}
                                  placeholder="Descreva a condição..."
                                  rows={2}
                                  disabled={!isEditable}
                                />
                              </div>

                              <div className="grid grid-cols-4 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Juros (% ao mês)</label>
                                  <Input
                                    type="number"
                                    {...register(`condicoes.${index}.juros_mensais`)}
                                    min={0}
                                    max={3}
                                    step="0.01"
                                    disabled={!isEditable}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Multa Atraso (%)</label>
                                  <Input
                                    type="number"
                                    {...register(`condicoes.${index}.multa_atraso_percentual`)}
                                    min={0}
                                    max={100}
                                    disabled={!isEditable}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Dias de Tolerância</label>
                                  <Input
                                    type="number"
                                    {...register(`condicoes.${index}.dias_tolerancia`)}
                                    disabled={!isEditable}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Direito Devolução (dias)</label>
                                  <Input
                                    type="number"
                                    {...register(`condicoes.${index}.direito_devolucao_dias`)}
                                    disabled={!isEditable}
                                  />
                                </div>
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
                    <p>Nenhuma condição adicionada.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 6: ENTREGA */}
          <TabsContent value="entrega" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações de Entrega</CardTitle>
                <CardDescription>Transportadora, rastreamento e documentação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Transportadora */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Transportadora</label>
                    <Input
                      {...register('transportadora')}
                      placeholder="Nome da transportadora"
                      disabled={!isEditable}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Código de Rastreamento</label>
                    <Input
                      {...register('codigo_rastreamento')}
                      placeholder="Número de rastreamento"
                      disabled={!isEditable}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prazo de Trânsito (dias)</label>
                    <Input
                      type="number"
                      {...register('prazo_transito_dias')}
                      disabled={!isEditable}
                    />
                  </div>
                </div>

                {/* Documentação */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Número da NF Esperada</label>
                  <Input
                    {...register('numero_nf_esperada')}
                    placeholder="Número da Nota Fiscal"
                    disabled={!isEditable}
                  />
                </div>

                {/* Upload do Contrato */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Documento do Contrato (PDF)</label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer transition">
                    <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para fazer upload do PDF</p>
                    <Input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      disabled={!isEditable}
                    />
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Observações de Entrega</label>
                  <Textarea
                    {...register('observacoes_entrega')}
                    placeholder="Instruções especiais, pontos de referência, contacto local, etc."
                    rows={4}
                    disabled={!isEditable}
                  />
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

export default ContratoVendaForm;
