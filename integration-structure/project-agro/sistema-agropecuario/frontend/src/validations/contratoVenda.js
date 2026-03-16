// ========================================
// SCHEMAS DE VALIDAÇÃO - CONTRATO DE VENDA
// ========================================
import * as yup from 'yup';
// ============ Schema para Item Venda ============
export const schemaItemVenda = yup.object().shape({
    id: yup.string().optional(),
    descricao_produto: yup.string()
        .required('Descrição do produto é obrigatória')
        .min(5, 'Mínimo 5 caracteres'),
    tipo_produto: yup.string()
        .oneOf(['commodity', 'produto_processado', 'servico', 'maquina', 'outro'])
        .required('Tipo de produto é obrigatório'),
    categoria_produto: yup.string()
        .oneOf(['graos', 'hortifruti', 'proteinas', 'polpas', 'servicos', 'outros'])
        .required('Categoria é obrigatória'),
    quantidade: yup.number()
        .required('Quantidade é obrigatória')
        .positive('Quantidade deve ser maior que 0')
        .min(1),
    unidade: yup.string()
        .oneOf(['kg', 'saca', 'tonelada', 'L', 'un', 'bushel', 'alqueire'])
        .required('Unidade é obrigatória'),
    valor_unitario: yup.number()
        .required('Valor unitário é obrigatório')
        .positive('Valor deve ser maior que 0'),
    desconto_item_percentual: yup.number()
        .optional()
        .min(0, 'Desconto não pode ser negativo')
        .max(100, 'Desconto máximo é 100%'),
    desconto_item_valor: yup.number()
        .optional()
        .min(0, 'Desconto não pode ser negativo'),
    valor_total_item: yup.number()
        .required('Valor total é obrigatório')
        .positive(),
    lote_numero: yup.string().optional().min(3, 'Número de lote inválido'),
    data_colheita_producao: yup.string().optional(),
    certificacoes: yup.string().optional(),
    condicoes_entrega_item: yup.string().optional(),
    observacoes_item: yup.string().optional(),
});
// ============ Schema para Parcela ============
export const schemaParecelaVenda = yup.object().shape({
    numero_parcela: yup.number().required().positive(),
    data_vencimento: yup.string().required('Data de vencimento é obrigatória'),
    valor: yup.number().required().positive('Valor deve ser positivo'),
    status: yup.string()
        .optional()
        .oneOf(['pendente', 'paga', 'vencida', 'cancelada']),
});
// ============ Schema para Condição Venda ============
export const schemaCondicaoVenda = yup.object().shape({
    id: yup.string().optional(),
    tipo_condicao: yup.string()
        .oneOf(['pagamento', 'entrega', 'garantia', 'devolucao', 'cancelamento', 'multa', 'outras'])
        .required('Tipo de condição é obrigatório'),
    descricao: yup.string()
        .required('Descrição é obrigatória')
        .min(10, 'Mínimo 10 caracteres'),
    valor_referencia: yup.number().optional().positive(),
    percentual_referencia: yup.number().optional().min(0).max(100),
    prazo_dias: yup.number().optional().positive(),
    obrigatoria: yup.boolean().required(),
    observacoes: yup.string().optional(),
    juros_mensais: yup.number()
        .optional()
        .min(0, 'Juros não pode ser negativo')
        .max(3, 'Juros máximo é 3%'),
    multa_atraso_percentual: yup.number()
        .optional()
        .min(0)
        .max(100),
    multa_atraso_valor: yup.number().optional().positive(),
    dias_tolerancia: yup.number().optional().positive(),
    condicoes_cancelamento: yup.string().optional(),
    direito_devolucao_dias: yup.number()
        .optional()
        .positive('Dias de devolução deve ser positivo'),
    seguro_contratado: yup.boolean().optional(),
});
// ============ Schema para Dados Cliente ============
export const schemaDadosClienteVenda = yup.object().shape({
    cliente_id: yup.number().required('Cliente é obrigatório'),
    cliente_nome: yup.string().required(),
    cpf_cnpj: yup.string()
        .required('CPF/CNPJ é obrigatório')
        .test('cpf-cnpj-valido', 'CPF/CNPJ inválido', (value) => {
        if (!value)
            return false;
        const numeros = value.replace(/\D/g, '');
        return numeros.length === 11 || numeros.length === 14;
    }),
    tipo_pessoa: yup.string()
        .oneOf(['pf', 'pj'])
        .required('Tipo de pessoa é obrigatório'),
    representante_legal: yup.object().shape({
        nome: yup.string().required('Nome do representante é obrigatório'),
        cpf: yup.string()
            .required('CPF é obrigatório')
            .matches(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/, 'Formato de CPF inválido'),
        cargo: yup.string().required('Cargo é obrigatório'),
        telefone: yup.string().optional(),
        email: yup.string().optional().email('Email inválido'),
    }).optional(),
    telefone: yup.string().optional(),
    email: yup.string().optional().email('Email inválido'),
    endereco_entrega: yup.string()
        .required('Endereço de entrega é obrigatório')
        .min(10, 'Endereço incompleto'),
    historico_cliente: yup.object().shape({
        total_ja_comprado: yup.number().optional(),
        data_primeira_compra: yup.string().optional(),
        status_pagamento: yup.string()
            .optional()
            .oneOf(['em_dia', 'atrasado', 'vencido']),
    }).optional(),
});
// ============ Schema Principal Venda ============
export const schemaContratoVenda = yup.object().shape({
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
        .oneOf(['VENDA_DINHEIRO', 'VENDA_PARCELADA', 'VENDA_ANTECIPADA', 'VENDA_FUTURA', 'VENDA_SPOT', 'VENDA_BARTER'])
        .required('Tipo de operação é obrigatório'),
    categoria_venda: yup.string()
        .oneOf(['commodities', 'produtos_processados', 'servicos_agricolas', 'maquinas_usadas', 'outros'])
        .required('Categoria é obrigatória'),
    status: yup.string()
        .oneOf(['rascunho', 'em_negociacao', 'em_aprovacao', 'assinado', 'em_execucao', 'pronto_entrega', 'entregue', 'recebido', 'finalizado', 'cancelado'])
        .required('Status é obrigatório'),
    valor_total: yup.number()
        .required('Valor total é obrigatório')
        .positive('Valor deve ser maior que 0'),
    desconto_total: yup.number()
        .optional()
        .min(0, 'Desconto não pode ser negativo'),
    valor_final: yup.number()
        .optional()
        .positive('Valor final deve ser positivo'),
    // Cliente
    cliente: schemaDadosClienteVenda.required('Dados do cliente são obrigatórios'),
    // Datas
    data_emissao: yup.string()
        .required('Data de emissão é obrigatória'),
    data_inicio_producao: yup.string()
        .required('Data de início da produção é obrigatória'),
    data_entrega_prevista: yup.string()
        .required('Data de entrega prevista é obrigatória')
        .test('entrega-maior-producao', 'Data de entrega deve ser após início da produção', function (value) {
        const { data_inicio_producao } = this.parent;
        if (!data_inicio_producao || !value)
            return true;
        return new Date(value) >= new Date(data_inicio_producao);
    }),
    // Pagamento
    tipo_pagamento: yup.string()
        .oneOf(['A_VISTA', 'PARCELADO', 'CONTRA_ENTREGA', 'ANTECIPADO'])
        .required('Tipo de pagamento é obrigatório'),
    numero_parcelas: yup.number()
        .optional()
        .when('tipo_pagamento', {
        is: 'PARCELADO',
        then: (schema) => schema.required('Número de parcelas é obrigatório').positive().max(24),
        otherwise: (schema) => schema.optional(),
    }),
    periodicidade_parcelas: yup.string()
        .optional()
        .when('tipo_pagamento', {
        is: 'PARCELADO',
        then: (schema) => schema.required('Periodicidade é obrigatória'),
        otherwise: (schema) => schema.optional(),
    })
        .oneOf(['SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL']),
    // Itens (obrigatório ter pelo menos 1)
    itens: yup.array()
        .of(schemaItemVenda)
        .min(1, 'Adicione pelo menos um produto/serviço')
        .required('Itens são obrigatórios'),
    // Parcelas (se PARCELADO)
    parcelas: yup.array()
        .of(schemaParecelaVenda)
        .optional(),
    // Condições
    condicoes: yup.array()
        .of(schemaCondicaoVenda)
        .optional(),
    // Entrega
    transportadora: yup.string().optional(),
    codigo_rastreamento: yup.string().optional(),
    prazo_transito_dias: yup.number().optional().positive(),
    observacoes_entrega: yup.string().optional(),
    // Barter
    dados_barter: yup.object()
        .optional(),
    // Documentação
    documento_contrato: yup.mixed().optional(),
    url_documento: yup.string().optional().url(),
    numero_nf_esperada: yup.string().optional(),
    // Observações
    observacoes_gerais: yup.string().optional(),
    // Controle
    criado_em: yup.string().optional(),
    atualizado_em: yup.string().optional(),
    criado_por: yup.number().optional(),
    assinado_em: yup.string().optional(),
});
