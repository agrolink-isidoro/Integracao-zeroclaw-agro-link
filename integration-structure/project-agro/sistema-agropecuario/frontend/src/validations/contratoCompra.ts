// ========================================
// SCHEMAS DE VALIDAÇÃO - CONTRATO DE COMPRA
// ========================================

import * as yup from 'yup';

// ============ Schema para Item ============

export const schemaItemCompra = yup.object().shape({
  id: yup.string().optional(),
  descricao_item: yup.string().required('Descrição do item é obrigatória').min(5, 'Mínimo 5 caracteres'),
  categoria_item: yup.string().oneOf(['insumo', 'maquina', 'servico', 'outro']).required('Categoria é obrigatória'),
  especificacoes_tecnicas: yup.string().optional(),
  quantidade: yup.number().required('Quantidade é obrigatória').positive('Quantidade deve ser maior que 0').min(1),
  unidade: yup.string().required('Unidade é obrigatória'),
  valor_unitario: yup.number().required('Valor unitário é obrigatório').positive('Valor deve ser maior que 0'),
  valor_total_item: yup.number().required('Valor total é obrigatório').positive('Deve ser positivo'),
  desconto_percentual: yup.number().optional().min(0).max(100),
  valor_com_desconto: yup.number().optional(),
  prazo_entrega_item: yup.string().optional(),
  observacoes_item: yup.string().optional(),
});

// ============ Schema para Condição ============

export const schemaCondicaoCompra = yup.object().shape({
  id: yup.string().optional(),
  tipo_condicao: yup.string()
    .oneOf(['pagamento', 'entrega', 'garantia', 'devolucao', 'multa', 'outras'])
    .required('Tipo de condição é obrigatório'),
  descricao: yup.string().required('Descrição é obrigatória').min(10),
  valor_referencia: yup.number().optional().positive('Deve ser positivo'),
  percentual_referencia: yup.number().optional().min(0).max(100),
  prazo_dias: yup.number().optional().positive('Deve ser positivo'),
  obrigatoria: yup.boolean().required(),
  observacoes: yup.string().optional(),
  garantia_produto_meses: yup.number().optional().positive(),
  responsavel_devolucao: yup.string()
    .optional()
    .oneOf(['fornecedor', 'comprador', 'ambos']),
});

// ============ Schema para Barter ============

export const schemaDadosBarter = yup.object().shape({
  fornecedor_origem_id: yup.number().required('Fornecedor de origem é obrigatório'),
  fornecedor_origem_nome: yup.string().required(),
  produto_fornecido_descricao: yup.string().required('Descrição do produto fornecido é obrigatória'),
  cliente_barter_id: yup.number().required('Cliente do barter é obrigatório'),
  cliente_barter_nome: yup.string().required(),
  produto_barter_descricao: yup.string().required('Descrição do produto de troca é obrigatória'),
  quantidade_barter: yup.number().required().positive(),
  unidade_barter: yup.string().required(),
  valor_produto_barter: yup.number().required().positive('Valor deve ser positivo'),
  data_entrega_barter: yup.string().required('Data de entrega é obrigatória'),
  taxa_ajuste_financeira: yup.number().required('Ajuste financeiro é obrigatório'),
  tipo_ajuste: yup.string()
    .oneOf(['SEM_AJUSTE', 'DINHEIRO_AGORA', 'DESCONTO_PROXIMA', 'CREDITO_FUTURO'])
    .required(),
  observacoes_barter: yup.string().optional(),
});

// ============ Schema Principal ============

