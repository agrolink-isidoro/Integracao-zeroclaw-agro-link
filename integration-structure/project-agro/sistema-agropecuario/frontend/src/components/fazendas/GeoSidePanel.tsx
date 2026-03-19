import React from 'react';
import { Link } from 'react-router-dom';
import { GeoFeature } from '../hooks/useGeoData';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface GeoSidePanelProps {
  feature: GeoFeature;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component: GeoSidePanel
// Displays details for a selected feature (Area or Talhao)
// ---------------------------------------------------------------------------
const GeoSidePanel: React.FC<GeoSidePanelProps> = ({ feature, onClose }) => {
  const p = feature.properties;
  const isArea = p.entity_type === 'area';
  const hectares = isArea ? p.area_hectares : p.area_size_ha;

  return (
    <div
      className="card shadow-lg position-absolute top-0 end-0 m-3"
      style={{ width: '320px', zIndex: 10, maxHeight: 'calc(100% - 24px)', overflowY: 'auto' }}
    >
      <div className="card-header d-flex justify-content-between align-items-center bg-primary text-white">
        <h6 className="mb-0">
          <i className={`bi ${isArea ? 'bi-map' : 'bi-grid-3x3-gap'} me-2`}></i>
          {p.name}
        </h6>
        <button className="btn btn-sm btn-light" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </button>
      </div>
      <div className="card-body">
        <table className="table table-sm mb-3">
          <tbody>
            <tr>
              <th>Tipo</th>
              <td>
                <span
                  className={`badge bg-${
                    isArea ? (p.tipo === 'propria' ? 'success' : 'warning') : 'info'
                  }`}
                >
                  {isArea ? (p.tipo === 'propria' ? 'Própria' : 'Arrendada') : 'Talhão'}
                </span>
              </td>
            </tr>
            <tr>
              <th>Fazenda</th>
              <td>{p.fazenda_name}</td>
            </tr>
            {!isArea && p.area_name && (
              <tr>
                <th>Área</th>
                <td>{p.area_name}</td>
              </tr>
            )}
            {hectares != null && (
              <tr>
                <th>Hectares</th>
                <td>{Number(hectares).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="d-grid gap-2">
          {isArea ? (
            <Link to={`/fazendas/areas`} className="btn btn-outline-primary btn-sm">
              <i className="bi bi-eye me-1"></i>Ver Áreas
            </Link>
          ) : (
            <Link to={`/fazendas/talhoes`} className="btn btn-outline-primary btn-sm">
              <i className="bi bi-eye me-1"></i>Ver Talhões
            </Link>
          )}
          <Link to={`/fazendas/fazendas`} className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-house-door me-1"></i>Ir para Fazenda
          </Link>
          <Link to="/agricultura/colheitas" className="btn btn-outline-success btn-sm">
            <i className="bi bi-basket me-1"></i>Ver Colheitas
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GeoSidePanel;
