import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
const ColheitaCargasModal = ({ show, onHide, colheita }) => {
    const { data, isLoading, error } = useQuery({
        queryKey: ['colheita-cargas', colheita?.id],
        queryFn: async () => {
            if (!colheita?.id)
                throw new Error('Colheita não selecionada');
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
    const getDestinoLabel = (tipo) => {
        const labels = {
            armazenagem_interna: 'Armazenagem Interna',
            armazenagem_externa: 'Armazenagem Externa',
            venda_direta: 'Venda Direta',
        };
        return tipo ? labels[tipo] || tipo : '-';
    };
    const formatDate = (dateString) => {
        if (!dateString)
            return '-';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const formatPeso = (peso) => {
        if (!peso && peso !== 0)
            return '-';
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(peso) + ' kg';
    };
    if (!show)
        return null;
    return (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, onClick: onHide, children: _jsx("div", { className: "modal-dialog modal-dialog-centered modal-xl", onClick: (e) => e.stopPropagation(), children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title", children: ["Cargas da Colheita", colheita && (_jsxs("small", { className: "text-muted ms-2", children: ["(", data?.plantio_nome || colheita.plantio_cultura, ")"] }))] }), _jsx("button", { type: "button", className: "btn-close", onClick: onHide })] }), _jsxs("div", { className: "modal-body p-3 p-md-4", children: [isLoading && (_jsxs("div", { className: "text-center py-5", children: [_jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Carregando..." }) }), _jsx("p", { className: "mt-3", children: "Carregando cargas..." })] })), error && (_jsxs("div", { className: "alert alert-danger", children: ["Erro ao carregar cargas: ", error instanceof Error ? error.message : 'Erro desconhecido'] })), data && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "row g-2 g-md-3 mb-3", children: [_jsxs("div", { className: "col-12 col-md-4", children: [_jsx("strong", { children: "Data da Colheita:" }), _jsx("p", { children: data.data_colheita ? new Date(data.data_colheita).toLocaleDateString('pt-BR') : '-' })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("strong", { children: "Quantidade Colhida:" }), _jsx("p", { children: data.quantidade_colhida ? formatPeso(data.quantidade_colhida) : '-' })] }), _jsxs("div", { className: "col-md-4", children: [_jsx("strong", { children: "Total de Cargas:" }), _jsx("p", { className: "fs-5 fw-bold text-primary", children: data.count || 0 })] })] }), data.count === 0 ? (_jsx("div", { className: "alert alert-info", children: "Nenhuma carga registrada para esta colheita." })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-striped table-bordered table-hover", children: [_jsx("thead", { className: "table-dark", children: _jsxs("tr", { children: [_jsx("th", { children: "Placa" }), _jsx("th", { children: "Motorista" }), _jsx("th", { children: "Talh\u00E3o" }), _jsx("th", { children: "Peso Bruto" }), _jsx("th", { children: "Tara" }), _jsx("th", { children: "Descontos" }), _jsx("th", { children: "Peso L\u00EDquido" }), _jsx("th", { children: "Destino" }), _jsx("th", { children: "Local/Empresa" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Data" })] }) }), _jsx("tbody", { children: (data.results || []).map((carga) => (_jsxs("tr", { children: [_jsx("td", { children: carga.placa || '-' }), _jsx("td", { children: carga.motorista || '-' }), _jsx("td", { children: carga.talhao_name || '-' }), _jsx("td", { className: "text-end", children: formatPeso(carga.peso_bruto) }), _jsx("td", { className: "text-end", children: formatPeso(carga.tara) }), _jsx("td", { className: "text-end", children: formatPeso(carga.descontos) }), _jsx("td", { className: "text-end fw-bold", children: formatPeso(carga.peso_liquido) }), _jsx("td", { children: getDestinoLabel(carga.destino_tipo) }), _jsx("td", { children: carga.local_destino_nome || carga.empresa_destino_nome || '-' }), _jsx("td", { children: carga.reconciled ? (_jsxs("span", { className: "badge bg-success", children: ["Entregue", carga.reconciled_at && (_jsx("small", { className: "d-block mt-1", children: formatDate(carga.reconciled_at) }))] })) : (_jsx("span", { className: "badge bg-warning text-dark", children: "Em Tr\u00E2nsito" })) }), _jsx("td", { children: formatDate(carga.criado_em) })] }, carga.id))) }), _jsx("tfoot", { className: "table-secondary", children: _jsxs("tr", { children: [_jsx("td", { colSpan: 6, className: "text-end fw-bold", children: "Total:" }), _jsx("td", { className: "text-end fw-bold", children: formatPeso((data.results || []).reduce((sum, c) => sum + (parseFloat(String(c.peso_liquido || 0)) || 0), 0)) }), _jsx("td", { colSpan: 4 })] }) })] }) }))] }))] }), _jsx("div", { className: "modal-footer", children: _jsx("button", { type: "button", className: "btn btn-secondary", onClick: onHide, children: "Fechar" }) })] }) }) }));
};
export default ColheitaCargasModal;
