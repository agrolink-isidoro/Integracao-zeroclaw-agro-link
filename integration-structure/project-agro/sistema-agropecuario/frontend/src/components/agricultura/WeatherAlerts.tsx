import React from 'react';
import type { WeatherAlert } from '../../services/weather';

interface WeatherAlertsProps {
  alerts: WeatherAlert[];
}

const WeatherAlerts: React.FC<WeatherAlertsProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'BAIXA':
        return '#0dcaf0'; // cyan
      case 'MEDIA':
        return '#ffc107'; // yellow
      case 'ALTA':
        return '#fd7e14'; // orange
      case 'CRITICA':
        return '#dc3545'; // red
      default:
        return '#6c757d'; // gray
    }
  };

  const getSeverityBadgeClass = (severity: string): string => {
    switch (severity) {
      case 'BAIXA':
        return 'bg-info';
      case 'MEDIA':
        return 'bg-warning text-dark';
      case 'ALTA':
        return 'bg-warning';
      case 'CRITICA':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };

  const getAlertIcon = (tipo: string): string => {
    const tipoLower = tipo.toLowerCase();
    if (tipoLower.includes('chuva')) return 'cloud-rain';
    if (tipoLower.includes('granizo')) return 'snow';
    if (tipoLower.includes('vento')) return 'wind';
    if (tipoLower.includes('geada')) return 'snow2';
    if (tipoLower.includes('estiagem')) return 'sun';
    if (tipoLower.includes('raio') || tipoLower.includes('tempestade')) return 'cloud-lightning';
    return 'exclamation-triangle';
  };

  const criticalAlerts = alerts.filter(a => a.severidade === 'CRITICA');
  const otherAlerts = alerts.filter(a => a.severidade !== 'CRITICA');

  return (
    <div className="alert-container">
      {criticalAlerts.length > 0 && (
        <div className="mb-3">
          <div className="alert alert-danger border-2 border-danger mb-3">
            <div className="d-flex align-items-start">
              <i className="bi bi-exclamation-triangle-fill fs-5 me-3 flex-shrink-0"></i>
              <div className="flex-grow-1">
                <h5 className="alert-heading mb-2">
                  ⚠️ Alerta Crítico
                </h5>
                {criticalAlerts.map((alert, idx) => (
                  <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-top border-danger-light' : ''}>
                    <strong>{alert.tipo_display}</strong>
                    {alert.talhao_name && (
                      <p className="mb-1 small">
                        <i className="bi bi-geo-alt me-1"></i>{alert.talhao_name}
                      </p>
                    )}
                    <p className="mb-0 small">{alert.descricao}</p>
                    <small className="text-muted d-block mt-1">
                      De {new Date(alert.data_inicio_prevista).toLocaleString('pt-BR')} até{' '}
                      {new Date(alert.data_fim_prevista).toLocaleString('pt-BR')}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {otherAlerts.length > 0 && (
        <div className="row g-2">
          {otherAlerts.map((alert) => (
            <div key={alert.id} className="col-12 col-md-6">
              <div
                className="alert mb-0"
                style={{
                  borderLeft: `4px solid ${getSeverityColor(alert.severidade)}`,
                  backgroundColor: getSeverityColor(alert.severidade) + '15',
                }}
              >
                <div className="d-flex align-items-start">
                  <i
                    className={`bi bi-${getAlertIcon(alert.tipo)} me-2 flex-shrink-0`}
                    style={{ color: getSeverityColor(alert.severidade) }}
                  ></i>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <strong className="small">{alert.tipo_display}</strong>
                      <span className={`badge ${getSeverityBadgeClass(alert.severidade)} text-nowrap ms-2`}>
                        {alert.severidade}
                      </span>
                    </div>
                    {alert.talhao_name && (
                      <small className="text-muted d-block mb-1">
                        <i className="bi bi-geo-alt me-1"></i>{alert.talhao_name}
                      </small>
                    )}
                    <small className="d-block mb-2">{alert.descricao}</small>
                    <small className="text-muted">
                      {new Date(alert.data_inicio_prevista).toLocaleDateString('pt-BR')} até{' '}
                      {new Date(alert.data_fim_prevista).toLocaleDateString('pt-BR')}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeatherAlerts;
