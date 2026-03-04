import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import type { Colheita } from '../../types/agricultura';

interface MovimentacaoCarga {
  id: number;
  session_item?: number | null;
  talhao?: number | null;
  talhao_name?: string;
  placa?: string;
  motorista?: string;
  peso_bruto?: number | null;
  tara?: number | null;
  peso_liquido?: number | null;
  descontos?: number;
  destino_tipo?: string;
  local_destino_nome?: string;
  empresa_destino_nome?: string;
  reconciled?: boolean;
  reconciled_at?: string;
  criado_em?: string;
}

interface CargasResponse {
  count: number;
  plantio_nome: string;
  data_colheita: string;
  quantidade_colhida: number;
  results: MovimentacaoCarga[];
}

interface ColheitaCargasModalProps {
  show: boolean;
  onHide: () => void;
  colheita: Colheita | null;
}

const ColheitaCargasModal: React.FC<ColheitaCargasModalProps> = ({ show, onHide, colheita }) => {
  const { data, isLoading, error } = useQuery<CargasResponse>({
    queryKey: ['colheita-cargas', colheita?.id],
    queryFn: async () => {
      if (!colheita?.id) throw new Error('Colheita não selecionada');
      console.log('=== Buscando cargas para colheita:', colheita.id);
      const response = await api.get(`/agricultura/colheitas/${colheita.id}/cargas/`);
      console.log('=== Resposta da API cargas:', response.data);
      console.log('  - Tipo:', Array.isArray(response.data) ? 'Array' : 'Object');
      
      // Se a resposta for um array direto, normalizar para o formato esperado
      if (Array.isArray(response.data)) {
        return {
          count: response.data.length,
          plantio_nome: colheita.plantio_cultura || '',
          data_colheita: colheita.data_colheita,
          quantidade_colhida: colheita.quantidade_colhida || 0,
          results: response.data
        };
      }
      
      return response.data;
    },
    enabled: show && !!colheita?.id,
  });

  const getDestinoLabel = (tipo: string | undefined) => {
    const labels: Record<string, string> = {
      armazenagem_interna: 'Armazenagem Interna',
      armazenagem_externa: 'Armazenagem Externa',
      venda_direta: 'Venda Direta',
    };
    return tipo ? labels[tipo] || tipo : '-';
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPeso = (peso: number | null | undefined) => {
    if (!peso && peso !== 0) return '-';
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(peso) + ' kg';
  };

  if (!show) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onHide}>
      <div className="modal-dialog modal-dialog-centered modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              Cargas da Colheita
              {colheita && (
                <small className="text-muted ms-2">
                  ({data?.plantio_nome || colheita.plantio_cultura})
                </small>
              )}
            </h5>
            <button type="button" className="btn-close" onClick={onHide}></button>
          </div>

          <div className="modal-body p-3 p-md-4">
            {isLoading && (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Carregando...</span>
                </div>
                <p className="mt-3">Carregando cargas...</p>
              </div>
            )}

            {error && (
              <div className="alert alert-danger">
                Erro ao carregar cargas: {error instanceof Error ? error.message : 'Erro desconhecido'}
              </div>
            )}

            {data && (
              <>
                <div className="row g-2 g-md-3 mb-3">
                  <div className="col-12 col-md-4">
                    <strong>Data da Colheita:</strong>
                    <p>{data.data_colheita ? new Date(data.data_colheita).toLocaleDateString('pt-BR') : '-'}</p>
                  </div>
                  <div className="col-md-4">
                    <strong>Quantidade Colhida:</strong>
                    <p>{data.quantidade_colhida ? formatPeso(data.quantidade_colhida) : '-'}</p>
                  </div>
                  <div className="col-md-4">
                    <strong>Total de Cargas:</strong>
                    <p className="fs-5 fw-bold text-primary">{data.count || 0}</p>
                  </div>
                </div>

                {data.count === 0 ? (
                  <div className="alert alert-info">
                    Nenhuma carga registrada para esta colheita.
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped table-bordered table-hover">
                      <thead className="table-dark">
                        <tr>
                          <th>Placa</th>
                          <th>Motorista</th>
                          <th>Talhão</th>
                          <th>Peso Bruto</th>
                          <th>Tara</th>
                          <th>Descontos</th>
                          <th>Peso Líquido</th>
                          <th>Destino</th>
                          <th>Local/Empresa</th>
                          <th>Status</th>
                          <th>Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.results || []).map((carga: MovimentacaoCarga) => (
                          <tr key={carga.id}>
                            <td>{carga.placa || '-'}</td>
                            <td>{carga.motorista || '-'}</td>
                            <td>{carga.talhao_name || '-'}</td>
                            <td className="text-end">{formatPeso(carga.peso_bruto)}</td>
                            <td className="text-end">{formatPeso(carga.tara)}</td>
                            <td className="text-end">{formatPeso(carga.descontos)}</td>
                            <td className="text-end fw-bold">{formatPeso(carga.peso_liquido)}</td>
                            <td>{getDestinoLabel(carga.destino_tipo)}</td>
                            <td>{carga.local_destino_nome || carga.empresa_destino_nome || '-'}</td>
                            <td>
                              {carga.reconciled ? (
                                <span className="badge bg-success">
                                  Entregue
                                  {carga.reconciled_at && (
                                    <small className="d-block mt-1">
                                      {formatDate(carga.reconciled_at)}
                                    </small>
                                  )}
                                </span>
                              ) : (
                                <span className="badge bg-warning text-dark">
                                  Em Trânsito
                                </span>
                              )}
                            </td>
                            <td>{formatDate(carga.criado_em)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="table-secondary">
                        <tr>
                          <td colSpan={6} className="text-end fw-bold">
                            Total:
                          </td>
                          <td className="text-end fw-bold">
                            {formatPeso(
                              (data.results || []).reduce(
                                (sum: number, c: MovimentacaoCarga) => sum + (parseFloat(String(c.peso_liquido || 0)) || 0),
                                0
                              )
                            )}
                          </td>
                          <td colSpan={4}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onHide}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColheitaCargasModal;
