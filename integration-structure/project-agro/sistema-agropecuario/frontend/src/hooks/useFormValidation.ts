import { useState, useCallback } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

interface ValidationRules {
  [key: string]: ValidationRule;
}

interface ValidationErrors {
  [key: string]: string;
}

export function useFormValidation<T extends Record<string, unknown>>(
  rules: ValidationRules
) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = useCallback((name: string, value: any): string | null => {
    const rule = rules[name];
    if (!rule) return null;

    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return rule.message || 'Este campo é obrigatório';
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    // Min length validation
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return rule.message || `Mínimo de ${rule.minLength} caracteres`;
    }

    // Max length validation
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return rule.message || `Máximo de ${rule.maxLength} caracteres`;
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return rule.message || 'Formato inválido';
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }, [rules]);

  const validate = useCallback((data: T): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.keys(rules).forEach(fieldName => {
      const error = validateField(fieldName, data[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [rules, validateField]);

  const validateSingle = useCallback((name: string, value: unknown): boolean => {
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error || ''
    }));
    return !error;
  }, [validateField]);

  const setFieldTouched = useCallback((name: string) => {
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const getFieldError = useCallback((name: string): string | null => {
    return touched[name] ? errors[name] || null : null;
  }, [errors, touched]);

  return {
    errors,
    touched,
    validate,
    validateSingle,
    setFieldTouched,
    clearErrors,
    getFieldError,
    isValid: Object.keys(errors).length === 0
  };
}

// Validações específicas para o sistema
export const cpfCnpjValidation = (value: string): string | null => {
  if (!value) return null;

  const cleanValue = value.replace(/\D/g, '');

  if (cleanValue.length === 11) {
    // CPF validation
    if (!isValidCPF(cleanValue)) {
      return 'CPF inválido';
    }
  } else if (cleanValue.length === 14) {
    // CNPJ validation
    if (!isValidCNPJ(cleanValue)) {
      return 'CNPJ inválido';
    }
  } else {
    return 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos';
  }

  return null;
};

function isValidCPF(cpf: string): boolean {
  if (cpf.length !== 11) return false;

  // Check if all digits are the same
  if (/^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;

  return true;
}

function isValidCNPJ(cnpj: string): boolean {
  if (cnpj.length !== 14) return false;

  // Check if all digits are the same
  if (/^(\d)\1+$/.test(cnpj)) return false;

  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

export const emailValidation = (value: string): string | null => {
  if (!value) return null;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return 'Email inválido';
  }

  return null;
};

export const phoneValidation = (value: string): string | null => {
  if (!value) return null;

  const cleanPhone = value.replace(/\D/g, '');
  if (cleanPhone.length < 10 || cleanPhone.length > 11) {
    return 'Telefone deve ter 10 ou 11 dígitos';
  }

  return null;
};