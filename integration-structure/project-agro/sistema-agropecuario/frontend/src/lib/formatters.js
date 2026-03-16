// ========================================
// FORMATADORES E CONVERSORES DE DADOS
// ========================================
/**
 * Formata um número como moeda em BRL
 */
export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}
/**
 * Formata um CPF (apenas dígitos para XXX.XXX.XXX-XX)
 */
export function formatCPF(value) {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0)
        return '';
    if (digits.length <= 3)
        return digits;
    if (digits.length <= 6)
        return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9)
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}
/**
 * Formata um CNPJ (apenas dígitos para XX.XXX.XXX/XXXX-XX)
 */
export function formatCNPJ(value) {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0)
        return '';
    if (digits.length <= 2)
        return digits;
    if (digits.length <= 5)
        return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8)
        return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}
/**
 * Formata telefone (apenas dígitos para (XX) XXXXX-XXXX ou (XX) XXXX-XXXX)
 */
export function formatPhone(value) {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0)
        return '';
    if (digits.length <= 2)
        return `(${digits}`;
    if (digits.length <= 7)
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length === 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}
/**
 * Remove formatação de valores monetários
 */
export function parseMoneyValue(value) {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(cleaned) || 0;
}
/**
 * Valida CPF estruturalmente (verifica dígitos verificadores)
 */
export function isValidCPF(cpf) {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11)
        return false;
    if (/^(\d)\1{10}$/.test(digits))
        return false; // Verifica se todos os dígitos são iguais
    let sum = 0;
    let remainder;
    // Primeiro dígito verificador
    for (let i = 1; i <= 9; i++) {
        sum += parseInt(digits.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11)
        remainder = 0;
    if (remainder !== parseInt(digits.substring(9, 10)))
        return false;
    // Segundo dígito verificador
    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(digits.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11)
        remainder = 0;
    if (remainder !== parseInt(digits.substring(10, 11)))
        return false;
    return true;
}
/**
 * Valida CNPJ estruturalmente (verifica dígitos verificadores)
 */
export function isValidCNPJ(cnpj) {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14)
        return false;
    if (/^(\d)\1{13}$/.test(digits))
        return false; // Verifica se todos os dígitos são iguais
    let sum = 0;
    let remainder;
    const multiplier = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    // Primeiro dígito verificador
    for (let i = 0; i < 12; i++) {
        sum += parseInt(digits[i]) * multiplier[i];
    }
    remainder = sum % 11;
    remainder = remainder < 2 ? 0 : 11 - remainder;
    if (remainder !== parseInt(digits[12]))
        return false;
    // Segundo dígito verificador
    sum = 0;
    const multiplier2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for (let i = 0; i < 13; i++) {
        sum += parseInt(digits[i]) * multiplier2[i];
    }
    remainder = sum % 11;
    remainder = remainder < 2 ? 0 : 11 - remainder;
    if (remainder !== parseInt(digits[13]))
        return false;
    return true;
}
/**
 * Formata uma data para o padrão brasileiro (DD/MM/YYYY)
 */
export function formatDateBR(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}
/**
 * Converte data no formato YYYY-MM-DD para objeto Date
 */
export function parseDate(date) {
    return new Date(date + 'T00:00:00');
}
/**
 * Calcula diferença em dias entre duas datas
 */
export function calcularDiasDiferenca(dataInicio, dataFim) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const diferenca = fim.getTime() - inicio.getTime();
    return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
}
/**
 * Capitaliza a primeira letra de uma string
 */
export function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
/**
 * Converte enum para label legível
 */
export function enumToLabel(value) {
    return value
        .split('_')
        .map((word) => capitalize(word))
        .join(' ');
}
/**
 * Trunca texto com elipses se exceder comprimento máximo
 */
export function truncateText(text, maxLength = 50) {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength) + '...';
}
/**
 * Remove espaços em branco extras
 */
export function cleanWhitespace(text) {
    return text.replace(/\s+/g, ' ').trim();
}
/**
 * Gera ID único simples (não criptográfico)
 */
export function generateSimpleId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
