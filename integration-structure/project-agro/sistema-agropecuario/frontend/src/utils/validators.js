/**
 * Validadores para documentos brasileiros
 */
/**
 * Valida CPF (11 dígitos)
 */
export const validarCPF = (cpf) => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11)
        return false;
    if (/^(\d)\1{10}$/.test(cleaned))
        return false; // Todos dígitos iguais
    let soma = 0;
    let resto;
    // Validar primeiro dígito verificador
    for (let i = 1; i <= 9; i++) {
        soma += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11)
        resto = 0;
    if (resto !== parseInt(cleaned.substring(9, 10)))
        return false;
    // Validar segundo dígito verificador
    soma = 0;
    for (let i = 1; i <= 10; i++) {
        soma += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11)
        resto = 0;
    if (resto !== parseInt(cleaned.substring(10, 11)))
        return false;
    return true;
};
/**
 * Valida CNPJ (14 dígitos)
 */
export const validarCNPJ = (cnpj) => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14)
        return false;
    if (/^(\d)\1{13}$/.test(cleaned))
        return false; // Todos dígitos iguais
    let tamanho = cleaned.length - 2;
    let numeros = cleaned.substring(0, tamanho);
    const digitos = cleaned.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    // Validar primeiro dígito verificador
    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2)
            pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0)))
        return false;
    // Validar segundo dígito verificador
    tamanho = tamanho + 1;
    numeros = cleaned.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
        soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
        if (pos < 2)
            pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1)))
        return false;
    return true;
};
/**
 * Valida CPF ou CNPJ automaticamente
 */
export const validarCPFouCNPJ = (documento) => {
    const cleaned = documento.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return validarCPF(cleaned);
    }
    else if (cleaned.length === 14) {
        return validarCNPJ(cleaned);
    }
    return false;
};
/**
 * Aplica máscara de CPF: 000.000.000-00
 */
export const mascaraCPF = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};
/**
 * Aplica máscara de CNPJ: 00.000.000/0000-00
 */
export const mascaraCNPJ = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
};
/**
 * Aplica máscara de CPF ou CNPJ automaticamente
 */
export const mascaraCPFouCNPJ = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
        return mascaraCPF(value);
    }
    else {
        return mascaraCNPJ(value);
    }
};
/**
 * Aplica máscara de telefone: (00) 0000-0000 ou (00) 00000-0000
 */
export const mascaraTelefone = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(\d{4})-(\d)(\d{4})/, '$1$2-$3')
        .replace(/(-\d{4})\d+?$/, '$1');
};
/**
 * Aplica máscara de CEP: 00000-000
 */
export const mascaraCEP = (value) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{3})\d+?$/, '$1');
};
