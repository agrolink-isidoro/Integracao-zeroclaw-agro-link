import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
const DESTINO_LABELS = {
    armazenagem_interna: 'Armazenagem Interna',
    armazenagem_geral: 'Armazém Geral',
    contrato_industria: 'Contrato c/ Indústria',
    venda_direta: 'Venda Direta',
};
function fmt(n, decimals = 3) {
    if (n == null)
        return '—';
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(Number(n));
}
function fmtDate(d) {
    if (!d)
        return '—';
    return new Date(d).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}
const SessaoMovimentacoesModal = ({ session, onClose }) => {
    const { data: movimentacoes = [], isLoading, error } = useQuery({
        queryKey: ['movimentacoes-sessao', session.id],
        queryFn: async () => {
            const r = await api.get(`/agricultura/movimentacoes-carga/?session_item__session=${session.id}&page_size=200`);
            const d = r.data;
            return Array.isArray(d) ? d : (d.results ?? []);
        },
    });
    const totalBruto = movimentacoes.reduce((a, m) => a + Number(m.peso_bruto ?? m.transporte?.peso_bruto ?? 0), 0);
    const totalLiquido = movimentacoes.reduce((a, m) => a + Number(m.peso_liquido ?? m.transporte?.peso_liquido ?? 0), 0);
    const totalDesconto = movimentacoes.reduce((a, m) => a + Number(m.descontos ?? m.transporte?.descontos ?? 0), 0);
    const placa = (m) => m.placa || m.transporte?.placa || '—';
    const motorista = (m) => m.motorista || m.transporte?.motorista || '—';
    const tara = (m) => m.tara ?? m.transporte?.tara;
    const pesoBruto = (m) => m.peso_bruto ?? m.transporte?.peso_bruto;
    const pesoLiquido = (m) => m.peso_liquido ?? m.transporte?.peso_liquido;
    const descontos = (m) => m.descontos ?? m.transporte?.descontos;
    const custoFrete = (m) => m.custo_transporte ?? m.transporte?.custo_transporte;
    const destino = (m) => {
        const label = DESTINO_LABELS[m.destino_tipo || ''] ?? m.destino_tipo ?? '—';
        const nome = m.empresa_destino_nome || m.local_destino_nome || '';
        return nome ? `${label}: ${nome}` : label;
    };
    return (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, onClick: onClose, children: _jsx("div", { className: "modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable", onClick: (e) => e.stopPropagation(), children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title", children: [_jsx("i", { className: "bi bi-truck me-2" }), "Movimenta\u00E7\u00F5es da Sess\u00E3o", _jsxs("small", { className: "text-muted ms-2 fw-normal", children: [session.plantio_nome || `Sessão ${session.id}`, session.data_inicio ? ` — ${fmtDate(session.data_inicio)}` : ''] })] }), _jsx("button", { type: "button", className: "btn-close", onClick: onClose })] }), _jsxs("div", { className: "modal-body p-0", children: [isLoading && (_jsxs("div", { className: "text-center py-5", children: [_jsx("div", { className: "spinner-border text-primary", role: "status" }), _jsx("p", { className: "mt-3 text-muted", children: "Carregando movimenta\u00E7\u00F5es\u2026" })] })), !isLoading && error && (_jsx("div", { className: "alert alert-danger m-3", children: "Erro ao carregar movimenta\u00E7\u00F5es. Tente novamente." })), !isLoading && !error && movimentacoes.length === 0 && (_jsxs("div", { className: "alert alert-info m-3", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Nenhuma movimenta\u00E7\u00E3o registrada para esta sess\u00E3o."] })), !isLoading && movimentacoes.length > 0 && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "row g-0 border-bottom bg-light", children: [_jsxs("div", { className: "col-4 border-end text-center py-3", children: [_jsx("div", { className: "small text-muted", children: "Total Peso Bruto" }), _jsxs("strong", { className: "fs-6", children: [fmt(totalBruto), " kg"] })] }), _jsxs("div", { className: "col-4 border-end text-center py-3", children: [_jsx("div", { className: "small text-muted", children: "Total Descontos" }), _jsxs("strong", { className: "fs-6 text-danger", children: [fmt(totalDesconto), " kg"] })] }), _jsxs("div", { className: "col-4 text-center py-3", children: [_jsx("div", { className: "small text-muted", children: "Total Peso L\u00EDquido" }), _jsxs("strong", { className: "fs-6 text-success", children: [fmt(totalLiquido), " kg"] }), _jsxs("div", { className: "small text-muted", children: ["(", (totalLiquido / 1000).toFixed(3), " ton)"] })] })] }), _jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-sm table-hover mb-0 align-middle", children: [_jsx("thead", { className: "table-light sticky-top", children: _jsxs("tr", { children: [_jsx("th", { style: { minWidth: 90 }, children: "#" }), _jsx("th", { style: { minWidth: 110 }, children: "Talh\u00E3o" }), _jsx("th", { style: { minWidth: 110 }, children: "Placa" }), _jsx("th", { style: { minWidth: 130 }, children: "Motorista" }), _jsx("th", { className: "text-end", style: { minWidth: 100 }, children: "Tara (kg)" }), _jsx("th", { className: "text-end", style: { minWidth: 110 }, children: "Peso Bruto (kg)" }), _jsx("th", { className: "text-end", style: { minWidth: 110 }, children: "Descontos (kg)" }), _jsx("th", { className: "text-end", style: { minWidth: 110 }, children: "Peso L\u00EDq. (kg)" }), _jsx("th", { className: "text-end", style: { minWidth: 120 }, children: "Custo Frete" }), _jsx("th", { style: { minWidth: 200 }, children: "Destino" }), _jsx("th", { style: { minWidth: 130 }, children: "Data" }), _jsx("th", { style: { minWidth: 80 }, className: "text-center", children: "Concil." })] }) }), _jsx("tbody", { children: movimentacoes.map((m, idx) => (_jsxs("tr", { children: [_jsxs("td", { children: [_jsx("span", { className: "badge bg-secondary", children: idx + 1 }), _jsxs("span", { className: "text-muted ms-1 small", children: ["#", m.id] })] }), _jsx("td", { children: m.talhao_name || (m.talhao ? `Talhão ${m.talhao}` : '—') }), _jsx("td", { children: _jsxs("span", { className: "badge bg-primary bg-opacity-10 text-primary border border-primary", children: [_jsx("i", { className: "bi bi-truck me-1" }), placa(m)] }) }), _jsx("td", { children: motorista(m) }), _jsx("td", { className: "text-end font-monospace", children: fmt(tara(m)) }), _jsx("td", { className: "text-end font-monospace", children: fmt(pesoBruto(m)) }), _jsx("td", { className: "text-end font-monospace text-danger", children: fmt(descontos(m)) }), _jsx("td", { className: "text-end font-monospace fw-semibold text-success", children: fmt(pesoLiquido(m)) }), _jsx("td", { className: "text-end", children: custoFrete(m) != null ? (_jsxs("span", { children: [fmt(custoFrete(m), 2), m.custo_transporte_unidade ? (_jsxs("span", { className: "text-muted ms-1 small", children: ["/", m.custo_transporte_unidade] })) : null] })) : '—' }), _jsxs("td", { children: [_jsx("span", { className: `badge me-1 ${m.destino_tipo === 'armazenagem_interna' ? 'bg-info' :
                                                                            m.destino_tipo === 'contrato_industria' ? 'bg-warning text-dark' :
                                                                                'bg-secondary'}`, children: DESTINO_LABELS[m.destino_tipo || ''] ?? m.destino_tipo ?? '—' }), _jsx("div", { className: "small text-muted", children: m.empresa_destino_nome || m.local_destino_nome || '' }), m.nf_provisoria && (_jsxs("div", { className: "small text-muted", children: ["NF: ", m.nf_provisoria] }))] }), _jsx("td", { className: "small text-muted", children: fmtDate(m.criado_em) }), _jsx("td", { className: "text-center", children: m.reconciled ? (_jsx("i", { className: "bi bi-check-circle-fill text-success", title: "Reconciliado" })) : (_jsx("i", { className: "bi bi-circle text-muted", title: "Pendente" })) })] }, m.id))) }), _jsx("tfoot", { className: "table-light fw-semibold", children: _jsxs("tr", { children: [_jsxs("td", { colSpan: 4, children: ["Total (", movimentacoes.length, " carga", movimentacoes.length !== 1 ? 's' : '', ")"] }), _jsx("td", { className: "text-end font-monospace", children: "\u2014" }), _jsx("td", { className: "text-end font-monospace", children: fmt(totalBruto) }), _jsx("td", { className: "text-end font-monospace text-danger", children: fmt(totalDesconto) }), _jsx("td", { className: "text-end font-monospace text-success", children: fmt(totalLiquido) }), _jsx("td", { colSpan: 4 })] }) })] }) })] }))] }), _jsxs("div", { className: "modal-footer", children: [_jsxs("small", { className: "text-muted me-auto", children: [movimentacoes.length, " movimenta\u00E7\u00E3o", movimentacoes.length !== 1 ? 'ões' : '', " registrada", movimentacoes.length !== 1 ? 's' : ''] }), _jsx("button", { type: "button", className: "btn btn-secondary", onClick: onClose, children: "Fechar" })] })] }) }) }));
};
export default SessaoMovimentacoesModal;
