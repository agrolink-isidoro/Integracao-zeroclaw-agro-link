import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useApiCreate, useApiUpdate, useApiQuery } from '../../hooks/useApi';
import type { Arrendamento, Proprietario, Fazenda, Area, AreaFeature } from '../../types';
import SelectDropdown from '../../components/common/SelectDropdown';
import DatePicker from '../../components/common/DatePicker';
import ErrorMessage from '../../components/common/ErrorMessage';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface Talhao {
  id: number;
  name: string;
  area_id: number;
  area_name: string;
  area_size: number | null;
}

interface ArrendamentoFormProps {
  arrendamento?: Arrendamento | null;
  onSuccess: () => void;
}

interface ArrendamentoFormData {
  arrendador: number;
  arrendatario: number;
  fazenda: number;
  talhoes: number[];
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
    talhoes: [],
    start_date: '',
    end_date: '',
    custo_sacas_hectare: ''
  });

  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});
  const [invalidTalhoesWarning, setInvalidTalhoesWarning] = useState<string>('');

  const validationRules = {
    arrendador: { required: true },
    arrendatario: { required: true },
    fazenda: { required: true },
    talhoes: { required: true, minLength: 1 },
    start_date: { required: true },
    custo_sacas_hectare: { required: true, min: 0.01 }
  };

  const { validate, validateSingle, getFieldError, clearErrors } = useFormValidation(validationRules);

  // Queries
  const { data: proprietarios = [] } = useApiQuery<Proprietario[]>(
    ['proprietarios'],
    '/proprietarios/'
  );

  const { data: fazendas = [] } = useApiQuery<Fazenda[]>(
    ['fazendas'],
    '/fazendas/'
  );

  const { data: talhoes = [] } = useApiQuery<Talhao[]>(
    ['talhoes'],
    '/talhoes/'
  );

  // Garantir arrays
  const proprietariosArray = Array.isArray(proprietarios) ? proprietarios : [];
  const fazendasArray = Array.isArray(fazendas) ? fazendas : [];
  const talhoesArray = Array.isArray(talhoes) ? talhoes : [];

  // Debug: Monitorar carregamento de fazendas e áreas
  useEffect(() => {
    if (fazendasArray.length > 0) {
      console.log('Fazendas carregadas:', fazendasArray.map(f => ({
        id: f.id,
        name: f.name,
        areas_count: Array.isArray(f.areas) ? f.areas.length : 0,
        areas: f.areas
      })));
    }
  }, [fazendasArray]);

  // Re-validar talhões quando fazendas são carregadas (em caso de race condition)
  useEffect(() => {
    if (formData.fazenda && formData.talhoes.length > 0 && fazendasArray.length > 0) {
      const fazenda_obj: any = fazendasArray.find(f => f.id === formData.fazenda);
      if (fazenda_obj && fazenda_obj.areas_ids) {
        const fazendasAreaIds = fazenda_obj.areas_ids;
        const invalidTalhoes = formData.talhoes.filter(id => !fazendasAreaIds.includes(id));
        
        if (invalidTalhoes.length > 0) {
          const msg = `⚠️ Detectados ${invalidTalhoes.length} talhão(ões) que não pertencem à fazenda selecionada. Foram removidos automaticamente.`;
          setInvalidTalhoesWarning(msg);
          console.warn(msg);
          setFormData(prev => ({ ...prev, talhoes: [] }));
        } else {
          setInvalidTalhoesWarning('');
        }
      }
    }
  }, [fazendasArray, formData.fazenda]);

  // Mutations
  const createMutation = useApiCreate('/arrendamentos/', [['arrendamentos']]);
  const updateMutation = useApiUpdate('/arrendamentos/', [['arrendamentos']]);

  // Inicializar form data quando arrendamento muda
  useEffect(() => {
    if (arrendamento) {
      const fazendaId = arrendamento.fazenda || 0;
      const areaIds = arrendamento.areas || [];
      
      // Validação: Verificar se as áreas carregadas pertencem à fazenda
      const fazenda_obj: any = fazendasArray.find(f => f.id === fazendaId);
      let validTalhoes = areaIds;
      
      if (fazenda_obj && fazenda_obj.areas_ids) {
        const fazendasAreaIds = fazenda_obj.areas_ids;
        const invalidTalhoes = areaIds.filter(id => !fazendasAreaIds.includes(id));
        
        if (invalidTalhoes.length > 0) {
          const msg = `⚠️ Detectados ${invalidTalhoes.length} talhão(ões) que não pertencem à fazenda selecionada. Foram removidos automaticamente.`;
          setInvalidTalhoesWarning(msg);
          console.warn(msg);
          validTalhoes = areaIds.filter(id => fazendasAreaIds.includes(id));
        } else {
          setInvalidTalhoesWarning('');
        }
      }
      
      setFormData({
        arrendador: arrendamento.arrendador || 0,
        arrendatario: arrendamento.arrendatario || 0,
        fazenda: fazendaId,
        talhoes: validTalhoes,
        start_date: arrendamento.start_date || '',
        end_date: arrendamento.end_date || '',
        custo_sacas_hectare: arrendamento.custo_sacas_hectare?.toString() || ''
      });
      clearErrors();
    }
  }, [arrendamento, fazendasArray, clearErrors]);

  // Filtrar fazendas - usando useMemo para evitar re-renders desnecessários
  const filteredFazendas = useMemo(() => {
    if (!formData.arrendador) return [];
    return fazendasArray.filter(f => f.proprietario === formData.arrendador);
  }, [formData.arrendador, fazendasArray]);

  // Filtrar talhões - usando useMemo para evitar re-renders desnecessários
  const filteredTalhoes = useMemo(() => {
    if (!formData.fazenda) return [];
    
    // Buscar a fazenda selecionada
    const fazenda_obj: any = fazendasArray.find(f => f.id === formData.fazenda);
    if (!fazenda_obj) return [];
    
    // Obter IDs de todas as áreas que pertencem à fazenda
    // O backend retorna areas_ids como um array simples de IDs para facilitar filtragem
    const areaIds = fazenda_obj.areas_ids || [];
    
    // Rastreamento: Talhão → area_id → Área (que pertence à Fazenda)
    // Filtrar apenas talhões que tem area_id válido vinculado à fazenda
    if (areaIds.length > 0) {
      return talhoesArray.filter(t => areaIds.includes(t.area_id));
    }
    
    // Se não há áreas carregadas, tentar fallback por fazenda_id se existir
    // Alguns APIs retornam fazenda_id diretamente no Talhão
    const hasDirectFazendaId = talhoesArray.length > 0 && 'fazenda_id' in talhoesArray[0];
    if (hasDirectFazendaId) {
      console.info(`Fallback: filtrando talhões por fazenda_id (áreas não carregadas para fazenda ${formData.fazenda})`);
      return talhoesArray.filter(t => (t as any).fazenda_id === formData.fazenda);
    }
    
    // Se não conseguimos rastrear a relação, não mostrar talhões para evitar dados inválidos
    console.warn(`Aviso: Não foi possível filtrar talhões para fazenda ${formData.fazenda}. Áreas não carregadas ([${areaIds}]) e talhões não têm fazenda_id.`);
    return [];
  }, [formData.fazenda, fazendasArray, talhoesArray]);

  // Callback para mudar fazenda - limpa talhões se necessário
  const handleFazendaChange = useCallback((value: string | number) => {
    const newFazendaId = Number(value);
    setFormData(prev => ({ 
      ...prev, 
      fazenda: newFazendaId,
      talhoes: [] // Limpar talhões ao mudar fazenda
    }));
    validateSingle('fazenda', value);
  }, [validateSingle]);

  // Callback para mudar arrendador - limpa fazenda e talhões
  const handleArrendadorChange = useCallback((value: string | number) => {
    const arrendadorId = Number(value);
    setFormData(prev => ({ 
      ...prev, 
      arrendador: arrendadorId,
      fazenda: 0,
      talhoes: []
    }));
    validateSingle('arrendador', value);
    
    // Validação customizada
    if (arrendadorId === formData.arrendatario) {
      setCustomErrors({ arrendador: 'Arrendador não pode ser o mesmo que arrendatário' });
    } else {
      setCustomErrors({});
    }
  }, [formData.arrendatario, validateSingle]);

  // Callback para mudar arrendatário
  const handleArrendatarioChange = useCallback((value: string | number) => {
    const arrendatarioId = Number(value);
    setFormData(prev => ({ ...prev, arrendatario: arrendatarioId }));
    validateSingle('arrendatario', value);
    
    // Validação customizada
    if (arrendatarioId === formData.arrendador) {
      setCustomErrors({ arrendatario: 'Arrendatário não pode ser o mesmo que arrendador' });
    } else {
      setCustomErrors({});
    }
  }, [formData.arrendador, validateSingle]);

  // Callback para mudar talhões
  const handleTalhoesChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const selectedTalhoes: number[] = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedTalhoes.push(Number(options[i].value));
      }
    }
    setFormData(prev => ({ ...prev, talhoes: selectedTalhoes }));
    validateSingle('talhoes', selectedTalhoes);
  }, [validateSingle]);

  // Callback para mudar input
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateSingle(name, value);
  }, [validateSingle]);

  // Callback para mudar data
  const handleDateChange = useCallback((name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    validateSingle(name, value);

    // Validar datas
    if (name === 'start_date' && formData.end_date) {
      if (new Date(value) >= new Date(formData.end_date)) {
        setCustomErrors(prev => ({ ...prev, start_date: 'Data de início deve ser anterior à data de fim' }));
      } else {
        setCustomErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.start_date;
          return newErrors;
        });
      }
    }
    if (name === 'end_date' && formData.start_date) {
      if (new Date(value) <= new Date(formData.start_date)) {
        setCustomErrors(prev => ({ ...prev, end_date: 'Data de fim deve ser posterior à data de início' }));
      } else {
        setCustomErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.end_date;
          return newErrors;
        });
      }
    }
  }, [formData.end_date, formData.start_date, validateSingle]);

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

    if (formData.talhoes.length === 0) {
      setCustomErrors({ talhoes: 'Selecione ao menos um talhão' });
      return;
    }

    if (!validate(formData)) {
      return;
    }

    try {
      // Converter Talhão IDs para Area IDs
      const areaIds = formData.talhoes.map(talhaoId => {
        const talhao = talhoesArray.find(t => t.id === talhaoId);
        return talhao ?  talhao.area_id : null;
      }).filter(id => id !== null);

      // Debug: Log dos dados antes de enviar
      const submitData = {
        arrendador: formData.arrendador,
        arrendatario: formData.arrendatario,
        fazenda: formData.fazenda,
        areas: areaIds, // Agora é Array de Area IDs, não Talhão IDs
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        custo_sacas_hectare: parseFloat(formData.custo_sacas_hectare)
      };
      
      console.log('Antes de enviar:', {
        fazenda_id: formData.fazenda,
        talhao_ids: formData.talhoes,
        area_ids: areaIds,
        talhao_detalhes: formData.talhoes.map(id => {
          const t = talhoesArray.find(t => t.id === id);
          return t ? `${t.name} (area_id: ${t.area_id})` : `ID ${id} não encontrado`;
        })
      });

      if (arrendamento) {
        await updateMutation.mutateAsync({ id: arrendamento.id, ...submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar arrendamento:', error);
      
      if (error.response?.data) {
        const backendErrors = error.response.data;
        
        if (backendErrors.non_field_errors) {
          alert('Erro de validação:\n\n' + backendErrors.non_field_errors.join('\n'));
        }
        
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

  const proprietarioOptions = useMemo(() => 
    proprietariosArray.map(p => ({
      value: p.id.toString(),
      label: `${p.nome} (${p.cpf_cnpj})`
    })), 
    [proprietariosArray]
  );

  const fazendaOptions = useMemo(() =>
    filteredFazendas.map(f => ({
      value: f.id.toString(),
      label: `${f.name} (${f.matricula})`
    })),
    [filteredFazendas]
  );

  const talhoesOptions = useMemo(() =>
    filteredTalhoes.map(t => ({
      value: t.id.toString(),
      label: `${t.name} - ${t.area_name} ${t.area_size ? `(${t.area_size} ha)` : ''}`
    })),
    [filteredTalhoes]
  );

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
                onChange={(value) => handleArrendadorChange(value)}
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
                onChange={(value) => handleArrendatarioChange(value)}
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
                onChange={(value) => handleFazendaChange(value)}
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

            {/* Talhões (multi-select) */}
            <div className="col-12">
              {invalidTalhoesWarning && (
                <div className="alert alert-warning mb-2">
                  {invalidTalhoesWarning}
                </div>
              )}
              <label className="form-label">
                <i className="bi bi-grid-3x3-gap me-2"></i>
                Talhões que serão arrendados <span className="text-danger">*</span>
              </label>
              <select
                className={`form-select ${getFieldError('talhoes') || customErrors.talhoes ? 'is-invalid' : ''}`}
                multiple
                size={Math.min(5, Math.max(2, filteredTalhoes.length || 3))}
                value={formData.talhoes.map(t => t.toString())}
                onChange={handleTalhoesChange}
                disabled={!formData.fazenda}
              >
                {!formData.fazenda ? (
                  <option disabled>Selecione uma fazenda primeiro</option>
                ) : filteredTalhoes.length === 0 ? (
                  <option disabled>Nenhum talhão disponível para esta fazenda</option>
                ) : (
                  filteredTalhoes.map(talhao => (
                    <option key={talhao.id} value={talhao.id}>
                      {talhao.name} {talhao.area_name ? `- ${talhao.area_name}` : ''} {talhao.area_size ? `(${talhao.area_size} ha)` : ''}
                    </option>
                  ))
                )}
              </select>
              {(getFieldError('talhoes') || customErrors.talhoes) && (
                <div className="invalid-feedback d-block">{getFieldError('talhoes') || customErrors.talhoes}</div>
              )}
              <small className="form-text text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Segure Ctrl (Cmd no Mac) para selecionar múltiplos talhões da fazenda
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
