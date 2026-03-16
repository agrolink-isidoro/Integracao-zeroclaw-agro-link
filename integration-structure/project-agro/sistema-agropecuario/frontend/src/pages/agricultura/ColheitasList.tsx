import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
import ColheitaForm from './ColheitaForm';
import StartHarvestSessionModal from './StartHarvestSessionModal';
import MovimentacaoCargaModal from './MovimentacaoCargaModal';
import EditHarvestSessionModal from './EditHarvestSessionModal';
import ColheitaCargasModal from './ColheitaCargasModal';
import SessaoMovimentacoesModal from './SessaoMovimentacoesModal';
import type { Colheita } from '../../types';

// Local interfaces for sessions and movimentacoes used by this list
interface SessionItem {
  id: number;
  talhao?: number;
  talhao_name?: string;
  quantidade_colhida?: number | null;
  status?: string;
}

interface HarvestSession {
  id: number;
  plantio?: number;
  plantio_nome?: string;
  data_inicio?: string;
  observacoes?: string;
  status?: string;
  itens?: SessionItem[];
}

interface MovimentacaoCarga {
  id: number;
  session_item?: number | null;
  talhao?: number | null;
  peso_liquido?: number | null;
  peso_bruto?: number | null;
  criado_em?: string;
  talhao_name?: string;
  empresa_destino_nome?: string;
  local_destino_nome?: string;
  destino_tipo?: string;
}

interface FinalizeTarget {
  plantioId?: number;
  talhaoId?: number | string;
  suggestedQuantity?: number;
  expected?: number | null;
  sessionItemId?: number;
  talhaoName?: string;
}

interface ColheitaPreselect { plantioId?: number; talhaoId?: number | string; suggestedQuantity?: number; sessionItemId?: number }

