import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
const ColheitasList = () => {
    const [showColheitaForm, setShowColheitaForm] = useState(false);
    const [showStartSession, setShowStartSession] = useState(false);
    const [showMovimentacao, setShowMovimentacao] = useState(false);
    const [showCargasModal, setShowCargasModal] = useState(false);
    const [selectedColheita, setSelectedColheita] = useState(null);
    const [selectedSessaoMovs, setSelectedSessaoMovs] = useState(null);
    const { data: sessions = [] } = useQuery({
        queryKey: ['harvest-sessions'],
        queryFn: async () => {
            const r = await api.get('/agricultura/harvest-sessions/');
            return r.data;
        }
    });
    const { data: plantios = [] } = useQuery({
        queryKey: ['plantios'],
        queryFn: async () => {
            const r = await api.get('/agricultura/plantios/');
            return r.data.results || r.data || [];
        }
    });
    // Colheitas and movimentacoes for main list
    const { data: colheitas = [], refetch: refetchColheitas } = useQuery({
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
    const { data: movimentacoes = [] } = useQuery({ queryKey: ['movimentacoes-carga'], queryFn: async () => { const r = await api.get('/agricultura/movimentacoes-carga/'); return r.data.results || r.data; } });
    // Suppression state (local - uses localStorage)
    const [suppressed, setSuppressed] = useState(() => {
        try {
            const raw = localStorage.getItem('suppressedSessions');
            return raw ? JSON.parse(raw) : [];
        }
        catch {
            return [];
        }
    });
    const [showSuppressed, setShowSuppressed] = useState(false);
    const updateSuppressed = (newList) => {
        setSuppressed(newList);
        try {
            localStorage.setItem('suppressedSessions', JSON.stringify(newList));
        }
        catch { /* ignore localStorage errors */ }
    };
    // Sort sessions: active (em_andamento) first, planejada next, others (finalizada, cancelada) last
    const statusPriority = (s) => {
        if (s.status === 'em_andamento')
            return 0;
        if (s.status === 'planejada')
            return 1;
        return 2;
    };
    const visibleSessions = sessions
        .filter((s) => !suppressed.includes(s.id))
        .slice()
        .sort((a, b) => {
        const pa = statusPriority(a), pb = statusPriority(b);
        if (pa !== pb)
            return pa - pb;
        // fallback: newer first by data_inicio
        return new Date(b.data_inicio || '').getTime() - new Date(a.data_inicio || '').getTime();
    });
    const suppressedSessions = sessions.filter((s) => suppressed.includes(s.id));
    // Identificar plantios que não têm sessões ativas (planejada ou em_andamento)
    const plantiosComSessoesAtivas = new Set(sessions
        .filter(s => s.status === 'planejada' || s.status === 'em_andamento')
        .map(s => s.plantio));
    const plantiosSemSessao = plantios.filter(p => !plantiosComSessoesAtivas.has(p.id));
    const [editingSession, setEditingSession] = useState(null);
    const [colheitaPreselect, setColheitaPreselect] = useState(null);
    const [showFinalizeModal, setShowFinalizeModal] = useState(false);
    const [finalizeTarget, setFinalizeTarget] = useState(null);
    // small helper to compute session total (y = sum x_i)
    const sessionTotal = (session) => {
        if (!session || !session.itens)
            return 0;
        return session.itens.reduce((acc, it) => {
            const sumForItem = (movimentacoes || []).filter((m) => (m.session_item === it.id) || (m.talhao === it.talhao)).reduce((a, m) => a + Number(m.peso_liquido || m.peso_bruto || 0), 0);
            return acc + sumForItem;
        }, 0);
    };
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToast();
    useEffect(() => {
        const listener = (e) => {
            const ce = e;
            setEditingSession(ce.detail || null);
        };
        window.addEventListener('edit-harvest-session', listener);
        return () => window.removeEventListener('edit-harvest-session', listener);
    }, []);
    const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
    const formatQuantity = (q) => q == null ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(q);
    const getOrigem = (c) => {
        if (c.itens && c.itens.length > 0) {
            const first = (c.itens[0]?.talhao_name) || `Talhão ${c.itens[0]?.talhao ?? '?'} `;
            return c.itens.length > 1 ? `${first} (+${c.itens.length - 1} outros)` : first;
        }
        return c.plantio_talhoes || '—';
    };
    const getDestinoLabelForColheita = (c) => {
        const localRaw = c?.movimentacao_estoque_info?.local_armazenamento;
        const local = localRaw != null ? String(localRaw) : '';
        if (local) {
            const lc = local.toLowerCase();
            if (lc.includes('silo') || lc.includes('bolsa'))
                return `Silo/Bolsa (${local})`;
            return `Armazenagem interna (${local})`;
        }
        else if (c?.carga_comercial_info?.cliente) {
            const cliente = String(c.carga_comercial_info.cliente || '');
            return `Armazém/Indústria (${cliente})`;
        }
        else if (c.status === 'armazenada') {
            return 'Armazenado (sem local)';
        }
        return c.status || '—';
    };
    const getDestinoLabelForMov = (m) => {
        const companyRaw = m?.empresa_destino_nome ?? (m.empresa_destino?.nome ?? m.empresa_destino);
        const company = companyRaw != null ? String(companyRaw) : '';
        const localRaw = m?.local_destino_nome ?? (m.local_destino?.nome ?? m.local_destino);
        const local = localRaw != null ? String(localRaw) : '';
        if (company)
            return `Armazém/Indústria (${company})`;
        if (local) {
            const lc = local.toLowerCase();
            if (lc.includes('silo') || lc.includes('bolsa'))
                return `Silo/Bolsa (${local})`;
            return `Armazenagem interna (${local})`;
        }
        if (m.destino_tipo === 'armazenagem_interna')
            return 'Armazenagem interna';
        if (m.destino_tipo === 'armazenagem_externa')
            return 'Armazenagem externa';
        if (m.destino_tipo === 'venda_direta')
            return 'Venda direta';
        return '—';
    };
    // Agrupar sessões por status
    const sessoesEmAndamento = visibleSessions.filter(s => s.status === 'em_andamento');
    const sessoesProximas = visibleSessions.filter(s => s.status === 'planejada');
    const sessoesFinalizadas = visibleSessions.filter(s => s.status === 'finalizada');
    const colheitasFinalizadas = colheitas.filter(c => c.status === 'finalizada' || c.status === 'armazenada');
    // Total por sessão finalizada (movimentações registradas)
    const totalSessaoFinalizada = (s) => (movimentacoes || []).filter(m => {
        if (!s.itens || s.itens.length === 0)
            return false;
        return s.itens.some((it) => {
            const mSI = typeof m.session_item === 'object' ? (m.session_item?.id ?? null) : m.session_item;
            const mTal = typeof m.talhao === 'object' ? (m.talhao?.id ?? null) : m.talhao;
            return (mSI && it.id && mSI === it.id) || (mTal && it.talhao && mTal === it.talhao);
        });
    }).reduce((acc, m) => acc + Number(m.peso_liquido || m.peso_bruto || 0), 0);
    // Calcular totais
    const totalMovimentacoes = movimentacoes.reduce((acc, m) => acc + Number(m.peso_liquido || m.peso_bruto || 0), 0);
    const totalColheitasFinalizadas = colheitasFinalizadas.reduce((acc, c) => acc + Number(c.quantidade_colhida || 0), 0);
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("div", { children: [_jsxs("h2", { children: [_jsx("i", { className: "bi bi-box-seam me-2" }), " Colheitas"] }), _jsx("p", { className: "text-muted mb-0", children: "Registro e controle de colheitas organizadas por andamento, pr\u00F3ximas e finalizadas." })] }), _jsxs("div", { className: "d-flex gap-2", children: [_jsxs("button", { className: "btn btn-success", onClick: () => setShowStartSession(true), children: [_jsx("i", { className: "bi bi-play-circle me-2" }), "Iniciar Sess\u00E3o"] }), _jsxs("button", { className: "btn btn-warning", onClick: () => setShowMovimentacao(true), children: [_jsx("i", { className: "bi bi-truck me-2" }), "Nova Movimenta\u00E7\u00E3o"] })] })] }), _jsxs("div", { className: "card mb-4 border-success", children: [_jsx("div", { className: "card-header bg-success text-white", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-hourglass-split me-2" }), "Colheitas em Andamento"] }) }), _jsx("div", { className: "card-body", children: sessoesEmAndamento.length === 0 ? (_jsxs("div", { className: "alert alert-info mb-0", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Nenhuma colheita em andamento no momento."] })) : (sessoesEmAndamento.map((s) => (_jsxs("div", { className: "mb-4 border rounded p-3 bg-light", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-3", children: [_jsxs("div", { children: [_jsx("h6", { className: "mb-1", children: _jsx("strong", { children: s.plantio_nome || ('Plantio ' + s.plantio) }) }), _jsxs("small", { className: "text-muted", children: ["Iniciada em: ", formatDate(s.data_inicio)] })] }), _jsxs("div", { className: "btn-group", role: "group", children: [_jsxs("button", { className: "btn btn-sm btn-outline-primary", onClick: () => {
                                                        const ev = new CustomEvent('edit-harvest-session', { detail: s });
                                                        window.dispatchEvent(ev);
                                                    }, children: [_jsx("i", { className: "bi bi-pencil me-1" }), "Editar"] }), _jsxs("button", { className: "btn btn-sm btn-success", onClick: async () => {
                                                        if (!confirm('Finalizar esta sessão de colheita?'))
                                                            return;
                                                        try {
                                                            await api.post(`agricultura/harvest-sessions/${s.id}/finalize/`);
                                                            queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
                                                            showSuccess('Sessão finalizada com sucesso!');
                                                        }
                                                        catch (err) {
                                                            const eObj = err;
                                                            const msg = eObj?.response?.data?.detail || 'Falha ao finalizar sessão';
                                                            showError(msg);
                                                        }
                                                    }, children: [_jsx("i", { className: "bi bi-check-circle me-1" }), "Finalizar Sess\u00E3o"] }), _jsxs("button", { className: "btn btn btn-sm btn-outline-danger", onClick: async () => {
                                                        if (!confirm('Cancelar esta sessão?'))
                                                            return;
                                                        try {
                                                            await api.post(`agricultura/harvest-sessions/${s.id}/cancel/`);
                                                            queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
                                                            showSuccess('Sessão cancelada');
                                                        }
                                                        catch (e) {
                                                            console.error(e);
                                                            const err = e;
                                                            const msg = err?.response?.data?.detail || 'Falha ao cancelar sessão';
                                                            showError(msg);
                                                        }
                                                    }, children: [_jsx("i", { className: "bi bi-x-circle me-1" }), "Cancelar"] })] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("strong", { className: "d-block mb-2", children: "Talh\u00F5es:" }), (!s.itens || s.itens.length === 0) ? (_jsx("div", { className: "text-muted small", children: "Nenhum talh\u00E3o adicionado" })) : (_jsx("ul", { className: "list-group", children: (s.itens || []).filter(Boolean).map((it) => {
                                                // segurança: lidar com itens possivelmente nulos ou incompletos
                                                const itemId = it?.id ?? null;
                                                const itemTalhao = it?.talhao ?? null;
                                                const sumForItem = (movimentacoes || [])
                                                    .filter((m) => {
                                                    // aceitar session_item como id ou objeto, talhao como id ou objeto
                                                    const mSessionItemId = typeof m.session_item === 'object' ? (m.session_item?.id ?? null) : m.session_item;
                                                    const mTalhaoId = typeof m.talhao === 'object' ? (m.talhao?.id ?? null) : m.talhao;
                                                    return (mSessionItemId && itemId && mSessionItemId === itemId) || (mTalhaoId && itemTalhao && mTalhaoId === itemTalhao);
                                                })
                                                    .reduce((acc, m) => acc + Number(m.peso_liquido || m.peso_bruto || 0), 0);
                                                const expected = Number(it?.quantidade_colhida || 0);
                                                const readyToRegister = (sumForItem > 0 && expected > 0 && sumForItem >= expected) || it?.status === 'carregado';
                                                return (_jsxs("li", { className: "list-group-item d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsx("strong", { children: it?.talhao_name || 'Sem talhão' }), _jsx("span", { className: "badge bg-secondary ms-2", children: it?.status }), _jsxs("div", { className: "small text-muted mt-1", children: ["Movimentado: ", _jsxs("strong", { children: [formatQuantity(sumForItem), " kg"] }), " \u2022 Esperado: ", expected ? formatQuantity(expected) + ' kg' : '—'] })] }), _jsxs("button", { title: readyToRegister ? 'Finalizar talhão' : 'Aguardando movimentações', className: `btn btn-sm ${readyToRegister ? 'btn-success' : 'btn-outline-secondary'}`, disabled: !readyToRegister, onClick: () => {
                                                                const pre = {
                                                                    plantioId: s.plantio,
                                                                    talhaoId: itemTalhao ?? undefined,
                                                                    suggestedQuantity: sumForItem || undefined,
                                                                    expected: expected || undefined,
                                                                    sessionItemId: itemId ?? undefined,
                                                                    talhaoName: it?.talhao_name
                                                                };
                                                                setFinalizeTarget(pre);
                                                                setShowFinalizeModal(true);
                                                            }, children: [_jsx("i", { className: "bi bi-check-lg me-1" }), "Finalizar Talh\u00E3o"] })] }, itemId ?? `item-${Math.random()}`));
                                            }) }))] }), _jsxs("div", { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-2", children: [_jsx("strong", { children: "Movimenta\u00E7\u00F5es de Carga:" }), _jsxs("button", { className: "btn btn-sm btn-warning", onClick: () => setShowMovimentacao(true), children: [_jsx("i", { className: "bi bi-plus-circle me-1" }), "Nova Movimenta\u00E7\u00E3o"] }), _jsxs("button", { className: "btn btn-sm btn-outline-primary", onClick: () => setSelectedSessaoMovs(s), children: [_jsx("i", { className: "bi bi-table me-1" }), "Ver Movimenta\u00E7\u00F5es"] })] }), (() => {
                                            const sessionMovs = (movimentacoes || []).filter(m => {
                                                try {
                                                    if (!s.itens || s.itens.length === 0)
                                                        return false;
                                                    return s.itens.some((it) => {
                                                        if (!it)
                                                            return false;
                                                        const itemId = it.id ?? null;
                                                        const itemTalhao = it.talhao ?? null;
                                                        const mSessionItemId = typeof m.session_item === 'object' ? (m.session_item?.id ?? null) : m.session_item;
                                                        const mTalhaoId = typeof m.talhao === 'object' ? (m.talhao?.id ?? null) : m.talhao;
                                                        if (mSessionItemId && itemId && mSessionItemId === itemId)
                                                            return true;
                                                        if (mTalhaoId && itemTalhao && mTalhaoId === itemTalhao)
                                                            return true;
                                                        // fallback: compare talhao id with itemId if model shapes differ
                                                        if (itemId && (mTalhaoId === itemId || (typeof m.talhao === 'object' && m.talhao?.id === itemId)))
                                                            return true;
                                                        return false;
                                                    });
                                                }
                                                catch (e) {
                                                    console.warn('Erro ao filtrar movimentações para sessão', s.id, e);
                                                    return false;
                                                }
                                            });
                                            console.log(`Sessão ${s.id} - movimentações encontradas:`, sessionMovs.length);
                                            const totalSession = sessionMovs.reduce((acc, m) => acc + Number(m.peso_liquido || m.peso_bruto || 0), 0);
                                            return sessionMovs.length === 0 ? (_jsx("div", { className: "text-muted small", children: "Nenhuma movimenta\u00E7\u00E3o registrada" })) : (_jsxs(_Fragment, { children: [_jsx("ul", { className: "list-group mb-2", children: sessionMovs.map((m) => (_jsxs("li", { className: "list-group-item d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("strong", { children: m.talhao_name || `Talhão ${m.talhao && (m.talhao.id || m.talhao)}` }), _jsxs("div", { className: "small text-muted", children: ["Peso: ", formatQuantity((m.peso_liquido ?? m.peso_bruto)), " kg \u2022", formatDate(m.criado_em), " \u2022 ", getDestinoLabelForMov(m)] })] }), _jsxs("div", { className: "d-flex gap-2 align-items-start", children: [_jsxs("button", { className: "btn btn-sm btn-outline-primary", onClick: () => {
                                                                                // abrir detalhes ou reconciliar
                                                                                const ev = new CustomEvent('open-movimentacao', { detail: m });
                                                                                window.dispatchEvent(ev);
                                                                            }, children: [_jsx("i", { className: "bi bi-eye me-1" }), "Detalhes"] }), s.status !== 'finalizada' && (_jsxs("button", { className: "btn btn-sm btn-success", onClick: async () => {
                                                                                if (!confirm('Finalizar sessão de colheita? Isso gerará registros de colheita para os talhões desta sessão.'))
                                                                                    return;
                                                                                try {
                                                                                    // tentar sem força primeiro
                                                                                    await api.post(`agricultura/harvest-sessions/${s.id}/finalize/`);
                                                                                    queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
                                                                                    queryClient.invalidateQueries({ queryKey: ['colheitas'] });
                                                                                    showSuccess('Sessão finalizada e colheitas geradas');
                                                                                }
                                                                                catch (err) {
                                                                                    const e = err;
                                                                                    const msg = e?.response?.data?.detail || '';
                                                                                    if (msg && msg.toLowerCase().includes('existem itens pendentes')) {
                                                                                        if (!confirm('Existem itens pendentes. Deseja forçar a finalização?'))
                                                                                            return;
                                                                                        try {
                                                                                            await api.post(`agricultura/harvest-sessions/${s.id}/finalize/`, { force: true });
                                                                                            queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
                                                                                            queryClient.invalidateQueries({ queryKey: ['colheitas'] });
                                                                                            showSuccess('Sessão finalizada (forçada) e colheitas geradas');
                                                                                        }
                                                                                        catch (e2) {
                                                                                            const e2obj = e2;
                                                                                            showError(e2obj?.response?.data?.detail || 'Falha ao finalizar sessão');
                                                                                        }
                                                                                    }
                                                                                    else {
                                                                                        showError(msg || 'Falha ao finalizar sessão');
                                                                                    }
                                                                                }
                                                                            }, children: [_jsx("i", { className: "bi bi-flag-fill me-1" }), "Finalizar Sess\u00E3o"] }))] })] }, m.id))) }), _jsx("div", { className: "alert alert-success mb-0", children: _jsxs("strong", { children: ["Total Movimentado nesta Sess\u00E3o: ", formatQuantity(totalSession), " kg (", (totalSession / 1000).toFixed(2), " ton)"] }) })] }));
                                        })()] })] }, s.id)))) })] }), _jsxs("div", { className: "card mb-4 border-warning", children: [_jsx("div", { className: "card-header bg-warning text-dark", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-calendar-event me-2" }), "Colheitas Pr\u00F3ximas"] }) }), _jsx("div", { className: "card-body", children: sessoesProximas.length === 0 && plantiosSemSessao.length === 0 ? (_jsxs("div", { className: "alert alert-info mb-0", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Nenhuma colheita planejada no momento."] })) : (_jsxs("div", { className: "list-group", children: [sessoesProximas.map((s) => (_jsx("div", { className: "list-group-item", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsxs("h6", { className: "mb-1", children: [_jsx("span", { className: "badge bg-info me-2", children: "Sess\u00E3o Planejada" }), s.plantio_nome || ('Plantio ' + s.plantio)] }), _jsxs("small", { className: "text-muted", children: ["Planejada para: ", formatDate(s.data_inicio)] }), s.itens && s.itens.length > 0 && (_jsxs("div", { className: "mt-2", children: [_jsx("strong", { className: "small", children: "Talh\u00F5es a colher:" }), _jsx("ul", { className: "mb-0 small", children: s.itens.map((it) => (_jsx("li", { children: it.talhao_name || `Talhão ${it.talhao}` }, it.id))) })] }))] }), _jsxs("button", { className: "btn btn-success", onClick: async () => {
                                                    try {
                                                        await api.post(`agricultura/harvest-sessions/${s.id}/start/`);
                                                        queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
                                                        showSuccess('Colheita iniciada!');
                                                    }
                                                    catch (err) {
                                                        const eObj = err;
                                                        const msg = eObj?.response?.data?.detail || 'Falha ao iniciar colheita';
                                                        showError(msg);
                                                    }
                                                }, children: [_jsx("i", { className: "bi bi-play-fill me-1" }), "Iniciar Colheita"] })] }) }, `session-${s.id}`))), plantiosSemSessao.map((p) => (_jsx("div", { className: "list-group-item", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsxs("h6", { className: "mb-1", children: [_jsx("span", { className: "badge bg-secondary me-2", children: "Safra" }), p.nome || `Safra ${p.cultura?.nome || 'N/A'}`] }), _jsxs("small", { className: "text-muted", children: ["Plantado em: ", formatDate(p.data_plantio), p.data_previsao_colheita && ` • Previsão: ${formatDate(p.data_previsao_colheita)}`] })] }), _jsxs("button", { className: "btn btn-success", onClick: () => {
                                                    // Abrir modal para criar nova sessão de colheita para este plantio
                                                    setShowStartSession(true);
                                                    // Poderia passar o plantio como preselect aqui
                                                }, children: [_jsx("i", { className: "bi bi-plus-circle me-1" }), "Criar Sess\u00E3o"] })] }) }, `plantio-${p.id}`)))] })) })] }), _jsxs("div", { className: "card mb-4 border-primary", children: [_jsx("div", { className: "card-header bg-primary text-white", children: _jsxs("h5", { className: "mb-0", children: [_jsx("i", { className: "bi bi-check-circle me-2" }), "Colheitas Finalizadas"] }) }), _jsx("div", { className: "card-body", children: colheitasFinalizadas.length === 0 && sessoesFinalizadas.length === 0 ? (_jsxs("div", { className: "alert alert-info mb-0", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Nenhuma colheita finalizada ainda."] })) : (_jsxs(_Fragment, { children: [colheitasFinalizadas.length > 0 && (_jsxs("div", { className: "row mb-3", children: [_jsx("div", { className: "col-md-6", children: _jsx("div", { className: "card bg-light", children: _jsxs("div", { className: "card-body text-center", children: [_jsx("h6", { className: "text-muted", children: "Total Colhido" }), _jsxs("h3", { className: "mb-0", children: [formatQuantity(totalColheitasFinalizadas), " kg"] }), _jsxs("small", { className: "text-muted", children: ["(", (totalColheitasFinalizadas / 1000).toFixed(2), " ton)"] })] }) }) }), _jsx("div", { className: "col-md-6", children: _jsx("div", { className: "card bg-light", children: _jsxs("div", { className: "card-body text-center", children: [_jsx("h6", { className: "text-muted", children: "Produtividade M\u00E9dia" }), _jsx("h3", { className: "mb-0", children: colheitasFinalizadas.length > 0 && colheitasFinalizadas[0].area_total
                                                                ? (totalColheitasFinalizadas / Number(colheitasFinalizadas.reduce((acc, c) => acc + Number(c.area_total || 0), 0))).toFixed(2)
                                                                : '—' }), _jsx("small", { className: "text-muted", children: "kg/ha" })] }) }) })] })), _jsxs("div", { className: "list-group", children: [sessoesFinalizadas.map((s) => {
                                            const tot = totalSessaoFinalizada(s);
                                            return (_jsx("div", { className: "list-group-item", children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsxs("h6", { className: "mb-1", children: [_jsx("span", { className: "badge bg-success me-2", children: "Sess\u00E3o Finalizada" }), s.plantio_nome || ('Plantio ' + s.plantio)] }), _jsxs("small", { className: "text-muted", children: ["Finalizada em: ", formatDate(s.data_inicio)] }), tot > 0 && (_jsx("div", { className: "mt-1", children: _jsxs("span", { className: "badge bg-primary", children: [formatQuantity(tot), " kg movimentados"] }) }))] }), _jsxs("button", { className: "btn btn-sm btn-outline-secondary", onClick: () => updateSuppressed([...suppressed, s.id]), children: [_jsx("i", { className: "bi bi-eye-slash me-1" }), "Suprimir"] }), _jsxs("button", { className: "btn btn-sm btn-outline-primary ms-2", onClick: () => setSelectedSessaoMovs(s), children: [_jsx("i", { className: "bi bi-table me-1" }), "Ver Movimenta\u00E7\u00F5es"] })] }) }, `sess-${s.id}`));
                                        }), colheitasFinalizadas.map((c) => {
                                            const origem = getOrigem(c);
                                            const destino = getDestinoLabelForColheita(c);
                                            return (_jsx("div", { className: "list-group-item list-group-item-action", style: { cursor: 'pointer' }, onClick: () => {
                                                    setSelectedColheita(c);
                                                    setShowCargasModal(true);
                                                }, children: _jsxs("div", { className: "d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("h6", { className: "mb-1", children: c.plantio_cultura ? `Safra ${c.plantio_cultura}` : (c.plantio_nome || `Safra ${c.plantio}`) }), _jsxs("small", { className: "text-muted", children: [formatDate(c.data_colheita), " \u2022 Origem: ", origem, " \u2022 Destino: ", destino] }), _jsx("div", { className: "mt-1", children: _jsxs("span", { className: "badge bg-success", children: [formatQuantity(c.quantidade_colhida || 0), " ", c.unidade || 'kg'] }) })] }), _jsx("div", { className: "text-end", children: _jsxs("button", { className: "btn btn-sm btn-outline-primary", onClick: (e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedColheita(c);
                                                                    setShowCargasModal(true);
                                                                }, children: [_jsx("i", { className: "bi bi-truck me-1" }), "Ver Movimenta\u00E7\u00F5es"] }) })] }) }, c.id));
                                        })] })] })) })] }), _jsx("div", { className: "row mb-4", children: _jsx("div", { className: "col-md-12", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: _jsx("h6", { className: "mb-0", children: "Sess\u00F5es Suprimidas" }) }), _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-2", children: [_jsx("small", { className: "text-muted", children: "Gerenciar sess\u00F5es suprimidas" }), _jsx("button", { className: `btn btn-sm ${showSuppressed ? 'btn-primary' : 'btn-outline-secondary'}`, onClick: () => setShowSuppressed(!showSuppressed), children: showSuppressed ? 'Ocultar' : `Mostrar (${suppressed.length})` })] }), showSuppressed && (_jsx("div", { className: "mt-3", children: suppressedSessions.length === 0 ? (_jsx("div", { className: "text-muted small", children: "Nenhuma sess\u00E3o suprimida" })) : (suppressedSessions.map((s) => (_jsx("div", { className: "mb-2 border rounded p-2 bg-light", children: _jsxs("div", { className: "d-flex justify-content-between align-items-center", children: [_jsxs("div", { children: [_jsx("strong", { children: s.plantio_nome || ('Plantio ' + s.plantio) }), _jsx("span", { className: "badge bg-secondary ms-2", children: s.status }), _jsx("div", { className: "small text-muted", children: formatDate(s.data_inicio) })] }), _jsx("div", { children: _jsx("button", { className: "btn btn-sm btn-outline-primary me-2", onClick: () => {
                                                                updateSuppressed(suppressed.filter((id) => id !== s.id));
                                                                showSuccess('Sessão restaurada');
                                                            }, children: "Restaurar" }) })] }) }, s.id)))) }))] })] }) }) }), showColheitaForm && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered modal-lg", children: _jsx("div", { className: "modal-content", children: _jsx(ColheitaForm, { plantioId: colheitaPreselect?.plantioId, onClose: () => { setShowColheitaForm(false); setColheitaPreselect(null); }, onSuccess: () => { setShowColheitaForm(false); setColheitaPreselect(null); }, preselectedTalhao: typeof colheitaPreselect?.talhaoId === 'number' ? colheitaPreselect?.talhaoId : undefined, preselectedQuantidade: colheitaPreselect?.suggestedQuantity, preselectedSessionItem: colheitaPreselect?.sessionItemId }) }) }) })), showFinalizeModal && finalizeTarget && (() => {
                const expected = finalizeTarget?.expected || null;
                const suggested = finalizeTarget?.suggestedQuantity || 0;
                const divergencePercent = (expected && expected > 0) ? (suggested / expected * 100) : null;
                const outOfRange = divergencePercent != null && (divergencePercent < 80 || divergencePercent > 120);
                const confirmBtnClass = outOfRange ? 'btn btn-warning' : 'btn btn-primary';
                const alertClass = divergencePercent == null ? 'alert-secondary' : (outOfRange ? 'alert-warning' : 'alert-success');
                return (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-sm", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Confirmar Finaliza\u00E7\u00E3o" }), _jsx("button", { type: "button", className: "btn-close", onClick: () => { setShowFinalizeModal(false); setFinalizeTarget(null); } })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("p", { children: [_jsx("strong", { children: "Talh\u00E3o:" }), " ", finalizeTarget.talhaoName || finalizeTarget.talhaoId] }), _jsxs("p", { children: [_jsx("strong", { children: "Movimenta\u00E7\u00F5es soma:" }), " ", formatQuantity(suggested), " kg"] }), expected ? (_jsxs("div", { className: `alert ${alertClass} small mb-2`, role: "alert", children: [_jsxs("strong", { children: [divergencePercent?.toFixed(1), "%"] }), " do esperado (", formatQuantity(expected), " kg). ", outOfRange ? 'Verifique os registros antes de confirmar ou ajuste a quantidade no formulário.' : 'Dentro do intervalo esperado.'] })) : (_jsx("div", { className: "alert alert-secondary small mb-2", role: "alert", children: "Quantidade esperada n\u00E3o informada no talh\u00E3o." })), _jsx("p", { className: "small text-muted", children: "Ao confirmar ser\u00E1 aberto o formul\u00E1rio de finaliza\u00E7\u00E3o com esta quantidade sugerida. Voc\u00EA pode ajustar antes de enviar." })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { className: "btn btn-outline-secondary", onClick: () => { setShowFinalizeModal(false); setFinalizeTarget(null); }, children: "Cancelar" }), _jsx("button", { className: confirmBtnClass, onClick: () => {
                                                // proceed to open finalize form
                                                setColheitaPreselect({ plantioId: finalizeTarget.plantioId, talhaoId: finalizeTarget.talhaoId, suggestedQuantity: finalizeTarget.suggestedQuantity, sessionItemId: finalizeTarget.sessionItemId });
                                                setShowColheitaForm(true);
                                                setShowFinalizeModal(false);
                                                setFinalizeTarget(null);
                                            }, children: "Confirmar" })] })] }) }) }));
            })(), showStartSession && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-lg", children: _jsx("div", { className: "modal-content", children: _jsx(StartHarvestSessionModal, { plantioId: undefined, onClose: () => setShowStartSession(false), onSuccess: () => setShowStartSession(false) }) }) }) })), _jsx("div", { id: "edit-session-modal-root" }), showMovimentacao && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-lg", children: _jsx("div", { className: "modal-content", children: _jsx(MovimentacaoCargaModal, { onClose: () => setShowMovimentacao(false), onSuccess: () => setShowMovimentacao(false) }) }) }) })), editingSession && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-lg", children: _jsx("div", { className: "modal-content", children: _jsx(EditHarvestSessionModal, { session: editingSession, onClose: () => setEditingSession(null), onSuccess: () => setEditingSession(null) }) }) }) })), _jsx(ColheitaCargasModal, { show: showCargasModal, onHide: () => {
                    setShowCargasModal(false);
                    setSelectedColheita(null);
                }, colheita: selectedColheita }), selectedSessaoMovs && (_jsx(SessaoMovimentacoesModal, { session: selectedSessaoMovs, onClose: () => setSelectedSessaoMovs(null) }))] }));
};
export default ColheitasList;
