export const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};
export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR');
};
export const formatArea = (area) => {
    return `${area.toFixed(2)} ha`;
};
export const formatStatus = (status) => {
    const statusMap = {
        'pending': 'Pendente',
        'in_progress': 'Em Andamento',
        'completed': 'Concluído',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
};
export const formatCPFCNPJ = (value) => {
    if (!value)
        return '';
    // Remove non-digits
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 11) {
        // CPF: 000.000.000-00
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    else if (cleaned.length === 14) {
        // CNPJ: 00.000.000/0000-00
        return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
};
export const formatPhone = (phone) => {
    if (!phone)
        return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
        // (00) 00000-0000
        return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    else if (cleaned.length === 10) {
        // (00) 0000-0000
        return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
};