const ColheitasList: React.FC = () => {
  const [showColheitaForm, setShowColheitaForm] = useState(false);
  const [showStartSession, setShowStartSession] = useState(false);
  const [showMovimentacao, setShowMovimentacao] = useState(false);
  const [showCargasModal, setShowCargasModal] = useState(false);
  const [selectedColheita, setSelectedColheita] = useState<Colheita | null>(null);
  const [selectedSessaoMovs, setSelectedSessaoMovs] = useState<HarvestSession | null>(null);


  const { data: sessions = [] } = useQuery<HarvestSession[]>({
    queryKey: ['harvest-sessions'],
    queryFn: async () => {
      const r = await api.get('/agricultura/harvest-sessions/');
      return r.data;
    }
  });

  // Query plantios para listar os que não têm sessões
  interface Plantio {
    id: number;
    nome?: string;
    cultura?: { nome: string };
    data_plantio?: string;
    data_previsao_colheita?: string;
  }
  const { data: plantios = [] } = useQuery<Plantio[]>({
    queryKey: ['plantios'],
    queryFn: async () => {
      const r = await api.get('/agricultura/plantios/');
      return r.data.results || r.data || [];
    }
  });

  // Colheitas and movimentacoes for main list
  const { data: colheitas = [], refetch: refetchColheitas } = useQuery<Colheita[]>({ 
    queryKey: ['colheitas'], 
    queryFn: async () => { 
      const r = await api.get('/agricultura/colheitas/'); 
      console.log('Resposta API colheitas:', r.data);
      // Normaliza resposta: pode ser array direto, objeto com results, ou paginado
      if (Array.isArray(r.data)) {
        console.log('Colheitas (array):', r.data.length);
        return r.data;
      }
      if (r.data.results && Array.isArray(r.data.results)) {
        console.log('Colheitas (paginado):', r.data.results.length);
        return r.data.results;
      }
      console.log('Colheitas: nenhuma encontrada, retornando []');
      return [];
    } 
  });
  const { data: movimentacoes = [] } = useQuery<MovimentacaoCarga[]>({ queryKey: ['movimentacoes-carga'], queryFn: async () => { const r = await api.get('/agricultura/movimentacoes-carga/'); return r.data.results || r.data; } });

  // Suppression state (local - uses localStorage)
  const [suppressed, setSuppressed] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem('suppressedSessions');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [showSuppressed, setShowSuppressed] = useState(false);

  const updateSuppressed = (newList: number[]) => {
    setSuppressed(newList);
    try { localStorage.setItem('suppressedSessions', JSON.stringify(newList)); } catch { /* ignore localStorage errors */ }
  };

  // Sort sessions: active (em_andamento) first, planejada next, others (finalizada, cancelada) last
  const statusPriority = (s: HarvestSession) => {
    if (s.status === 'em_andamento') return 0;
    if (s.status === 'planejada') return 1;
    return 2;
  };

  const visibleSessions = sessions
    .filter((s: HarvestSession) => !suppressed.includes(s.id))
    .slice()
    .sort((a: HarvestSession, b: HarvestSession) => {
      const pa = statusPriority(a), pb = statusPriority(b);
      if (pa !== pb) return pa - pb;
      // fallback: newer first by data_inicio
      return new Date(b.data_inicio || '').getTime() - new Date(a.data_inicio || '').getTime();
    });

  const suppressedSessions = sessions.filter((s: HarvestSession) => suppressed.includes(s.id));

  // Identificar plantios que não têm sessões ativas (planejada ou em_andamento)
  const plantiosComSessoesAtivas = new Set(
    sessions
      .filter(s => s.status === 'planejada' || s.status === 'em_andamento')
      .map(s => s.plantio)
  );
  const plantiosSemSessao = plantios.filter(p => !plantiosComSessoesAtivas.has(p.id));

  const [editingSession, setEditingSession] = useState<HarvestSession | null>(null);
  const [colheitaPreselect, setColheitaPreselect] = useState<ColheitaPreselect | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeTarget, setFinalizeTarget] = useState<FinalizeTarget | null>(null);

  // small helper to compute session total (y = sum x_i)
  const sessionTotal = (session?: HarvestSession) => {
    if (!session || !session.itens) return 0;
    return session.itens.reduce((acc: number, it: SessionItem) => {
      const sumForItem = (movimentacoes || []).filter((m: MovimentacaoCarga) => (m.session_item === it.id) || (m.talhao === it.talhao)).reduce((a: number, m: MovimentacaoCarga) => a + Number(m.peso_liquido || m.peso_bruto || 0), 0);
      return acc + sumForItem;
    }, 0);
  }
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const listener = (e: Event) => {
      const ce = e as CustomEvent<HarvestSession>;
      setEditingSession(ce.detail || null);
    };
    window.addEventListener('edit-harvest-session', listener as EventListener);
    return () => window.removeEventListener('edit-harvest-session', listener as EventListener);
  }, []);

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString() : '—';
  const formatQuantity = (q?: number) => q == null ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(q);

  const getOrigem = (c: Colheita) => {
    if (c.itens && c.itens.length > 0) {
      const first = ((c.itens[0] as any)?.talhao_name) || `Talhão ${c.itens[0]?.talhao ?? '?'} `;
      return c.itens.length > 1 ? `${first} (+${c.itens.length - 1} outros)` : first;
    }
    return c.plantio_talhoes || '—';
  };

  const getDestinoLabelForColheita = (c: Colheita) => {
    const localRaw = c?.movimentacao_estoque_info?.local_armazenamento;
    const local = localRaw != null ? String(localRaw) : '';
    if (local) {
      const lc = local.toLowerCase();
      if (lc.includes('silo') || lc.includes('bolsa')) return `Silo/Bolsa (${local})`;
      return `Armazenagem interna (${local})`;
    } else if (c?.carga_comercial_info?.cliente) {
      const cliente = String(c.carga_comercial_info.cliente || '');
      return `Armazém/Indústria (${cliente})`;
    } else if (c.status === 'armazenada') {
      return 'Armazenado (sem local)';
    }
    return c.status || '—';
  };

  const getDestinoLabelForMov = (m: MovimentacaoCarga) => {
    const companyRaw = m?.empresa_destino_nome ?? ((m as any).empresa_destino?.nome ?? (m as any).empresa_destino);
    const company = companyRaw != null ? String(companyRaw) : '';
    const localRaw = m?.local_destino_nome ?? ((m as any).local_destino?.nome ?? (m as any).local_destino);
    const local = localRaw != null ? String(localRaw) : '';

    if (company) return `Armazém/Indústria (${company})`;
    if (local) {
      const lc = local.toLowerCase();
      if (lc.includes('silo') || lc.includes('bolsa')) return `Silo/Bolsa (${local})`;
      return `Armazenagem interna (${local})`;
    }
    if (m.destino_tipo === 'armazenagem_interna') return 'Armazenagem interna';
    if (m.destino_tipo === 'armazenagem_externa') return 'Armazenagem externa';
    if (m.destino_tipo === 'venda_direta') return 'Venda direta';
    return '—';
  };

  // Agrupar sessões por status
  const sessoesEmAndamento = visibleSessions.filter(s => s.status === 'em_andamento');
  const sessoesProximas = visibleSessions.filter(s => s.status === 'planejada');
  const sessoesFinalizadas = visibleSessions.filter(s => s.status === 'finalizada');
  const colheitasFinalizadas = colheitas.filter(c => c.status === 'finalizada' || c.status === 'armazenada');
  // Total por sessão finalizada (movimentações registradas)
  const totalSessaoFinalizada = (s: HarvestSession) =>
    (movimentacoes || []).filter(m => {
      if (!s.itens || s.itens.length === 0) return false;
      return (s.itens as SessionItem[]).some((it: SessionItem) => {
        const mSI = typeof m.session_item === 'object' ? ((m.session_item as any)?.id ?? null) : m.session_item;
        const mTal = typeof m.talhao === 'object' ? ((m.talhao as any)?.id ?? null) : m.talhao;
        return (mSI && it.id && mSI === it.id) || (mTal && it.talhao && mTal === it.talhao);
      });
    }).reduce((acc, m) => acc + Number(m.peso_liquido || m.peso_bruto || 0), 0);

  // Calcular totais
  const totalMovimentacoes = movimentacoes.reduce((acc, m) => acc + Number(m.peso_liquido || m.peso_bruto || 0), 0);
  const totalColheitasFinalizadas = colheitasFinalizadas.reduce((acc, c) => acc + Number(c.quantidade_colhida || 0), 0);

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2><i className="bi bi-box-seam me-2"></i> Colheitas</h2>
          <p className="text-muted mb-0">Registro e controle de colheitas organizadas por andamento, próximas e finalizadas.</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-success" onClick={() => setShowStartSession(true)}>
            <i className="bi bi-play-circle me-2"></i>Iniciar Sessão
          </button>
          <button className="btn btn-warning" onClick={() => setShowMovimentacao(true)}>
            <i className="bi bi-truck me-2"></i>Nova Movimentação
          </button>
        </div>
      </div>

      {/* SEÇÃO 1: COLHEITAS EM ANDAMENTO (TOPO) */}
      <div className="card mb-4 border-success">
        <div className="card-header bg-success text-white">
          <h5 className="mb-0"><i className="bi bi-hourglass-split me-2"></i>Colheitas em Andamento</h5>
        </div>
        <div className="card-body">
          {sessoesEmAndamento.length === 0 ? (
            <div className="alert alert-info mb-0">
              <i className="bi bi-info-circle me-2"></i>Nenhuma colheita em andamento no momento.
            </div>
          ) : (
            sessoesEmAndamento.map((s: HarvestSession) => (
              <div key={s.id} className="mb-4 border rounded p-3 bg-light">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h6 className="mb-1"><strong>{s.plantio_nome || ('Plantio ' + s.plantio)}</strong></h6>
                    <small className="text-muted">Iniciada em: {formatDate(s.data_inicio)}</small>
                  </div>
                  <div className="btn-group" role="group">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => {
                      const ev = new CustomEvent('edit-harvest-session', { detail: s });
                      window.dispatchEvent(ev);
                    }}>
                      <i className="bi bi-pencil me-1"></i>Editar
                    </button>
                    <button className="btn btn-sm btn-success" onClick={async () => {
                      if (!confirm('Finalizar esta sessão de colheita?')) return;
                      try {
                        await api.post(`agricultura/harvest-sessions/${s.id}/finalize/`);
                        queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
                        showSuccess('Sessão finalizada com sucesso!');
                      } catch (err: unknown) {
                        const eObj = err as { response?: { data?: { detail?: string } } } | null;
                        const msg = eObj?.response?.data?.detail || 'Falha ao finalizar sessão';
                        showError(msg);
                      }
                    }}>
                      <i className="bi bi-check-circle me-1"></i>Finalizar Sessão
                    </button>
                    <button className="btn btn btn-sm btn-outline-danger" onClick={async () => {
                      if (!confirm('Cancelar esta sessão?')) return;
                      try {
                        await api.post(`agricultura/harvest-sessions/${s.id}/cancel/`);
                        queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
                        showSuccess('Sessão cancelada');
                      } catch (e: unknown) {
                        console.error(e);
                        const err = e as { response?: { data?: { detail?: string } } } | null;
                        const msg = err?.response?.data?.detail || 'Falha ao cancelar sessão';
                        showError(msg);
                      }
                    }}>
                      <i className="bi bi-x-circle me-1"></i>Cancelar
                    </button>
                  </div>
                </div>

                {/* Talhões da sessão */}
                <div className="mb-3">
                  <strong className="d-block mb-2">Talhões:</strong>
                  {(!s.itens || s.itens.length === 0) ? (
                    <div className="text-muted small">Nenhum talhão adicionado</div>
                  ) : (
                    <ul className="list-group">
                      {(s.itens || []).filter(Boolean).map((it: SessionItem) => {
                        // segurança: lidar com itens possivelmente nulos ou incompletos
                        const itemId = it?.id ?? null;
                        const itemTalhao = it?.talhao ?? null;

                        const sumForItem = (movimentacoes || [])
                          .filter((m: MovimentacaoCarga) => {
                            // aceitar session_item como id ou objeto, talhao como id ou objeto
                            const mSessionItemId = typeof m.session_item === 'object' ? ((m.session_item as any)?.id ?? null) : m.session_item;
                            const mTalhaoId = typeof m.talhao === 'object' ? ((m.talhao as any)?.id ?? null) : m.talhao;
                            return (mSessionItemId && itemId && mSessionItemId === itemId) || (mTalhaoId && itemTalhao && mTalhaoId === itemTalhao);
                          })
                          .reduce((acc: number, m: MovimentacaoCarga) => acc + Number(m.peso_liquido || m.peso_bruto || 0), 0);

                        const expected = Number(it?.quantidade_colhida || 0);
                        const readyToRegister = (sumForItem > 0 && expected > 0 && sumForItem >= expected) || it?.status === 'carregado';

                        return (
                          <li key={itemId ?? `item-${Math.random()}`} className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                              <strong>{it?.talhao_name || 'Sem talhão'}</strong>
                              <span className="badge bg-secondary ms-2">{it?.status}</span>
                              <div className="small text-muted mt-1">
                                Movimentado: <strong>{formatQuantity(sumForItem)} kg</strong> • 
                                Esperado: {expected ? formatQuantity(expected) + ' kg' : '—'}
                              </div>
                            </div>
                            <button 
                              title={readyToRegister ? 'Finalizar talhão' : 'Aguardando movimentações'} 
                              className={`btn btn-sm ${readyToRegister ? 'btn-success' : 'btn-outline-secondary'}`} 
                              disabled={!readyToRegister} 
                              onClick={() => {
                                const pre: FinalizeTarget = { 
                                  plantioId: s.plantio, 
                                  talhaoId: itemTalhao ?? undefined, 
                                  suggestedQuantity: sumForItem || undefined, 
                                  expected: expected || undefined, 
                                  sessionItemId: itemId ?? undefined, 
                                  talhaoName: it?.talhao_name 
                                };
                                setFinalizeTarget(pre);
                                setShowFinalizeModal(true);
                              }}
                            >
                              <i className="bi bi-check-lg me-1"></i>Finalizar Talhão
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Movimentações da sessão */}
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>Movimentações de Carga:</strong>
                    <button className="btn btn-sm btn-warning" onClick={() => setShowMovimentacao(true)}>
                      <i className="bi bi-plus-circle me-1"></i>Nova Movimentação
                    </button>
                    <button className="btn btn-sm btn-outline-primary" onClick={() => setSelectedSessaoMovs(s)}>
                      <i className="bi bi-table me-1"></i>Ver Movimentações
                    </button>
                  </div>
                  {(() => {
                    const sessionMovs = (movimentacoes || []).filter(m => {
                      try {
                        if (!s.itens || s.itens.length === 0) return false;
                        return (s.itens as SessionItem[]).some((it: SessionItem) => {
                          if (!it) return false;
                          const itemId = it.id ?? null;
                          const itemTalhao = it.talhao ?? null;

                          const mSessionItemId = typeof m.session_item === 'object' ? ((m.session_item as any)?.id ?? null) : m.session_item;
                          const mTalhaoId = typeof m.talhao === 'object' ? ((m.talhao as any)?.id ?? null) : m.talhao;

                          if (mSessionItemId && itemId && mSessionItemId === itemId) return true;
                          if (mTalhaoId && itemTalhao && mTalhaoId === itemTalhao) return true;
                          // fallback: compare talhao id with itemId if model shapes differ
                          if (itemId && (mTalhaoId === itemId || (typeof m.talhao === 'object' && (m.talhao as any)?.id === itemId))) return true;
                          return false;
                        });
                      } catch (e) {
                        console.warn('Erro ao filtrar movimentações para sessão', s.id, e);
                        return false;
                      }
                    });
                    console.log(`Sessão ${s.id} - movimentações encontradas:`, sessionMovs.length);
                    const totalSession = sessionMovs.reduce((acc, m) => acc + Number(m.peso_liquido || m.peso_bruto || 0), 0);
                    
                    return sessionMovs.length === 0 ? (
                      <div className="text-muted small">Nenhuma movimentação registrada</div>
                    ) : (
                      <>
                        <ul className="list-group mb-2">
                          {sessionMovs.map((m: MovimentacaoCarga) => (
                            <li key={m.id} className="list-group-item d-flex justify-content-between align-items-start">
                              <div>
                                <strong>{m.talhao_name || `Talhão ${m.talhao && ((m.talhao as any).id || m.talhao)}`}</strong>
                                <div className="small text-muted">
                                  Peso: {formatQuantity((m.peso_liquido ?? m.peso_bruto) as number | undefined)} kg • 
                                  {formatDate(m.criado_em)} • {getDestinoLabelForMov(m)}
                                </div>
                              </div>

                              <div className="d-flex gap-2 align-items-start">
                                <button className="btn btn-sm btn-outline-primary" onClick={() => {
                                  // abrir detalhes ou reconciliar
                                  const ev = new CustomEvent('open-movimentacao', { detail: m });
                                  window.dispatchEvent(ev);
                                }}>
                                  <i className="bi bi-eye me-1"></i>Detalhes
                                </button>

                                {/* Finalizar sessão a partir de uma movimentação */}
                                {s.status !== 'finalizada' && (
                                  <button className="btn btn-sm btn-success" onClick={async () => {
                                    if (!confirm('Finalizar sessão de colheita? Isso gerará registros de colheita para os talhões desta sessão.')) return;
                                    try {
                                      // tentar sem força primeiro
                                      await api.post(`agricultura/harvest-sessions/${s.id}/finalize/`);
                                      queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
                                      queryClient.invalidateQueries({ queryKey: ['colheitas'] });
                                      showSuccess('Sessão finalizada e colheitas geradas');
                                    } catch (err: unknown) {
                                      const e = err as { response?: { data?: { detail?: string } } } | null;
                                      const msg = e?.response?.data?.detail || '';
                                      if (msg && msg.toLowerCase().includes('existem itens pendentes')) {
                                        if (!confirm('Existem itens pendentes. Deseja forçar a finalização?')) return;
                                        try {
                                          await api.post(`agricultura/harvest-sessions/${s.id}/finalize/`, { force: true });
                                          queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
                                          queryClient.invalidateQueries({ queryKey: ['colheitas'] });
                                          showSuccess('Sessão finalizada (forçada) e colheitas geradas');
                                        } catch (e2: unknown) {
                                          const e2obj = e2 as { response?: { data?: { detail?: string } } } | null;
                                          showError(e2obj?.response?.data?.detail || 'Falha ao finalizar sessão');
                                        }
                                      } else {
                                        showError(msg || 'Falha ao finalizar sessão');
                                      }
                                    }

                                  }}>
                                    <i className="bi bi-flag-fill me-1"></i>Finalizar Sessão
                                  </button>
                                )}

                              </div>

                            </li>
                          ))}
                        </ul>
                        <div className="alert alert-success mb-0">
                          <strong>Total Movimentado nesta Sessão: {formatQuantity(totalSession)} kg ({(totalSession / 1000).toFixed(2)} ton)</strong>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SEÇÃO 2: COLHEITAS PRÓXIMAS */}
      <div className="card mb-4 border-warning">
        <div className="card-header bg-warning text-dark">
          <h5 className="mb-0"><i className="bi bi-calendar-event me-2"></i>Colheitas Próximas</h5>
        </div>
        <div className="card-body">
          {sessoesProximas.length === 0 && plantiosSemSessao.length === 0 ? (
            <div className="alert alert-info mb-0">
              <i className="bi bi-info-circle me-2"></i>Nenhuma colheita planejada no momento.
            </div>
          ) : (
            <div className="list-group">
              {/* Sessões planejadas */}
              {sessoesProximas.map((s: HarvestSession) => (
                <div key={`session-${s.id}`} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-1">
                        <span className="badge bg-info me-2">Sessão Planejada</span>
                        {s.plantio_nome || ('Plantio ' + s.plantio)}
                      </h6>
                      <small className="text-muted">Planejada para: {formatDate(s.data_inicio)}</small>
                      {s.itens && s.itens.length > 0 && (
                        <div className="mt-2">
                          <strong className="small">Talhões a colher:</strong>
                          <ul className="mb-0 small">
                            {s.itens.map((it: SessionItem) => (
                              <li key={it.id}>{it.talhao_name || `Talhão ${it.talhao}`}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <button 
                      className="btn btn-success"
                      onClick={async () => {
                        try {
                          await api.post(`agricultura/harvest-sessions/${s.id}/start/`);
                          queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
                          showSuccess('Colheita iniciada!');
                        } catch (err: unknown) {
                          const eObj = err as { response?: { data?: { detail?: string } } } | null;
                          const msg = eObj?.response?.data?.detail || 'Falha ao iniciar colheita';
                          showError(msg);
                        }
                      }}
                    >
                      <i className="bi bi-play-fill me-1"></i>Iniciar Colheita
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Plantios sem sessão */}
              {plantiosSemSessao.map((p: Plantio) => (
                <div key={`plantio-${p.id}`} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-1">
                        <span className="badge bg-secondary me-2">Safra</span>
                        {p.nome || `Safra ${p.cultura?.nome || 'N/A'}`}
                      </h6>
                      <small className="text-muted">
                        Plantado em: {formatDate(p.data_plantio)}
                        {p.data_previsao_colheita && ` • Previsão: ${formatDate(p.data_previsao_colheita)}`}
                      </small>
                    </div>
                    <button 
                      className="btn btn-success"
                      onClick={() => {
                        // Abrir modal para criar nova sessão de colheita para este plantio
                        setShowStartSession(true);
                        // Poderia passar o plantio como preselect aqui
                      }}
                    >
                      <i className="bi bi-plus-circle me-1"></i>Criar Sessão
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO 3: COLHEITAS FINALIZADAS */}
      <div className="card mb-4 border-primary">
        <div className="card-header bg-primary text-white">
          <h5 className="mb-0"><i className="bi bi-check-circle me-2"></i>Colheitas Finalizadas</h5>
        </div>
        <div className="card-body">
          {colheitasFinalizadas.length === 0 && sessoesFinalizadas.length === 0 ? (
            <div className="alert alert-info mb-0">
              <i className="bi bi-info-circle me-2"></i>Nenhuma colheita finalizada ainda.
            </div>
          ) : (
            <>
              {colheitasFinalizadas.length > 0 && (
                <div className="row mb-3">
                  <div className="col-md-6">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h6 className="text-muted">Total Colhido</h6>
                        <h3 className="mb-0">{formatQuantity(totalColheitasFinalizadas)} kg</h3>
                        <small className="text-muted">({(totalColheitasFinalizadas / 1000).toFixed(2)} ton)</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <h6 className="text-muted">Produtividade Média</h6>
                        <h3 className="mb-0">
                          {colheitasFinalizadas.length > 0 && colheitasFinalizadas[0].area_total
                            ? (totalColheitasFinalizadas / Number(colheitasFinalizadas.reduce((acc, c) => acc + Number(c.area_total || 0), 0))).toFixed(2)
                            : '—'
                          }
                        </h3>
                        <small className="text-muted">kg/ha</small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="list-group">
                {/* Sessões que já foram finalizadas automaticamente após movimentação */}
                {sessoesFinalizadas.map((s: HarvestSession) => {
                  const tot = totalSessaoFinalizada(s);
                  return (
                    <div key={`sess-${s.id}`} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">
                            <span className="badge bg-success me-2">Sessão Finalizada</span>
                            {s.plantio_nome || ('Plantio ' + s.plantio)}
                          </h6>
                          <small className="text-muted">Finalizada em: {formatDate(s.data_inicio)}</small>
                          {tot > 0 && (
                            <div className="mt-1">
                              <span className="badge bg-primary">{formatQuantity(tot)} kg movimentados</span>
                            </div>
                          )}
                        </div>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => updateSuppressed([...suppressed, s.id])}
                        >
                          <i className="bi bi-eye-slash me-1"></i>Suprimir
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary ms-2"
                          onClick={() => setSelectedSessaoMovs(s)}
                        >
                          <i className="bi bi-table me-1"></i>Ver Movimentações
                        </button>
                      </div>
                    </div>
                  );
                })}
                {colheitasFinalizadas.map((c: Colheita) => {
                  const origem = getOrigem(c);
                  const destino = getDestinoLabelForColheita(c);

                  return (
                    <div key={c.id} className="list-group-item list-group-item-action" style={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedColheita(c);
                        setShowCargasModal(true);
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">
                            {c.plantio_cultura ? `Safra ${c.plantio_cultura}` : ((c as any).plantio_nome || `Safra ${c.plantio}`)}
                          </h6>
                          <small className="text-muted">
                            {formatDate(c.data_colheita)} • Origem: {origem} • Destino: {destino}
                          </small>
                          <div className="mt-1">
                            <span className="badge bg-success">{formatQuantity(c.quantidade_colhida || 0)} {c.unidade || 'kg'}</span>
                          </div>
                        </div>
                        <div className="text-end">
                          <button className="btn btn-sm btn-outline-primary" onClick={(e) => {
                            e.stopPropagation();
                            setSelectedColheita(c);
                            setShowCargasModal(true);
                          }}>
                            <i className="bi bi-truck me-1"></i>Ver Movimentações
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Área auxiliar: Sessões suprimidas e outras ações */}
      <div className="row mb-4">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Sessões Suprimidas</h6>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <small className="text-muted">Gerenciar sessões suprimidas</small>
                <button 
                  className={`btn btn-sm ${showSuppressed ? 'btn-primary' : 'btn-outline-secondary'}`} 
                  onClick={() => setShowSuppressed(!showSuppressed)}
                >
                  {showSuppressed ? 'Ocultar' : `Mostrar (${suppressed.length})`}
                </button>
              </div>

              {showSuppressed && (
                <div className="mt-3">
                  {suppressedSessions.length === 0 ? (
                    <div className="text-muted small">Nenhuma sessão suprimida</div>
                  ) : (
                    suppressedSessions.map((s: HarvestSession) => (
                      <div key={s.id} className="mb-2 border rounded p-2 bg-light">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{s.plantio_nome || ('Plantio ' + s.plantio)}</strong>
                            <span className="badge bg-secondary ms-2">{s.status}</span>
                            <div className="small text-muted">{formatDate(s.data_inicio)}</div>
                          </div>
                          <div>
                            <button className="btn btn-sm btn-outline-primary me-2" onClick={() => {
                              updateSuppressed(suppressed.filter((id) => id !== s.id));
                              showSuccess('Sessão restaurada');
                            }}>Restaurar</button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showColheitaForm && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <ColheitaForm
                plantioId={colheitaPreselect?.plantioId}
                onClose={() => { setShowColheitaForm(false); setColheitaPreselect(null); }}
                onSuccess={() => { setShowColheitaForm(false); setColheitaPreselect(null); }}
                preselectedTalhao={typeof colheitaPreselect?.talhaoId === 'number' ? colheitaPreselect?.talhaoId : undefined}
                preselectedQuantidade={colheitaPreselect?.suggestedQuantity}
                preselectedSessionItem={colheitaPreselect?.sessionItemId}
              />
            </div>
          </div>
        </div>
      )}

      {/* Finalize confirmation modal (with divergence check) */}
      {showFinalizeModal && finalizeTarget && (() => {
        const expected = finalizeTarget?.expected || null;
        const suggested = finalizeTarget?.suggestedQuantity || 0;
        const divergencePercent = (expected && expected > 0) ? (suggested / expected * 100) : null;
        const outOfRange = divergencePercent != null && (divergencePercent < 80 || divergencePercent > 120);
        const confirmBtnClass = outOfRange ? 'btn btn-warning' : 'btn btn-primary';
        const alertClass = divergencePercent == null ? 'alert-secondary' : (outOfRange ? 'alert-warning' : 'alert-success');
        return (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-sm">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirmar Finalização</h5>
                  <button type="button" className="btn-close" onClick={() => { setShowFinalizeModal(false); setFinalizeTarget(null); }}></button>
                </div>
                <div className="modal-body">
                  <p><strong>Talhão:</strong> {finalizeTarget.talhaoName || finalizeTarget.talhaoId}</p>
                  <p><strong>Movimentações soma:</strong> {formatQuantity(suggested)} kg</p>
                  {expected ? (
                    <div className={`alert ${alertClass} small mb-2`} role="alert">
                      <strong>{divergencePercent?.toFixed(1)}%</strong> do esperado ({formatQuantity(expected)} kg). {outOfRange ? 'Verifique os registros antes de confirmar ou ajuste a quantidade no formulário.' : 'Dentro do intervalo esperado.'}
                    </div>
                  ) : (
                    <div className="alert alert-secondary small mb-2" role="alert">Quantidade esperada não informada no talhão.</div>
                  )}
                  <p className="small text-muted">Ao confirmar será aberto o formulário de finalização com esta quantidade sugerida. Você pode ajustar antes de enviar.</p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline-secondary" onClick={() => { setShowFinalizeModal(false); setFinalizeTarget(null); }}>Cancelar</button>
                  <button className={confirmBtnClass} onClick={() => {
                    // proceed to open finalize form
                    setColheitaPreselect({ plantioId: finalizeTarget.plantioId, talhaoId: finalizeTarget.talhaoId, suggestedQuantity: finalizeTarget.suggestedQuantity, sessionItemId: finalizeTarget.sessionItemId });
                    setShowColheitaForm(true);
                    setShowFinalizeModal(false);
                    setFinalizeTarget(null);
                  }}>Confirmar</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {showStartSession && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <StartHarvestSessionModal
                plantioId={undefined}
                onClose={() => setShowStartSession(false)}
                onSuccess={() => setShowStartSession(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit session modal will open when an event is received */}
      <div id="edit-session-modal-root"></div>

      {showMovimentacao && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <MovimentacaoCargaModal
                onClose={() => setShowMovimentacao(false)}
                onSuccess={() => setShowMovimentacao(false)}
              />
            </div>
          </div>
        </div>
      )}

      {editingSession && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <EditHarvestSessionModal
                session={editingSession as any}
                onClose={() => setEditingSession(null)}
                onSuccess={() => setEditingSession(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cargas da Colheita */}
      <ColheitaCargasModal
        show={showCargasModal}
        onHide={() => {
          setShowCargasModal(false);
          setSelectedColheita(null);
        }}
        colheita={selectedColheita}
      />

      {/* Modal de Movimentações da Sessão (tabela com transporte) */}
      {selectedSessaoMovs && (
        <SessaoMovimentacoesModal
          session={selectedSessaoMovs}
          onClose={() => setSelectedSessaoMovs(null)}
        />
      )}
    </div>
  );
};

export default ColheitasList;
