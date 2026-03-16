import React from 'react';
import type { WeatherForecast } from '../../services/weather';

interface CurrentWeatherProps {
  forecast: WeatherForecast;
}

const CurrentWeather: React.FC<CurrentWeatherProps> = ({ forecast }) => {
  const getWeatherIcon = (condition: string): string => {
    const conditionLower = condition.toLowerCase();
    if (conditionLower.includes('rain') || conditionLower.includes('chuva')) return 'cloud-rain';
    if (conditionLower.includes('cloud') || conditionLower.includes('nuvem')) return 'cloud';
    if (conditionLower.includes('clear') || conditionLower.includes('limpo')) return 'sun';
    if (conditionLower.includes('snow') || conditionLower.includes('neve')) return 'snow';
    if (conditionLower.includes('storm') || conditionLower.includes('tempestade')) return 'cloud-lightning';
    if (conditionLower.includes('fog') || conditionLower.includes('neblina')) return 'cloud-fog';
    return 'cloud';
  };

  const getTemperatureColor = (temp: number): string => {
    if (temp < 5) return '#0069d9'; // blue - cold
    if (temp < 15) return '#28a745'; // green - cool
    if (temp < 25) return '#ffc107'; // yellow - warm
    if (temp < 35) return '#fd7e14'; // orange - hot
    return '#dc3545'; // red - very hot
  };

  const temp = forecast.temperatura_atual;
  const humidity = forecast.umidade_atual;
  const windSpeed = forecast.vento_velocidade;
  const condition = forecast.condicao_atual;
  const uvIndex = forecast.indice_uv || 0;

  return (
    <div className="card h-100 border-0 shadow-sm">
      <div className="card-body">
        {/* Header with location */}
        <div className="mb-4 pb-3 border-bottom">
          <h5 className="card-title mb-1">
            <i className="bi bi-geo-alt me-2"></i>
            {forecast.talhao_name || forecast.municipio || 'Localização'}
          </h5>
          <small className="text-muted">
            Dados de {forecast.fonte_dados}
          </small>
        </div>

        {/* Large temperature display */}
        <div className="text-center mb-4">
          <div className="position-relative d-inline-block">
            <i
              className={`bi bi-${getWeatherIcon(condition)} fs-1`}
              style={{ color: getTemperatureColor(temp) }}
            ></i>
          </div>
          <div className="mt-3">
            <div
              className="display-4 fw-bold"
              style={{ color: getTemperatureColor(temp) }}
            >
              {temp.toFixed(1)}°
            </div>
            <p className="text-muted mb-2">{condition}</p>
            {forecast.temperatura_sensacao && (
              <small className="text-muted">
                Sensação térmica: {forecast.temperatura_sensacao.toFixed(1)}°
              </small>
            )}
          </div>
        </div>

        {/* Weather details grid */}
        <div className="row g-3">
          <div className="col-6">
            <div className="p-2 bg-light rounded">
              <small className="text-muted d-block">Umidade</small>
              <h6 className="mb-0">
                <i className="bi bi-droplet text-info me-1"></i>
                {humidity}%
              </h6>
            </div>
          </div>

          <div className="col-6">
            <div className="p-2 bg-light rounded">
              <small className="text-muted d-block">Vento</small>
              <h6 className="mb-0">
                <i className="bi bi-wind text-warning me-1"></i>
                {windSpeed.toFixed(1)} km/h
              </h6>
            </div>
          </div>

          {uvIndex > 0 && (
            <div className="col-6">
              <div className="p-2 bg-light rounded">
                <small className="text-muted d-block">Índice UV</small>
                <h6 className="mb-0">
                  <i className="bi bi-sun text-danger me-1"></i>
                  {uvIndex.toFixed(1)}
                </h6>
              </div>
            </div>
          )}

          {forecast.ponto_orvalho && (
            <div className="col-6">
              <div className="p-2 bg-light rounded">
                <small className="text-muted d-block">Ponto de Orvalho</small>
                <h6 className="mb-0">
                  <i className="bi bi-moisture text-primary me-1"></i>
                  {forecast.ponto_orvalho.toFixed(1)}°
                </h6>
              </div>
            </div>
          )}

          <div className="col-12">
            <div className="p-2 bg-light rounded">
              <small className="text-muted d-block">Cobertura de Nuvens</small>
              <div className="progress" style={{ height: '8px' }}>
                <div
                  className="progress-bar bg-info"
                  role="progressbar"
                  style={{ width: `${forecast.cobertura_nuvens}%` }}
                  aria-valuenow={forecast.cobertura_nuvens}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
              <small className="text-muted">{forecast.cobertura_nuvens}%</small>
            </div>
          </div>

          {forecast.pressao && (
            <div className="col-12">
              <div className="p-2 bg-light rounded">
                <small className="text-muted d-block">Pressão Atmosférica</small>
                <h6 className="mb-0">{forecast.pressao.toFixed(0)} hPa</h6>
              </div>
            </div>
          )}
        </div>

        {/* Chance of precipitation */}
        <div className="mt-3 p-3 bg-warning bg-opacity-10 rounded">
          <small className="text-muted d-block mb-1">Chance de Chuva</small>
          <div className="progress" style={{ height: '12px' }}>
            <div
              className="progress-bar bg-warning"
              role="progressbar"
              style={{ width: `${forecast.chance_precipitacao}%` }}
              aria-valuenow={forecast.chance_precipitacao}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>
          <small className="text-muted">{forecast.chance_precipitacao}%</small>
        </div>
      </div>
    </div>
  );
};

export default CurrentWeather;
