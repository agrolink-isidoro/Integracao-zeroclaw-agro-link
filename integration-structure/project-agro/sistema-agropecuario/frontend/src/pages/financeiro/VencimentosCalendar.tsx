import React, { useMemo, useState } from 'react';
// Basic date helpers to avoid additional dependencies
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const startOfWeek = (d: Date) => { const copy = new Date(d); const day = copy.getDay(); copy.setDate(copy.getDate() - day); copy.setHours(0,0,0,0); return copy; };
const endOfWeek = (d: Date) => { const copy = new Date(d); const day = copy.getDay(); copy.setDate(copy.getDate() + (6 - day)); copy.setHours(23,59,59,999); return copy; };
const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const pad2 = (n:number) => n<10? '0'+n : ''+n;
const format = (d: Date, fmt = 'yyyy-MM-dd') => {
  if (fmt === 'yyyy-MM-dd') return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  if (fmt === 'd') return ''+d.getDate();
  return d.toISOString();
};
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import financeiroService from '@/services/financeiro';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';
import type { Vencimento } from '@/types/financeiro';
import { toCSV, downloadCSV } from '@/utils/csv';
import QuitarModal from '@/components/financeiro/QuitarModal';

const VencimentosCalendar: React.FC = () => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedVencimentos, setSelectedVencimentos] = useState<Vencimento[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pendente' | 'pago' | 'atrasado'>('all');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  // Fetch vencimentos for the month
  const { data, isLoading, error } = useQuery<Vencimento[]>({
    queryKey: ['financeiro', 'vencimentos', 'calendar', format(monthStart, 'yyyy-MM-dd')],
    queryFn: () => financeiroService.getVencimentos({ data_inicio: format(monthStart, 'yyyy-MM-dd'), data_fim: format(monthEnd, 'yyyy-MM-dd') }),
  });

  // Debug: log calendar query and returned data for current month (must be unconditionally declared before any returns)
  React.useEffect(() => {
    try {
      const key = ['financeiro','vencimentos','calendar', format(monthStart, 'yyyy-MM-dd')];
      console.log('📅 VencimentosCalendar (early) queryKey:', key);
      console.log('📦 Calendar data length (early):', (data || []).length);
      console.log('🆔 Calendar vencimentos ids (early):', (data || []).map(v => v.id));
    } catch (e) {
      console.warn('⚠️ Erro debug calendar logs (early):', e);
    }
  }, [data, monthStart]);

  // Compute month totals and counts
  const monthStats = React.useMemo(() => {
    const stats = { total_value: 0, pendente: 0, pago: 0, atrasado: 0 } as { total_value: number; pendente: number; pago: number; atrasado: number };
    (data || []).forEach((v) => {
      const val = parseFloat(String(v.valor || 0)) || 0;
      stats.total_value += val;
      if (v.status === 'pago') stats.pago += 1;
      else if (v.status === 'atrasado') stats.atrasado += 1;
      else stats.pendente += 1;
    });
    return stats;
  }, [data]);

  // Important: declare query client, mutations and confirmation state BEFORE any early returns to keep hook order stable
  const queryClient = useQueryClient();

  const markMutation = useMutation<Vencimento, Error, number, unknown>({
    mutationFn: (id: number) => financeiroService.marcarVencimentoPago(id),
    onMutate: async (id: number) => {
      // Optimistic update: mark selectedVencimentos locally to 'pago'
      setSelectedVencimentos((prev) => prev.map((v) => (v.id === id ? { ...v, status: 'pago' } : v)));
      return { id };
    },
    onError: (err: Error) => {
      console.error('Erro ao marcar vencimento como pago', err);
      toast.error('Erro ao marcar como pago');
      // revert optimistic update by refetching
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] });
    },
    onSuccess: (data: Vencimento, id?: number) => {
      toast.success('Vencimento marcado como pago');
      // refetch calendar and lists
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro', 'vencimentos', 'calendar'] });
      // update local selectedVencimentos fully to include server response if provided
      setSelectedVencimentos((prev) => prev.map((v) => (v.id === id ? { ...v, status: 'pago', data_pagamento: data.data_pagamento || v.data_pagamento } : v)));
    }
  });

  // confirmation modal state
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmId, setConfirmId] = React.useState<number | null>(null);
  const [confirmDate, setConfirmDate] = React.useState<string | null>(null);

  // quick quit modal
  const [quitarOpen, setQuitarOpen] = React.useState(false);
  const [quitarId, setQuitarId] = React.useState<number | null>(null);

  // help modal state
  const [helpOpen, setHelpOpen] = React.useState(false);
  const openConfirm = (id: number, defaultDate?: string) => {
    setConfirmId(id);
    setConfirmDate(defaultDate || null);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setConfirmId(null);
    setConfirmDate(null);
  };

  const confirmMark = async () => {
    if (!confirmId) return;
    try {
      await markMutation.mutateAsync(confirmId);
      closeConfirm();
    } catch (e) {
      // error handled by mutation onError
    }
  };

  const mapByDate = useMemo(() => {
    const map = new Map<string, Vencimento[]>();
    (data || []).forEach((v) => {
      const k = v.data_vencimento;
      const arr = map.get(k) || [];
      arr.push(v);
      map.set(k, arr);
    });
    return map;
  }, [data]);

  // Filtered view depending on statusFilter
  const filteredMapByDate = useMemo(() => {
    if (statusFilter === 'all') return mapByDate;
    const fm = new Map<string, Vencimento[]>();
    Array.from(mapByDate.entries()).forEach(([k, arr]) => {
      const filtered = arr.filter((v) => v.status === statusFilter);
      if (filtered.length) fm.set(k, filtered);
    });
    return fm;
  }, [mapByDate, statusFilter]);


  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="alert alert-danger">Erro ao carregar vencimentos</div>;



  const rows = [];
  let day = startDate;
  while (day <= endDate) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    rows.push(week);
  }

  // NOTE: no hooks should be conditionally invoked below this point
  // openDay depends on mapByDate which is defined later; it is safe to reference
  const openDay = (d: Date) => {
    setSelectedDay(d);
    const key = format(d, 'yyyy-MM-dd');
    setSelectedVencimentos(filteredMapByDate.get(key) || []);
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4>Calendário de Vencimentos</h4>
          <p className="text-muted mb-0">Visualize vencimentos por dia e marque como pagos.</p>
          <div className="mt-2">
            <strong>{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</strong>
            <div className="small text-muted">
              Total mês: R$ {monthStats.total_value.toFixed(2)} — <span className="text-warning">Pendente {monthStats.pendente}</span> • <span className="text-success">Pago {monthStats.pago}</span> • <span className="text-danger">Atrasado {monthStats.atrasado}</span>
            </div>
            <div className="mt-2 d-flex align-items-center">
              <div aria-label="Legenda de status" data-testid="legend">
                <span className="badge bg-warning me-1" title="Pendente: vencimentos ainda não pagos">Pendente</span>
                <span className="badge bg-success me-1" title="Pago: vencimentos marcados como pagos">Pago</span>
                <span className="badge bg-danger me-1" title="Atrasado: vencimentos em atraso">Atrasado</span>
              </div>
              <button className="btn btn-sm btn-outline-secondary ms-3" aria-label="Ajuda legenda" title="Badges mostram os vencimentos do dia; clique no dia para ver detalhes; use o filtro para limitar por status" onClick={() => setHelpOpen(true)}>?</button>
            </div>
          </div>
        </div>
        <div>
          <div className="d-flex align-items-center">
            <div className="me-3">
              <label htmlFor="statusFilter" className="form-label small mb-1">Filtrar status</label>
              <select id="statusFilter" aria-label="Filtrar status" className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pendente' | 'pago' | 'atrasado')}>
                <option value="all">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="atrasado">Atrasado</option>
              </select>
            </div>
            <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>Anterior</button>
            <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>Próximo</button>
            <button data-testid="export-csv" className="btn btn-sm btn-outline-secondary me-2" onClick={() => {
              const rows = (data || []).map(v => ({ id: v.id, titulo: v.titulo, descricao: v.descricao || '', valor: v.valor, data_vencimento: v.data_vencimento, status: v.status }));
              const csv = toCSV(rows, ['id','titulo','descricao','valor','data_vencimento','status']);
              downloadCSV(`vencimentos-${format(monthStart,'yyyy-MM-dd')}.csv`, csv);
            }}>Exportar CSV</button>

            <button data-testid="export-pdf" className="btn btn-sm btn-outline-secondary" onClick={() => {
              // export month as PDF (basic HTML print approach)
              const rows = (data || []).map(v => ({ id: v.id, titulo: v.titulo, descricao: v.descricao || '', valor: v.valor, data_vencimento: v.data_vencimento, status: v.status }));
              const html = `<!doctype html><html><head><meta charset="utf-8"><title>Vencimentos - ${format(monthStart,'yyyy-MM-dd')}</title><style>table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px}</style></head><body><h3>Vencimentos - ${currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3><table><thead><tr><th>ID</th><th>Titulo</th><th>Valor</th><th>Data</th><th>Status</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.id}</td><td>${r.titulo}</td><td>R$ ${r.valor}</td><td>${r.data_vencimento}</td><td>${r.status}</td></tr>`).join('')}</tbody></table></body></html>`;
              const win = window.open('', '_blank');
              if (win && win.document) {
                win.document.open();
                win.document.write(html);
                win.document.close();
                // try to trigger print (in browser it will open print dialog)
                try { win.focus(); win.print(); } catch (e) { /* noop in tests */ }
              }
            }}>Exportar PDF</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Dom</th>
                  <th>Seg</th>
                  <th>Ter</th>
                  <th>Qua</th>
                  <th>Qui</th>
                  <th>Sex</th>
                  <th>Sáb</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((week, wi) => (
                  <tr key={wi}>
                    {week.map((d) => {
                      const key = format(d, 'yyyy-MM-dd');
                      const dayVenc = filteredMapByDate.get(key) || [];
                      const isOtherMonth = d.getMonth() !== monthStart.getMonth();
                      return (
                        <td key={key} className={isOtherMonth ? 'text-muted' : ''} style={{ verticalAlign: 'top', minWidth: 120 }}>
                          <div onClick={() => openDay(d)} style={{ cursor: 'pointer' }}>
                            <strong>{format(d, 'd')}</strong>
                                    <div>
                                {/* show up to 3 individual items */}
                                {dayVenc.slice(0, 3).map((v) => (
                                  <div key={v.id} className={`badge ${v.status === 'pago' ? 'bg-success' : v.status === 'atrasado' ? 'bg-danger' : 'bg-warning'} me-1`} title={`${v.titulo} — ${v.status}`}>
                                    R$ {v.valor}
                                  </div>
                                ))}
                                {dayVenc.length > 0 && (
                                  <div className="small text-muted mt-1">
                                    Total: R$ {dayVenc.reduce((s, it) => s + (parseFloat(String(it.valor || 0)) || 0), 0).toFixed(2)} —
                                    <span className="ms-1 text-warning">P {dayVenc.filter(x => x.status !== 'pago' && x.status !== 'atrasado').length}</span>
                                    <span className="ms-1 text-success">Pago {dayVenc.filter(x => x.status === 'pago').length}</span>
                                    <span className="ms-1 text-danger">Atr {dayVenc.filter(x => x.status === 'atrasado').length}</span>
                                  </div>
                                )}
                                {dayVenc.length > 3 && <div className="text-muted small">+{dayVenc.length - 3} mais</div>}
                              </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer small text-muted d-flex justify-content-between align-items-center">
          <div data-testid="footer-legend">
            <span className="badge bg-warning me-1">Pendente</span>
            <span className="badge bg-success me-1">Pago</span>
            <span className="badge bg-danger me-1">Atrasado</span>
          </div>
          <div className="text-end"><small>Dica: clique em um dia para abrir detalhes</small></div>
        </div>
      </div>

      {selectedDay && (
        <div className="modal d-block" tabIndex={-1} role="dialog" aria-label="day-modal">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Vencimentos - {format(selectedDay, 'yyyy-MM-dd')}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setSelectedDay(null)} />
              </div>
              <div className="modal-body">
                {selectedVencimentos.length === 0 && <p>Nenhum vencimento neste dia.</p>}
                {selectedVencimentos.map((v) => (
                  <div key={v.id} className="d-flex justify-content-between align-items-center border-bottom py-2">
                    <div>
                      <strong>{v.titulo}</strong>
                      <div><small>{v.descricao}</small></div>
                    </div>
                    <div className="text-end">
                      <div>R$ {v.valor}</div>
                      {v.status !== 'pago' && (
                        <>
                          <button className="btn btn-sm btn-outline-primary me-2 mt-2" onClick={() => { setSelectedVencimentos((prev) => prev); setQuitarId(v.id); setQuitarOpen(true); }}>Quitar</button>
                          <button data-testid={`mark-${v.id}`} className="btn btn-sm btn-success mt-2" onClick={() => openConfirm(v.id, v.data_vencimento)}>Marcar como pago</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {confirmOpen && (
        <div className="modal d-block" tabIndex={-1} role="dialog" aria-label="confirm-mark-modal">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar pagamento</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={closeConfirm} />
              </div>
              <div className="modal-body">
                <p>Você tem certeza que deseja marcar este vencimento como pago?</p>
                <div className="mb-3">
                  <label className="form-label">Data de pagamento</label>
                  <input data-testid="confirm-date" type="date" className="form-control" value={confirmDate || ''} onChange={(e) => setConfirmDate(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeConfirm}>Cancelar</button>
                <button data-testid="confirm-mark-btn" className="btn btn-primary" onClick={confirmMark}>Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Quitar modal */}
      {quitarOpen && quitarId && (
        <QuitarModal show={quitarOpen} vencimentoId={quitarId} onClose={() => { setQuitarOpen(false); setQuitarId(null); }} onSuccess={() => { /* refresh queries: invalidate via queryClient if applicable */ }} />
      )}

      {/* Help modal */}
      {helpOpen && (
        <div className="modal d-block" tabIndex={-1} role="dialog" aria-label="help-modal">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Ajuda - Legenda e filtros</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setHelpOpen(false)} />
              </div>
              <div className="modal-body">
                <p>As badges representam vencimentos no dia. Cores: <strong>Amarelo</strong> = Pendente, <strong>Verde</strong> = Pago, <strong>Vermelho</strong> = Atrasado.</p>
                <p>Use o filtro para mostrar apenas um status e clique em um dia para ver ou marcar vencimentos como pagos. Use <strong>Exportar CSV</strong> e <strong>Exportar PDF</strong> para salvar o mês atual.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setHelpOpen(false)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default VencimentosCalendar;