import React from 'react';
import { useApiQuery } from '@/hooks/useApi';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import RateioPreviewModal from './RateioPreviewModal';

interface Despesa {
  id: number;
  titulo: string;
  valor: string;
  data: string;
  centro_nome?: string;
  fornecedor_nome?: string;
  safra_nome?: string;
  documento_referencia?: string;
  pendente_rateio: boolean;
  rateio?: number | null;
}

const DespesasList: React.FC<{ onOpenForm?: () => void }> = ({ onOpenForm }) => {
  const queryClient = useQueryClient();
  const { data: despesas = [], isLoading, error, refetch } = useApiQuery<Despesa[]>(['despesas'], '/administrativo/despesas/');

  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewData, setPreviewData] = React.useState<any | null>(null);
  const [currentDespesa, setCurrentDespesa] = React.useState<number | null>(null);

  async function previewRateio(despesaId: number) {
    try {
      const res = await api.post(`/administrativo/despesas/${despesaId}/preview_rateio/`);
      const data = res.data;
      const preview = {
        valor_total: data.valor_total || data.valor || null,
        parts: data.parts || data || []
      };
      setPreviewData(preview);
      setCurrentDespesa(despesaId);
      setPreviewOpen(true);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar preview de rateio');
    }
  }

  async function createRateio(despesaId: number) {
    if (!window.confirm('Criar rateio para esta despesa?')) return;
    try {
      const res = await api.post(`/administrativo/despesas/${despesaId}/create_rateio/`);
      alert('Rateio criado com sucesso (id: ' + res.data.id + ')');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'rateios'] });
      queryClient.invalidateQueries({ queryKey: ['rateios-approvals'] });
    } catch (err: any) {
      console.error(err);
      alert('Erro ao criar rateio: ' + (err.response?.data?.detail || err.message));
    }
  }

  function rateioStatus(d: Despesa) {
    if (d.rateio) return <span className="badge bg-success"><i className="bi bi-check-circle me-1" />Rateado</span>;
    if (d.pendente_rateio) return <span className="badge bg-warning text-dark"><i className="bi bi-hourglass-split me-1" />Pendente</span>;
    return <span className="badge bg-secondary">N/A</span>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0"><i className="bi bi-receipt me-2" />Despesas Administrativas</h6>
        <div>
          <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => refetch()}>
            <i className="bi bi-arrow-clockwise" /> Atualizar
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => onOpenForm?.()}>
            <i className="bi bi-plus" /> Nova Despesa
          </button>
        </div>
      </div>

      {isLoading && <div className="text-center py-4"><div className="spinner-border spinner-border-sm" /> Carregando...</div>}
      {error && <div className="alert alert-danger"><i className="bi bi-exclamation-triangle me-2" />Erro ao carregar despesas</div>}

      {!isLoading && despesas.length === 0 && (
        <div className="text-muted text-center py-4">
          <i className="bi bi-inbox d-block fs-1 mb-2" />
          Nenhuma despesa encontrada.
        </div>
      )}

      {despesas.length > 0 && (
        <div className="table-responsive">
          <table className="table table-hover table-sm align-middle">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Título</th>
                <th>Centro</th>
                <th>Fornecedor</th>
                <th>Safra</th>
                <th>Doc. Ref.</th>
                <th className="text-end">Valor</th>
                <th>Data</th>
                <th>Rateio</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {despesas.map((d) => (
                <tr key={d.id}>
                  <td className="text-muted">{d.id}</td>
                  <td className="fw-semibold">{d.titulo}</td>
                  <td><small>{d.centro_nome || '-'}</small></td>
                  <td><small>{d.fornecedor_nome || '-'}</small></td>
                  <td><small>{d.safra_nome || '-'}</small></td>
                  <td><small className="text-muted">{d.documento_referencia || '-'}</small></td>
                  <td className="text-end text-nowrap fw-semibold">R$ {Number(d.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="text-nowrap">{d.data}</td>
                  <td>{rateioStatus(d)}</td>
                  <td className="text-nowrap">
                    <button className="btn btn-sm btn-outline-secondary me-1" title="Preview rateio" onClick={() => previewRateio(d.id)} disabled={!!d.rateio}>
                      <i className="bi bi-eye" />
                    </button>
                    <button className="btn btn-sm btn-outline-primary" title="Criar rateio" onClick={() => createRateio(d.id)} disabled={!!d.rateio}>
                      <i className="bi bi-pie-chart" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rateio preview modal */}
      {previewOpen && (
        <RateioPreviewModal
          show={previewOpen}
          preview={previewData}
          onClose={() => { setPreviewOpen(false); setPreviewData(null); setCurrentDespesa(null); }}
          onCreate={async () => {
            if (currentDespesa) {
              await createRateio(currentDespesa);
              setPreviewOpen(false);
              setPreviewData(null);
              setCurrentDespesa(null);
            }
          }}
        />
      )}
    </div>
  );
};

export default DespesasList;
