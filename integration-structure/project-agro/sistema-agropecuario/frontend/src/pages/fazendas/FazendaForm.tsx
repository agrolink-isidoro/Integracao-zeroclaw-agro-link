import React, { useState, useEffect } from 'react';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useApiCreate, useApiUpdate, useApiQuery } from '../../hooks/useApi';
import type { Fazenda, Proprietario } from '../../types';
import SelectDropdown from '../../components/common/SelectDropdown';
import ErrorMessage from '../../components/common/ErrorMessage';

interface FazendaFormProps {
  fazenda?: Fazenda | null;
  onSuccess: () => void;
}

interface FazendaFormData {
  proprietario: number;
  name: string;
  matricula: string;
  [key: string]: unknown;
}

const FazendaForm: React.FC<FazendaFormProps> = ({
  fazenda,
  onSuccess
}) => {
  const [formData, setFormData] = useState<FazendaFormData>({
    proprietario: 0,
    name: '',
    matricula: ''
  });

  const validationRules = {
    proprietario: { 
      required: true,
      custom: (value: any) => {
        if (!value || value === 0 || value === '0') {
          return 'Proprietário é obrigatório';
        }
        return null;
      }
    },
    name: { required: true, minLength: 2, maxLength: 200 },
    matricula: { required: true, minLength: 1, maxLength: 100 }
  };

  const { validate, validateSingle, getFieldError, clearErrors } = useFormValidation(validationRules);

  // Query proprietários
  const { data: proprietarios = [], isLoading: loadingProprietarios } = useApiQuery<Proprietario[]>(
    ['proprietarios'],
    '/proprietarios/'
  );

  // Mutations
  const createMutation = useApiCreate('/fazendas/', [['fazendas']]);
  const updateMutation = useApiUpdate('/fazendas/', [['fazendas']]);

  useEffect(() => {
    if (fazenda) {
      setFormData({
        proprietario: fazenda.proprietario || 0,
        name: fazenda.name,
        matricula: fazenda.matricula
      });
      clearErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazenda]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateSingle(name, value);
  };

  const handleProprietarioChange = (value: string | number) => {
    setFormData(prev => ({ ...prev, proprietario: Number(value) }));
    validateSingle('proprietario', value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate(formData)) {
      return;
    }

    try {
      if (fazenda) {
        await updateMutation.mutateAsync({ id: fazenda.id, ...formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      onSuccess();
    } catch (error: unknown) {
      console.error('Erro ao salvar fazenda:', error);
      const err = error as { response?: { data?: { matricula?: string } } };
      // Handle specific errors (e.g., duplicate matricula)
      if (err.response?.data?.matricula) {
        // Error will be handled by the validation system
      }
    }
  };

  const proprietarioOptions = proprietarios.map(prop => ({
    value: prop.id,
    label: `${prop.nome} (${prop.cpf_cnpj})`
  }));

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Get all errors
  const allErrors = [
    getFieldError('proprietario'),
    getFieldError('name'),
    getFieldError('matricula')
  ].filter(Boolean);

  return (
    <form onSubmit={handleSubmit}>
      <div className="card border-0 shadow-sm">
        <div className="card-body p-3 p-md-4">
          {/* Error Alert */}
          {allErrors.length > 0 && (
            <div className="alert alert-danger mb-3">
              <h6 className="alert-heading">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Erros de validação:
              </h6>
              <ul className="mb-0">
                {allErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="row g-2 g-md-3">
            {/* Proprietário */}
            <div className="col-12">
              <label className="form-label">
                <i className="bi bi-person-badge me-2"></i>
                Proprietário *
              </label>
              <SelectDropdown
                options={proprietarioOptions}
                value={formData.proprietario || ''}
                onChange={handleProprietarioChange}
                placeholder="Selecione o proprietário"
                loading={loadingProprietarios}
                error={getFieldError('proprietario')}
                allowCreate={true}
                onCreate={async (nome) => {
                  // TODO: Implementar criação rápida de proprietário
                  console.log('Criar proprietário:', nome);
                }}
              />
              <ErrorMessage message={getFieldError('proprietario')} />
            </div>

            {/* Nome */}
            <div className="col-md-6">
              <label htmlFor="name" className="form-label">
                <i className="bi bi-house-door me-2"></i>
                Nome da Fazenda *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`form-control ${getFieldError('name') ? 'is-invalid' : ''}`}
                placeholder="Nome da fazenda"
              />
              <ErrorMessage message={getFieldError('name')} />
            </div>

            {/* Matrícula */}
            <div className="col-md-6">
              <label htmlFor="matricula" className="form-label">
                <i className="bi bi-file-earmark-text me-2"></i>
                Matrícula/Registro *
              </label>
              <input
                type="text"
                id="matricula"
                name="matricula"
                value={formData.matricula}
                onChange={handleInputChange}
                className={`form-control ${getFieldError('matricula') ? 'is-invalid' : ''}`}
                placeholder="Número da matrícula ou registro"
              />
              <ErrorMessage message={getFieldError('matricula')} />
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
              {fazenda ? 'Atualizar' : 'Criar'} Fazenda
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default FazendaForm;