export const schemaContratoCompra = yup.object().shape({
  id: yup.number().optional(),
  
  // Dados Gerais
  numero_contrato: yup.string()
    .required('Número do contrato é obrigatório')
    .matches(/^[A-Z0-9\-]+$/, 'Formato inválido'),
  titulo: yup.string()
    .required('Título é obrigatório')
    .min(5, 'Mínimo 5 caracteres')
    .max(200, 'Máximo 200 caracteres'),
  tipo_operacao: yup.string()
    .oneOf(['COMPRA_DINHEIRO', 'COMPRA_ANTECIPADO', 'COMPRA_BARTER'])
    .required('Tipo de operação é obrigatório'),
  categoria_compra: yup.string()
    .oneOf(['insumos', 'maquinas', 'sementes', 'defensivos', 'servicos_agricolas', 'outros'])
    .required('Categoria é obrigatória'),
  status: yup.string()
    .oneOf(['rascunho', 'em_negociacao', 'em_aprovacao', 'assinado', 'em_execucao', 'recebido', 'finalizado', 'cancelado', 'suspenso'])
    .required('Status é obrigatório'),
  valor_total: yup.number()
    .required('Valor total é obrigatório')
    .positive('Valor deve ser maior que 0'),
  
  // Fornecedor
  fornecedor_id: yup.number().required('Fornecedor é obrigatório'),
  fornecedor_nome: yup.string().required(),
  fornecedor_cnpj: yup.string()
    .required('CNPJ é obrigatório')
    .matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}$/, 'Formato de CNPJ inválido'),
  fornecedor_tipo_pessoa: yup.string().oneOf(['pj']).required(),
  representante_legal: yup.object().shape({
    nome: yup.string().required('Nome do representante é obrigatório'),
    cpf: yup.string()
      .required('CPF é obrigatório')
      .matches(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/, 'Formato de CPF inválido'),
    cargo: yup.string().required('Cargo é obrigatório'),
    telefone: yup.string().optional(),
    email: yup.string().optional().email('Email inválido'),
  }).optional(),
  telefone_fornecedor: yup.string().optional(),
  email_fornecedor: yup.string().optional().email('Email inválido'),
  endereco_completo: yup.string().optional().min(10),
  
  // Pagamento
  condicoes_pagamento: yup.string()
    .oneOf(['A_VISTA', '30_DIAS', '60_DIAS', '90_DIAS', 'PARCELADO_CUSTOMIZADO'])
    .required('Condição de pagamento é obrigatória'),
  numero_parcelas: yup.number()
    .optional()
    .positive('Deve ser positivo')
    .max(12, 'Máximo 12 parcelas'),
  
  // Datas
  data_emissao: yup.string().required('Data de emissão é obrigatória'),
  data_inicio: yup.string().required('Data de início é obrigatória'),
  data_fim: yup.string()
    .required('Data final é obrigatória')
    .test('data-fim-maior', 'Data final deve ser maior que data de início', function(value) {
      const { data_inicio } = this.parent;
      if (!data_inicio || !value) return true;
      return new Date(value) > new Date(data_inicio);
    }),
  prazo_execucao_dias: yup.number().optional().positive(),
  
  // Itens (obrigatório ter pelo menos 1)
  itens: yup.array()
    .of(schemaItemCompra)
    .min(1, 'Adicione pelo menos um item')
    .required('Itens são obrigatórios'),
  
  // Condições
  condicoes: yup.array()
    .of(schemaCondicaoCompra)
    .optional(),
  
  // Barter
  dados_barter: yup.object()
    .when('tipo_operacao', {
      is: 'COMPRA_BARTER',
      then: (_) => schemaDadosBarter.required('Dados do barter são obrigatórios para compra com barter'),
      otherwise: (_) => yup.object().optional(),
    }),
  
  // Entrega
  condicoes_frete: yup.string()
    .oneOf(['CIF', 'FOB', 'GRATIS', 'A_COMBINAR'])
    .required('Condição de frete é obrigatória'),
  
  // Documentação
  documento_contrato: yup.mixed().optional(),
  url_documento: yup.string().optional().url(),
  nota_fiscal_esperada: yup.boolean().optional(),
  
  // Observações
  observacoes_gerais: yup.string().optional(),
  
  // Controle
  criado_em: yup.string().optional(),
  atualizado_em: yup.string().optional(),
  criado_por: yup.number().optional(),
  assinado_em: yup.string().optional(),
});

// Exportar tipo inferido
export type ContratoCompraFormData = yup.InferType<typeof schemaContratoCompra>;
