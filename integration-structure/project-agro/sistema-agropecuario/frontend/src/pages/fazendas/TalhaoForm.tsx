import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useApiCreate, useApiUpdate, useApiQuery } from '../../hooks/useApi';
import api from '../../services/api';
import type { Talhao, Area, AreaFeature } from '../../types';
import SelectDropdown from '../../components/common/SelectDropdown';
import ErrorMessage from '../../components/common/ErrorMessage';
import LoadingSpinner from '../../components/common/LoadingSpinner';

interface TalhaoFormProps {
  talhao?: Talhao | null;
  onSuccess: () => void;
}

interface TalhaoFormData {
  area: number;
  name: string;
  area_size: string;
  [key: string]: unknown;
}

const TalhaoForm: React.FC<TalhaoFormProps> = ({
  talhao,
  onSuccess
}) => {
  const [formData, setFormData] = useState<TalhaoFormData>({
    area: 0,
    name: '',
    area_size: ''
  });

  const [showManualGeometry, setShowManualGeometry] = useState(false);
  const [geometryInput, setGeometryInput] = useState('');
  const [kmlFile, setKmlFile] = useState<File | null>(null);
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});

  // Regras de validação dinâmicas baseadas em KML
  const getValidationRules = () => {
    const rules: any = {
      area: { required: true },
      name: { required: true, minLength: 2, maxLength: 200 }
    };
    
    // area_size só é obrigatório se não houver KML
    if (!kmlFile) {
      rules.area_size = { required: true, min: 0.01 };
    }
    
    return rules;
  };

  const { validate, validateSingle, getFieldError, clearErrors } = useFormValidation(getValidationRules());

  // Query áreas - API retorna GeoJSON FeatureCollection
  const { data: areasData, isLoading: loadingAreas } = useApiQuery<{ type: string; features: AreaFeature[] }>(
    ['areas'],
    '/areas/'
  );

  // Extrair áreas do GeoJSON FeatureCollection
  const areas: Area[] = (areasData?.features || []).map(feature => ({
    ...feature.properties,
    id: feature.id
  }));

  // Mutations
  const queryClient = useQueryClient();
  const createMutation = useApiCreate('/talhoes/', [['talhoes']]);
  const updateMutation = useApiUpdate('/talhoes/', [['talhoes']]);
  const toast = useToast();

  useEffect(() => {
    if (talhao) {
      setFormData({
        area: talhao.area || 0,
        name: talhao.name,
        area_size: talhao.area_size?.toString() || ''
      });
      clearErrors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talhao]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateSingle(name, value);
  };

  const handleAreaChange = (value: string | number) => {
    setFormData(prev => ({ ...prev, area: Number(value) }));
    validateSingle('area', value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate(formData)) {
      return;
    }

    try {
      const submitFormData = new FormData();
      submitFormData.append('area', formData.area.toString());
      submitFormData.append('name', formData.name);
      
      // Adicionar KML se fornecido
      if (kmlFile) {
        submitFormData.append('kml_file', kmlFile);
      }
      // Se não tem KML mas tem area_size, enviar como area_size_manual
      else if (formData.area_size && formData.area_size.trim() !== '') {
        submitFormData.append('area_size_manual', formData.area_size);
      }

      // Use mutations (supporting FormData) to keep behavior consistent
      if (talhao) {
        // useApiUpdate expects { id, ...data } and supports formData via data.formData
        await updateMutation.mutateAsync({ id: talhao.id, formData: submitFormData as any });
        toast.showSuccess('Talhão atualizado com sucesso');
      } else {
        // For create, pass FormData directly
        await createMutation.mutateAsync(submitFormData as any);
        toast.showSuccess('Talhão criado com sucesso');
      }

      // Invalidar queries para atualizar listas
      queryClient.invalidateQueries({ queryKey: ['talhoes'] });
      queryClient.invalidateQueries({ queryKey: ['areas'] });

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar talhão:', error);
      console.error('Resposta do backend:', error.response?.data);
      console.error('Status:', error.response?.status);
      
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

  const areaOptions = areas.map(area => ({
    value: area.id.toString(),
    label: `${area.name} - ${area.fazenda_detail?.name || 'Fazenda'}`,
    group: area.fazenda_detail?.name
  }));

  if (loadingAreas) {
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
            {/* SelectFK Área */}
            <div className="col-12">
              <label className="form-label">
                <i className="bi bi-map me-2"></i>
                Área <span className="text-danger">*</span>
              </label>
        <SelectDropdown
          value={formData.area.toString()}
          onChange={handleAreaChange}
          options={areaOptions}
          placeholder="Selecione uma área"
          error={getFieldError('area') || customErrors.area}
        />
        {(getFieldError('area') || customErrors.area) && (
          <div className="text-danger small mt-1">{getFieldError('area') || customErrors.area}</div>
        )}
            </div>

            {/* Nome do Talhão */}
            <div className="col-md-6">
              <label htmlFor="name" className="form-label">
                <i className="bi bi-geo-alt me-2"></i>
                Nome do Talhão <span className="text-danger">*</span>
              </label>
        <input
          type="text"
          className={`form-control ${getFieldError('name') || customErrors.name ? 'is-invalid' : ''}`}
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Ex: Talhão A1"
        />
        {(getFieldError('name') || customErrors.name) && (
          <div className="invalid-feedback">{getFieldError('name') || customErrors.name}</div>
        )}
            </div>

            {/* Tamanho em Hectares */}
            <div className="col-md-6">
              <label htmlFor="area_size" className="form-label">
                <i className="bi bi-rulers me-2"></i>
                Tamanho (hectares) {!kmlFile && <span className="text-danger">*</span>}
              </label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          className={`form-control ${getFieldError('area_size') || customErrors.area_size ? 'is-invalid' : ''}`}
          id="area_size"
          name="area_size"
          value={formData.area_size}
          onChange={handleInputChange}
          placeholder="Ex: 25.50"
          disabled={!!kmlFile}
        />
        {(getFieldError('area_size') || customErrors.area_size) && (
          <div className="invalid-feedback">{getFieldError('area_size') || customErrors.area_size}</div>
        )}
        <small className="form-text text-muted">
          {kmlFile ? 'Área será calculada automaticamente do arquivo KML' : 'Área em hectares deste talhão (obrigatório se não fornecer KML)'}
        </small>
            </div>

            {/* Geometria - Upload KML */}
            <div className="col-12">
              <label className="form-label">
                <i className="bi bi-map me-2"></i>
                Geometria do Talhão (Opcional)
              </label>
        <div className="border rounded p-3 bg-light">
          {/* Upload KML */}
          <div className="mb-3">
            <label htmlFor="kml_file" className="form-label">
              <i className="bi bi-file-earmark-arrow-up me-2"></i>
              Upload de arquivo KML
            </label>
            <input
              type="file"
              className="form-control"
              id="kml_file"
              accept=".kml,.kmz"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setKmlFile(file);
                // Se selecionou KML, limpar area_size
                if (file) {
                  setFormData(prev => ({ ...prev, area_size: '' }));
                }
              }}
            />
            <small className="form-text text-muted">
              {kmlFile ? (
                <span className="text-success">
                  <i className="bi bi-check-circle me-1"></i>
                  Arquivo selecionado: {kmlFile.name} - A área será calculada automaticamente
                </span>
              ) : (
                'Importe um arquivo KML/KMZ com o polígono do talhão (geometria da área de trabalho agrícola)'
              )}
            </small>
          </div>

          {/* Botão para mostrar entrada manual */}
          <div className="d-flex justify-content-center">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setShowManualGeometry(!showManualGeometry)}
            >
              <i className="bi bi-code-square me-2"></i>
              {showManualGeometry ? 'Ocultar entrada manual' : 'Inserir código de polígono manualmente'}
            </button>
          </div>

          {/* Entrada Manual de Geometria */}
          {showManualGeometry && (
            <div className="mt-3">
              <label htmlFor="geometry_input" className="form-label">
                Código WKT do Polígono
              </label>
              <textarea
                className="form-control font-monospace"
                id="geometry_input"
                rows={6}
                value={geometryInput}
                onChange={(e) => setGeometryInput(e.target.value)}
                placeholder="POLYGON((longitude latitude, longitude latitude, ...))"
              />
              <small className="form-text text-muted">
                <strong>Exemplo de formato WKT (Well-Known Text):</strong>
                <br />
                <code className="d-block bg-white p-2 mt-1 rounded border">
                  POLYGON((-47.8919 -15.7942, -47.8919 -15.8042, -47.8819 -15.8042, -47.8819 -15.7942, -47.8919 -15.7942))
                </code>
                <br />
                O primeiro e último ponto devem ser iguais para fechar o polígono.
              </small>
            </div>
          )}
        </div>
            </div>

            {/* Error Message */}
            {(createMutation.isError || updateMutation.isError) && (
              <div className="col-12">
                <ErrorMessage
                  message={
                    (createMutation.error as any)?.message ||
                    (updateMutation.error as any)?.message ||
                    'Erro ao salvar talhão'
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
                  {talhao ? 'Atualizar' : 'Salvar'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default TalhaoForm;
