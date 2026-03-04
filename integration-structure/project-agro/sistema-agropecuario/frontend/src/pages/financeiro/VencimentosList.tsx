import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import financeiroService from '@/services/financeiro';
import { useApiQuery } from '@/hooks/useApi';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import VencimentoDetailModal from '@/components/financeiro/VencimentoDetailModal';
import { useAuthContext } from '@/contexts/AuthContext';
import type { Vencimento } from '@/types/financeiro';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toCSV, downloadCSV } from '@/utils/csv';
import ChangeVencimentoDateModal from '@/components/financeiro/ChangeVencimentoDateModal';
import MarkAsPaidModal from '@/components/financeiro/MarkAsPaidModal';
import QuitarModal from '@/components/financeiro/QuitarModal';
import { toast } from 'react-hot-toast';

const VencimentosList: React.FC = () => {
  const queryClient = useQueryClient();
  const [pageSize, setPageSize] = React.useState(1000); // Default: fetch all for reliability in tests/UI
  const { data, isLoading, error } = useQuery<Vencimento[], Error>({
    queryKey: ['financeiro', 'vencimentos', pageSize],
    queryFn: () => financeiroService.getVencimentos({ page_size: pageSize }),
  });

  const [searchTerm, setSearchTerm] = React.useState('');

  // Modal states
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedVencimento, setSelectedVencimento] = React.useState<Vencimento | null>(null);
  const [changeDateOpen, setChangeDateOpen] = React.useState(false);
  const [changeVencimentoId, setChangeVencimentoId] = React.useState<number | null>(null);
  const [markPaidOpen, setMarkPaidOpen] = React.useState(false);
  const [markPaidVencimentoId, setMarkPaidVencimentoId] = React.useState<number | null>(null);
  const [markPaidValor, setMarkPaidValor] = React.useState<number | null>(null);
  const [quitarOpen, setQuitarOpen] = React.useState(false);
  const [quitarVencimentoId, setQuitarVencimentoId] = React.useState<number | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteVencimentoId, setDeleteVencimentoId] = React.useState<number | null>(null);

  // permissions (fetch core permissions and check if the user can delete in financeiro)
  const { data: permissions } = useApiQuery<unknown[], Error>(['permissions'], '/core/permissions/');
  const { user } = useAuthContext();
  const canDeleteVencimento = React.useMemo(() => {
    // Admin users (is_staff) can always delete
    if (user?.is_staff) return true;
    if (!permissions) return false;
    return permissions.some(p => p.module && p.module.includes('financeiro') && Array.isArray(p.permissions) && p.permissions.includes('delete'));
  }, [permissions, user]);

  // compute memoized values *before* any early returns to keep hook order stable
  const sortedVencimentos = React.useMemo(() => {
    if (!data) return [];
    const todayLocal = new Date().toISOString().slice(0, 10);
    
    // Filter by search term
    let filtered = data;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = data.filter(v => 
        v.titulo.toLowerCase().includes(term) ||
        v.descricao?.toLowerCase().includes(term) ||
        v.valor.toString().includes(term)
      );
    }
    
    return [...filtered].sort((a, b) => {
      const aAtrasado = a.status !== 'pago' && a.data_vencimento < todayLocal;
      const bAtrasado = b.status !== 'pago' && b.data_vencimento < todayLocal;
      
      // Atrasados primeiro
      if (aAtrasado && !bAtrasado) return -1;
      if (!aAtrasado && bAtrasado) return 1;
      
      // Depois ordena por data crescente
      return a.data_vencimento.localeCompare(b.data_vencimento);
    });
  }, [data, searchTerm]);

  const exportCsv = React.useCallback(() => {
    const rows = (sortedVencimentos || []).map(v => ({ id: v.id, titulo: v.titulo, descricao: v.descricao || '', valor: v.valor, data_vencimento: v.data_vencimento, status: v.status, conta: v.conta_bancaria_nome || '', origem: v.origem_tipo || '' }));
    const csv = toCSV(rows, ['id','titulo','descricao','valor','data_vencimento','status','conta','origem']);
    downloadCSV('vencimentos.csv', csv);
  }, [sortedVencimentos]);

  const today = new Date().toISOString().slice(0, 10);

  // Calculate days until/late
  const getDiasAte = (dataVencimento: string) => {
    const venc = new Date(dataVencimento);
    const agora = new Date();
    const diff = Math.floor((venc.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const openDetail = (vencimento: Vencimento) => {
    setSelectedVencimento(vencimento);
    setDetailOpen(true);
  };

  if (isLoading) return (<LoadingSpinner />);
  if (error) return (<div className="alert alert-danger">Erro ao carregar vencimentos</div>);

  return (
    <div className="container-fluid py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-0">
            <i className="bi bi-calendar-event me-2"></i>
            Vencimentos
            <span className="badge bg-secondary ms-2">{sortedVencimentos?.length || 0}</span>
          </h5>
          <small className="text-muted">Gerenciar prazos e confirmações</small>
        </div>
        <div className="d-flex gap-1 align-items-center">
          <div className="btn-group btn-group-sm">
            <button type="button" className={`btn btn-sm ${pageSize === 25 ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPageSize(25)}>25</button>
            <button type="button" className={`btn btn-sm ${pageSize === 50 ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPageSize(50)}>50</button>
            <button type="button" className={`btn btn-sm ${pageSize === 100 ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPageSize(100)}>100</button>
            <button type="button" className={`btn btn-sm ${pageSize === 1000 ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPageSize(1000)}>∞</button>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={exportCsv} title="Exportar CSV"><i className="bi bi-download"></i></button>
        </div>
      </div>

      {/* Busca */}
      <div className="mb-3">
        <input type="text" className="form-control" placeholder="🔍 Buscar por título, descrição ou valor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Alerta explicativo */}
      {sortedVencimentos?.length > 0 && (
        <div className="alert alert-light py-2 px-3 mb-3 small border-start border-4 border-info">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Como usar:</strong> Clique em <strong>VER</strong> para detalhes completos. Use <strong>Marcar como pago</strong> para confirmação rápida ou <strong>Quitar</strong> para fluxo completo com conta bancária.
        </div>
      )}

      {sortedVencimentos?.length === 0 && !searchTerm && (
        <div className="alert alert-info py-3">
          <i className="bi bi-info-circle me-2"></i>
          Nenhum vencimento cadastrado.
        </div>
      )}
      {sortedVencimentos?.length === 0 && searchTerm && (
        <div className="alert alert-warning py-3">
          <i className="bi bi-search me-2"></i>
          Nenhum resultado para "{searchTerm}".
        </div>
      )}

      {/* Tabela com 7 colunas (3 novas) */}
      {sortedVencimentos?.length > 0 && (
        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Título</th>
                <th className="text-end">Valor</th>
                <th>Vencimento</th>
                <th>Dias até/Atraso</th>
                <th>Conta Bancária</th>
                <th>Origem</th>
                <th>Status</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedVencimentos?.map((v) => {
                const atrasado = v.status !== 'pago' && v.data_vencimento < today;
                const diasAte = getDiasAte(v.data_vencimento);
                return (
                  <tr key={v.id} data-vencimento-id={v.id} className={atrasado ? 'table-danger' : ''}>
                    <td>
                      <div className="fw-medium text-truncate" style={{maxWidth: '200px'}} title={v.titulo}>
                        <i className="bi bi-receipt me-1"></i>
                        {v.titulo}
                      </div>
                      {v.descricao && <small className="text-muted text-truncate d-block" style={{maxWidth: '200px'}} title={v.descricao}>{v.descricao}</small>}
                    </td>
                    <td className="text-end fw-bold">R$ {Number(v.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                    <td><small className="text-monospace">{v.data_vencimento}</small></td>
                    <td>
                      {diasAte < 0 && v.status !== 'pago' ? (
                        <span className="badge bg-danger">
                          <i className="bi bi-exclamation-triangle me-1"></i>
                          {Math.abs(diasAte)} dias
                        </span>
                      ) : diasAte <= 7 && diasAte >= 0 && v.status !== 'pago' ? (
                        <span className="badge bg-warning text-dark">
                          <i className="bi bi-clock me-1"></i>
                          {diasAte} dias
                        </span>
                      ) : (
                        <span className="badge bg-info">
                          {diasAte} dias
                        </span>
                      )}
                    </td>
                    <td className="small">
                      {v.conta_bancaria_nome ? (
                        <span>{v.conta_bancaria_nome}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="small">
                      {v.origem_tipo ? (
                        <span className="badge bg-secondary text-capitalize">{v.origem_tipo}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      {v.status === 'pago' ? (
                        <span className="badge bg-success">
                          <i className="bi bi-check-circle me-1"></i>Pago
                        </span>
                      ) : atrasado ? (
                        <span className="badge bg-danger">
                          <i className="bi bi-exclamation-circle me-1"></i>Atrasado
                        </span>
                      ) : (
                        <span className="badge bg-warning text-dark">
                          <i className="bi bi-hourglass-split me-1"></i>Pendente
                        </span>
                      )}
                    </td>
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button 
                          className="btn btn-outline-info" 
                          title="Visualizar detalhes" 
                          onClick={() => openDetail(v)}
                        >
                          <i className="bi bi-eye"></i> VER
                        </button>
                        {v.status !== 'pago' && (
                          <>
                            <button className="btn btn-success" title="Marcar como pago" onClick={async () => {
                              try {
                                await financeiroService.marcarVencimentoPago(v.id);
                                toast.success('Pago!');
                                await queryClient.invalidateQueries({ queryKey: ['financeiro','vencimentos'] });
                              } catch (err) {
                                toast.error('Erro ao marcar como pago');
                              }
                            }}>
                              <i className="bi bi-check-lg"></i>
                            </button>
                            <button className="btn btn-outline-primary" title="Quitar (fluxo completo)" onClick={() => { setQuitarVencimentoId(v.id); setQuitarOpen(true); }}>
                              <i className="bi bi-cash-coin"></i>
                            </button>
                          </>
                        )}
                        <button className="btn btn-outline-secondary" title="Alterar data" onClick={() => { setChangeVencimentoId(v.id); setChangeDateOpen(true); }}>
                          <i className="bi bi-calendar-event"></i>
                        </button>
                        <button className="btn btn-outline-danger" title={canDeleteVencimento ? "Deletar" : "Sem permissão"} disabled={!canDeleteVencimento} onClick={() => { setDeleteVencimentoId(v.id); setDeleteOpen(true); }}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      <VencimentoDetailModal 
        data={selectedVencimento} 
        show={detailOpen} 
        onClose={() => setDetailOpen(false)} 
      />

      {/* Other Modals */}
      {changeDateOpen && changeVencimentoId && (
        <ChangeVencimentoDateModal show={changeDateOpen} id={changeVencimentoId} onClose={() => { setChangeDateOpen(false); setChangeVencimentoId(null); }} onSaved={() => queryClient.invalidateQueries({ queryKey: ['financeiro','vencimentos'] })} />
      )}

      {markPaidOpen && markPaidVencimentoId && (
        <MarkAsPaidModal show={markPaidOpen} id={markPaidVencimentoId} valorDefault={markPaidValor || 0} onClose={() => { setMarkPaidOpen(false); setMarkPaidVencimentoId(null); setMarkPaidValor(null); }} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['financeiro','vencimentos'] })} />
      )}

      {quitarOpen && quitarVencimentoId && (
        <QuitarModal show={quitarOpen} onClose={() => { setQuitarOpen(false); setQuitarVencimentoId(null); }} vencimentoId={quitarVencimentoId} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['financeiro','vencimentos'] })} />
      )}

      {deleteOpen && deleteVencimentoId && (
        <ConfirmDialog isOpen={deleteOpen} title="Confirmar exclusão" message="Tem certeza que deseja excluir este vencimento?" confirmText="Excluir" cancelText="Cancelar" type="danger" onCancel={() => { setDeleteOpen(false); setDeleteVencimentoId(null); }} onConfirm={async () => {
          try {
            await financeiroService.deleteVencimento(deleteVencimentoId!);
            setDeleteOpen(false);
            setDeleteVencimentoId(null);
            await queryClient.invalidateQueries({ queryKey: ['financeiro','vencimentos'] });
          } catch (err) {
            console.error('Erro ao deletar vencimento', err);
            alert('Falha ao deletar vencimento');
          }
        }} />
      )}

    </div>
  );
};

export default VencimentosList;