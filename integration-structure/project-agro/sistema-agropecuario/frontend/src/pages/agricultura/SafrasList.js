import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import financeiroService from '../../services/financeiro';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import { SafraForm } from './SafraForm';
import { useToast } from '../../hooks/useToast';
import { ManejoForm } from './ManejoForm';
import { OrdemServicoForm } from './OrdemServicoForm';
import ColheitaForm from './ColheitaForm';
export const SafrasList = () => {
    const queryClient = useQueryClient();
    const [safraExpandida, setSafraExpandida] = useState(null);
    const [filtroStatus, setFiltroStatus] = useState('todos');
    const [showSafraForm, setShowSafraForm] = useState(false);
    const [showManejoForm, setShowManejoForm] = useState(false);
    const [showOSForm, setShowOSForm] = useState(false);
    const [showColheitaForm, setShowColheitaForm] = useState(false);
    const [safraEdit, setSafraEdit] = useState(undefined);
    const [plantioIdForForm, setPlantioIdForForm] = useState(undefined);
    // Mutation para deletar safra
    const { showSuccess, showError } = useToast();
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`agricultura/plantios/${id}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plantios'] });
            showSuccess && showSuccess('Safra excluída');
        },
        onError: (err) => {
            console.error('Erro ao excluir safra', err);
            const e = err;
            const msg = e?.response?.data?.detail || e?.response?.data || 'Erro ao excluir safra';
            showError && showError(String(msg));
        }
    });
    const handleDeleteSafra = (safra) => {
        if (window.confirm(`Tem certeza que deseja excluir a safra "${safra.nome_safra}"? Esta ação não pode ser desfeita.`)) {
            deleteMutation.mutate(safra.id);
        }
    };
    // Buscar plantios (safras)
    const { data: plantios = [], isLoading, error } = useQuery({
        queryKey: ['plantios'],
        queryFn: async () => {
            const response = await api.get('/agricultura/plantios/');
            // Support both paginated DRF responses and plain lists
            return response.data?.results ?? response.data;
        },
    });
    // Buscar manejos quando expandir uma safra
    const { data: manejos = [] } = useQuery({
        queryKey: ['manejos'],
        queryFn: async () => {
            const response = await api.get('/agricultura/manejos/');
            return response.data;
        },
        enabled: safraExpandida !== null,
    });
    // Buscar ordens de serviço
    const { data: ordensServico = [] } = useQuery({
        queryKey: ['ordens-servico'],
        queryFn: async () => {
            const response = await api.get('/agricultura/ordens-servico/');
            return response.data;
        },
        enabled: safraExpandida !== null,
    });
    // Buscar rateios/despesas relacionados à safra expandida
    const { data: rateiosDaSafra = [], isLoading: rateiosLoading } = useQuery({
        queryKey: ['rateios', safraExpandida],
        queryFn: async () => {
            if (!safraExpandida)
                return [];
            return financeiroService.getRateios({ safra: safraExpandida });
        },
        enabled: safraExpandida !== null,
    });
    if (isLoading)
        return _jsx(LoadingSpinner, {});
    if (error)
        return _jsx(ErrorMessage, { message: "Erro ao carregar safras" });
    // Agregar operações por plantio
    const safrasComOperacoes = plantios.map(plantio => {
        const manejosDoPlantio = manejos.filter(m => m.plantio === plantio.id);
        const osDoPlantio = ordensServico.filter(os => {
            // OrdemServico não tem plantio direto, mas tem talhões
            // Verificar se algum talhão da OS está no plantio
            const talhoesPlantio = plantio.talhoes || [];
            const osTalhoes = os.talhoes || [];
            return osTalhoes.some(t => talhoesPlantio.includes(t));
        });
        return {
            ...plantio,
            manejos: manejosDoPlantio,
            ordens_servico: osDoPlantio,
            total_operacoes: manejosDoPlantio.length + osDoPlantio.length,
        };
    });
    // Filtrar por status
    const safrasFiltradas = filtroStatus === 'todos'
        ? safrasComOperacoes
        : safrasComOperacoes.filter(s => s.status === filtroStatus);
    // Agrupar por cultura (conceito de "Safra")
    const safrasPorCultura = safrasFiltradas.reduce((acc, safra) => {
        const cultura = safra.cultura_nome || 'Sem cultura';
        if (!acc[cultura])
            acc[cultura] = [];
        acc[cultura].push(safra);
        return acc;
    }, {});
    const getStatusBadge = (status) => {
        const colors = {
            planejado: 'secondary',
            em_andamento: 'primary',
            colhido: 'success',
            perdido: 'danger',
        };
        return `badge bg-${colors[status] || 'secondary'}`;
    };
    const toggleExpansao = (id) => {
        setSafraExpandida(safraExpandida === id ? null : id);
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("h2", { children: [_jsx("i", { className: "bi bi-calendar-event me-2" }), "Safras e Opera\u00E7\u00F5es Agr\u00EDcolas"] }), _jsxs("button", { className: "btn btn-primary", onClick: () => {
                            setSafraEdit(undefined);
                            setShowSafraForm(true);
                        }, children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), "Nova Safra"] })] }), _jsx("div", { className: "card mb-4", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-3", children: [_jsx("label", { className: "form-label", children: "Status" }), _jsxs("select", { className: "form-select", value: filtroStatus, onChange: (e) => setFiltroStatus(e.target.value), children: [_jsx("option", { value: "todos", children: "Todos" }), _jsx("option", { value: "planejado", children: "Planejado" }), _jsx("option", { value: "em_andamento", children: "Em Andamento" }), _jsx("option", { value: "colhido", children: "Colhido" }), _jsx("option", { value: "perdido", children: "Perdido" })] })] }), _jsxs("div", { className: "col-md-9", children: [_jsx("label", { className: "form-label", children: "\u00A0" }), _jsxs("div", { className: "d-flex gap-2", children: [_jsxs("button", { className: "btn btn-outline-secondary", children: [_jsx("i", { className: "bi bi-funnel me-2" }), "Mais Filtros"] }), _jsxs("button", { className: "btn btn-outline-secondary", children: [_jsx("i", { className: "bi bi-download me-2" }), "Exportar"] })] })] })] }) }) }), _jsxs("div", { className: "row mb-4", children: [_jsx("div", { className: "col-md-3", children: _jsx("div", { className: "card text-white bg-primary", children: _jsxs("div", { className: "card-body", children: [_jsx("h5", { className: "card-title", children: "Total de Safras" }), _jsx("h2", { children: safrasComOperacoes.length })] }) }) }), _jsx("div", { className: "col-md-3", children: _jsx("div", { className: "card text-white bg-success", children: _jsxs("div", { className: "card-body", children: [_jsx("h5", { className: "card-title", children: "\u00C1rea Total" }), _jsxs("h2", { children: [safrasComOperacoes.reduce((sum, s) => sum + (s.area_total_ha || 0), 0).toFixed(0), " ha"] })] }) }) }), _jsx("div", { className: "col-md-3", children: _jsx("div", { className: "card text-white bg-warning", children: _jsxs("div", { className: "card-body", children: [_jsx("h5", { className: "card-title", children: "Em Andamento" }), _jsx("h2", { children: safrasComOperacoes.filter(s => s.status === 'em_andamento').length })] }) }) }), _jsx("div", { className: "col-md-3", children: _jsx("div", { className: "card text-white bg-info", children: _jsxs("div", { className: "card-body", children: [_jsx("h5", { className: "card-title", children: "Opera\u00E7\u00F5es" }), _jsx("h2", { children: safrasComOperacoes.reduce((sum, s) => sum + (s.total_operacoes || 0), 0) })] }) }) })] }), Object.entries(safrasPorCultura).map(([cultura, safras]) => (_jsxs("div", { className: "mb-4", children: [_jsxs("h4", { className: "mb-3", children: [_jsx("i", { className: "bi bi-flower2 me-2 text-success" }), "Safra ", cultura] }), safras.map((safra) => (_jsxs("div", { className: "card mb-3", children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center", style: { cursor: 'pointer' }, onClick: () => toggleExpansao(safra.id), children: [_jsxs("div", { children: [_jsxs("h5", { className: "mb-0", children: [safra.nome_safra, _jsx("span", { className: `ms-2 ${getStatusBadge(safra.status)}`, children: safra.status })] }), _jsxs("small", { className: "text-muted", children: [safra.fazenda_nome, " \u2022", safra.talhoes_info?.length, " talh\u00E3o(\u00F5es) \u2022", safra.area_total_ha, " ha \u2022 Plantio: ", new Date(safra.data_plantio).toLocaleDateString()] })] }), _jsxs("div", { className: "d-flex align-items-center gap-3", children: [_jsxs("span", { className: "badge bg-info", children: [safra.total_operacoes, " opera\u00E7\u00F5es"] }), _jsxs(Link, { to: `/dashboard/inteligencia?safraId=${safra.id}`, onClick: (e) => e.stopPropagation(), className: "btn btn-sm btn-outline-primary", title: "Abrir Central de Intelig\u00EAncia", children: [_jsx("i", { className: "bi bi-lightbulb-fill me-1", style: { color: '#198754' } }), "Central de Intelig\u00EAncia"] }), _jsx("button", { className: "btn btn-sm btn-outline-info", onClick: async (e) => { e.stopPropagation(); try {
                                                    const servis = await import('../../services/operacoes');
                                                    await servis.default.recalcularPlantio(safra.id);
                                                    queryClient.invalidateQueries({ queryKey: ['plantios'] });
                                                }
                                                catch (err) {
                                                    console.error(err);
                                                } }, children: "Recalcular custos" }), _jsx("i", { className: `bi bi-chevron-${safraExpandida === safra.id ? 'up' : 'down'}` })] })] }), safraExpandida === safra.id && (_jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "mb-3", children: [_jsx("i", { className: "bi bi-clock-history me-2" }), "Timeline de Opera\u00E7\u00F5es"] }), safra.total_operacoes === 0 ? (_jsxs("div", { className: "alert alert-info", children: ["Nenhuma opera\u00E7\u00E3o registrada ainda.", _jsx("button", { className: "btn btn-sm btn-link", children: "Adicionar primeira opera\u00E7\u00E3o" })] })) : (_jsxs("div", { className: "timeline", children: [safra.manejos?.map((manejo) => (_jsx("div", { className: "timeline-item mb-3", children: _jsxs("div", { className: "d-flex", children: [_jsx("div", { className: "timeline-icon bg-primary text-white rounded-circle d-flex align-items-center justify-content-center", style: { width: '40px', height: '40px', minWidth: '40px' }, children: _jsx("i", { className: "bi bi-tools" }) }), _jsx("div", { className: "ms-3 flex-grow-1", children: _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between", children: [_jsxs("div", { children: [_jsxs("h6", { className: "mb-1", children: [_jsx("span", { className: "badge bg-primary me-2", children: "Manejo" }), manejo.tipo] }), _jsxs("small", { className: "text-muted", children: [new Date(manejo.data_manejo).toLocaleDateString(), " \u2022", manejo.equipamento ? ` Equipamento: ${manejo.equipamento}` : ''] }), manejo.descricao && (_jsx("p", { className: "mt-2 mb-0", children: manejo.descricao }))] }), _jsxs("div", { className: "text-end", children: [_jsxs("strong", { children: ["R$ ", Number(manejo.custo_total ?? manejo.custo ?? 0).toFixed(2)] }), _jsx("div", { className: "mt-2", children: manejo.contabilizado ? (_jsx("span", { className: "badge bg-success", children: "Contabilizado" })) : (_jsx("button", { className: "btn btn-sm btn-outline-primary", onClick: async () => {
                                                                                                        try {
                                                                                                            await (await import('../../services/operacoes')).default.contabilizarManejo(manejo.id);
                                                                                                            // refetch manejos
                                                                                                            queryClient.invalidateQueries({ queryKey: ['manejos'] });
                                                                                                        }
                                                                                                        catch (e) {
                                                                                                            console.error('Erro ao contabilizar manejo', e);
                                                                                                        }
                                                                                                    }, children: "Contabilizar" })) })] })] }) }) }) })] }) }, `manejo-${manejo.id}`))), safra.ordens_servico?.map((os) => (_jsx("div", { className: "timeline-item mb-3", children: _jsxs("div", { className: "d-flex", children: [_jsx("div", { className: "timeline-icon bg-warning text-white rounded-circle d-flex align-items-center justify-content-center", style: { width: '40px', height: '40px', minWidth: '40px' }, children: _jsx("i", { className: "bi bi-clipboard-check" }) }), _jsx("div", { className: "ms-3 flex-grow-1", children: _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "d-flex justify-content-between", children: [_jsxs("div", { children: [_jsxs("h6", { className: "mb-1", children: [_jsx("span", { className: "badge bg-warning me-2", children: "Ordem de Servi\u00E7o" }), os.tarefa] }), _jsxs("small", { className: "text-muted", children: ["In\u00EDcio: ", new Date(os.data_inicio).toLocaleDateString(), " \u2022", os.maquina ? ` Máquina: ${os.maquina}` : '', _jsx("span", { className: `ms-2 badge ${getStatusBadge(os.status)}`, children: os.status })] })] }), _jsx("div", { className: "text-end", children: _jsxs("strong", { children: ["R$ ", Number(os.custo_total ?? 0).toFixed(2)] }) })] }) }) }) })] }) }, `os-${os.id}`)))] }))] }), _jsxs("div", { className: "mb-4", children: [_jsxs("h6", { className: "mb-3", children: [_jsx("i", { className: "bi bi-receipt me-2" }), "Despesas & Rateios desta Safra"] }), rateiosLoading ? (_jsx("div", { children: "Carregando..." })) : rateiosDaSafra.length === 0 ? (_jsx("div", { className: "alert alert-light", children: "Nenhuma despesa ou rateio vinculado a esta safra." })) : (_jsx("div", { className: "list-group", children: rateiosDaSafra.map((r) => (_jsxs("a", { href: `/financeiro/rateios/${r.id}`, className: "list-group-item list-group-item-action d-flex justify-content-between align-items-start", children: [_jsxs("div", { children: [_jsx("strong", { children: r.titulo }), _jsx("div", { className: "small text-muted", children: r.descricao })] }), _jsxs("div", { className: "text-end", children: [_jsxs("div", { children: ["R$ ", Number(r.valor_total ?? 0).toFixed(2)] }), _jsx("small", { className: "text-muted", children: new Date(r.data_rateio).toLocaleDateString() })] })] }, r.id))) }))] }), _jsxs("div", { className: "d-flex gap-2", children: [_jsxs("button", { className: "btn btn-sm btn-primary", onClick: () => {
                                                    setPlantioIdForForm(safra.id);
                                                    setShowManejoForm(true);
                                                }, children: [_jsx("i", { className: "bi bi-plus-circle me-1" }), "Adicionar Manejo"] }), _jsxs("button", { className: "btn btn-sm btn-warning", onClick: () => {
                                                    setPlantioIdForForm(safra.id);
                                                    setShowOSForm(true);
                                                }, children: [_jsx("i", { className: "bi bi-clipboard-plus me-1" }), "Nova Ordem de Servi\u00E7o"] }), _jsxs("button", { className: "btn btn-sm btn-success", onClick: () => { setPlantioIdForForm(safra.id); setShowColheitaForm(true); }, children: [_jsx("i", { className: "bi bi-box-seam me-1" }), "Registrar Colheita"] }), _jsxs("button", { className: "btn btn-sm btn-outline-secondary ms-auto", onClick: () => {
                                                    setSafraEdit(safra);
                                                    setShowSafraForm(true);
                                                }, children: [_jsx("i", { className: "bi bi-pencil me-1" }), "Editar Safra"] }), _jsxs("button", { className: "btn btn-sm btn-outline-danger", onClick: () => handleDeleteSafra(safra), disabled: deleteMutation.isPending, children: [_jsx("i", { className: "bi bi-trash me-1" }), "Excluir"] })] })] }))] }, safra.id)))] }, cultura))), safrasFiltradas.length === 0 && (_jsxs("div", { className: "alert alert-info text-center", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Nenhuma safra encontrada com os filtros selecionados."] })), showSafraForm && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered modal-lg", children: _jsx("div", { className: "modal-content", children: _jsx(SafraForm, { plantio: safraEdit, onClose: () => {
                                setShowSafraForm(false);
                                setSafraEdit(undefined);
                            }, onSuccess: () => {
                                setShowSafraForm(false);
                                setSafraEdit(undefined);
                            } }) }) }) })), showManejoForm && plantioIdForForm && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered", children: _jsx("div", { className: "modal-content", children: _jsx(ManejoForm, { plantioId: plantioIdForForm, onClose: () => {
                                setShowManejoForm(false);
                                setPlantioIdForForm(undefined);
                            }, onSuccess: () => {
                                setShowManejoForm(false);
                                setPlantioIdForForm(undefined);
                            } }) }) }) })), showColheitaForm && plantioIdForForm && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered modal-lg", children: _jsx("div", { className: "modal-content", children: _jsx(ColheitaForm, { plantioId: plantioIdForForm, onClose: () => {
                                setShowColheitaForm(false);
                                setPlantioIdForForm(undefined);
                            }, onSuccess: () => {
                                setShowColheitaForm(false);
                                setPlantioIdForForm(undefined);
                            } }) }) }) })), showOSForm && plantioIdForForm && (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, children: _jsx("div", { className: "modal-dialog modal-dialog-centered modal-lg", children: _jsx("div", { className: "modal-content", children: _jsx(OrdemServicoForm, { plantioId: plantioIdForForm, onClose: () => {
                                setShowOSForm(false);
                                setPlantioIdForForm(undefined);
                            }, onSuccess: () => {
                                setShowOSForm(false);
                                setPlantioIdForForm(undefined);
                            } }) }) }) }))] }));
};
export default SafrasList;
