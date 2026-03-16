// ========================================
// SCHEMAS DE VALIDAÇÃO - CONTRATO FINANCEIRO
// ========================================
import * as yup from 'yup';
// ============ Schema para Beneficiário ============
export const schemaDadosBeneficiario = yup.object().shape({
    tipo_beneficiario: yup.string()
        .oneOf(['pessoa_fisica', 'pessoa_juridica', 'ambas'])
        .required('Tipo de beneficiário é obrigatório'),
    cpf_beneficiario: yup.string()
        .optional()
        .when('tipo_beneficiario', {
        is: (val) => val === 'pessoa_fisica' || val === 'ambas',
        then: (_) => yup.string().required('CPF é obrigatório').matches(/^\d{3}\.\d{3}\.\d{3}\-\d{2}$/, 'CPF inválido'),
        otherwise: (_) => yup.string().optional(),
    }),
    cnpj_beneficiario: yup.string()
        .optional()
        .when('tipo_beneficiario', {
        is: (val) => val === 'pessoa_juridica' || val === 'ambas',
        then: (_) => yup.string().required('CNPJ é obrigatório').matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}$/, 'CNPJ inválido'),
        otherwise: (_) => yup.string().optional(),
    }),
    nome_beneficiario: yup.string()
        .required('Nome do beneficiário é obrigatório')
        .min(5, 'Mínimo 5 caracteres'),
    data_nascimento: yup.string()
        .optional()
        .when('tipo_beneficiario', {
        is: 'pessoa_fisica',
        then: (schema) => schema.required('Data de nascimento é obrigatória'),
        otherwise: (schema) => schema.optional(),
    }),
    profissao: yup.string().optional(),
    endereco_completo: yup.string()
        .required('Endereço é obrigatório')
        .min(10, 'Endereço incompleto'),
    telefone: yup.string()
        .required('Telefone é obrigatório')
        .min(10, 'Telefone inválido'),
    email: yup.string()
        .required('Email é obrigatório')
        .email('Email inválido'),
    renda_mensal_estimada: yup.number().optional().positive(),
    area_propriedade_hectares: yup.number().optional().positive(),
});
// ============ Schema para Consórcio ============
export const schemaDadosConsorcio = yup.object().shape({
    bem_consortiado: yup.string()
        .required('Bem consortiado é obrigatório')
        .min(5),
    categoria_bem: yup.string()
        .oneOf(['mecanizacao', 'transporte', 'irrigacao', 'construcao', 'outro'])
        .required('Categoria do bem é obrigatória'),
    numero_cotas: yup.number()
        .required('Número de cotas é obrigatório')
        .positive()
        .integer(),
    valor_cota: yup.number()
        .required('Valor da cota é obrigatório')
        .positive('Valor deve ser maior que 0'),
    valor_total_consorcio: yup.number().optional(),
    numero_meses: yup.number()
        .required('Número de meses é obrigatório')
        .positive()
        .min(12, 'Mínimo 12 meses')
        .max(180, 'Máximo 180 meses'),
    valor_mensalidade: yup.number()
        .required('Valor da mensalidade é obrigatório')
        .positive(),
    taxa_administracao_percentual: yup.number()
        .required('Taxa de administração é obrigatória')
        .min(0)
        .max(5, 'Taxa máxima é 5%'),
    seguro_obrigatorio: yup.boolean().required(),
    valor_seguro_mensal: yup.number()
        .optional()
        .when('seguro_obrigatorio', {
        is: true,
        then: (schema) => schema.required('Valor do seguro é obrigatório').positive(),
        otherwise: (schema) => schema.optional(),
    }),
    fundo_rateio_percentual: yup.number()
        .required('Fundo de rateio é obrigatório')
        .min(0)
        .max(10),
    taxa_juros_atraso: yup.number()
        .required('Taxa de juros de atraso é obrigatória')
        .positive(),
    numero_sorteios_anuais: yup.number()
        .required('Sorteios anuais é obrigatório')
        .positive()
        .integer(),
    data_primeiro_sorteio: yup.string().required('Data do primeiro sorteio é obrigatória'),
    ordem_consorcio: yup.number()
        .required('Ordem no consórcio é obrigatória')
        .positive()
        .integer(),
    ja_foi_sorteado: yup.boolean().required(),
    data_recebimento_bem: yup.string().optional(),
    condicoes_inadimplencia: yup.string().optional().min(10),
});
// ============ Schema para Seguro ============
export const schemaDadosSeguro = yup.object().shape({
    tipo_seguro: yup.string()
        .oneOf(['SEGURO_SAFRA', 'SEGURO_RESPONSABILIDADE_CIVIL', 'SEGURO_EQUIPAMENTOS', 'SEGURO_VIDA', 'SEGURO_INCENDIO', 'OUTRO'])
        .required('Tipo de seguro é obrigatório'),
    objeto_segurado: yup.string()
        .required('Objeto segurado é obrigatório')
        .min(5),
    area_segurada_hectares: yup.number()
        .optional()
        .when('tipo_seguro', {
        is: 'SEGURO_SAFRA',
        then: (schema) => schema.required('Área é obrigatória para seguro safra').positive(),
        otherwise: (schema) => schema.optional(),
    }),
    valor_cobertura: yup.number()
        .required('Valor de cobertura é obrigatório')
        .positive('Valor deve ser maior que 0'),
    valor_premio_mensal: yup.number()
        .required('Valor do prêmio mensal é obrigatório')
        .positive(),
    valor_fracionado: yup.number().optional().positive(),
    numero_parcelas_premio: yup.number()
        .required('Número de parcelas é obrigatório')
        .positive()
        .integer(),
    data_vencimento_apolicе: yup.string().required('Data de vencimento é obrigatória'),
    numero_apolicе: yup.string()
        .required('Número da apólice é obrigatório')
        .min(5),
    franquia_percentual: yup.number()
        .required('Franquia percentual é obrigatória')
        .min(0)
        .max(100),
    franquia_minima: yup.number()
        .required('Franquia mínima é obrigatória')
        .positive(),
    indenizacoes_previas: yup.string().optional(),
    cobertura_adicional_1: yup.string().optional(),
    cobertura_adicional_2: yup.string().optional(),
    telefone_sinistro_24h: yup.string()
        .optional()
        .min(10, 'Telefone inválido'),
    documentos_necessarios: yup.string().optional(),
});
// ============ Schema para Aplicação Financeira ============
export const schemaDadosAplicacaoFinanceira = yup.object().shape({
    tipo_aplicacao: yup.string()
        .oneOf(['POUPANCA', 'CDB', 'LCI', 'LCA', 'CRI', 'CRA', 'TESOURO_DIRETO', 'FUNDO_RENDA_FIXA', 'FUNDO_MULTIMERCADO', 'OUTRO'])
        .required('Tipo de aplicação é obrigatório'),
    instituicao_emissora: yup.string()
        .required('Instituição emissora é obrigatória')
        .min(3),
    valor_investido: yup.number()
        .required('Valor investido é obrigatório')
        .positive('Valor deve ser maior que 0'),
    taxa_remuneracao_anual: yup.number()
        .required('Taxa de remuneração anual é obrigatória')
        .positive(),
    taxa_remuneracao_tipo: yup.string()
        .oneOf(['PREFIXADA', 'POSPIXADA', 'FLUTUANTE'])
        .required('Tipo de taxa é obrigatório'),
    indice_correcao: yup.string()
        .oneOf(['SELIC', 'CDI', 'IPCA', 'IGPM', 'NENHUM'])
        .required('Índice de correção é obrigatório'),
    percentual_indice: yup.number()
        .optional()
        .when('indice_correcao', {
        is: (val) => val !== 'NENHUM',
        then: (_) => yup.number().required('Percentual do índice é obrigatório').positive().max(100),
        otherwise: (_) => yup.number().optional(),
    }),
    data_resgate_prevista: yup.string().required('Data de resgate prevista é obrigatória'),
    prazo_minimo_dias: yup.number()
        .required('Prazo mínimo é obrigatório')
        .positive()
        .integer(),
    carencia_dias: yup.number()
        .required('Carência é obrigatória')
        .min(0)
        .integer(),
    valor_minimo_investimento: yup.number()
        .required('Valor mínimo de investimento é obrigatório')
        .positive(),
    valor_minimo_resgate: yup.number()
        .required('Valor mínimo de resgate é obrigatório')
        .positive(),
    liquido_resgate_parcial: yup.boolean().required(),
    liquidacao_automatica: yup.boolean().required(),
    imposto_renda_aliquota: yup.number()
        .required('Alíquota de IR é obrigatória')
        .min(0)
        .max(100),
    possui_garantia_fgc: yup.boolean().required(),
    limite_fgc: yup.number()
        .optional()
        .when('possui_garantia_fgc', {
        is: true,
        then: (schema) => schema.required('Limite FGC é obrigatório').positive(),
        otherwise: (schema) => schema.optional(),
    }),
    rentabilidade_acumulada: yup.number().optional(),
    data_proximo_pagamento_juros: yup.string().optional(),
    observacoes_investimento: yup.string().optional(),
});
// ============ Schema para Condição Financeira ============
export const schemaCondicaoFinanceira = yup.object().shape({
    id: yup.string().optional(),
    tipo_condicao: yup.string()
        .oneOf(['pagamento', 'rescisao', 'penalidade', 'outras'])
        .required('Tipo é obrigatório'),
    descricao: yup.string()
        .required('Descrição é obrigatória')
        .min(10),
    valor_referencia: yup.number().optional().positive(),
    percentual_referencia: yup.number().optional().min(0).max(100),
    prazo_dias: yup.number().optional().positive(),
    obrigatoria: yup.boolean().required(),
    forma_pagamento: yup.string()
        .oneOf(['BOLETO', 'DEBITO_AUTOMATICO', 'TRANSFERENCIA', 'CARTAO_CREDITO', 'DINHEIRO', 'CHEQUE'])
        .required('Forma de pagamento é obrigatória'),
    banco_agencia_cc: yup.string().optional(),
    taxa_atraso_percentual: yup.number().optional().min(0),
    juros_atraso_percentual: yup.number().optional().min(0),
    condicoes_rescisao: yup.string().optional(),
    penalidade_resgate_antecipado: yup.string().optional(),
    documentos_necessarios: yup.string().optional(),
});
// ============ Schema Principal Financeiro ============
export const schemaContratoFinanceiro = yup.object().shape({
    id: yup.number().optional(),
    // Dados Gerais
    numero_contrato: yup.string()
        .required('Número do contrato é obrigatório')
        .matches(/^[A-Z0-9\-]+$/, 'Formato inválido'),
    titulo: yup.string()
        .required('Título é obrigatório')
        .min(5)
        .max(200),
    tipo_produto_financeiro: yup.string()
        .oneOf(['CONSORCIO', 'SEGURO', 'APLICACAO_FINANCEIRA'])
        .required('Tipo de produto é obrigatório'),
    status: yup.string()
        .oneOf(['rascunho', 'em_analise', 'aprovado', 'em_vigencia', 'aguardando_resgate', 'finalizado', 'cancelado'])
        .required('Status é obrigatório'),
    valor_total: yup.number()
        .required('Valor total é obrigatório')
        .positive(),
    valor_entrada: yup.number().optional().positive(),
    // Beneficiário
    beneficiario: schemaDadosBeneficiario.required('Dados do beneficiário são obrigatórios'),
    // Instituição
    instituicao_financeira_id: yup.number().required('Instituição é obrigatória'),
    instituicao_financeira_nome: yup.string().required(),
    // Datas
    data_assinatura: yup.string().required('Data de assinatura é obrigatória'),
    data_inicio_vigencia: yup.string().required('Data de início é obrigatória'),
    data_fim_vigencia: yup.string()
        .required('Data de fim é obrigatória')
        .test('data-fim-maior', 'Data de fim deve ser após início', function (value) {
        const { data_inicio_vigencia } = this.parent;
        if (!data_inicio_vigencia || !value)
            return true;
        return new Date(value) > new Date(data_inicio_vigencia);
    }),
    // Dados Específicos (apenas 1 preenchido)
    dados_consorcio: yup.object()
        .optional()
        .when('tipo_produto_financeiro', {
        is: 'CONSORCIO',
        then: (_) => schemaDadosConsorcio.required('Dados do consórcio são obrigatórios'),
        otherwise: (_) => yup.object().optional(),
    }),
    dados_seguro: yup.object()
        .optional()
        .when('tipo_produto_financeiro', {
        is: 'SEGURO',
        then: (_) => schemaDadosSeguro.required('Dados do seguro são obrigatórios'),
        otherwise: (_) => yup.object().optional(),
    }),
    dados_aplicacao_financeira: yup.object()
        .optional()
        .when('tipo_produto_financeiro', {
        is: 'APLICACAO_FINANCEIRA',
        then: (_) => schemaDadosAplicacaoFinanceira.required('Dados da aplicação são obrigatórios'),
        otherwise: (_) => yup.object().optional(),
    }),
    // Condições
    condicoes: yup.array()
        .of(schemaCondicaoFinanceira)
        .optional(),
    // Responsável
    responsavel_vendedor: yup.string().optional().min(3),
    telefone_vendedor: yup.string().optional().min(10),
    // Documentação
    documento_contrato: yup.mixed().optional(),
    url_documento: yup.string().optional().url(),
    documento_proposta: yup.mixed().optional(),
    documento_identidade: yup.mixed().optional(),
    documento_cpf_cnpj: yup.mixed().optional(),
    comprovante_renda: yup.mixed().optional(),
    comprovante_endereco: yup.mixed().optional(),
    documentos_adicionais: yup.array().optional(),
    observacoes_documentacao: yup.string().optional(),
    // Observações
    observacoes_gerais: yup.string().optional(),
    // Controle
    criado_em: yup.string().optional(),
    atualizado_em: yup.string().optional(),
    criado_por: yup.number().optional(),
    assinado_em: yup.string().optional(),
});
