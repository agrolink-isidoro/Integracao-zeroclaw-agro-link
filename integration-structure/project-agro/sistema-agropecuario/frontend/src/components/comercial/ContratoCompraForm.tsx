// ========================================
// CONTRATO DE COMPRA - COMPONENTE FORM
// ========================================

import React, { useState } from 'react';
import { useForm, Controller, FieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ContratoCompra, ItemCompra, CondicaoCompra } from '@/types/contratosSplit';
import { schemaContratoCompra } from '@/validations/contratoCompra';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Plus, Trash2, DollarSign, Calendar, FileUp } from 'lucide-react';
import { formatCPF, formatCNPJ, formatCurrency } from '@/lib/formatters';
import { calcularPrazoExecucao } from '@/lib/dateUtils';

interface ContratoCompraFormProps {
  initialData?: ContratoCompra;
  onSubmit: (data: ContratoCompra) => Promise<void>;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
}

export const ContratoCompraForm: React.FC<ContratoCompraFormProps> = ({
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
    reset,
  } = useForm<ContratoCompra>({
    resolver: yupResolver(schemaContratoCompra),
    defaultValues: initialData,
    mode: 'onChange',
  });

  const tipoOperacao = watch('tipo_operacao');
  const dataInicio = watch('data_inicio');
  const dataFim = watch('data_fim');
  const itens = watch('itens');
  const condicoesPagamento = watch('condicoes_pagamento');

  // Auto-calcular prazo
  React.useEffect(() => {
    if (dataInicio && dataFim) {
      const prazo = calcularPrazoExecucao(dataInicio, dataFim);
      setValue('prazo_execucao_dias', prazo);
    }
  }, [dataInicio, dataFim, setValue]);

  // Auto-calcular valores dos itens
  React.useEffect(() => {
    if (itens && itens.length > 0) {
      const total = itens.reduce((acc, item) => {
        const desconto = item.valor_unitario * item.quantidade * (item.desconto_percentual || 0) / 100;
        const comDesconto = item.valor_unitario * item.quantidade - desconto;
        return acc + comDesconto;
      }, 0);
      setValue('valor_total', Number(total.toFixed(2)));
    }
  }, [itens, setValue]);

  const handleFormSubmit = async (data: ContratoCompra) => {
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

  const isBarter = tipoOperacao === 'COMPRA_BARTER';
  const isParcelado = condicoesPagamento === 'PARCELADO_CUSTOMIZADO';
  const isEditable = mode !== 'view';

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Contrato de Compra</h1>
        <p className="text-muted-foreground">
          {mode === 'create' ? 'Criar novo contrato de compra' : `Editar contrato ${initialData?.numero_contrato}`}
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
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="fornecedor">Fornecedor</TabsTrigger>
            <TabsTrigger value="itens">Itens</TabsTrigger>
            <TabsTrigger value="condicoes">Condições</TabsTrigger>
            <TabsTrigger value="documentacao">Documentação</TabsTrigger>
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
                      placeholder="CMP-2026-001"
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
                      placeholder="Ex: Compra de Adubo NPK 20-05-20"
                      disabled={!isEditable}
                    />
                    {errors.titulo && (
                      <p className="text-sm text-red-500">{errors.titulo.message}</p>
                    )}
                  </div>
                </div>

                {/* Tipo de Operação */}
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
                            <SelectItem value="COMPRA_DINHEIRO">Compra à Vista</SelectItem>
                            <SelectItem value="COMPRA_ANTECIPADO">Compra com Antecipação</SelectItem>
                            <SelectItem value="COMPRA_BARTER">Compra com Barter</SelectItem>
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
                      name="categoria_compra"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="insumos">Insumos</SelectItem>
                            <SelectItem value="maquinas">Máquinas</SelectItem>
                            <SelectItem value="sementes">Sementes</SelectItem>
                            <SelectItem value="defensivos">Defensivos</SelectItem>
                            <SelectItem value="servicos_agricolas">Serviços Agrícolas</SelectItem>
                            <SelectItem value="outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.categoria_compra && (
                      <p className="text-sm text-red-500">{errors.categoria_compra.message}</p>
                    )}
                  </div>
                </div>

                {/* Status e Valor */}
                <div className="grid grid-cols-3 gap-4">
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
                            <SelectItem value="recebido">Recebido</SelectItem>
                            <SelectItem value="finalizado">Finalizado</SelectItem>
                            <SelectItem value="cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Valor Total *</label>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold">{formatCurrency(getValues('valor_total') || 0)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prazo (dias)</label>
                    <Input
                      type="number"
                      {...register('prazo_execucao_dias')}
                      readOnly
                      disabled
                      className="bg-muted"
                    />
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
                    <label className="text-sm font-medium">Data de Início *</label>
                    <Input
                      type="date"
                      {...register('data_inicio')}
                      disabled={!isEditable}
                    />
                    {errors.data_inicio && (
                      <p className="text-sm text-red-500">{errors.data_inicio.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data Final *</label>
                    <Input
                      type="date"
                      {...register('data_fim')}
                      disabled={!isEditable}
                    />
                    {errors.data_fim && (
                      <p className="text-sm text-red-500">{errors.data_fim.message}</p>
                    )}
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Observações Gerais</label>
                  <Textarea
                    {...register('observacoes_gerais')}
                    placeholder="Notas adicionais sobre o contrato..."
                    rows={3}
                    disabled={!isEditable}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 2: FORNECEDOR */}
          <TabsContent value="fornecedor" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados do Fornecedor</CardTitle>
                <CardDescription>Informações de contato e representante</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Fornecedor */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fornecedor *</label>
                    <Input
                      {...register('fornecedor_nome')}
                      placeholder="Nome do fornecedor"
                      disabled={!isEditable}
                    />
                    {errors.fornecedor_nome && (
                      <p className="text-sm text-red-500">{errors.fornecedor_nome.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">CNPJ *</label>
                    <Input
                      {...register('fornecedor_cnpj')}
                      placeholder="00.000.000/0000-00"
                      disabled={!isEditable}
                    />
                    {errors.fornecedor_cnpj && (
                      <p className="text-sm text-red-500">{errors.fornecedor_cnpj.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefone</label>
                    <Input
                      {...register('telefone_fornecedor')}
                      placeholder="(00) 00000-0000"
                      disabled={!isEditable}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    {...register('email_fornecedor')}
                    placeholder="contato@fornecedor.com"
                    disabled={!isEditable}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Endereço Completo</label>
                  <Textarea
                    {...register('endereco_completo')}
                    placeholder="Rua, número, complemento, bairro, cidade, estado, CEP"
                    rows={2}
                    disabled={!isEditable}
                  />
                </div>

                {/* Representante Legal */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold mb-4">Representante Legal</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome *</label>
                      <Input
                        {...register('representante_legal.nome')}
                        placeholder="Nome completo"
                        disabled={!isEditable}
                      />
                      {errors.representante_legal?.nome && (
                        <p className="text-sm text-red-500">{errors.representante_legal.nome.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">CPF *</label>
                      <Input
                        {...register('representante_legal.cpf')}
                        placeholder="000.000.000-00"
                        disabled={!isEditable}
                      />
                      {errors.representante_legal?.cpf && (
                        <p className="text-sm text-red-500">{errors.representante_legal.cpf.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cargo *</label>
                      <Input
                        {...register('representante_legal.cargo')}
                        placeholder="Ex: Gerente de Vendas"
                        disabled={!isEditable}
                      />
                      {errors.representante_legal?.cargo && (
                        <p className="text-sm text-red-500">{errors.representante_legal.cargo.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Condições de Pagamento */}
                <div className="border-t pt-6 space-y-4">
                  <h3 className="text-sm font-semibold">Condições de Pagamento</h3>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prazo de Pagamento *</label>
                    <Controller
                      name="condicoes_pagamento"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A_VISTA">À Vista</SelectItem>
                            <SelectItem value="30_DIAS">30 dias</SelectItem>
                            <SelectItem value="60_DIAS">60 dias</SelectItem>
                            <SelectItem value="90_DIAS">90 dias</SelectItem>
                            <SelectItem value="PARCELADO_CUSTOMIZADO">Parcelado Customizado</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {isParcelado && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Número de Parcelas (1-12) *</label>
                      <Input
                        type="number"
                        {...register('numero_parcelas')}
                        min={1}
                        max={12}
                        disabled={!isEditable}
                      />
                      {errors.numero_parcelas && (
                        <p className="text-sm text-red-500">{errors.numero_parcelas.message}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Frete */}
                <div className="border-t pt-6 space-y-2">
                  <label className="text-sm font-medium">Condição de Frete *</label>
                  <Controller
                    name="condicoes_frete"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CIF">CIF (Custo, Seguro e Frete Inclusos)</SelectItem>
                          <SelectItem value="FOB">FOB (Livre a Bordo)</SelectItem>
                          <SelectItem value="GRATIS">Frete Grátis</SelectItem>
                          <SelectItem value="A_COMBINAR">A Combinar</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 3: ITENS */}
          <TabsContent value="itens" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Itens da Compra</CardTitle>
                  <CardDescription>Produtos e serviços inclusos no contrato</CardDescription>
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
                          descricao_item: '',
                          categoria_item: 'insumo',
                          quantidade: 1,
                          unidade: 'kg',
                          valor_unitario: 0,
                          valor_total_item: 0,
                        } as ItemCompra,
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {itens && itens.length > 0 ? (
                  <FieldArray name="itens" control={control}>
                    {({ fields, append, remove }) => (
                      <div className="space-y-4">
                        {fields.map((field, index) => (
                          <Card key={field.id} className="p-4">
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Descrição *</label>
                                <Input
                                  {...register(`itens.${index}.descricao_item`)}
                                  placeholder="Ex: Adubo NPK 20-05-20"
                                  disabled={!isEditable}
                                />
                                {errors.itens?.[index]?.descricao_item && (
                                  <p className="text-sm text-red-500">
                                    {errors.itens[index]?.descricao_item?.message}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">Categoria *</label>
                                <Controller
                                  name={`itens.${index}.categoria_item`}
                                  control={control}
                                  render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange} disabled={!isEditable}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="insumo">Insumo</SelectItem>
                                        <SelectItem value="maquina">Máquina</SelectItem>
                                        <SelectItem value="servico">Serviço</SelectItem>
                                        <SelectItem value="outro">Outro</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">Especificações Técnicas</label>
                                <Input
                                  {...register(`itens.${index}.especificacoes_tecnicas`)}
                                  placeholder="Marca, modelo, composição..."
                                  disabled={!isEditable}
                                />
                              </div>
                            </div>

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
                                        <SelectItem value="L">Litro</SelectItem>
                                        <SelectItem value="un">Unidade</SelectItem>
                                        <SelectItem value="tonelada">Tonelada</SelectItem>
                                        <SelectItem value="metro">Metro</SelectItem>
                                        <SelectItem value="hora">Hora</SelectItem>
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
                                  {...register(`itens.${index}.desconto_percentual`)}
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
                                    (1 - (itens[index]?.desconto_percentual || 0) / 100)
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2 mb-4">
                              <label className="text-sm font-medium">Prazo de Entrega</label>
                              <Input
                                type="date"
                                {...register(`itens.${index}.prazo_entrega_item`)}
                                disabled={!isEditable}
                              />
                            </div>

                            <div className="space-y-2 mb-4">
                              <label className="text-sm font-medium">Observações</label>
                              <Textarea
                                {...register(`itens.${index}.observacoes_item`)}
                                placeholder="Notas específicas para este item"
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
                    <p>Nenhum item adicionado. Clique em "Adicionar Item" para começar.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 4: CONDIÇÕES */}
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
                      <label className="text-sm font-medium">Produto Fornecido *</label>
                      <Input
                        {...register('dados_barter.produto_fornecido_descricao')}
                        placeholder="Descrição do produto a ser fornecido"
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Produto em Troca *</label>
                      <Input
                        {...register('dados_barter.produto_barter_descricao')}
                        placeholder="Produto que você oferece"
                        disabled={!isEditable}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quantidade *</label>
                      <Input
                        type="number"
                        {...register('dados_barter.quantidade_barter')}
                        step="0.01"
                        disabled={!isEditable}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Valor do Produto *</label>
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ajuste Financeiro (R$)</label>
                      <Input
                        type="number"
                        {...register('dados_barter.taxa_ajuste_financeira')}
                        step="0.01"
                        placeholder="Positivo = crédito | Negativo = desconto"
                        disabled={!isEditable}
                      />
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
                              <SelectItem value="SEM_AJUSTE">Sem Ajuste</SelectItem>
                              <SelectItem value="DINHEIRO_AGORA">Dinheiro Agora</SelectItem>
                              <SelectItem value="DESCONTO_PROXIMA">Desconto na Próxima</SelectItem>
                              <SelectItem value="CREDITO_FUTURO">Crédito Futuro</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Observações do Barter</label>
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

            {/* Condições */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Condições do Contrato</CardTitle>
                  <CardDescription>Regras, garantias e penalidades</CardDescription>
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
                        } as CondicaoCompra,
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
                                  <label className="text-sm font-medium">Valor (R$)</label>
                                  <Input
                                    type="number"
                                    {...register(`condicoes.${index}.valor_referencia`)}
                                    step="0.01"
                                    disabled={!isEditable}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Percentual (%)</label>
                                  <Input
                                    type="number"
                                    {...register(`condicoes.${index}.percentual_referencia`)}
                                    min={0}
                                    max={100}
                                    disabled={!isEditable}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Prazo (dias)</label>
                                  <Input
                                    type="number"
                                    {...register(`condicoes.${index}.prazo_dias`)}
                                    disabled={!isEditable}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Garantia (meses)</label>
                                  <Input
                                    type="number"
                                    {...register(`condicoes.${index}.garantia_produto_meses`)}
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

          {/* ABA 5: DOCUMENTAÇÃO */}
          <TabsContent value="documentacao" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Documentação e Anexos</CardTitle>
                <CardDescription>Arquivos do contrato e informações adicionais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Documento do Contrato (PDF)</label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer transition">
                    <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Clique para fazer upload do PDF</p>
                    <Input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Checkbox id="nf_esperada" labelText="Esperado receber Nota Fiscal" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Observações sobre Documentação</label>
                  <Textarea
                    placeholder="Notas sobre documentos, assinantes, etc."
                    rows={3}
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

export default ContratoCompraForm;
