import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);

type Props = {
  topFornecedores?: Array<{ id: number; nome: string; total_compras: string | number }>;
  documentosVencendo?: number;
  documentosVencidos?: number;
};

const FornecedoresCharts: React.FC<Props> = ({ topFornecedores = [], documentosVencendo = 0, documentosVencidos = 0 }) => {
  const barData = {
    labels: topFornecedores.map((f) => f.nome),
    datasets: [
      {
        label: 'Gastos (R$)',
        data: topFornecedores.map((f) => Number(f.total_compras || 0)),
        backgroundColor: '#2563eb',
        borderColor: '#1e40af',
        borderWidth: 1,
      },
    ],
  };

  const pieData = {
    labels: ['Vencendo', 'Vencidos'],
    datasets: [
      {
        data: [documentosVencendo, documentosVencidos],
        backgroundColor: ['#f59e0b', '#ef4444'],
      },
    ],
  };

  return (
    <div className="row">
      <div className="col-12">
        <figure role="group" aria-labelledby="fornecedores-charts-title" className="mb-4">
          <figcaption id="fornecedores-charts-title" className="visually-hidden">Gráficos de fornecedores: gastos por fornecedor e status de documentos (vencendo VS vencidos).</figcaption>
          <div className="row">
            <div className="col-md-8 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="mb-0">Top Fornecedores — Gastos</h5>
                </div>
                <div className="card-body">
                  {topFornecedores && topFornecedores.length ? (
                    <div role="img" aria-label="Gráfico de barras mostrando gastos dos top fornecedores" tabIndex={0} className="chart-focusable">
                      <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                    </div>
                  ) : (
                    <p className="text-muted">Nenhum dado disponível para os fornecedores.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="mb-0">Status de Documentos</h5>
                </div>
                <div className="card-body d-flex align-items-center justify-content-center">
                  <div role="img" aria-label="Gráfico de pizza mostrando documentos vencendo e vencidos" tabIndex={0} className="chart-focusable">
                    <Pie data={pieData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visually hidden data table for screen readers */}
          <table className="visually-hidden" aria-hidden={false} aria-label="Dados do gráfico de fornecedores">
            <caption className="visually-hidden">Dados do gráfico de fornecedores e status dos documentos.</caption>
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Gastos (R$)</th>
              </tr>
            </thead>
            <tbody>
              {topFornecedores && topFornecedores.length ? (
                topFornecedores.map((f) => (
                  <tr key={`sr-${f.id}`}>
                    <td>{f.nome}</td>
                    <td>{Number(f.total_compras || 0).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2}>Nenhum fornecedor disponível</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td>Documentos vencendo</td>
                <td>{documentosVencendo}</td>
              </tr>
              <tr>
                <td>Documentos vencidos</td>
                <td>{documentosVencidos}</td>
              </tr>
            </tfoot>
          </table>
        </figure>
      </div>
    </div>
  );
};

export default FornecedoresCharts;
