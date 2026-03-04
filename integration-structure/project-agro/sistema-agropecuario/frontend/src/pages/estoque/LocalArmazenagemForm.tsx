import React, { useState, useEffect } from 'react';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useApiCreate, useApiUpdate, useApiQuery } from '../../hooks/useApi';
import type { LocalArmazenagem, UnidadeCapacidade } from '../../types/estoque_maquinas';
import { UNIDADES_CAPACIDADE } from '../../types/estoque_maquinas';
import { getUnitLabel } from '../../utils/units';
import SelectDropdown from '../../components/common/SelectDropdown';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface Props {
  local?: LocalArmazenagem | null;
  onSuccess: () => void;
}

const LocalArmazenagemForm: React.FC<Props> = ({ local, onSuccess }) => {
  const [formData, setFormData] = useState<Partial<LocalArmazenagem>>({
    nome: '',
    tipo: 'armazem',
    tipo_local: 'interno',
    capacidade_total: undefined,
    unidade_capacidade: 'kg',
    fazenda: undefined,
    fornecedor: undefined,
    ativo: true
  });
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  // Validation rules change depending on tipo_local
  const getRules = () => {
    const rules: Record<string, any> = {
      nome: { required: true, minLength: 2 },
    };
    if (formData.tipo_local === 'interno') {
      rules.fazenda = { required: true };
    } else {
      rules.fornecedor = { required: true };
    }
    return rules;
  };

  const { validate, validateSingle, getFieldError, clearErrors } = useFormValidation(getRules());

  const createMutation = useApiCreate('/estoque/locais-armazenamento/', [['locais-armazenamento']]);
  const updateMutation = useApiUpdate('/estoque/locais-armazenamento/', [['locais-armazenamento']]);

  const { data: fazendas = [], isLoading: loadingFazendas } = useApiQuery<any[]>(['fazendas'], '/fazendas/');
  const { data: fornecedores = [], isLoading: loadingFornecedores } = useApiQuery<any[]>(
    ['fornecedores-ativos'],
    '/comercial/fornecedores/?status=ativo&page_size=500'
  );

  useEffect(() => {
    if (local) {
      setFormData({
        nome: local.nome,
        tipo: local.tipo,
        tipo_local: local.tipo_local || 'interno',
        capacidade_total: (local as any).capacidade_total ?? (local as any).capacidade_maxima,
        unidade_capacidade: local.unidade_capacidade as UnidadeCapacidade,
        fazenda: local.fazenda ?? undefined,
        fornecedor: local.fornecedor ?? undefined,
        ativo: local.ativo
      });
      clearErrors();
      setCustomErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const processed = type === 'number' ? (value === '' ? undefined : Number(value)) : value;
    setFormData(prev => ({ ...prev, [name]: processed }));
    validateSingle(name, processed as any);
  };

  const handleTipoLocalChange = (newTipoLocal: 'interno' | 'externo') => {
    setFormData(prev => ({
      ...prev,
      tipo_local: newTipoLocal,
      fazenda: newTipoLocal === 'interno' ? prev.fazenda : undefined,
      fornecedor: newTipoLocal === 'externo' ? prev.fornecedor : undefined,
    }));
    clearErrors();
    setCustomErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate(formData)) {
      return;
    }

    try {
      const payload: any = { ...formData };

      // Ensure opposite FK is null
      if (payload.tipo_local === 'interno') {
        payload.fornecedor = null;
      } else {
        payload.fazenda = null;
      }

      if (local) {
        await updateMutation.mutateAsync({ id: local.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar local de armazenagem:', error);
      if (error.response?.data) {
        const fieldErrors: any = {};
        Object.keys(error.response.data).forEach(k => {
          fieldErrors[k] = Array.isArray(error.response.data[k]) ? error.response.data[k].join('\n') : String(error.response.data[k]);
        });
        setCustomErrors(fieldErrors);
      }
    }
  };

  if (loadingFazendas || loadingFornecedores) {
    return (
      <div className="d-flex justify-content-center py-4">
        <LoadingSpinner />
      </div>
    );
  }

  const isInterno = formData.tipo_local === 'interno';

  return (
    <form onSubmit={handleSubmit}>
      <div className="row g-2 g-md-3">
        {/* Local Interno / Externo toggle */}
        <div className="col-12">
          <label className="form-label">
            <i className="bi bi-signpost-split me-2"></i>
            Local Interno / Externo <span className="text-danger">*</span>
          </label>
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn ${isInterno ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleTipoLocalChange('interno')}
            >
              <i className="bi bi-house-door me-2"></i>
              Interno (Próprio)
            </button>
            <button
              type="button"
              className={`btn ${!isInterno ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleTipoLocalChange('externo')}
            >
              <i className="bi bi-truck me-2"></i>
              Externo (Terceiros)
            </button>
          </div>
          <small className="text-muted d-block mt-1">
            {isInterno
              ? 'Local dentro de uma fazenda própria (silo, armazém, galpão, etc.)'
              : 'Local de um fornecedor ou terceiro (armazém terceirizado, revenda, etc.)'}
          </small>
        </div>

        {/* Vinculação: Fazenda (interno) ou Fornecedor (externo) */}
        <div className="col-12">
          {isInterno ? (
            <>
              <label className="form-label">
                <i className="bi bi-geo-alt me-2"></i>
                Fazenda <span className="text-danger">*</span>
              </label>
              <SelectDropdown
                value={formData.fazenda ? String(formData.fazenda) : ''}
                onChange={(v) => setFormData(prev => ({ ...prev, fazenda: Number(v) }))}
                options={(fazendas || []).map((f: any) => ({ value: String(f.id), label: f.name }))}
                placeholder="Selecione uma fazenda"
                error={getFieldError('fazenda') || customErrors.fazenda}
              />
            </>
          ) : (
            <>
              <label className="form-label">
                <i className="bi bi-person-badge me-2"></i>
                Fornecedor <span className="text-danger">*</span>
              </label>
              <SelectDropdown
                value={formData.fornecedor ? String(formData.fornecedor) : ''}
                onChange={(v) => setFormData(prev => ({ ...prev, fornecedor: Number(v) }))}
                options={(fornecedores || []).map((f: any) => ({ value: String(f.id), label: `${f.nome} (${f.cpf_cnpj || ''})` }))}
                placeholder="Selecione um fornecedor"
                error={getFieldError('fornecedor') || customErrors.fornecedor}
              />
            </>
          )}
        </div>

        {/* Nome */}
        <div className="col-12">
          <label className="form-label">
            <i className="bi bi-building me-2"></i>
            Nome do Local <span className="text-danger">*</span>
          </label>
          <input
            name="nome"
            id="nome"
            className={`form-control ${getFieldError('nome') || customErrors.nome ? 'is-invalid' : ''}`}
            value={formData.nome || ''}
            onChange={handleChange}
            placeholder="Ex: Silo 01, Armazém Central, Depósito Revenda..."
          />
          {(getFieldError('nome') || customErrors.nome) && (
            <div className="invalid-feedback">{getFieldError('nome') || customErrors.nome}</div>
          )}
        </div>

        {/* Tipo do local */}
        <div className="col-12 col-md-6">
          <label className="form-label">
            <i className="bi bi-folder me-2"></i>
            Tipo
          </label>
          <select name="tipo" className="form-select" value={formData.tipo} onChange={handleChange}>
            <option value="silo">Silo</option>
            <option value="armazem">Armazém</option>
            <option value="galpao">Galpão</option>
            <option value="depósito">Depósito</option>
            <option value="almoxerifado">Almoxarifado</option>
            <option value="barracao">Barracão</option>
            <option value="patio">Pátio</option>
            <option value="posto">Posto de Combustível</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        {/* Unidade de Capacidade */}
        <div className="col-12 col-md-6">
          <label className="form-label">
            <i className="bi bi-rulers me-2"></i>
            Unidade de Capacidade
          </label>
          <select name="unidade_capacidade" value={formData.unidade_capacidade} onChange={handleChange} className="form-select">
            {UNIDADES_CAPACIDADE.map(u => (
              <option key={u} value={u}>{getUnitLabel(u)}</option>
            ))}
          </select>
        </div>

        {/* Capacidade Máxima */}
        <div className="col-12 col-md-6">
          <label className="form-label">
            <i className="bi bi-123 me-2"></i>
            Capacidade Máxima
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="capacidade_total"
            className="form-control"
            value={formData.capacidade_total ?? ''}
            onChange={handleChange}
          />
        </div>

        {/* Ativo */}
        <div className="col-12">
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="ativo" name="ativo" checked={!!formData.ativo} onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))} />
            <label className="form-check-label" htmlFor="ativo">Ativo</label>
          </div>
        </div>

        {/* Buttons */}
        <div className="col-12">
          <div className="d-flex justify-content-end gap-2 mt-2">
            <button type="button" className="btn btn-secondary" onClick={() => onSuccess()}>
              <i className="bi bi-x-circle me-2"></i>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              <i className="bi bi-save me-2"></i>
              {local ? 'Atualizar' : 'Cadastrar'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default LocalArmazenagemForm;
