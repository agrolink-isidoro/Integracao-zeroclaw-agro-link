import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiCreate, useApiUpdate, useApiQuery } from '../../hooks/useApi';
import api from '../../services/api';
import type { Area, Proprietario, Fazenda } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { TIPO_AREA_CHOICES } from '../../utils/constants';

interface AreasFormProps {
  area?: Area;
  onSuccess: () => void;
  onCancel: () => void;
}

const AreasForm: React.FC<AreasFormProps> = ({ area, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    proprietario: '',
    fazenda: '',
    name: '',
    tipo: 'propria' as 'propria' | 'arrendada',
    geom: '',
    custo_arrendamento: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showManualGeometry, setShowManualGeometry] = useState(false);
  const [geometryInput, setGeometryInput] = useState('');
  const [kmlFile, setKmlFile] = useState<File | null>(null);
  const [areaHectaresManual, setAreaHectaresManual] = useState<string>('');

  // Queries
  const { data: proprietarios = [], isLoading: loadingProprietarios } = useApiQuery<Proprietario[]>(
    ['proprietarios'],
    '/proprietarios/'
  );

  const { data: fazendas = [], isLoading: loadingFazendas } = useApiQuery<Fazenda[]>(
    ['fazendas'],
    '/fazendas/'
  );

  // Mutations
  const queryClient = useQueryClient();
  const createMutation = useApiCreate(
    '/areas/',
    [['areas']]
  );

  const updateMutation = useApiUpdate(
    '/areas/',
    [['areas']]
  );

  // Initialize form data when editing
  useEffect(() => {
    if (area) {
      setFormData({
        proprietario: area.proprietario?.toString() || '',
        fazenda: area.fazenda.toString(),
        name: area.name,
        tipo: (area.tipo as 'propria' | 'arrendada') || 'propria',
        geom: area.geom || '',
        custo_arrendamento: area.custo_arrendamento?.toString() || ''
      });
    }
  }, [area]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.proprietario || formData.proprietario === '' || formData.proprietario === '0') {
      newErrors.proprietario = 'Proprietário é obrigatório';
    }
    if (!formData.fazenda || formData.fazenda === '' || formData.fazenda === '0') {
      newErrors.fazenda = 'Fazenda é obrigatória';
    }
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.tipo) newErrors.tipo = 'Tipo é obrigatório';

    if (formData.tipo === 'arrendada' && !formData.custo_arrendamento) {
      newErrors.custo_arrendamento = 'Custo de arrendamento é obrigatório para áreas arrendadas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Use FormData if there's a KML file to upload or manual hectares
    if (kmlFile || areaHectaresManual) {
      const formDataToSend = new FormData();
      formDataToSend.append('proprietario', formData.proprietario);
      formDataToSend.append('fazenda', formData.fazenda);
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('tipo', formData.tipo);
      if (formData.custo_arrendamento && formData.tipo === 'arrendada') {
        formDataToSend.append('custo_arrendamento', formData.custo_arrendamento);
      }
      if (kmlFile) {
        formDataToSend.append('kml_file', kmlFile);
      }
      if (areaHectaresManual && !kmlFile) {
        formDataToSend.append('area_hectares_manual', areaHectaresManual);
      }

      try {
        if (area?.id) {
          await api.put(`/areas/${area.id}/`, formDataToSend, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else {
          await api.post('/areas/', formDataToSend, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
        
        // Invalidar queries para atualizar listas
        queryClient.invalidateQueries({ queryKey: ['areas'] });
        
        onSuccess();
      } catch (error: unknown) {
        console.error('Error saving area:', error);
        const err = error as { response?: { data?: Record<string, string> } };
        if (err.response?.data) {
          setErrors(err.response.data);
        }
      }
    } else {
      // Regular JSON submission
      const submitData = {
        id: area?.id,
        proprietario: parseInt(formData.proprietario),
        fazenda: parseInt(formData.fazenda),
        name: formData.name.trim(),
        tipo: formData.tipo,
        geom: formData.geom || null,
        custo_arrendamento: formData.tipo === 'arrendada' ? parseFloat(formData.custo_arrendamento) : null
      };

      try {
        if (area) {
          if (!area.id) throw new Error('ID da área não encontrado');
          await updateMutation.mutateAsync({ ...submitData, id: area.id });
        } else {
          await createMutation.mutateAsync(submitData);
        }
        onSuccess();
      } catch (error: unknown) {
        console.error('Error saving area:', error);
        const err = error as { response?: { data?: Record<string, string> } };
        if (err.response?.data) {
          setErrors(err.response.data);
        }
      }
    }
  };

  if (loadingProprietarios || loadingFazendas) {
    return <LoadingSpinner />;
  }

  // Get all error messages
  const errorMessages = Object.entries(errors)
    .filter(([, value]) => value)
    .map(([, value]) => {
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return String(value);
    });

  return (
    <form onSubmit={handleSubmit}>
      <div className="card border-0 shadow-sm">
        <div className="card-body p-3 p-md-4">
          {/* Error Alert */}
          {errorMessages.length > 0 && (
            <div className="alert alert-danger mb-3">
              <h6 className="alert-heading">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Erros de validação:
              </h6>
              <ul className="mb-0">
                {errorMessages.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="row g-2 g-md-3">
            {/* Proprietário */}
            <div className="col-md-6">
              <label htmlFor="proprietario" className="form-label">
                <i className="bi bi-person-badge me-2"></i>
                Proprietário *
              </label>
          <select
            id="proprietario"
            name="proprietario"
            value={formData.proprietario}
            onChange={handleInputChange}
            className={`form-select ${errors.proprietario ? 'is-invalid' : ''}`}
          >
            <option value="">Selecione um proprietário</option>
            {proprietarios.map(prop => (
              <option key={prop.id} value={prop.id}>
                {prop.nome} ({prop.cpf_cnpj})
              </option>
            ))}
          </select>
          {errors.proprietario && (
            <div className="invalid-feedback d-block">{errors.proprietario}</div>
          )}
        </div>

            {/* Fazenda */}
            <div className="col-md-6">
              <label htmlFor="fazenda" className="form-label">
                <i className="bi bi-house-door me-2"></i>
                Fazenda *
              </label>
          <select
            id="fazenda"
            name="fazenda"
            value={formData.fazenda}
            onChange={handleInputChange}
            className={`form-select ${errors.fazenda ? 'is-invalid' : ''}`}
          >
            <option value="">Selecione uma fazenda</option>
            {fazendas.map(faz => (
              <option key={faz.id} value={faz.id}>
                {faz.name} ({faz.matricula})
              </option>
            ))}
          </select>
          {errors.fazenda && (
            <div className="invalid-feedback d-block">{errors.fazenda}</div>
          )}
        </div>

            {/* Nome */}
            <div className="col-md-6">
              <label htmlFor="name" className="form-label">
                <i className="bi bi-map me-2"></i>
                Nome da Área *
              </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
            placeholder="Ex: Área Norte, Talhão 1"
          />
          {errors.name && (
            <div className="invalid-feedback">{errors.name}</div>
          )}
        </div>

            {/* Tipo */}
            <div className="col-md-6">
              <label htmlFor="tipo" className="form-label">
                <i className="bi bi-tag me-2"></i>
                Tipo *
              </label>
          <select
            id="tipo"
            name="tipo"
            value={formData.tipo}
            onChange={handleInputChange}
            className={`form-select ${errors.tipo ? 'is-invalid' : ''}`}
          >
            {TIPO_AREA_CHOICES.map(choice => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
          {errors.tipo && (
            <div className="invalid-feedback">{errors.tipo}</div>
          )}
        </div>

            {/* Custo de Arrendamento */}
            {formData.tipo === 'arrendada' && (
              <div className="col-md-6">
                <label htmlFor="custo_arrendamento" className="form-label">
                  <i className="bi bi-cash-coin me-2"></i>
                  Custo de Arrendamento (sacas/ha) *
                </label>
            <input
              type="number"
              id="custo_arrendamento"
              name="custo_arrendamento"
              value={formData.custo_arrendamento}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className={`form-control ${errors.custo_arrendamento ? 'is-invalid' : ''}`}
              placeholder="Ex: 2.5"
            />
            {errors.custo_arrendamento && (
              <div className="invalid-feedback">{errors.custo_arrendamento}</div>
            )}
          </div>
        )}

        {/* Área em Hectares (Manual) */}
        <div className="col-md-6">
          <label htmlFor="area_hectares_manual" className="form-label">
            <i className="bi bi-rulers me-2"></i>
            Área em Hectares (Opcional)
          </label>
          <input
            type="number"
            id="area_hectares_manual"
            value={areaHectaresManual}
            onChange={(e) => setAreaHectaresManual(e.target.value)}
            step="0.01"
            min="0"
            className="form-control"
            placeholder="Ex: 50.75"
            disabled={!!kmlFile}
          />
          <div className="form-text">
            {kmlFile ? (
              <span className="text-warning">
                <i className="bi bi-exclamation-triangle me-1"></i>
                Desabilitado pois um arquivo KML foi selecionado
              </span>
            ) : (
              'Digite o tamanho da área se não tiver KML ou coordenadas. Um polígono aproximado será criado.'
            )}
          </div>
        </div>

            {/* Geometria - Upload KML */}
            <div className="col-12">
              <label className="form-label">
                <i className="bi bi-geo-alt me-2"></i>
                Geometria da Área (Opcional)
              </label>
          <div className="border rounded p-4 bg-light">
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
                  setKmlFile(e.target.files?.[0] || null);
                  if (e.target.files?.[0]) {
                    setAreaHectaresManual('');
                  }
                }}
              />
              <div className="form-text">
                Importe um arquivo KML/KMZ com o polígono da área
              </div>
            </div>

            {/* Botão para mostrar entrada manual */}
            <div className="d-flex justify-content-center">
              <button
                type="button"
                className="btn btn-outline-secondary"
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
                <div className="mt-2 text-muted small">
                  <strong>Exemplo de formato WKT (Well-Known Text):</strong>
                  <pre className="mt-2 p-2 bg-white rounded border">
                    <code>POLYGON((-47.8919 -15.7942, -47.8919 -15.8042, -47.8819 -15.8042, -47.8819 -15.7942, -47.8919 -15.7942))</code>
                  </pre>
                  <p className="mt-1">O primeiro e último ponto devem ser iguais para fechar o polígono.</p>
                </div>
              </div>
            )}
          </div>
        </div>

            {/* Geometria (GeoJSON) */}
            <div className="col-12">
              <label htmlFor="geom" className="form-label">
                <i className="bi bi-code-square me-2"></i>
                Geometria (GeoJSON)
              </label>
          <textarea
            id="geom"
            name="geom"
            value={formData.geom}
            onChange={handleInputChange}
            rows={4}
            className="form-control font-monospace"
            placeholder='{"type": "Polygon", "coordinates": [[[...long, lat...]]]}'
          />
          <div className="form-text">
            Opcional: Defina a geometria da área em formato GeoJSON. Pode ser definido posteriormente via upload de KML.
          </div>
        </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="card-footer bg-transparent border-top pt-3">
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              <i className="bi bi-x-circle me-2"></i>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="btn btn-success"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Salvando...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  {area ? 'Atualizar' : 'Criar'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default AreasForm;