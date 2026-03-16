// Constantes do Agro-link
export const TIPO_AREA_CHOICES = [
    { value: 'propria', label: 'Própria' },
    { value: 'arrendada', label: 'Arrendada' }
];
export const STATUS_SAFRA_CHOICES = [
    { value: 'planejada', label: 'Planejada' },
    { value: 'plantada', label: 'Plantada' },
    { value: 'crescimento', label: 'Crescimento' },
    { value: 'colheita', label: 'Colheita' },
    { value: 'finalizada', label: 'Finalizada' }
];
export const STATUS_GERAL_CHOICES = [
    { value: 'ativo', label: 'Ativo' },
    { value: 'inativo', label: 'Inativo' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'aprovado', label: 'Aprovado' },
    { value: 'reprovado', label: 'Reprovado' },
    { value: 'cancelado', label: 'Cancelado' },
    { value: 'finalizado', label: 'Finalizado' }
];
export const TIPO_PESSOA_CHOICES = [
    { value: 'PF', label: 'Pessoa Física' },
    { value: 'PJ', label: 'Pessoa Jurídica' }
];
export const TIPO_OPERACAO_AGRICOLA_CHOICES = [
    { value: 'plantio', label: 'Plantio' },
    { value: 'adubacao', label: 'Adubação' },
    { value: 'pulverizacao', label: 'Pulverização' },
    { value: 'colheita', label: 'Colheita' },
    { value: 'preparacao_solo', label: 'Preparação do Solo' },
    { value: 'irrigacao', label: 'Irrigação' },
    { value: 'outros', label: 'Outros' }
];
export const CATEGORIA_INSUMO_CHOICES = [
    { value: 'sementes', label: 'Sementes' },
    { value: 'fertilizantes', label: 'Fertilizantes' },
    { value: 'defensivos', label: 'Defensivos Agrícolas' },
    { value: 'maquinas', label: 'Peças de Máquinas' },
    { value: 'combustivel', label: 'Combustível' },
    { value: 'outros', label: 'Outros' }
];
export const UNIDADE_MEDIDA_CHOICES = [
    { value: 'kg', label: 'Quilograma (kg)' },
    { value: 'litros', label: 'Litros (L)' },
    { value: 'unidades', label: 'Unidades' },
    { value: 'sacas', label: 'Sacas' },
    { value: 'metros', label: 'Metros' },
    { value: 'hectares', label: 'Hectares' }
];
export const TIPO_MAQUINA_CHOICES = [
    { value: 'trator', label: 'Trator' },
    { value: 'colheitadeira', label: 'Colheitadeira' },
    { value: 'pulverizador', label: 'Pulverizador' },
    { value: 'plantadeira', label: 'Plantadeira' },
    { value: 'outros', label: 'Outros' }
];
export const PROPULSAO_MAQUINA_CHOICES = [
    { value: 'autopropelida', label: 'Autopropelida' },
    { value: 'estacionaria', label: 'Estacionária' }
];
export const TIPO_MANUTENCAO_CHOICES = [
    { value: 'preventiva', label: 'Preventiva' },
    { value: 'corretiva', label: 'Corretiva' },
    { value: 'emergencial', label: 'Emergencial' }
];
export const TIPO_MOVIMENTACAO_CHOICES = [
    { value: 'entrada', label: 'Entrada' },
    { value: 'saida', label: 'Saída' }
];
export const FORMA_PAGAMENTO_CHOICES = [
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'cartao_credito', label: 'Cartão de Crédito' },
    { value: 'cartao_debito', label: 'Cartão de Débito' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'transferencia', label: 'Transferência' },
    { value: 'boleto', label: 'Boleto' }
];
export const TIPO_LANCAMENTO_CHOICES = [
    { value: 'receita', label: 'Receita' },
    { value: 'despesa', label: 'Despesa' }
];
export const TIPO_FINANCIAMENTO_CHOICES = [
    { value: 'custeio', label: 'Custeio' },
    { value: 'investimento', label: 'Investimento' },
    { value: 'comercializacao', label: 'Comercialização' }
];
export const STATUS_NFE_CHOICES = [
    { value: 'autorizada', label: 'Autorizada' },
    { value: 'cancelada', label: 'Cancelada' },
    { value: 'denegada', label: 'Denegada' },
    { value: 'inutilizada', label: 'Inutilizada' }
];
export const TIPO_MANIFESTACAO_CHOICES = [
    { value: 'ciencia', label: 'Ciência da Operação' },
    { value: 'confirmacao', label: 'Confirmação da Operação' },
    { value: 'desconhecimento', label: 'Desconhecimento da Operação' },
    { value: 'nao_realizada', label: 'Operação não Realizada' }
];
// Estados brasileiros
export const ESTADOS_BRASILEIROS = [
    { value: 'AC', label: 'Acre' },
    { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' },
    { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' },
    { value: 'MA', label: 'Maranhão' },
    { value: 'MT', label: 'Mato Grosso' },
    { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PA', label: 'Pará' },
    { value: 'PB', label: 'Paraíba' },
    { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' },
    { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'RN', label: 'Rio Grande do Norte' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'RO', label: 'Rondônia' },
    { value: 'RR', label: 'Roraima' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' },
    { value: 'SE', label: 'Sergipe' },
    { value: 'TO', label: 'Tocantins' }
];
// Culturas comuns
export const CULTURAS_CHOICES = [
    { value: 'soja', label: 'Soja' },
    { value: 'milho', label: 'Milho' },
    { value: 'algodao', label: 'Algodão' },
    { value: 'cafe', label: 'Café' },
    { value: 'cana', label: 'Cana-de-açúcar' },
    { value: 'trigo', label: 'Trigo' },
    { value: 'arroz', label: 'Arroz' },
    { value: 'feijao', label: 'Feijão' },
    { value: 'outros', label: 'Outros' }
];
