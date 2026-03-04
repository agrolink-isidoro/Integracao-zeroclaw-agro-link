import React, { useState, useEffect } from 'react';
import { useFormValidation, cpfCnpjValidation, emailValidation, phoneValidation } from '../../hooks/useFormValidation';
import { useApiCreate, useApiUpdate } from '../../hooks/useApi';
import type { Proprietario } from '../../types';
import ErrorMessage from '../../components/common/ErrorMessage';

interface ProprietarioFormProps {
  proprietario?: Proprietario | null;
  onSuccess: () => void;
}

interface ProprietarioFormData {
  nome: string;
  cpf_cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  [key: string]: unknown;
}

const ProprietarioForm: React.FC<ProprietarioFormProps> = ({
  proprietario,
  onSuccess
}) => {
  const [formData, setFormData] = useState<ProprietarioFormData>({
    nome: '',
    cpf_cnpj: '',
    telefone: '',
    email: '',
    endereco: ''
  });

  const [backendErrors, setBackendErrors] = useState<Record<string, string>>({});

  const validationRules = {
    nome: { required: true, minLength: 2, maxLength: 200 },
    cpf_cnpj: {
      required: true,
      custom: cpfCnpjValidation
    },
    telefone: { custom: phoneValidation },
    email: { custom: emailValidation },
    endereco: { maxLength: 500 }
  };

  const { validate, validateSingle, getFieldError, clearErrors, setFieldTouched } = useFormValidation(validationRules);

  // Mutations
  const createMutation = useApiCreate('/proprietarios/', [['proprietarios']]);
  const updateMutation = useApiUpdate('/proprietarios/', [['proprietarios']]);

  useEffect(() => {
    if (proprietario) {
      setFormData({
        nome: proprietario.nome,
        cpf_cnpj: proprietario.cpf_cnpj,
        telefone: proprietario.telefone || '',
        email: proprietario.email || '',
        endereco: proprietario.endereco || ''
      });
      clearErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proprietario]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateSingle(name, value);
  };

  const handleBlur = (name: string) => {
    setFieldTouched(name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Marcar todos os campos como touched antes de validar
    Object.keys(validationRules).forEach(field => {
      setFieldTouched(field);
    });

    if (!validate(formData)) {
      return;
    }

    setBackendErrors({});

    try {
      if (proprietario) {
        await updateMutation.mutateAsync({ id: proprietario.id, ...formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      onSuccess();
    } catch (error: unknown) {
      console.error('Erro ao salvar proprietário:', error);
      const err = error as { response?: { data?: Record<string, string | string[]> } };
      
      // Capturar erros do backend e exibir
      if (err.response?.data) {
        const errors: Record<string, string> = {};
        Object.entries(err.response.data).forEach(([key, value]) => {
          errors[key] = Array.isArray(value) ? value[0] : value;
        });
        setBackendErrors(errors);
      }
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit}>
      <div className="card border-0 shadow-sm">
        <div className="card-body p-3 p-md-4">
          {/* Alerta de erros gerais do backend */}
          {Object.keys(backendErrors).length > 0 && (
            <div className="alert alert-danger mb-3">
              <h6 className="alert-heading mb-2">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Erro ao salvar:
              </h6>
              <ul className="mb-0">
                {Object.entries(backendErrors).map(([field, message]) => (
                  <li key={field}>
                    <strong>{field === 'cpf_cnpj' ? 'CPF/CNPJ' : field}:</strong> {message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="row g-2 g-md-3">
            {/* Nome */}
            <div className="col-12">
              <label htmlFor="nome" className="form-label">
                <i className="bi bi-person me-2"></i>
                Nome *
              </label>
        <input
          type="text"
          id="nome"
          name="nome"
          value={formData.nome}
          onChange={handleInputChange}
          onBlur={() => handleBlur('nome')}
          className={`form-control ${getFieldError('nome') ? 'is-invalid' : ''}`}
          placeholder="Nome completo"
        />
        <ErrorMessage message={getFieldError('nome')} />
            </div>

            {/* CPF/CNPJ */}
            <div className="col-md-6">
              <label htmlFor="cpf_cnpj" className="form-label">
                <i className="bi bi-card-text me-2"></i>
                CPF/CNPJ *
              </label>
        <input
          type="text"
          id="cpf_cnpj"
          name="cpf_cnpj"
          value={formData.cpf_cnpj}
          onChange={handleInputChange}
          onBlur={() => handleBlur('cpf_cnpj')}
          className={`form-control ${getFieldError('cpf_cnpj') ? 'is-invalid' : ''}`}
          placeholder="000.000.000-00 ou 00.000.000/0000-00"
        />
        <ErrorMessage message={getFieldError('cpf_cnpj')} />
            </div>

            {/* Telefone */}
            <div className="col-md-6">
              <label htmlFor="telefone" className="form-label">
                <i className="bi bi-telephone me-2"></i>
                Telefone
              </label>
        <input
          type="text"
          id="telefone"
          name="telefone"
          value={formData.telefone}
          onChange={handleInputChange}
          onBlur={() => handleBlur('telefone')}
          className={`form-control ${getFieldError('telefone') ? 'is-invalid' : ''}`}
          placeholder="(00) 00000-0000"
        />
        <ErrorMessage message={getFieldError('telefone')} />
            </div>

            {/* Email */}
            <div className="col-md-6">
              <label htmlFor="email" className="form-label">
                <i className="bi bi-envelope me-2"></i>
                Email
              </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          onBlur={() => handleBlur('email')}
          className={`form-control ${getFieldError('email') ? 'is-invalid' : ''}`}
          placeholder="email@exemplo.com"
        />
        <ErrorMessage message={getFieldError('email')} />
            </div>

            {/* Endereço */}
            <div className="col-md-6">
              <label htmlFor="endereco" className="form-label">
                <i className="bi bi-pin-map me-2"></i>
                Endereço
              </label>
        <textarea
          id="endereco"
          name="endereco"
          value={formData.endereco}
          onChange={handleInputChange}
          onBlur={() => handleBlur('endereco')}
          rows={3}
          className={`form-control ${getFieldError('endereco') ? 'is-invalid' : ''}`}
          placeholder="Endereço completo"
        />
        <ErrorMessage message={getFieldError('endereco')} />
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="card-footer bg-transparent border-top pt-3">
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              onClick={onSuccess}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              <i className="bi bi-x-circle me-2"></i>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-success"
            >
              {isLoading && (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              )}
              <i className="bi bi-check-circle me-2"></i>
              {proprietario ? 'Atualizar' : 'Criar'} Proprietário
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default ProprietarioForm;