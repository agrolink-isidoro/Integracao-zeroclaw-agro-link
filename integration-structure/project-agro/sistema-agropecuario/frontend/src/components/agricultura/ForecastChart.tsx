import React, { useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { WeatherForecast, DayForecast } from '../../services/weather';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ForecastChartProps {
  forecast: WeatherForecast;
}

const ForecastChart: React.FC<ForecastChartProps> = ({ forecast }) => {
  // Parse and prepare forecast data
  const forecastData = useMemo(() => {
    if (!forecast.forecast_7dias || forecast.forecast_7dias.length === 0) {
      return null;
    }

    const days = forecast.forecast_7dias.map((day: DayForecast) => {
      const date = new Date(day.data);
      return date.toLocaleDateString('pt-BR', { weekday: 'short', month: 'numeric', day: 'numeric' });
    });

    return {
      labels: days,
      datasets: [
        {
          label: 'Temperatura Máxima (°C)',
          data: forecast.forecast_7dias.map((day: DayForecast) => day.temperatura_maxima),
          borderColor: '#dc3545',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Temperatura Mínima (°C)',
          data: forecast.forecast_7dias.map((day: DayForecast) => day.temperatura_minima),
          borderColor: '#0069d9',
          backgroundColor: 'rgba(0, 105, 217, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Chance de Chuva (%)',
          data: forecast.forecast_7dias.map((day: DayForecast) => day.chance_precipitacao),
          backgroundColor: 'rgba(0, 123, 255, 0.6)',
          borderColor: 'rgba(0, 123, 255, 1)',
          borderWidth: 1,
          type: 'bar' as const,
          yAxisID: 'y1',
          order: 1,
        },
      ],
    };
  }, [forecast.forecast_7dias]);

  if (!forecastData) {
    return (
      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <p className="text-muted mb-0">Sem dados de previsão para os próximos 7 dias.</p>
        </div>
      </div>
    );
  }

  const options = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
      title: {
        display: true,
        text: 'Previsão de 7 Dias',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Temperatura (°C)',
        },
        grid: {
          drawBorder: false,
        },
      } as any,
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Chance de Chuva (%)',
        },
        max: 100,
        grid: {
          drawOnChartArea: false,
        },
      } as any,
    },
  };

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body p-4">
        <Line data={forecastData} options={options} />

        {/* Forecast details table */}
        <div className="table-responsive mt-4">
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Data</th>
                <th>Max</th>
                <th>Min</th>
                <th>Umidade</th>
                <th>Condição</th>
                <th>Vento</th>
                <th>Chuva</th>
              </tr>
            </thead>
            <tbody>
              {forecast.forecast_7dias.map((day: DayForecast, idx: number) => {
                const date = new Date(day.data);
                const dateStr = date.toLocaleDateString('pt-BR');

                return (
                  <tr key={idx}>
                    <td>
                      <strong>{dateStr}</strong>
                    </td>
                    <td>
                      <span className="badge bg-danger">{day.temperatura_maxima.toFixed(1)}°</span>
                    </td>
                    <td>
                      <span className="badge bg-info">{day.temperatura_minima.toFixed(1)}°</span>
                    </td>
                    <td>{day.umidade_media}%</td>
                    <td>{day.condicao}</td>
                    <td>{day.vento_velocidade.toFixed(1)} km/h</td>
                    <td>
                      <div className="progress" style={{ width: '60px', height: '20px' }}>
                        <div
                          className="progress-bar bg-primary"
                          role="progressbar"
                          style={{ width: `${day.chance_precipitacao}%` }}
                          aria-valuenow={day.chance_precipitacao}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        ></div>
                      </div>
                      <small>{day.chance_precipitacao}%</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ForecastChart;
