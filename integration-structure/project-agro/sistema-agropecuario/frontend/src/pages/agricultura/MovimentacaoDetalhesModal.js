import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const DESTINO_LABELS = {
    armazenagem_interna: 'Armazenagem Interna',
    armazenagem_geral: 'Armazém Geral',
    armazenagem_externa: 'Armazém Geral',
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
function fmtCurrency(n) {
    if (n == null)
        return '—';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
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
const UNIDADE_LABELS = {
    unidade: 'Total (valor fixo)',
    saca: 'Por saca',
    tonelada: 'Por tonelada',
};
const MovimentacaoDetalhesModal = ({ movimentacao: m, onClose }) => {
    const placa = m.placa || m.transporte?.placa || '—';
    const motorista = m.motorista || m.transporte?.motorista || '—';
    const tara = m.tara ?? m.transporte?.tara;
    const pesoBruto = m.peso_bruto ?? m.transporte?.peso_bruto;
    const pesoLiquido = m.peso_liquido ?? m.transporte?.peso_liquido;
    const descontos = m.descontos ?? m.transporte?.descontos;
    const custoFrete = m.custo_transporte ?? m.transporte?.custo_transporte;
    const destinoLabel = DESTINO_LABELS[m.destino_tipo || ''] ?? m.destino_tipo ?? '—';
    const destinoNome = m.empresa_destino_nome || m.local_destino_nome || '';
    return (_jsx("div", { className: "modal show d-block", style: { backgroundColor: 'rgba(0,0,0,0.5)' }, onClick: onClose, children: _jsx("div", { className: "modal-dialog modal-dialog-centered modal-lg", onClick: (e) => e.stopPropagation(), children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header bg-primary bg-opacity-10", children: [_jsxs("h5", { className: "modal-title", children: [_jsx("i", { className: "bi bi-eye me-2" }), "Detalhes da Movimenta\u00E7\u00E3o #", m.id] }), _jsx("button", { type: "button", className: "btn-close", onClick: onClose })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("div", { className: "row mb-3", children: [_jsx("div", { className: "col-md-6", children: _jsx("div", { className: "card border-0 bg-light", children: _jsxs("div", { className: "card-body py-2", children: [_jsx("small", { className: "text-muted d-block", children: "Talh\u00E3o" }), _jsx("strong", { children: m.talhao_name || (m.talhao ? `Talhão ${m.talhao}` : '—') })] }) }) }), _jsx("div", { className: "col-md-6", children: _jsx("div", { className: "card border-0 bg-light", children: _jsxs("div", { className: "card-body py-2", children: [_jsx("small", { className: "text-muted d-block", children: "Data de Registro" }), _jsx("strong", { children: fmtDate(m.criado_em) })] }) }) })] }), _jsxs("h6", { className: "border-bottom pb-2 mb-3", children: [_jsx("i", { className: "bi bi-truck me-2" }), "Transporte"] }), _jsxs("div", { className: "row mb-3", children: [_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "mb-2", children: [_jsx("small", { className: "text-muted d-block", children: "Placa" }), _jsxs("span", { className: "badge bg-primary bg-opacity-10 text-primary border border-primary fs-6", children: [_jsx("i", { className: "bi bi-truck me-1" }), placa] })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "mb-2", children: [_jsx("small", { className: "text-muted d-block", children: "Motorista" }), _jsx("strong", { children: motorista })] }) })] }), _jsxs("h6", { className: "border-bottom pb-2 mb-3", children: [_jsx("i", { className: "bi bi-speedometer2 me-2" }), "Pesagem"] }), _jsxs("div", { className: "row mb-3 g-2", children: [_jsx("div", { className: "col-md-3", children: _jsx("div", { className: "card border-0 bg-light text-center", children: _jsxs("div", { className: "card-body py-2", children: [_jsx("small", { className: "text-muted d-block", children: "Tara" }), _jsxs("strong", { children: [fmt(tara), " kg"] })] }) }) }), _jsx("div", { className: "col-md-3", children: _jsx("div", { className: "card border-0 bg-light text-center", children: _jsxs("div", { className: "card-body py-2", children: [_jsx("small", { className: "text-muted d-block", children: "Peso Bruto" }), _jsxs("strong", { children: [fmt(pesoBruto), " kg"] })] }) }) }), _jsx("div", { className: "col-md-3", children: _jsx("div", { className: "card border-0 bg-light text-center", children: _jsxs("div", { className: "card-body py-2", children: [_jsx("small", { className: "text-muted d-block", children: "Descontos" }), _jsxs("strong", { className: "text-danger", children: [fmt(descontos), " kg"] })] }) }) }), _jsx("div", { className: "col-md-3", children: _jsx("div", { className: "card border-0 bg-success bg-opacity-10 text-center", children: _jsxs("div", { className: "card-body py-2", children: [_jsx("small", { className: "text-muted d-block", children: "Peso L\u00EDquido" }), _jsxs("strong", { className: "text-success fs-5", children: [fmt(pesoLiquido), " kg"] })] }) }) })] }), _jsxs("h6", { className: "border-bottom pb-2 mb-3", children: [_jsx("i", { className: "bi bi-currency-dollar me-2" }), "Custo de Transporte"] }), _jsxs("div", { className: "row mb-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("small", { className: "text-muted d-block", children: "Valor" }), _jsx("strong", { children: fmtCurrency(custoFrete) })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("small", { className: "text-muted d-block", children: "Unidade" }), _jsx("strong", { children: UNIDADE_LABELS[m.custo_transporte_unidade || 'unidade'] || m.custo_transporte_unidade || '—' })] })] }), _jsxs("h6", { className: "border-bottom pb-2 mb-3", children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), "Destino"] }), _jsxs("div", { className: "row mb-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsx("small", { className: "text-muted d-block", children: "Tipo" }), _jsx("strong", { children: destinoLabel })] }), _jsxs("div", { className: "col-md-6", children: [_jsx("small", { className: "text-muted d-block", children: "Local/Empresa" }), _jsx("strong", { children: destinoNome || '—' })] })] }), (m.nf_provisoria || m.contrato_ref) && (_jsxs("div", { className: "row mb-3", children: [m.nf_provisoria && (_jsxs("div", { className: "col-md-6", children: [_jsx("small", { className: "text-muted d-block", children: "NF Provis\u00F3ria" }), _jsx("strong", { children: m.nf_provisoria })] })), m.contrato_ref && (_jsxs("div", { className: "col-md-6", children: [_jsx("small", { className: "text-muted d-block", children: "Refer\u00EAncia do Contrato" }), _jsx("strong", { children: m.contrato_ref })] }))] })), m.condicoes_graos && (_jsxs("div", { className: "mb-3", children: [_jsx("small", { className: "text-muted d-block", children: "Condi\u00E7\u00F5es dos Gr\u00E3os" }), _jsx("p", { className: "mb-0", children: m.condicoes_graos })] })), _jsx("div", { className: "row", children: _jsxs("div", { className: "col-md-6", children: [_jsx("small", { className: "text-muted d-block", children: "Concilia\u00E7\u00E3o" }), m.reconciled ? (_jsxs("span", { className: "badge bg-success", children: [_jsx("i", { className: "bi bi-check-circle me-1" }), "Conciliada", m.reconciled_at ? ` em ${fmtDate(m.reconciled_at)}` : ''] })) : (_jsxs("span", { className: "badge bg-warning text-dark", children: [_jsx("i", { className: "bi bi-clock me-1" }), "Pendente"] }))] }) })] }), _jsx("div", { className: "modal-footer", children: _jsx("button", { type: "button", className: "btn btn-secondary", onClick: onClose, children: "Fechar" }) })] }) }) }));
};
export default MovimentacaoDetalhesModal;
