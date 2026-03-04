import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Manejo, Plantio } from '../../types/agricultura';
import { TalhoesMultiSelect } from '../../components/agricultura/TalhoesMultiSelect';

interface ManejoFormProps {
  plantioId?: number;
  manejo?: Manejo;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManejoForm: React.FC<ManejoFormProps> = ({ 
  plantioId, 
  manejo, 
  onClose, 
  onSuccess 
}) => {
  const queryClient = useQueryClient();
  const isEditMode = !!manejo;

  const [formData, setFormData] = useState<Partial<Manejo>>({
    plantio: plantioId || manejo?.plantio,
    tipo: manejo?.tipo || 'adubacao_base',
    data_manejo: manejo?.data_manejo || new Date().toISOString().split('T')[0],
    descricao: manejo?.descricao || '',
    equipamento: manejo?.equipamento || '',
    talhoes: manejo?.talhoes || [],
  });

  const [safraId, setSafraId] = useState<number | undefined>(plantioId);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Buscar todas as safras (plantios) para seleção opcional
  const { data: safras = [] } = useQuery<Plantio[]>({
    queryKey: ['plantios'],
    queryFn: async () => {
      const response = await api.get('/agricultura/plantios/');
      return response.data?.results ?? response.data;
    },
  });

  // Buscar todos os talhões (serão agrupados por fazenda no componente)
  const { data: todosTalhoes = [] } = useQuery({
    queryKey: ['talhoes'],
    queryFn: async () => {
      const response = await api.get('/talhoes/');
      return response.data;
    },
  });



  // When a safra is selected via the dropdown we update formData directly in the select handler
  // (avoids calling setState synchronously in an effect which triggers lint warnings).

  const mutation = useMutation<void, unknown, Partial<Manejo>>({
    mutationFn: async (data: Partial<Manejo>) => {
      if (isEditMode) {
        return api.put(`agricultura/manejos/${manejo!.id}/`, data);
      }
      return api.post('agricultura/manejos/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manejos'] });
      onSuccess();
      onClose();
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: unknown } } | null;
      if (e?.response?.data && typeof e.response.data === 'object') {
        setErrors(e.response.data as Record<string, string>);
      }
    },
  });

  const handleChange = (field: keyof Manejo, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value as unknown as Manejo[keyof Manejo] }));
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.tipo) newErrors.tipo = 'Tipo de operação é obrigatório';
    if (!formData.data_manejo) newErrors.data_manejo = 'Data é obrigatória';
    if (!formData.talhoes || formData.talhoes.length === 0) {
      newErrors.talhoes = 'Selecione pelo menos um talhão';
    }
    if (!formData.descricao || formData.descricao.trim().length < 3) {
      newErrors.descricao = 'Descrição deve ter pelo menos 3 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      mutation.mutate(formData);
    }
  };

  const tiposOperacao = [
    { value: 'preparo_solo', label: 'Preparo do Solo', grupo: 'Preparação' },
    { value: 'aracao', label: 'Aração', grupo: 'Preparação' },
    { value: 'gradagem', label: 'Gradagem', grupo: 'Preparação' },
    { value: 'subsolagem', label: 'Subsolagem', grupo: 'Preparação' },
    { value: 'correcao_solo', label: 'Correção do Solo', grupo: 'Preparação' },
    { value: 'calagem', label: 'Calagem', grupo: 'Preparação' },
    { value: 'adubacao_base', label: 'Adubação de Base', grupo: 'Adubação' },
    { value: 'adubacao_cobertura', label: 'Adubação de Cobertura', grupo: 'Adubação' },
    { value: 'adubacao_foliar', label: 'Adubação Foliar', grupo: 'Adubação' },
    { value: 'dessecacao', label: 'Dessecação', grupo: 'Plantio' },
    { value: 'plantio_direto', label: 'Plantio Direto', grupo: 'Plantio' },
    { value: 'plantio_convencional', label: 'Plantio Convencional', grupo: 'Plantio' },
    { value: 'irrigacao', label: 'Irrigação', grupo: 'Tratos' },
    { value: 'poda', label: 'Poda', grupo: 'Tratos' },
    { value: 'desbaste', label: 'Desbaste', grupo: 'Tratos' },
    { value: 'amontoa', label: 'Amontoa', grupo: 'Tratos' },
    { value: 'controle_pragas', label: 'Controle de Pragas', grupo: 'Fitossanitário' },
    { value: 'controle_doencas', label: 'Controle de Doenças', grupo: 'Fitossanitário' },
    { value: 'controle_plantas_daninhas', label: 'Controle de Plantas Daninhas', grupo: 'Fitossanitário' },
    { value: 'pulverizacao', label: 'Pulverização', grupo: 'Fitossanitário' },
    { value: 'aplicacao_herbicida', label: 'Aplicação de Herbicida', grupo: 'Fitossanitário' },
    { value: 'aplicacao_fungicida', label: 'Aplicação de Fungicida', grupo: 'Fitossanitário' },
    { value: 'aplicacao_inseticida', label: 'Aplicação de Inseticida', grupo: 'Fitossanitário' },
    { value: 'capina', label: 'Capina', grupo: 'Mecânica' },
    { value: 'rocada', label: 'Roçada', grupo: 'Mecânica' },
    { value: 'cultivo_mecanico', label: 'Cultivo Mecânico', grupo: 'Mecânica' },
    { value: 'outro', label: 'Outro', grupo: 'Outros' },
  ];

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-header">
        <h5 className="modal-title">
          <i className="bi bi-tools me-2"></i>
          {isEditMode ? 'Editar Manejo' : 'Novo Manejo'}
        </h5>
        <button type="button" className="btn-close" onClick={onClose}></button>
      </div>

      <div className="modal-body p-3 p-md-4">
        {/* Safra (Opcional) */}
        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-flower1 me-2"></i>
            Safra (Opcional)
          </label>
          <select
            className="form-select"
            value={safraId || ''}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : undefined;
              setSafraId(value);

              if (!value) {
                setFormData(prev => ({ ...prev, plantio: undefined, talhoes: [] }));
                return;
              }

              const selected = safras.find(s => s.id === value);
              if (!selected) {
                setFormData(prev => ({ ...prev, plantio: value, talhoes: [] }));
                return;
              }

              setFormData(prev => ({ ...prev, plantio: selected.id, talhoes: selected.talhoes }));
            }}
          >
            <option value="">Operação avulsa (selecione talhões manualmente)</option>
            {safras.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome_safra || `${s.cultura_nome} - ${new Date(s.data_plantio).toLocaleDateString()}`}
              </option>
            ))}
          </select>
          <small className="text-muted">
            {safraId 
              ? 'Talhões da safra pré-selecionados (pode ajustar abaixo)'
              : 'Deixe em branco para operação avulsa'
            }
          </small>
        </div>

        {/* Tipo de Operação */}
        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-tag me-2"></i>
            Tipo de Operação <span className="text-danger">*</span>
          </label>
          <select
            className={`form-select ${errors.tipo ? 'is-invalid' : ''}`}
            value={formData.tipo}
            onChange={(e) => handleChange('tipo', e.target.value)}
            required
          >
            <option value="">Selecione o tipo</option>
            {Object.entries(
              tiposOperacao.reduce((acc, tipo) => {
                if (!acc[tipo.grupo]) acc[tipo.grupo] = [];
                acc[tipo.grupo].push(tipo);
                return acc;
              }, {} as Record<string, typeof tiposOperacao>)
            ).map(([grupo, tipos]) => (
              <optgroup key={grupo} label={grupo}>
                {tipos.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {errors.tipo && (
            <div className="invalid-feedback">{errors.tipo}</div>
          )}
        </div>

        {/* Data do Manejo */}
        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-calendar-event me-2"></i>
            Data do Manejo <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            className={`form-control ${errors.data_manejo ? 'is-invalid' : ''}`}
            value={formData.data_manejo}
            onChange={(e) => handleChange('data_manejo', e.target.value)}
            required
          />
          {errors.data_manejo && (
            <div className="invalid-feedback">{errors.data_manejo}</div>
          )}
        </div>

        {/* Talhões Multi-Select */}
        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-geo-alt me-2"></i>
            Talhões <span className="text-danger">*</span>
          </label>
          <TalhoesMultiSelect
            talhoes={todosTalhoes}
            selectedIds={formData.talhoes || []}
            onChange={(ids) => {
              handleChange('talhoes', ids);
              if (errors.talhoes) {
                setErrors(prev => ({ ...prev, talhoes: '' }));
              }
            }}
          />
          {errors.talhoes && (
            <div className="text-danger small mt-1">{errors.talhoes}</div>
          )}
          {errors.talhoes && (
            <div className="text-danger small mt-1">{errors.talhoes}</div>
          )}
        </div>

        {/* Descrição */}
        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-text-paragraph me-2"></i>
            Descrição <span className="text-danger">*</span>
          </label>
          <textarea
            className={`form-control ${errors.descricao ? 'is-invalid' : ''}`}
            rows={3}
            value={formData.descricao}
            onChange={(e) => handleChange('descricao', e.target.value)}
            placeholder="Detalhe o manejo realizado..."
            required
          />
          {errors.descricao && (
            <div className="invalid-feedback">{errors.descricao}</div>
          )}
        </div>

        {/* Equipamento */}
        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-wrench me-2"></i>
            Equipamento Utilizado
          </label>
          <input
            type="text"
            className="form-control"
            value={formData.equipamento}
            onChange={(e) => handleChange('equipamento', e.target.value)}
            placeholder="Ex: Pulverizador Jacto, Trator John Deere..."
          />
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Salvando...
            </>
          ) : (
            <>
              <i className="bi bi-check-circle me-2"></i>
              {isEditMode ? 'Atualizar' : 'Adicionar Manejo'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};
