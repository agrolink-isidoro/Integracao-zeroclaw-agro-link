import React, { useState, useEffect } from 'react';
import type { Localizacao, TipoLocalizacao } from '../../types/estoque_maquinas';

interface LocalizacaoFormProps {
  localizacao?: Localizacao;
  onSave: (data: Partial<Localizacao>) => Promise<void>;
  onCancel: () => void;
}

const TIPOS_LOCALIZACAO: { value: TipoLocalizacao; label: string }[] = [
  { value: 'interna', label: 'Interna' },
  { value: 'externa', label: 'Externa' },
];

const LocalizacaoForm: React.FC<LocalizacaoFormProps> = ({ localizacao, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Localizacao>>({
    nome: '',
    tipo: 'interna',
    endereco: '',
    capacidade_total: 0,
    capacidade_ocupada: 0,
    ativa: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (localizacao) {
      setFormData(localizacao);
    }
  }, [localizacao]);

  const handleChange = (field: keyof Localizacao) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.type === 'checkbox' 
      ? (event.target as HTMLInputElement).checked 
      : event.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // Validações
    if (!formData.nome?.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    if (!formData.capacidade_total || formData.capacidade_total <= 0) {
      setError('Capacidade total deve ser maior que zero');
      return;
    }

    if (formData.capacidade_ocupada && formData.capacidade_ocupada < 0) {
      setError('Capacidade ocupada não pode ser negativa');
      return;
    }

    if (
      formData.capacidade_ocupada &&
      formData.capacidade_total &&
      formData.capacidade_ocupada > formData.capacidade_total
    ) {
      setError('Capacidade ocupada não pode ser maior que a capacidade total');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar localização');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      <div className="row g-2 g-md-3">
        <div className="col-12 col-md-6">
          <label className="form-label">
            <i className="bi bi-geo-alt me-2"></i>
            Nome <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className="form-control"
            value={formData.nome || ''}
            onChange={handleChange('nome')}
            placeholder="Ex: Armazém Central"
            disabled={loading}
            required
          />
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label">
            <i className="bi bi-folder me-2"></i>
            Tipo <span className="text-danger">*</span>
          </label>
          <select
            className="form-select"
            value={formData.tipo || 'interna'}
            onChange={handleChange('tipo')}
            disabled={loading}
            required
          >
            {TIPOS_LOCALIZACAO.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12">
          <label className="form-label">
            <i className="bi bi-map me-2"></i>
            Endereço
          </label>
          <textarea
            className="form-control"
            value={formData.endereco || ''}
            onChange={handleChange('endereco')}
            placeholder="Ex: Setor A - Galpão 1"
            rows={2}
            disabled={loading}
          />
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label">
            <i className="bi bi-123 me-2"></i>
            Capacidade Total <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            className="form-control"
            value={formData.capacidade_total || ''}
            onChange={handleChange('capacidade_total')}
            min="0"
            step="0.01"
            disabled={loading}
            required
          />
          <small className="form-text text-muted">Capacidade total de armazenamento</small>
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label">
            <i className="bi bi-speedometer2 me-2"></i>
            Capacidade Ocupada
          </label>
          <input
            type="number"
            className="form-control"
            value={formData.capacidade_ocupada || ''}
            onChange={handleChange('capacidade_ocupada')}
            min="0"
            step="0.01"
            disabled={loading || !!localizacao}
            readOnly={!!localizacao}
          />
          <small className="form-text text-muted">Capacidade atualmente ocupada</small>
        </div>

        <div className="col-12">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              checked={formData.ativa ?? true}
              onChange={handleChange('ativa')}
              disabled={loading}
            />
            <label className="form-check-label">Localização Ativa</label>
          </div>
        </div>

        <div className="col-12">
          <div className="d-flex gap-2 justify-content-end mt-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              <i className="bi bi-x-circle me-2"></i>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              <i className="bi bi-save me-2"></i>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default LocalizacaoForm;
