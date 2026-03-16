import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import OperacaoForm from '@/components/financeiro/OperacaoForm';
import OperacaoDetailModal from '@/components/financeiro/OperacaoDetailModal';
import ModalForm from '@/components/common/ModalForm';
import { useApiQuery } from '@/hooks/useApi';
const OperacoesPage = () => {
    const [showNovaModal, setShowNovaModal] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedOperacao, setSelectedOperacao] = useState(null);
    const [selectedTipo, setSelectedTipo] = useState('emprestimo');
    const { data: emprestimos = [] } = useApiQuery(['emprestimos'], '/financeiro/emprestimos/');
    const { data: financiamentos = [] } = useApiQuery(['financiamentos'], '/financeiro/financiamentos/');
    const combined = [
        ...emprestimos.map((e) => ({ ...e, tipo_operacao: 'Empréstimo' })),
        ...financiamentos.map((f) => ({ ...f, tipo_operacao: 'Financiamento' })),
    ];
    const openDetail = (operacao, tipo) => {
        console.log('[Operacoes] openDetail called with:', { operacao, tipo });
        setSelectedOperacao(operacao);
        setSelectedTipo(tipo);
        setDetailOpen(true);
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'ativo':
                return 'success';
            case 'quitado':
                return 'primary';
            case 'cancelado':
                return 'danger';
            case 'em_analise':
                return 'warning';
            default:
                return 'secondary';
        }
    };
    return (_jsxs("div", { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("div", { children: [_jsxs("h3", { className: "mb-0", children: [_jsx("i", { className: "bi bi-wallet2 me-2" }), "Opera\u00E7\u00F5es Financeiras"] }), _jsx("small", { className: "text-muted", children: "Empr\u00E9stimos e Financiamentos" })] }), _jsxs("button", { className: "btn btn-primary", onClick: () => setShowNovaModal(true), children: [_jsx("i", { className: "bi bi-plus-circle me-2" }), "Nova Opera\u00E7\u00E3o"] })] }), combined.length > 0 ? (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsx("th", { children: "T\u00EDtulo" }), _jsx("th", { children: "Tipo" }), _jsx("th", { children: "Status" }), _jsx("th", { className: "text-end", children: "Valor Pendente" }), _jsx("th", { children: "Data Contrata\u00E7\u00E3o" }), _jsx("th", { children: "Benefici\u00E1rio" }), _jsx("th", { children: "Primeiro Vencimento" }), _jsx("th", { className: "text-end", children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: combined.map((c, idx) => {
                                const tipoProp = c.tipo_operacao === 'Empréstimo' ? 'emprestimo' : 'financiamento';
                                const beneficiario = tipoProp === 'emprestimo'
                                    ? c.cliente_nome
                                    : c.instituicao_nome;
                                return (_jsxs("tr", { children: [_jsxs("td", { className: "fw-bold", children: [_jsx("i", { className: "bi bi-file-earmark me-2" }), c.titulo] }), _jsx("td", { children: _jsx("span", { className: `badge bg-${tipoProp === 'emprestimo' ? 'info' : 'success'}`, children: c.tipo_operacao }) }), _jsx("td", { children: _jsx("span", { className: `badge bg-${getStatusColor(c.status)}`, children: c.status }) }), _jsxs("td", { className: "text-end fw-bold text-danger", children: ["R$ ", Number(c.valor_pendente || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })] }), _jsx("td", { className: "small", children: c.data_contratacao }), _jsx("td", { children: beneficiario || '—' }), _jsx("td", { className: "small", children: c.data_primeiro_vencimento }), _jsx("td", { className: "text-end", children: _jsxs("button", { className: "btn btn-sm btn-outline-primary", title: "Visualizar detalhes", onClick: () => openDetail(c, tipoProp), children: [_jsx("i", { className: "bi bi-eye" }), " VER"] }) })] }, `${c.id}-${tipoProp}`));
                            }) })] }) })) : (_jsxs("div", { className: "alert alert-info py-4 text-center", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), "Nenhuma opera\u00E7\u00E3o cadastrada.", _jsx("button", { className: "btn btn-link", onClick: () => setShowNovaModal(true), children: "Criar primeira opera\u00E7\u00E3o" })] })), _jsx(ModalForm, { isOpen: showNovaModal, title: "Nova Opera\u00E7\u00E3o Financeira", onClose: () => setShowNovaModal(false), size: "lg", children: _jsx(OperacaoForm, { onClose: () => setShowNovaModal(false), onSaved: () => setShowNovaModal(false) }) }), _jsx(OperacaoDetailModal, { data: selectedOperacao, show: detailOpen, onClose: () => setDetailOpen(false), tipo: selectedTipo })] }));
};
export default OperacoesPage;
