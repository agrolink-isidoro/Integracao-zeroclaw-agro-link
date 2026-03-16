import React, { useState, useMemo } from 'react';
import { useApiQuery, useApiDelete } from '../../hooks/useApi';
import type { Area, AreaFeature } from '../../types';
import DataTable from '../../components/common/DataTable';
import ModalForm from '../../components/common/ModalForm';
import ErrorMessage from '../../components/common/ErrorMessage';
import AreasForm from './AreasForm';

const AreasList: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | undefined>();

  // Queries
  const { data: areasData, isLoading, error, refetch } = useApiQuery<{ type: string; features: AreaFeature[] }>(
    ['areas'],
    '/areas/'
  );

  // Extract features array from GeoJSON FeatureCollection and convert to Area objects
  const areas: Area[] = (areasData?.features || []).map(feature => ({
    ...feature.properties,
    id: feature.id
  }));

  const deleteMutation = useApiDelete('/areas/', [['areas']]);

  // Separar áreas próprias e arrendadas
  const { areasProprias, areasArrendadas, stats } = useMemo(() => {
    const proprias = areas.filter(a => a.tipo === 'propria' || !a.tipo);
    const arrendadas = areas.filter(a => a.tipo === 'arrendada');
    
    const totalProprias = proprias.reduce((sum, a) => sum + (a.area_hectares || 0), 0);
    const totalArrendadas = arrendadas.reduce((sum, a) => sum + (a.area_hectares || 0), 0);
    const totalGeral = totalProprias + totalArrendadas;
    
    return {
      areasProprias: proprias,
      areasArrendadas: arrendadas,
      stats: {
        totalProprias,
        totalArrendadas,
        totalGeral,
        countProprias: proprias.length,
        countArrendadas: arrendadas.length
      }
    };
  }, [areas]);

  const handleDelete = async (area: Area) => {
    if (!window.confirm(`Tem certeza que deseja remover a área "${area.name}"?`)) {
      return;
    }

    // Coerce/validate id before sending delete request and provide better logs
    const rawId = area.id;
    const numericId = Number(rawId);
    const idToSend = Number.isFinite(numericId) ? numericId : String(rawId);

    console.debug('Deleting area', { name: area.name, rawId, idToSend });

    try {
      await deleteMutation.mutateAsync(idToSend);
    } catch (error: any) {
      // Try to surface more details from Axios error (status, payload)
      console.error('Error deleting area:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        original: error
      });
      alert('Erro ao remover área. Tente novamente.');
    }
  };

  const getColumns = (tipo: 'propria' | 'arrendada') => [
    {
      key: 'name',
      header: 'Nome',
      sortable: true,
      render: (value: string) => (
        <span className="fw-semibold text-dark">
          <i className="bi bi-geo-alt-fill me-2 text-primary"></i>
          {value}
        </span>
      )
    },
    {
      key: 'fazenda_nome',
      header: 'Fazenda',
      render: (_value: any, item: Area) => (
        <span className="badge bg-info text-dark">
          <i className="bi bi-house-door me-1"></i>
          {item.fazenda_nome || `Fazenda ${item.fazenda}`}
        </span>
      ),
      sortable: true
    },
    {
      key: 'proprietario_nome',
      header: 'Proprietário',
      render: (_value: any, item: Area) => (
        <span className="text-muted">
          <i className="bi bi-person me-1"></i>
          {item.proprietario_nome || `Proprietário ${item.proprietario}`}
        </span>
      ),
      sortable: true
    },
    {
      key: 'area_hectares',
      header: 'Área',
      render: (value: any) => value ? (
        <span className="badge bg-success-subtle text-success fs-6">
          <i className="bi bi-rulers me-1"></i>
          {Number(value).toFixed(2)} ha
        </span>
      ) : 'N/A',
      sortable: true
    },
    ...(tipo === 'arrendada' ? [{
      key: 'custo_arrendamento',
      header: 'Custo Arrendamento',
      render: (value: any) => value ? (
        <span className="text-success fw-semibold">
          <i className="bi bi-cash-coin me-1"></i>
          R$ {Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      ) : 'N/A',
      sortable: true
    }] : []),
    {
      key: 'actions',
      header: 'Ações',
      render: (_value: unknown, item: Area) => (
        <div className="d-flex gap-2">
          <button
            onClick={() => setEditingArea(item)}
            className="btn btn-sm btn-primary"
            title="Editar área"
          >
            <i className="bi bi-pencil"></i>
          </button>
          <button
            onClick={() => handleDelete(item)}
            className="btn btn-sm btn-danger"
            title="Remover área"
          >
            <i className="bi bi-trash"></i>
          </button>
        </div>
      )
    }
  ];

  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditingArea(undefined);
  };

  const handleFormSuccess = async () => {
    await refetch();
    handleModalClose();
  };

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage message="Erro ao carregar áreas" />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 mb-1">
            <i className="bi bi-map text-primary me-2"></i>
            Gestão de Áreas
          </h1>
          <p className="text-muted mb-0">Gerencie áreas próprias e arrendadas</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-success btn-lg shadow-sm"
        >
          <i className="bi bi-plus-circle me-2"></i>
          Nova Área
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-primary bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">TOTAL GERAL</p>
                  <h3 className="mb-0 fw-bold">{stats.totalGeral.toFixed(2)} ha</h3>
                  <small className="text-white-50">
                    {stats.countProprias + stats.countArrendadas} áreas
                  </small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-globe fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-success bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">ÁREAS PRÓPRIAS</p>
                  <h3 className="mb-0 fw-bold">{stats.totalProprias.toFixed(2)} ha</h3>
                  <small className="text-white-50">
                    {stats.countProprias} área{stats.countProprias !== 1 ? 's' : ''}
                  </small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-house-check fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-warning bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">ARRENDADAS</p>
                  <h3 className="mb-0 fw-bold">{stats.totalArrendadas.toFixed(2)} ha</h3>
                  <small className="text-white-50">
                    {stats.countArrendadas} área{stats.countArrendadas !== 1 ? 's' : ''}
                  </small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-arrow-left-right fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-info bg-gradient text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-white-50 mb-1 small">PERCENTUAL</p>
                  <h3 className="mb-0 fw-bold">
                    {stats.totalGeral > 0 ? ((stats.totalProprias / stats.totalGeral) * 100).toFixed(1) : 0}%
                  </h3>
                  <small className="text-white-50">
                    próprias
                  </small>
                </div>
                <div className="bg-white bg-opacity-25 rounded-3 p-2">
                  <i className="bi bi-pie-chart fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Áreas Próprias */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-success text-white py-3">
          <h5 className="mb-0">
            <i className="bi bi-house-check me-2"></i>
            Áreas Próprias
            <span className="badge bg-white text-success ms-2">
              {stats.countProprias}
            </span>
          </h5>
        </div>
        <div className="card-body p-0">
          <DataTable
            data={areasProprias}
            columns={getColumns('propria')}
            loading={isLoading}
            emptyMessage="Nenhuma área própria cadastrada"
          />
        </div>
        {areasProprias.length > 0 && (
          <div className="card-footer bg-light border-top">
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Total de áreas próprias
              </span>
              <div className="d-flex align-items-center gap-3">
                <span className="text-muted">{stats.countProprias} área{stats.countProprias !== 1 ? 's' : ''}</span>
                <span className="badge bg-success fs-6 px-3 py-2">
                  <i className="bi bi-rulers me-2"></i>
                  {stats.totalProprias.toFixed(2)} ha
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Áreas Arrendadas */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-warning text-white py-3">
          <h5 className="mb-0">
            <i className="bi bi-arrow-left-right me-2"></i>
            Áreas Arrendadas
            <span className="badge bg-white text-warning ms-2">
              {stats.countArrendadas}
            </span>
          </h5>
        </div>
        <div className="card-body p-0">
          <DataTable
            data={areasArrendadas}
            columns={getColumns('arrendada')}
            loading={isLoading}
            emptyMessage="Nenhuma área arrendada cadastrada"
          />
        </div>
        {areasArrendadas.length > 0 && (
          <div className="card-footer bg-light border-top">
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Total de áreas arrendadas
              </span>
              <div className="d-flex align-items-center gap-3">
                <span className="text-muted">{stats.countArrendadas} área{stats.countArrendadas !== 1 ? 's' : ''}</span>
                <span className="badge bg-warning fs-6 px-3 py-2">
                  <i className="bi bi-rulers me-2"></i>
                  {stats.totalArrendadas.toFixed(2)} ha
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Criação */}
      <ModalForm
        isOpen={showCreateModal}
        title="Nova Área"
        onClose={handleModalClose}
      >
        <AreasForm onSuccess={handleFormSuccess} onCancel={handleModalClose} />
      </ModalForm>

      {/* Modal de Edição */}
      <ModalForm
        isOpen={!!editingArea}
        title="Editar Área"
        onClose={handleModalClose}
      >
        {editingArea && (
          <AreasForm
            area={editingArea}
            onSuccess={handleFormSuccess}
            onCancel={handleModalClose}
          />
        )}
      </ModalForm>
    </div>
  );
};

export default AreasList;