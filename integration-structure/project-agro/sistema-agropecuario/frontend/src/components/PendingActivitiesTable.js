import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import operacoesService from '../services/operacoes';
import { ordensService } from '../services/equipamentos';
import dashboardService from '../services/dashboard';
const PendingActivitiesTable = () => {
    const [items, setItems] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let mounted = true;
        async function load() {
            setLoading(true);
            try {
                const [ops, ords, estoque] = await Promise.all([
                    // next planned operations, limit 6, order by data_operacao or data_inicio
                    operacoesService.listar({ status: 'planejada', ordering: 'data_operacao' }),
                    ordensService.listar({ status: 'planejada', ordering: 'data_agendada' }).catch(() => ordensService.listar({ status: 'planejada' })),
                    dashboardService.getEstoque(),
                ]);
                const opItems = (ops || [])
                    .slice(0, 6)
                    .map((o) => ({
                    id: `op-${o.id}`,
                    module: 'Agricultura',
                    title: o.tipo_display || o.categoria_display || `Operação #${o.id}`,
                    date: o.data_operacao || o.data_inicio || null,
                    meta: o.fazenda ? String(o.fazenda) : undefined,
                    link: '/agricultura',
                }));
                const ordItems = (ords || [])
                    .slice(0, 6)
                    .map((o) => ({
                    id: `ord-${o.id}`,
                    module: 'Máquinas',
                    title: o.titulo || o.descricao || `Ordem #${o.id}`,
                    date: o.data_agendada || o.data_inicio || null,
                    meta: o.equipamento ? String(o.equipamento) : undefined,
                    link: '/maquinas',
                }));
                const estoqueItems = (estoque?.kpis?.abaixo_minimo_itens || [])
                    .slice(0, 6)
                    .map((it) => ({
                    id: `est-${it.id}`,
                    module: 'Estoque',
                    title: it.nome || it.codigo || `Item #${it.id}`,
                    date: null,
                    meta: `${it.quantidade_estoque} ${it.unidade ?? ''}`.trim(),
                    link: '/estoque',
                }));
                const combined = [...opItems, ...ordItems, ...estoqueItems]
                    .sort((a, b) => {
                    if (a.date && b.date)
                        return new Date(a.date).getTime() - new Date(b.date).getTime();
                    if (a.date)
                        return -1;
                    if (b.date)
                        return 1;
                    return 0;
                })
                    .slice(0, 10);
                if (mounted)
                    setItems(combined);
            }
            catch (err) {
                console.error('PendingActivitiesTable error', err);
                if (mounted)
                    setItems([]);
            }
            finally {
                if (mounted)
                    setLoading(false);
            }
        }
        load();
        return () => {
            mounted = false;
        };
    }, []);
    if (loading) {
        return (_jsxs("div", { className: "card shadow-sm mb-4", children: [_jsx("div", { className: "card-header", children: _jsx("h6", { className: "mb-0", children: "Atividades Pendentes" }) }), _jsxs("div", { className: "card-body text-center text-muted py-4", children: [_jsx("div", { className: "spinner-border spinner-border-sm me-2", role: "status" }), "Carregando..."] })] }));
    }
    if (!items || items.length === 0) {
        return (_jsxs("div", { className: "card shadow-sm mb-4", children: [_jsx("div", { className: "card-header", children: _jsx("h6", { className: "mb-0", children: "Atividades Pendentes" }) }), _jsxs("div", { className: "card-body text-center text-muted py-4", children: [_jsx("i", { className: "bi bi-check2-all fs-3 d-block mb-2 text-success" }), _jsx("small", { children: "Nenhuma atividade pendente" })] })] }));
    }
    return (_jsxs("div", { className: "card shadow-sm mb-4", children: [_jsxs("div", { className: "card-header d-flex align-items-center", children: [_jsx("h6", { className: "mb-0", children: "Atividades Pendentes" }), _jsx("small", { className: "text-muted ms-3", children: "Pr\u00F3ximas opera\u00E7\u00F5es, ordens e estoques baixos" })] }), _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table mb-0", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: 120 }, children: "M\u00F3dulo" }), _jsx("th", { children: "Item" }), _jsx("th", { style: { width: 140 }, children: "Prazo / Quantidade" }), _jsx("th", { style: { width: 80 } })] }) }), _jsx("tbody", { children: items.map((it) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("span", { className: "text-muted", style: { fontSize: '0.85rem' }, children: it.module }) }), _jsxs("td", { children: [_jsx("div", { className: "fw-semibold text-truncate", style: { maxWidth: 320 }, children: it.title }), it.meta && _jsx("div", { className: "text-muted", style: { fontSize: '0.75rem' }, children: it.meta })] }), _jsx("td", { children: it.date ? new Date(it.date).toLocaleString('pt-BR') : it.meta || '—' }), _jsx("td", { children: _jsx(Link, { to: it.link, className: "btn btn-sm btn-outline-dark", children: "Abrir" }) })] }, it.id))) })] }) }), _jsx("div", { className: "card-footer text-end", children: _jsx(Link, { to: "/agricultura", className: "btn btn-sm btn-link", children: "Ver mais" }) })] }));
};
export default PendingActivitiesTable;
