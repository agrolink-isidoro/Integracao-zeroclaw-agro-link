import React from 'react';
import type { WeatherForecast } from '../../services/weather';

interface AgriculturalRecommendationsProps {
  forecast: WeatherForecast;
}

const AgriculturalRecommendations: React.FC<AgriculturalRecommendationsProps> = ({ forecast }) => {
  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'BAIXO':
        return '#28a745'; // green
      case 'MEDIO':
        return '#ffc107'; // yellow
      case 'ALTO':
        return '#dc3545'; // red
      default:
        return '#6c757d'; // gray
    }
  };

  const getRiskBadgeClass = (risk: string): string => {
    switch (risk) {
      case 'BAIXO':
        return 'bg-success';
      case 'MEDIO':
        return 'bg-warning text-dark';
      case 'ALTO':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };

  const getRiskLabel = (risk: string): string => {
    switch (risk) {
      case 'BAIXO':
        return 'Baixo';
      case 'MEDIO':
        return 'Médio';
      case 'ALTO':
        return 'Alto';
      default:
        return risk;
    }
  };

  const getAridityLabel = (index: number): string => {
    if (index < 0.2) return 'Muito Úmido';
    if (index < 0.4) return 'Úmido';
    if (index < 0.6) return 'Normal';
    if (index < 0.8) return 'Seco';
    return 'Muito Seco';
  };

  const getAridityColor = (index: number): string => {
    if (index < 0.2) return '#0069d9'; // blue
    if (index < 0.4) return '#28a745'; // green
    if (index < 0.6) return '#20c997'; // teal
    if (index < 0.8) return '#ffc107'; // yellow
    return '#dc3545'; // red
  };

  const riskLevel = forecast.risco_doenca_fungica;
  const aridityIndex = forecast.indice_aridez;
  const recommendations = forecast.recomendacao_pulverizacao;

  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="card-body">
        <h5 className="card-title mb-4">
          <i className="bi bi-capsule me-2"></i>
          Recomendações Agrícolas
        </h5>

        {/* Disease risk section */}
        <div className="mb-4 pb-4 border-bottom">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h6 className="mb-1">Risco de Doença Fúngica</h6>
              <small className="text-muted">Baseado em temperatura e umidade</small>
            </div>
            <span className={`badge ${getRiskBadgeClass(riskLevel)} fs-6`}>
              {getRiskLabel(riskLevel)}
            </span>
          </div>

          {/* Risk indicator */}
          <div className="progress mb-2" style={{ height: '30px' }}>
            <div
              className={`progress-bar ${getRiskBadgeClass(riskLevel)}`}
              role="progressbar"
              style={{
                width: riskLevel === 'BAIXO' ? '33%' : riskLevel === 'MEDIO' ? '66%' : '100%',
              }}
              aria-valuenow={33}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span className="position-absolute top-50 start-50 translate-middle text-white fw-bold">
                {getRiskLabel(riskLevel)}
              </span>
            </div>
          </div>

          {/* Risk interpretation */}
          <div className="alert alert-light mb-0 py-2">
            {riskLevel === 'BAIXO' && (
              <small>
                <i className="bi bi-check-circle text-success me-2"></i>
                Condições desfavoráveis para o desenvolvimento de doenças fúngicas.
              </small>
            )}
            {riskLevel === 'MEDIO' && (
              <small>
                <i className="bi bi-exclamation-circle text-warning me-2"></i>
                Monitorar as plantas regularmente. Condições moderadamente favoráveis para fungos.
              </small>
            )}
            {riskLevel === 'ALTO' && (
              <small>
                <i className="bi bi-exclamation-triangle text-danger me-2"></i>
                Condições altamente favoráveis para fungos. Considere pulverização preventiva.
              </small>
            )}
          </div>
        </div>

        {/* Spray recommendations */}
        <div className="mb-4 pb-4 border-bottom">
          <h6 className="mb-3">Recomendações de Pulverização</h6>
          <div className="p-3 bg-info bg-opacity-10 rounded">
            <small>
              <i className="bi bi-info-circle text-info me-2"></i>
              {recommendations || 'Não há recomendações específicas no momento.'}
            </small>
          </div>
        </div>

        {/* Aridity index */}
        <div>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h6 className="mb-1">Índice de Aridez</h6>
              <small className="text-muted">Condição de umidade do solo</small>
            </div>
            <span className="badge bg-light text-dark" style={{ backgroundColor: getAridityColor(aridityIndex) }}>
              {(aridityIndex * 100).toFixed(0)}%
            </span>
          </div>

          {/* Aridity indicator */}
          <div className="progress mb-2" style={{ height: '25px' }}>
            <div
              className="progress-bar"
              role="progressbar"
              style={{
                width: `${aridityIndex * 100}%`,
                backgroundColor: getAridityColor(aridityIndex),
              }}
              aria-valuenow={aridityIndex * 100}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>

          <div className="d-flex justify-content-between mb-3">
            <small className="text-muted">Muito Úmido</small>
            <small className="text-muted">Muito Seco</small>
          </div>

          <div className="alert alert-light mb-0 py-2">
            <small>
              <strong>{getAridityLabel(aridityIndex)}:</strong> {' '}
              {aridityIndex < 0.2 && 'Solo com alta disponibilidade de água. Pode favorecer doenças fúngicas.'}
              {aridityIndex >= 0.2 && aridityIndex < 0.4 && 'Umidade adequada. Condições favoráveis para o crescimento das plantas.'}
              {aridityIndex >= 0.4 && aridityIndex < 0.6 && 'Umidade normal. Condições ideais para a maioria das culturas.'}
              {aridityIndex >= 0.6 && aridityIndex < 0.8 && 'Solo com déficit de água. Pode ser necessário irrigar.'}
              {aridityIndex >= 0.8 && 'Solo muito seco. Irrigação urgente recomendada.'}
            </small>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-4 pt-3 border-top">
          <h6 className="mb-3 small">Ações Recomendadas</h6>
          <div className="d-grid gap-2">
            {riskLevel === 'ALTO' && (
              <button className="btn btn-sm btn-outline-danger" type="button">
                <i className="bi bi-shield-check me-2"></i>
                Programar Pulverização
              </button>
            )}
            {aridityIndex > 0.7 && (
              <button className="btn btn-sm btn-outline-warning" type="button">
                <i className="bi bi-droplet me-2"></i>
                Ativar Irrigação
              </button>
            )}
            <button className="btn btn-sm btn-outline-secondary" type="button">
              <i className="bi bi-eye me-2"></i>
              Ver Histórico
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgriculturalRecommendations;
