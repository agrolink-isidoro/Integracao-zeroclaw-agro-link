// ========================================
// TIPOS DO MÓDULO AGRICULTURA
// ========================================
// ========================================
// CONSTANTES E HELPERS
// ========================================
export const TIPO_CULTURA_CHOICES = [
    { value: 'graos', label: 'Grãos' },
    { value: 'hortalicas', label: 'Hortaliças' },
    { value: 'fruticultura', label: 'Fruticultura' },
    { value: 'outros', label: 'Outros' },
];
export const UNIDADE_PRODUCAO_CHOICES = [
    { value: 'saca_60kg', label: 'Saca de 60 kg (grãos)', suffix: 'sc' },
    { value: 'tonelada', label: 'Tonelada (t)', suffix: 't' },
    { value: 'kg', label: 'Quilograma (kg)', suffix: 'kg' },
    { value: 'caixa', label: 'Caixa / Unidade', suffix: 'cx' },
];
export const STATUS_PLANTIO_CHOICES = [
    { value: 'planejado', label: 'Planejado', color: 'secondary' },
    { value: 'em_andamento', label: 'Em Andamento', color: 'primary' },
    { value: 'colhido', label: 'Colhido', color: 'success' },
    { value: 'perdido', label: 'Perdido', color: 'danger' },
];
export const STATUS_COLHEITA_CHOICES = [
    { value: 'colhida', label: 'Colhida', color: 'warning' },
    { value: 'armazenada', label: 'Armazenada', color: 'info' },
    { value: 'comercializada', label: 'Comercializada', color: 'primary' },
    { value: 'vendida', label: 'Vendida', color: 'success' },
];
export const TIPO_MANEJO_CHOICES = [
    { value: 'poda', label: 'Poda', icon: 'scissors' },
    { value: 'adubacao', label: 'Adubação', icon: 'droplet-fill' },
    { value: 'irrigacao', label: 'Irrigação', icon: 'droplet' },
    { value: 'controle_pragas', label: 'Controle de Pragas', icon: 'bug' },
    { value: 'outro', label: 'Outro', icon: 'gear' },
];
export const STATUS_ORDEM_SERVICO_CHOICES = [
    { value: 'pendente', label: 'Pendente', color: 'secondary' },
    { value: 'aprovada', label: 'Aprovada', color: 'info' },
    { value: 'ativa', label: 'Ativa', color: 'primary' },
    { value: 'finalizada', label: 'Finalizada', color: 'success' },
];
// Helper para obter cor do badge baseado no status
export const getStatusColor = (status, choices) => {
    const choice = choices.find(c => c.value === status);
    return choice?.color || 'secondary';
};
// Helper para obter label do status
export const getStatusLabel = (status, choices) => {
    const choice = choices.find(c => c.value === status);
    return choice?.label || status;
};
