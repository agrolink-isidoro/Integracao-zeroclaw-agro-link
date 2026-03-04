import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import financeiroService from '@/services/financeiro';
import { useApiQuery } from '@/hooks/useApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ContaDetalhesModal from '@/components/financeiro/ContaDetalhesModal';
import TransferForm from '@/components/financeiro/TransferForm';
import { toCSV, downloadCSV } from '@/utils/csv';

const LivroCaixa: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: contas = [] } = useApiQuery<any[]>(['contas-bancarias'], '/financeiro/contas/');

  const [filtros, setFiltros] = React.useState<any>({});
  const [contaSelecionada, setContaSelecionada] = React.useState<number | null>(null);
  const [dataInicio, setDataInicio] = React.useState<string>('');
  const [dataFim, setDataFim] = React.useState<string>('');
  const [reconciled, setReconciled] = React.useState<string>('all');
  const [tipo, setTipo] = React.useState<string>('');

  const [detalheContaId, setDetalheContaId] = React.useState<number | null>(null);
  const [showTransferModal, setShowTransferModal] = React.useState<boolean>(false);

  const [loadingError, setLoadingError] = React.useState<string | null>(null);
  const query = useQuery<any[], Error>({
    queryKey: ['financeiro', 'lancamentos', filtros],
    queryFn: () => financeiroService.getLancamentos(filtros),
  });

  const lancamentos = query.data ?? [];

  React.useEffect(() => {
    if (query.error) {
      const err = query.error as any;
      console.error('Erro ao buscar lançamentos:', err);
      setLoadingError(err?.message || 'Erro ao carregar lançamentos');
    }
  }, [query.error]);

  React.useEffect(() => {
    const f: any = {};
    if (contaSelecionada) f.conta_id = contaSelecionada;
    if (dataInicio) f.data_inicio = dataInicio;
    if (dataFim) f.data_fim = dataFim;
    if (reconciled === 'true') f.reconciled = true;
    if (reconciled === 'false') f.reconciled = false;
    if (tipo) f.tipo = tipo.split(',').map((t) => t.trim()).filter(Boolean);
    setFiltros(f);
  }, [contaSelecionada, dataInicio, dataFim, reconciled, tipo]);

  const exportCsv = React.useCallback(() => {
    const rows = (lancamentos || []).map((l: any) => ({ id: l.id, data: l.data, descricao: l.descricao || '', conta: l.conta?.banco ? `${l.conta.banco} - ${l.conta.conta}` : '', tipo: l.tipo, valor: l.valor, reconciled: l.reconciled }));
    const csv = toCSV(rows, ['id', 'data', 'descricao', 'conta', 'tipo', 'valor', 'reconciled']);
    downloadCSV('livro_caixa.csv', csv);
  }, [lancamentos]);

  if (query.isLoading) return <LoadingSpinner />;
  if (loadingError) return <div className="alert alert-danger">Erro ao carregar Livro Caixa: {loadingError}</div>;
  if (query.error) return <div className="alert alert-danger">Erro ao carregar Livro Caixa</div>;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">Livro Caixa</h4>
        <div>
          <button className="btn btn-sm btn-outline-secondary" onClick={exportCsv}>Exportar CSV</button>
          <button className="btn btn-sm btn-primary ms-2" onClick={() => setShowTransferModal(true)}>Nova Transferência</button>
        </div>
      </div>

      <div className="card mb-3">
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row gy-2">
            <div className="col-auto">
              <select className="form-select form-select-sm" value={contaSelecionada || ''} onChange={(e) => setContaSelecionada(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Todas as contas</option>
                {contas.map((c: any) => <option key={c.id} value={c.id}>{c.banco} - {c.conta}</option>)}
              </select>
            </div>
            <div className="col-auto">
              <input className="form-control form-control-sm" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="col-auto">
              <input className="form-control form-control-sm" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div className="col-auto">
              <select className="form-select form-select-sm" value={reconciled} onChange={(e) => setReconciled(e.target.value)}>
                <option value="all">Todos</option>
                <option value="true">Reconciliados</option>
                <option value="false">Não reconciliados</option>
              </select>
            </div>
            <div className="col-auto">
              <input className="form-control form-control-sm" placeholder="Tipo (ex: pagamento, transferencia)" value={tipo} onChange={(e) => setTipo(e.target.value)} />
            </div>
            <div className="col-auto">
              <button className="btn btn-sm btn-outline-primary" onClick={() => queryClient.invalidateQueries({ queryKey: ['financeiro', 'lancamentos', filtros] })}>Buscar</button>
              <button className="btn btn-sm btn-outline-secondary ms-2" onClick={() => { setContaSelecionada(null); setDataInicio(''); setDataFim(''); setReconciled('all'); setTipo(''); }}>Limpar</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {lancamentos.length === 0 ? (
            <div className="text-muted">Nenhum lançamento encontrado.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-sm">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Conta</th>
                    <th>Tipo</th>
                    <th className="text-end">Valor</th>
                    <th>Reconc.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.map((l: any) => (
                    <tr key={l.id} className={l.reconciled ? 'table-success' : ''} data-lancamento-id={l.id}>
                      <td>{l.data}</td>
                      <td>{l.descricao}</td>
                      <td>{l.conta ? `${l.conta.banco} - ${l.conta.conta}` : ''}</td>
                      <td>{l.tipo}</td>
                      <td className="text-end">R$ {l.valor}</td>
                      <td>{l.reconciled ? 'Sim' : 'Não'}</td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end align-items-center">
                          <button className={`btn btn-sm ${l.reconciled ? 'btn-success' : 'btn-outline-secondary'} me-2`} onClick={async () => {
                            try {
                              await financeiroService.reconcileLancamento(l.id, !l.reconciled);
                              // optimistic update: refresh query
                              queryClient.invalidateQueries({ queryKey: ['financeiro', 'lancamentos', filtros] });
                            } catch (err) {
                              console.error('Falha ao (des)reconciliar:', err);
                              alert('Falha ao (des)reconciliar lançamento');
                            }
                          }}>{l.reconciled ? 'Desreconciliar' : 'Reconciliar'}</button>

                          {l.conta && (
                            <button className="btn btn-sm btn-outline-primary" onClick={() => setDetalheContaId(l.conta.id)}>Ver conta</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {detalheContaId && (
        <ContaDetalhesModal contaId={detalheContaId} onClose={() => setDetalheContaId(null)} />
      )}

      {showTransferModal && (
        <TransferForm onClose={() => setShowTransferModal(false)} onSaved={() => { setShowTransferModal(false); queryClient.invalidateQueries({ queryKey: ['financeiro','lancamentos'] }); queryClient.invalidateQueries({ queryKey: ['transferencias'] }); }} />
      )}
    </div>
  );
};

export default LivroCaixa;
