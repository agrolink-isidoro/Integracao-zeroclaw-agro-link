import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { OrdemServico, Plantio } from '../../types/agricultura';
import type { Talhao } from '../../types';
import { TalhoesMultiSelect } from '../../components/agricultura/TalhoesMultiSelect';

interface OrdemServicoFormProps {
  plantioId?: number;
  ordemServico?: OrdemServico;
  onClose: () => void;
  onSuccess: () => void;
}

export const OrdemServicoForm: React.FC<OrdemServicoFormProps> = ({ 
  plantioId,
  ordemServico, 
  onClose, 
  onSuccess 
}) => {
  const queryClient = useQueryClient();
  const isEditMode = !!ordemServico;

  const [formData, setFormData] = useState<Partial<OrdemServico>>({
    talhoes: ordemServico?.talhoes || [],
    tarefa: ordemServico?.tarefa || '',
    tipo_manual: ordemServico?.tipo_manual || false,
    maquina: ordemServico?.maquina || '',
    data_inicio: ordemServico?.data_inicio 
      ? new Date(ordemServico.data_inicio).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    data_fim: ordemServico?.data_fim 
      ? new Date(ordemServico.data_fim).toISOString().slice(0, 16)
      : undefined,
    status: ordemServico?.status || 'pendente',
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
  const { data: todosTalhoes = [] } = useQuery<Talhao[]>({
    queryKey: ['talhoes'],
    queryFn: async () => {
      const response = await api.get('/talhoes/');
      return response.data as Talhao[];
    },
  });

  // Buscar dados da safra selecionada (se houver)
  const { data: safra } = useQuery<Plantio>({
    queryKey: ['plantios', safraId],
    queryFn: async () => {
      const response = await api.get(`agricultura/plantios/${safraId}/`);
      return response.data;
    },
    enabled: !!safraId,
  });

  // Compute selected talhões without mutating state inside an effect
  const selectedTalhoes = React.useMemo(() => {
    if (Array.isArray(formData.talhoes) && formData.talhoes.length > 0) return formData.talhoes;
    return safra?.talhoes ?? [];
  }, [formData.talhoes, safra]);


  const mutation = useMutation({
    mutationFn: async (data: Partial<OrdemServico>) => {
      if (isEditMode) {
        return api.put(`agricultura/ordens-servico/${ordemServico.id}/`, data);
      }
      return api.post('agricultura/ordens-servico/', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      onSuccess();
      onClose();
    },
    onError: (error: unknown) => {
      // Best-effort narrowing without using `any`
      if (typeof error === 'object' && error !== null) {
        const e = error as Record<string, unknown>;
        const resp = e.response as Record<string, unknown> | undefined;
        const data = resp?.data as Record<string, string> | undefined;
        if (data) setErrors(data);
      }
    },
  });

  const handleChange = (field: keyof OrdemServico, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value } as Partial<OrdemServico>));
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fazenda) newErrors.fazenda = 'Fazenda é obrigatória';
    if (!formData.tarefa || formData.tarefa.trim().length < 3) {
      newErrors.tarefa = 'Tarefa deve ter pelo menos 3 caracteres';
    }
    if (!formData.talhoes || formData.talhoes.length === 0) {
      newErrors.talhoes = 'Selecione pelo menos um talhão';
    }
    if (!formData.data_inicio) newErrors.data_inicio = 'Data de início é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      mutation.mutate(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-header">
        <h5 className="modal-title">
          <i className="bi bi-clipboard-check me-2"></i>
          {isEditMode ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
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
            }}
          >
            <option value="">Ordem de serviço avulsa (selecione talhões manualmente)</option>
            {safras.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome_safra || `${s.cultura_nome} - ${new Date(s.data_plantio).toLocaleDateString()}`}
              </option>
            ))}
          </select>
          <small className="text-muted">
            {safraId 
              ? 'Talhões da safra pré-selecionados (pode ajustar abaixo)'
              : 'Deixe em branco para OS avulsa'
            }
          </small>
        </div>

        {/* Tarefa */}
        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-list-task me-2"></i>
            Tarefa <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${errors.tarefa ? 'is-invalid' : ''}`}
            value={formData.tarefa}
            onChange={(e) => handleChange('tarefa', e.target.value)}
            placeholder="Ex: Pulverização preventiva, Preparo do solo..."
            required
          />
          {errors.tarefa && (
            <div className="invalid-feedback">{errors.tarefa}</div>
          )}
        </div>

        {/* Talhões */}
        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-geo-alt me-2"></i>
            Talhões <span className="text-danger">*</span>
          </label>
          <TalhoesMultiSelect
            talhoes={todosTalhoes}
            selectedIds={selectedTalhoes}
            onChange={(ids) => {
              handleChange('talhoes', ids);
              if (errors.talhoes) {
                setErrors(prev => ({ ...prev, talhoes: '' }));
              }
            }}
          />
          {errors.talhoes && (
            <div className="invalid-feedback d-block">{errors.talhoes}</div>
          )}
        </div>

        <div className="row">{/* Tipo Manual */}
          <div className="col-md-12 mb-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="tipo-manual"
                checked={formData.tipo_manual}
                onChange={(e) => handleChange('tipo_manual', e.target.checked)}
              />
              <label className="form-check-label" htmlFor="tipo-manual">
                Operação Manual (sem uso de máquinas)
              </label>
            </div>
          </div>
        </div>

        {/* Máquina */}
        {!formData.tipo_manual && (
          <div className="mb-3">
            <label htmlFor="maquina" className="form-label">
              <i className="bi bi-wrench me-2"></i>
              Máquina/Equipamento
            </label>
            <input
              id="maquina"
              type="text"
              className="form-control"
              value={formData.maquina}
              onChange={(e) => handleChange('maquina', e.target.value)}
              placeholder="Ex: Trator John Deere 7515, Pulverizador Jacto..."
            />
          </div>
        )}

        <div className="row g-2 g-md-3">
          {/* Data Início */}
          <div className="col-12 col-md-6 mb-3">
            <label htmlFor="data_inicio" className="form-label">
              <i className="bi bi-calendar-event me-2"></i>
              Data/Hora Início <span className="text-danger">*</span>
            </label>
            <input
              id="data_inicio"
              type="datetime-local"
              className={`form-control ${errors.data_inicio ? 'is-invalid' : ''}`}
              value={formData.data_inicio}
              onChange={(e) => handleChange('data_inicio', e.target.value)}
              required
            />
            {errors.data_inicio && (
              <div className="invalid-feedback">{errors.data_inicio}</div>
            )}
          </div>

          {/* Data Fim */}
          <div className="col-12 col-md-6 mb-3">
            <label htmlFor="data_fim" className="form-label">
              <i className="bi bi-calendar-check me-2"></i>
              Data/Hora Fim (opcional)
            </label>
            <input
              id="data_fim"
              type="datetime-local"
              className="form-control"
              value={formData.data_fim || ''}
              onChange={(e) => handleChange('data_fim', e.target.value || undefined)}
            />
          </div>
        </div>

        <div className="row g-2 g-md-3">
          {/* Status */}
          <div className="col-12 col-md-6 mb-3">
            <label htmlFor="status" className="form-label">
              <i className="bi bi-flag me-2"></i>
              Status
            </label>
            <select
              id="status"
              className="form-select"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <option value="pendente">Pendente</option>
              <option value="aprovada">Aprovada</option>
              <option value="ativa">Ativa</option>
              <option value="finalizada">Finalizada</option>
            </select>
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button 
          type="submit" 
          className="btn btn-warning"
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
              {isEditMode ? 'Atualizar' : 'Criar Ordem de Serviço'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};
