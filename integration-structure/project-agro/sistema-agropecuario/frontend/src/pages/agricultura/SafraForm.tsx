import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import type { Plantio, Cultura } from '../../types/agricultura';
import type { Talhao } from '../../types';
import SelectFK from '../../components/common/SelectFK';

interface TalhaoVariedade {
  talhao: number;
  variedade: string;
}

interface SafraFormProps {
  plantio?: Plantio;
  onClose: () => void;
  onSuccess: () => void;
}

export const SafraForm: React.FC<SafraFormProps> = ({ plantio, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const isEditMode = !!plantio;

  const [formData, setFormData] = useState<Partial<Omit<Plantio, 'talhoes' | 'talhoes_variedades'>>>({
    fazenda: plantio?.fazenda || undefined,
    cultura: plantio?.cultura || undefined,
    data_plantio: plantio?.data_plantio || new Date().toISOString().split('T')[0],
    observacoes: plantio?.observacoes || '',
    status: plantio?.status || 'planejado',
  });

  // Separate state for talhão + variedade pairs (write field)
  const [talhoesList, setTalhoesList] = useState<TalhaoVariedade[]>(() => {
    if (plantio?.talhoes_info && plantio.talhoes_info.length > 0) {
      return plantio.talhoes_info.map(ti => ({ talhao: ti.id, variedade: ti.variedade || '' }));
    }
    if (plantio?.talhoes) {
      return plantio.talhoes.map(id => ({ talhao: id, variedade: '' }));
    }
    return [];
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form data when editing an existing plantio (safra) prop changes
  React.useEffect(() => {
    if (plantio) {
      setFormData({
        fazenda: plantio.fazenda || undefined,
        cultura: plantio.cultura || undefined,
        data_plantio: plantio.data_plantio || new Date().toISOString().split('T')[0],
        observacoes: plantio.observacoes || '',
        status: plantio.status || 'planejado',
      });
      if (plantio.talhoes_info && plantio.talhoes_info.length > 0) {
        setTalhoesList(plantio.talhoes_info.map(ti => ({ talhao: ti.id, variedade: ti.variedade || '' })));
      } else if (plantio.talhoes) {
        setTalhoesList(plantio.talhoes.map(id => ({ talhao: id, variedade: '' })));
      }
      setErrors({});
    }
  }, [plantio]);

  // Buscar culturas
  const { data: culturas = [] } = useQuery<Cultura[]>({
    queryKey: ['culturas'],
    queryFn: async () => {
      const response = await api.get('/agricultura/culturas/');
      return response.data;
    },
  });

  // Variedades disponíveis para a cultura selecionada
  const variedadesOpcoes: string[] = React.useMemo(() => {
    const cultura = culturas.find(c => c.id === formData.cultura);
    if (!cultura?.variedades) return [];
    return cultura.variedades.split(',').map(v => v.trim()).filter(Boolean);
  }, [culturas, formData.cultura]);

  // Buscar talhões da fazenda
  const { data: talhoes = [] } = useQuery<Talhao[]>({
    queryKey: ['talhoes', formData.fazenda],
    queryFn: async () => {
      const response = await api.get('/talhoes/', {
        params: { fazenda: formData.fazenda }
      });
      return response.data as Talhao[];
    },
    enabled: !!formData.fazenda,
  });

  // Mutation para criar/editar
  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...formData,
        talhoes_variedades: talhoesList.map(tv => ({
          talhao: tv.talhao,
          variedade: tv.variedade || '',
        })),
      };
      if (isEditMode) {
        return api.put(`/agricultura/plantios/${plantio.id}/`, payload);
      }
      return api.post('/agricultura/plantios/', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantios'] });
      onSuccess();
      onClose();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: Record<string, string> } } | null;
      if (err?.response?.data) {
        setErrors(err.response.data as Record<string, string>);
      }
    },
  });

  const handleChange = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  };

  const handleTalhaoToggle = (talhaoId: number, checked: boolean) => {
    if (checked) {
      setTalhoesList(prev => [...prev, { talhao: talhaoId, variedade: '' }]);
    } else {
      setTalhoesList(prev => prev.filter(tv => tv.talhao !== talhaoId));
    }
    if (errors.talhoes_variedades) {
      setErrors(prev => ({ ...prev, talhoes_variedades: '' }));
    }
  };

  const handleVariedadeChange = (talhaoId: number, variedade: string) => {
    setTalhoesList(prev =>
      prev.map(tv => tv.talhao === talhaoId ? { ...tv, variedade } : tv)
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fazenda) newErrors.fazenda = 'Fazenda é obrigatória';
    if (!formData.cultura) newErrors.cultura = 'Cultura é obrigatória';
    if (talhoesList.length === 0) {
      newErrors.talhoes_variedades = 'Selecione pelo menos um talhão';
    }
    if (!formData.data_plantio) newErrors.data_plantio = 'Data do plantio é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      mutation.mutate();
    }
  };

  const selectedTalhaoIds = talhoesList.map(tv => tv.talhao);

  const areaTotalSelecionada = (talhoes as Talhao[])
    .filter((t: Talhao) => selectedTalhaoIds.includes(t.id))
    .reduce((sum: number, t: Talhao) => sum + (t.area_hectares || t.area_size || 0), 0);

  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-header">
        <h5 className="modal-title">
          {isEditMode ? 'Editar Safra' : 'Nova Safra'}
        </h5>
        <button type="button" className="btn-close" onClick={onClose}></button>
      </div>

      <div className="modal-body p-3 p-md-4">
        {/* Fazenda */}
        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-building me-2"></i>
            Fazenda <span className="text-danger">*</span>
          </label>
          <SelectFK
            endpoint="/fazendas/"
            value={formData.fazenda}
            onChange={(value: string | number) => {
              handleChange('fazenda', typeof value === 'string' ? parseInt(value) : value);
              setTalhoesList([]); // Limpar talhões ao mudar fazenda
            }}
            labelKey="name"
            placeholder="Selecione a fazenda"
          />
          {errors.fazenda && (
            <div className="invalid-feedback d-block">{errors.fazenda}</div>
          )}
        </div>

        {/* Cultura */}
        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-flower1 me-2"></i>
            Cultura <span className="text-danger">*</span>
          </label>
          <select
            className={`form-select ${errors.cultura ? 'is-invalid' : ''}`}
            value={formData.cultura || ''}
            onChange={(e) => {
              handleChange('cultura', parseInt(e.target.value));
              // Reset variedades dos talhões ao trocar cultura
              setTalhoesList(prev => prev.map(tv => ({ ...tv, variedade: '' })));
            }}
            required
          >
            <option value="">Selecione a cultura</option>
            {culturas.map((cultura) => (
              <option key={cultura.id} value={cultura.id}>
                {cultura.nome} {cultura.ciclo_dias ? `(${cultura.ciclo_dias} dias)` : ''}
              </option>
            ))}
          </select>
          {errors.cultura && (
            <div className="invalid-feedback">{errors.cultura}</div>
          )}
        </div>

        {/* Talhões (multi-select) */}
        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-geo-alt me-2"></i>
            Talhões <span className="text-danger">*</span>
          </label>
          {!formData.fazenda ? (
            <div className="alert alert-info py-2">
              Selecione uma fazenda primeiro
            </div>
          ) : talhoes.length === 0 ? (
            <div className="alert alert-warning py-2">
              Nenhum talhão cadastrado nesta fazenda
            </div>
          ) : (
            <div className="border rounded p-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {(talhoes as Talhao[]).map((talhao: Talhao) => (
                <div key={talhao.id} className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`talhao-${talhao.id}`}
                    checked={selectedTalhaoIds.includes(talhao.id)}
                    onChange={(e) => handleTalhaoToggle(talhao.id, e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor={`talhao-${talhao.id}`}>
                    <strong>{talhao.name}</strong>{' '}
                    ({(talhao.area_hectares || talhao.area_size || (talhao as any).area || 0).toFixed(2)} ha)
                  </label>
                </div>
              ))}
            </div>
          )}
          {errors.talhoes_variedades && (
            <div className="invalid-feedback d-block">{errors.talhoes_variedades}</div>
          )}
        </div>

        {/* Variedade por talhão */}
        {talhoesList.length > 0 && (
          <div className="mb-3">
            <label className="form-label">
              <i className="bi bi-tags me-2"></i>
              Variedade por Talhão
              <small className="text-muted ms-2">(opcional)</small>
            </label>
            <div className="border rounded p-3">
              {talhoesList.map((tv) => {
                const talhaoObj = (talhoes as Talhao[]).find(t => t.id === tv.talhao);
                return (
                  <div key={tv.talhao} className="row align-items-center mb-2">
                    <div className="col-5">
                      <small className="fw-semibold text-secondary">
                        {talhaoObj?.name || `Talhão #${tv.talhao}`}
                      </small>
                    </div>
                    <div className="col-7">
                      {variedadesOpcoes.length > 0 ? (
                        <select
                          className="form-select form-select-sm"
                          value={tv.variedade}
                          onChange={(e) => handleVariedadeChange(tv.talhao, e.target.value)}
                        >
                          <option value="">— Sem variedade —</option>
                          {variedadesOpcoes.map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Ex: M6210"
                          value={tv.variedade}
                          onChange={(e) => handleVariedadeChange(tv.talhao, e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="mt-2 text-muted small border-top pt-2">
                <i className="bi bi-rulers me-1"></i>
                <strong>Área total:</strong> {areaTotalSelecionada.toFixed(2)} ha em {talhoesList.length} talhão(ões)
              </div>
            </div>
          </div>
        )}

        {/* Data do Plantio */}
        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-calendar-event me-2"></i>
            Data do Plantio <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            className={`form-control ${errors.data_plantio ? 'is-invalid' : ''}`}
            value={formData.data_plantio}
            onChange={(e) => handleChange('data_plantio', e.target.value)}
            required
          />
          {errors.data_plantio && (
            <div className="invalid-feedback">{errors.data_plantio}</div>
          )}
        </div>

        {/* Status */}
        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-flag me-2"></i>
            Status
          </label>
          <select
            className="form-select"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as Plantio['status'])}
          >
            <option value="planejado">Planejado</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="colhido">Colhido</option>
            <option value="perdido">Perdido</option>
          </select>
        </div>

        {/* Observações */}
        <div className="mb-3">
          <label className="form-label">
            <i className="bi bi-text-paragraph me-2"></i>
            Observações
          </label>
          <textarea
            className="form-control"
            rows={3}
            value={formData.observacoes}
            onChange={(e) => handleChange('observacoes', e.target.value)}
            placeholder="Informações adicionais sobre o plantio..."
          />
        </div>

        {/* Preview da Safra */}
        {formData.cultura && talhoesList.length > 0 && (
          <div className="alert alert-success py-2">
            <strong>Preview:</strong>{' '}
            Safra {culturas.find(c => c.id === formData.cultura)?.nome} —{' '}
            {areaTotalSelecionada.toFixed(2)} ha em {talhoesList.length} talhão(ões)
            {talhoesList.some(tv => tv.variedade) && (
              <div className="mt-1">
                {talhoesList.filter(tv => tv.variedade).map(tv => {
                  const t = (talhoes as Talhao[]).find(x => x.id === tv.talhao);
                  return (
                    <span key={tv.talhao} className="badge bg-success me-1">
                      {t?.name}: {tv.variedade}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
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
              {isEditMode ? 'Atualizar' : 'Criar Safra'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};
