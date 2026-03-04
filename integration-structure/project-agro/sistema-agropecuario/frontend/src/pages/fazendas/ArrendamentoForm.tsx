import React, { useState, useEffect } from 'react';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useApiCreate, useApiUpdate, useApiQuery } from '../../hooks/useApi';
import type { Arrendamento, Proprietario, Fazenda, Area, AreaFeature } from '../../types';
import SelectDropdown from '../../components/common/SelectDropdown';
import DatePicker from '../../components/common/DatePicker';
import ErrorMessage from '../../components/common/ErrorMessage';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface ArrendamentoFormProps {
  arrendamento?: Arrendamento | null;
  onSuccess: () => void;
}

interface ArrendamentoFormData {
  arrendador: number;
  arrendatario: number;
  fazenda: number;
  areas: number[];
  start_date: string;
  end_date: string;
  custo_sacas_hectare: string;
  [key: string]: unknown;
}

const ArrendamentoForm: React.FC<ArrendamentoFormProps> = ({
  arrendamento,
  onSuccess
}) => {
  const [formData, setFormData] = useState<ArrendamentoFormData>({
    arrendador: 0,
    arrendatario: 0,
    fazenda: 0,
    areas: [],
    start_date: '',
    end_date: '',
    custo_sacas_hectare: ''
  });

  const [filteredAreas, setFilteredAreas] = useState<Area[]>([]);
  const [filteredFazendas, setFilteredFazendas] = useState<Fazenda[]>([]);

  const validationRules = {
    arrendador: { required: true },
    arrendatario: { required: true },
    fazenda: { required: true },
    areas: { required: true, minLength: 1 },
    start_date: { required: true },
    custo_sacas_hectare: { required: true, min: 0.01 }
  };

  const { validate, validateSingle, getFieldError, clearErrors } = useFormValidation(validationRules);
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  // Queries
  const { data: proprietarios = [], isLoading: loadingProprietarios } = useApiQuery<Proprietario[]>(
    ['proprietarios'],
    '/proprietarios/'
  );

  const { data: fazendas = [], isLoading: loadingFazendas } = useApiQuery<Fazenda[]>(
    ['fazendas'],
    '/fazendas/'
  );

  // Query áreas - API retorna GeoJSON FeatureCollection
  const { data: areasData, isLoading: loadingAreas } = useApiQuery<{ type: string; features: AreaFeature[] }>(
    ['areas'],
    '/areas/'
  );

  // Extrair áreas do GeoJSON FeatureCollection
  const allAreasArray: Area[] = (areasData?.features || []).map(feature => ({
    ...feature.properties,
    id: feature.id
  }));

  // Garantir que os dados sejam arrays
  const proprietariosArray = Array.isArray(proprietarios) ? proprietarios : [];
  const fazendasArray = Array.isArray(fazendas) ? fazendas : [];

  // Mutations
  const createMutation = useApiCreate('/arrendamentos/', [['arrendamentos']]);
  const updateMutation = useApiUpdate('/arrendamentos/', [['arrendamentos']]);

  useEffect(() => {
    if (arrendamento) {
      setFormData({
        arrendador: arrendamento.arrendador || 0,
        arrendatario: arrendamento.arrendatario || 0,
        fazenda: arrendamento.fazenda || 0,
        areas: arrendamento.areas || [],
        start_date: arrendamento.start_date || '',
        end_date: arrendamento.end_date || '',
        custo_sacas_hectare: arrendamento.custo_sacas_hectare?.toString() || ''
      });
      clearErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrendamento]);

  // Filtrar fazendas pelo arrendador selecionado
  useEffect(() => {
    if (formData.arrendador) {
      const fazendas = fazendasArray.filter(f => f.proprietario === formData.arrendador);
      setFilteredFazendas(fazendas);
      
      // Limpar fazenda selecionada se não pertencer ao arrendador
      if (formData.fazenda && !fazendas.some(f => f.id === formData.fazenda)) {
        // Mostrar alerta ao usuário
        if (arrendamento) {
          alert('Atenção: Ao mudar o arrendador, você precisa selecionar uma nova fazenda e áreas que pertencem a ele.');
        }
        setFormData(prev => ({ ...prev, fazenda: 0, areas: [] }));
      }
    } else {
      setFilteredFazendas([]);
      setFormData(prev => ({ ...prev, fazenda: 0, areas: [] }));
    }
  }, [formData.arrendador, fazendasArray, formData.fazenda]);

  // Filtrar áreas pela fazenda selecionada
  useEffect(() => {
    if (formData.fazenda && areasData?.features) {
      const areas = allAreasArray.filter(area => area.fazenda === formData.fazenda);
      setFilteredAreas(areas);
      
      // Limpar áreas selecionadas se não pertencerem à fazenda
      if (formData.areas.length > 0) {
        const validAreas = formData.areas.filter(areaId => 
          areas.some(a => a.id === areaId)
        );
        if (validAreas.length !== formData.areas.length) {
          setFormData(prev => ({ ...prev, areas: validAreas }));
        }
      }
    } else {
      setFilteredAreas([]);
    }
  }, [formData.fazenda, areasData, formData.areas]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateSingle(name, value);
  };

  const handleSelectChange = (name: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [name]: Number(value) }));
    validateSingle(name, value);

    // Validações customizadas
    if (name === 'arrendatario' && Number(value) === formData.arrendador) {
      setCustomErrors({ arrendatario: 'Arrendatário não pode ser o mesmo que arrendador' });
    } else if (name === 'arrendador' && Number(value) === formData.arrendatario) {
      setCustomErrors({ arrendador: 'Arrendador não pode ser o mesmo que arrendatário' });
    } else {
      setCustomErrors({});
    }
  };

  const handleDateChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    validateSingle(name, value);

    // Validar datas
    if (name === 'start_date' && formData.end_date) {
      if (new Date(value) >= new Date(formData.end_date)) {
        setCustomErrors({ start_date: 'Data de início deve ser anterior à data de fim' });
      } else {
        setCustomErrors({});
      }
    }
    if (name === 'end_date' && formData.start_date) {
      if (new Date(value) <= new Date(formData.start_date)) {
        setCustomErrors({ end_date: 'Data de fim deve ser posterior à data de início' });
      } else {
        setCustomErrors({});
      }
    }
  };

  const handleAreasChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const selectedAreas: number[] = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedAreas.push(Number(options[i].value));
      }
    }
    setFormData(prev => ({ ...prev, areas: selectedAreas }));
    validateSingle('areas', selectedAreas);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações customizadas
    if (formData.arrendador === formData.arrendatario) {
      setCustomErrors({ arrendatario: 'Arrendador e arrendatário não podem ser a mesma pessoa' });
      return;
    }

    if (formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
      setCustomErrors({ start_date: 'Data de início deve ser anterior à data de fim' });
      return;
    }

    if (formData.areas.length === 0) {
      setCustomErrors({ areas: 'Selecione ao menos uma área' });
      return;
    }

    if (!validate(formData)) {
      return;
    }

    try {
      const submitData = {
        arrendador: formData.arrendador,
        arrendatario: formData.arrendatario,
        fazenda: formData.fazenda,
        areas: formData.areas,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        custo_sacas_hectare: parseFloat(formData.custo_sacas_hectare)
      };

      if (arrendamento) {
        await updateMutation.mutateAsync({ id: arrendamento.id, ...submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar arrendamento:', error);
      
      // Mostrar erros de validação do backend
      if (error.response?.data) {
        const backendErrors = error.response.data;
        
        // Erros não relacionados a campos específicos
        if (backendErrors.non_field_errors) {
          alert('Erro de validação:\n\n' + backendErrors.non_field_errors.join('\n'));
        }
        
        // Erros em campos específicos
        const fieldErrors: any = {};
        Object.keys(backendErrors).forEach(field => {
          if (field !== 'non_field_errors') {
            fieldErrors[field] = Array.isArray(backendErrors[field]) 
              ? backendErrors[field].join('\n') 
              : backendErrors[field];
          }
        });
        
        if (Object.keys(fieldErrors).length > 0) {
          setCustomErrors(fieldErrors);
        }
      }
    }
  };

  const proprietarioOptions = proprietariosArray.map(p => ({
    value: p.id.toString(),
    label: `${p.nome} (${p.cpf_cnpj})`
  }));

  const fazendaOptions = filteredFazendas.map(f => ({
    value: f.id.toString(),
    label: `${f.name} (${f.matricula})`
  }));

  if (loadingProprietarios || loadingFazendas || loadingAreas) {
    return (
      <div className="d-flex justify-content-center py-5">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="card border-0 shadow-sm">
        <div className="card-body p-3 p-md-4">
          <div className="row g-2 g-md-3">
            {/* Arrendador */}
            <div className="col-md-6">
              <label className="form-label">
                <i className="bi bi-person-badge me-2"></i>
                Arrendador (proprietário da terra) <span className="text-danger">*</span>
              </label>
          <SelectDropdown
            value={formData.arrendador.toString()}
            onChange={(value) => handleSelectChange('arrendador', value)}
            options={proprietarioOptions}
            placeholder="Selecione o proprietário da terra"
            error={getFieldError('arrendador') || customErrors.arrendador}
          />
          <small className="form-text text-muted">
            Pessoa que é dona da terra e vai ceder para uso
          </small>
          {(getFieldError('arrendador') || customErrors.arrendador) && (
            <div className="text-danger small mt-1">{getFieldError('arrendador') || customErrors.arrendador}</div>
          )}
            </div>

            {/* Arrendatário */}
            <div className="col-md-6">
              <label className="form-label">
                <i className="bi bi-person-check me-2"></i>
                Arrendatário (produtor que usa/paga) <span className="text-danger">*</span>
              </label>
          <SelectDropdown
            value={formData.arrendatario.toString()}
            onChange={(value) => handleSelectChange('arrendatario', value)}
            options={proprietarioOptions}
            placeholder="Selecione quem vai usar a terra"
            error={getFieldError('arrendatario') || customErrors.arrendatario}
          />
          <small className="form-text text-muted">
            Produtor rural que vai pagar para cultivar na terra
          </small>
          {(getFieldError('arrendatario') || customErrors.arrendatario) && (
            <div className="text-danger small mt-1">{getFieldError('arrendatario') || customErrors.arrendatario}</div>
          )}
            </div>

            {/* Fazenda */}
            <div className="col-12">
              <label className="form-label">
                <i className="bi bi-house-door me-2"></i>
                Fazenda (do arrendador) <span className="text-danger">*</span>
              </label>
        <SelectDropdown
          value={formData.fazenda.toString()}
          onChange={(value) => handleSelectChange('fazenda', value)}
          options={fazendaOptions}
          placeholder={formData.arrendador ? "Selecione a fazenda" : "Selecione o arrendador primeiro"}
          error={getFieldError('fazenda')}
        />
        <small className="form-text text-muted">
          {formData.arrendador ? (
            <>
              <i className="bi bi-info-circle me-1"></i>
              Mostrando apenas fazendas do arrendador selecionado ({filteredFazendas.length} disponível{filteredFazendas.length !== 1 ? 'is' : ''})
            </>
          ) : (
            <>
              <i className="bi bi-exclamation-circle me-1"></i>
              Selecione primeiro o arrendador (proprietário da terra)
            </>
          )}
        </small>
        {getFieldError('fazenda') && (
          <div className="text-danger small mt-1">{getFieldError('fazenda')}</div>
        )}
            </div>

            {/* Áreas (multi-select) */}
            <div className="col-12">
              <label className="form-label">
                <i className="bi bi-map me-2"></i>
                Áreas que serão arrendadas <span className="text-danger">*</span>
              </label>
        <select
          className={`form-select ${getFieldError('areas') || customErrors.areas ? 'is-invalid' : ''}`}
          multiple
          size={5}
          value={formData.areas.map(a => a.toString())}
          onChange={handleAreasChange}
          disabled={!formData.fazenda}
        >
          {filteredAreas.length === 0 ? (
            <option disabled>Selecione uma fazenda primeiro</option>
          ) : (
            filteredAreas.map(area => (
              <option key={area.id} value={area.id}>
                {area.name} ({area.area_hectares ? `${area.area_hectares} ha` : 'Área não calculada'})
              </option>
            ))
          )}
        </select>
        {(getFieldError('areas') || customErrors.areas) && (
          <div className="invalid-feedback d-block">{getFieldError('areas') || customErrors.areas}</div>
        )}
        <small className="form-text text-muted">
          <i className="bi bi-info-circle me-1"></i>
          Segure Ctrl (Cmd no Mac) para selecionar múltiplas áreas da fazenda
        </small>
            </div>

            {/* Data Início */}
            <div className="col-md-6">
              <label className="form-label">
                <i className="bi bi-calendar-event me-2"></i>
                Data de Início <span className="text-danger">*</span>
              </label>
          <DatePicker
            value={formData.start_date}
            onChange={(value) => handleDateChange('start_date', value)}
            error={getFieldError('start_date') || customErrors.start_date || undefined}
          />
          {(getFieldError('start_date') || customErrors.start_date) && (
            <div className="text-danger small mt-1">{getFieldError('start_date') || customErrors.start_date}</div>
          )}
            </div>

            {/* Data Fim */}
            <div className="col-md-6">
              <label className="form-label">
                <i className="bi bi-calendar-check me-2"></i>
                Data de Fim (opcional)
              </label>
          <DatePicker
            value={formData.end_date}
            onChange={(value) => handleDateChange('end_date', value)}
            error={getFieldError('end_date') || customErrors.end_date || undefined}
          />
          {(getFieldError('end_date') || customErrors.end_date) && (
            <div className="text-danger small mt-1">{getFieldError('end_date') || customErrors.end_date}</div>
          )}
            </div>

            {/* Custo em Sacas/Hectare */}
            <div className="col-md-6">
              <label htmlFor="custo_sacas_hectare" className="form-label">
                <i className="bi bi-cash-coin me-2"></i>
                Custo do Arrendamento (sacas/hectare) <span className="text-danger">*</span>
              </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          className={`form-control ${getFieldError('custo_sacas_hectare') ? 'is-invalid' : ''}`}
          id="custo_sacas_hectare"
          name="custo_sacas_hectare"
          value={formData.custo_sacas_hectare}
          onChange={handleInputChange}
          placeholder="Ex: 8.5"
        />
        {getFieldError('custo_sacas_hectare') && (
          <div className="invalid-feedback">{getFieldError('custo_sacas_hectare')}</div>
        )}
        <small className="form-text text-muted">
          <i className="bi bi-info-circle me-1"></i>
          Valor que o <strong>arrendatário paga</strong> ao arrendador, em sacas de soja por hectare
        </small>
            </div>

            {/* Custo Total (calculado pelo backend) */}
            {arrendamento?.custo_total_atual && (
              <div className="col-12">
                <div className="alert alert-info mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  <strong>Custo Total Estimado:</strong> R$ {arrendamento.custo_total_atual.toFixed(2)}
                  <br />
                  <small>Baseado na cotação mais recente da saca de soja</small>
                </div>
              </div>
            )}

            {/* Error Message */}
            {(createMutation.isError || updateMutation.isError) && (
              <div className="col-12">
                <ErrorMessage
                  message={
                    (createMutation.error as any)?.message ||
                    (updateMutation.error as any)?.message ||
                    'Erro ao salvar arrendamento'
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="card-footer bg-transparent border-top pt-3">
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              onClick={onSuccess}
              className="btn btn-secondary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <i className="bi bi-x-circle me-2"></i>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Salvando...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  {arrendamento ? 'Atualizar' : 'Salvar'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default ArrendamentoForm;
