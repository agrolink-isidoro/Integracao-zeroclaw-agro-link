import React, { useState, useEffect } from 'react';
import { useApiCreate, useApiUpdate } from '../../hooks/useApi';
import type { Cultura } from '../../types/agricultura';
import { TIPO_CULTURA_CHOICES, UNIDADE_PRODUCAO_CHOICES } from '../../types/agricultura';

interface CulturaFormProps {
  cultura?: Cultura | null;
  onSuccess: () => void;
}

const CulturaForm: React.FC<CulturaFormProps> = ({ cultura, onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'graos' as 'graos' | 'hortalicas' | 'fruticultura' | 'outros',
    descricao: '',
    ciclo_dias: '',
    zoneamento_apto: true,
    ativo: true,
    unidade_producao: 'tonelada' as 'saca_60kg' | 'tonelada' | 'kg' | 'caixa',
    variedades: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mutations
  const createMutation = useApiCreate('/agricultura/culturas/', [['culturas']]);
  const updateMutation = useApiUpdate('/agricultura/culturas/', [['culturas']]);

  // Initialize form data when editing
  useEffect(() => {
    if (cultura) {
      setFormData({
        nome: cultura.nome,
        tipo: cultura.tipo,
        descricao: cultura.descricao || '',
        ciclo_dias: cultura.ciclo_dias?.toString() || '',
        zoneamento_apto: cultura.zoneamento_apto,
        ativo: cultura.ativo,
        unidade_producao: cultura.unidade_producao || 'tonelada',
        variedades: cultura.variedades || '',
      });
    }
  }, [cultura]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    } else if (formData.nome.length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
    } else if (formData.nome.length > 100) {
      newErrors.nome = 'Nome deve ter no máximo 100 caracteres';
    }

    if (!formData.tipo) {
      newErrors.tipo = 'Tipo é obrigatório';
    }

    if (formData.ciclo_dias) {
      const ciclo = parseInt(formData.ciclo_dias);
      if (isNaN(ciclo) || ciclo < 1 || ciclo > 3650) {
        newErrors.ciclo_dias = 'Ciclo deve ser entre 1 e 3650 dias';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const submitData = {
      ...formData,
      ciclo_dias: formData.ciclo_dias ? parseInt(formData.ciclo_dias) : null,
      descricao: formData.descricao || null,
      variedades: formData.variedades || null,
    };

    try {
      if (cultura?.id) {
        await updateMutation.mutateAsync({
          id: cultura.id,
          ...submitData,
        });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      onSuccess();
    } catch (error: unknown) {
      const err = error as { response?: { data?: Record<string, string | string[]> } };
      if (err.response?.data) {
        const apiErrors: Record<string, string> = {};
        Object.entries(err.response.data).forEach(([key, value]) => {
          apiErrors[key] = Array.isArray(value) ? value[0] : value;
        });
        setErrors(apiErrors);
      } else {
        setErrors({ submit: 'Erro ao salvar cultura. Tente novamente.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="needs-validation" noValidate>
      {errors.submit && (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {errors.submit}
        </div>
      )}

      <div className="row g-2 g-md-3">
        {/* Nome */}
        <div className="col-12">
          <label htmlFor="nome" className="form-label">
            <i className="bi bi-flower1 me-2"></i>
            Nome da Cultura <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${errors.nome ? 'is-invalid' : ''}`}
            id="nome"
            name="nome"
            value={formData.nome}
            onChange={handleInputChange}
            placeholder="Ex: Soja, Milho, Trigo..."
            maxLength={100}
            required
          />
          {errors.nome && <div className="invalid-feedback">{errors.nome}</div>}
        </div>

        {/* Tipo */}
        <div className="col-12 col-md-6">
          <label htmlFor="tipo" className="form-label">
            <i className="bi bi-tag me-2"></i>
            Tipo <span className="text-danger">*</span>
          </label>
          <select
            className={`form-select ${errors.tipo ? 'is-invalid' : ''}`}
            id="tipo"
            name="tipo"
            value={formData.tipo}
            onChange={handleInputChange}
            required
          >
            {TIPO_CULTURA_CHOICES.map(choice => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
          {errors.tipo && <div className="invalid-feedback">{errors.tipo}</div>}
        </div>

        {/* Ciclo */}
        <div className="col-12 col-md-6">
          <label htmlFor="ciclo_dias" className="form-label">
            <i className="bi bi-calendar-event me-2"></i>
            Ciclo (dias) <small className="text-muted">(opcional)</small>
          </label>
          <input
            type="number"
            className={`form-control ${errors.ciclo_dias ? 'is-invalid' : ''}`}
            id="ciclo_dias"
            name="ciclo_dias"
            value={formData.ciclo_dias}
            onChange={handleInputChange}
            placeholder="Ex: 120"
            min="1"
            max="3650"
          />
          {errors.ciclo_dias && <div className="invalid-feedback">{errors.ciclo_dias}</div>}
          <small className="form-text text-muted">
            Número de dias até a colheita
          </small>
        </div>

        {/* Descrição */}
        <div className="col-12">
          <label htmlFor="descricao" className="form-label">
            <i className="bi bi-text-paragraph me-2"></i>
            Descrição <small className="text-muted">(opcional)</small>
          </label>
          <textarea
            className={`form-control ${errors.descricao ? 'is-invalid' : ''}`}
            id="descricao"
            name="descricao"
            value={formData.descricao}
            onChange={handleInputChange}
            rows={3}
            placeholder="Informações adicionais sobre a cultura..."
          />
          {errors.descricao && <div className="invalid-feedback">{errors.descricao}</div>}
        </div>

        {/* Checkboxes */}
        <div className="col-12">
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="zoneamento_apto"
              name="zoneamento_apto"
              checked={formData.zoneamento_apto}
              onChange={handleInputChange}
            />
            <label className="form-check-label" htmlFor="zoneamento_apto">
              <i className="bi bi-geo-alt me-1"></i>
              Zoneamento Agrícola Apto
            </label>
          </div>
          <small className="form-text text-muted d-block mb-3">
            Indica se a cultura é apta para o zoneamento agrícola da região
          </small>
        </div>

        {/* Unidade de Produção */}
        <div className="col-12 col-md-6">
          <label htmlFor="unidade_producao" className="form-label">
            <i className="bi bi-box-seam me-2"></i>
            Unidade de Produção <span className="text-danger">*</span>
          </label>
          <select
            className="form-select"
            id="unidade_producao"
            name="unidade_producao"
            value={formData.unidade_producao}
            onChange={handleInputChange}
          >
            {UNIDADE_PRODUCAO_CHOICES.map(choice => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
          <small className="form-text text-muted">
            Usado para exibir a produtividade no painel (sacas, toneladas...)
          </small>
        </div>

        {/* Variedades */}
        <div className="col-12 col-md-6">
          <label htmlFor="variedades" className="form-label">
            <i className="bi bi-diagram-2 me-2"></i>
            Variedades <small className="text-muted">(opcional)</small>
          </label>
          <input
            type="text"
            className="form-control"
            id="variedades"
            name="variedades"
            value={formData.variedades}
            onChange={handleInputChange}
            placeholder="Ex: M6210, B2801, Nidera 5909"
          />
          <small className="form-text text-muted">
            Variedades cultivadas, separadas por vírgula
          </small>
        </div>

        <div className="col-12">
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="ativo"
              name="ativo"
              checked={formData.ativo}
              onChange={handleInputChange}
            />
            <label className="form-check-label" htmlFor="ativo">
              <i className="bi bi-check-circle me-1"></i>
              Cultura Ativa
            </label>
          </div>
          <small className="form-text text-muted">
            Apenas culturas ativas ficam disponíveis para novos plantios
          </small>
        </div>
      </div>

      {/* Botões */}
      <div className="d-flex justify-content-end gap-2 gap-md-3 mt-4 pt-3 border-top">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onSuccess}
          disabled={isSubmitting}
        >
          <i className="bi bi-x-circle me-2"></i>
          Cancelar
        </button>
        <button
          type="submit"
          className="btn btn-success"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Salvando...
            </>
          ) : (
            <>
              <i className="bi bi-check-circle me-2"></i>
              {cultura ? 'Atualizar' : 'Salvar'} Cultura
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default CulturaForm;
