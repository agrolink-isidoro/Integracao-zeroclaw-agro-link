import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import financeiroService from '@/services/financeiro';
import { useApiQuery } from '@/hooks/useApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ContaDetalhesModal from '@/components/financeiro/ContaDetalhesModal';
import TransferForm from '@/components/financeiro/TransferForm';
import { toCSV, downloadCSV } from '@/utils/csv';
const LivroCaixa = () => {
    const queryClient = useQueryClient();
    const { data: contas = [] } = useApiQuery(['contas-bancarias'], '/financeiro/contas/');
    const [filtros, setFiltros] = React.useState({});
    const [contaSelecionada, setContaSelecionada] = React.useState(null);
    const [dataInicio, setDataInicio] = React.useState('');
    const [dataFim, setDataFim] = React.useState('');
    const [reconciled, setReconciled] = React.useState('all');
    const [tipo, setTipo] = React.useState('');
    const [detalheContaId, setDetalheContaId] = React.useState(null);
    const [showTransferModal, setShowTransferModal] = React.useState(false);
    const [loadingError, setLoadingError] = React.useState(null);
    const query = useQuery({
        queryKey: ['financeiro', 'lancamentos', filtros],
        queryFn: () => financeiroService.getLancamentos(filtros),
    });
    const lancamentos = query.data ?? [];
    React.useEffect(() => {
        if (query.error) {
            const err = query.error;
            console.error('Erro ao buscar lançamentos:', err);
            setLoadingError(err?.message || 'Erro ao carregar lançamentos');
        }
    }, [query.error]);
    React.useEffect(() => {
        const f = {};
        if (contaSelecionada)
            f.conta_id = contaSelecionada;
        if (dataInicio)
            f.data_inicio = dataInicio;
        if (dataFim)
            f.data_fim = dataFim;
        if (reconciled === 'true')
            f.reconciled = true;
        if (reconciled === 'false')
            f.reconciled = false;
        if (tipo)
            f.tipo = tipo.split(',').map((t) => t.trim()).filter(Boolean);
        setFiltros(f);
    }, [contaSelecionada, dataInicio, dataFim, reconciled, tipo]);
    const exportCsv = React.useCallback(() => {
        const rows = (lancamentos || []).map((l) => ({ id: l.id, data: l.data, descricao: l.descricao || '', conta: l.conta?.banco ? `${l.conta.banco} - ${l.conta.conta}` : '', tipo: l.tipo, valor: l.valor, reconciled: l.reconciled }));
        const csv = toCSV(rows, ['id', 'data', 'descricao', 'conta', 'tipo', 'valor', 'reconciled']);
        downloadCSV('livro_caixa.csv', csv);
    }, [lancamentos]);
    if (query.isLoading)
        return _jsx(LoadingSpinner, {});
    if (loadingError)
        return _jsxs("div", { className: "alert alert-danger", children: ["Erro ao carregar Livro Caixa: ", loadingError] });
    if (query.error)
        return _jsx("div", { className: "alert alert-danger", children: "Erro ao carregar Livro Caixa" });
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsx("h4", { className: "mb-0", children: "Livro Caixa" }), _jsxs("div", { children: [_jsx("button", { className: "btn btn-sm btn-outline-secondary", onClick: exportCsv, children: "Exportar CSV" }), _jsx("button", { className: "btn btn-sm btn-primary ms-2", onClick: () => setShowTransferModal(true), children: "Nova Transfer\u00EAncia" })] })] }), _jsx("div", { className: "card mb-3" }), _jsx("div", { className: "card mb-3", children: _jsx("div", { className: "card-body", children: _jsxs("div", { className: "row gy-2", children: [_jsx("div", { className: "col-auto", children: _jsxs("select", { className: "form-select form-select-sm", value: contaSelecionada || '', onChange: (e) => setContaSelecionada(e.target.value ? Number(e.target.value) : null), children: [_jsx("option", { value: "", children: "Todas as contas" }), contas.map((c) => _jsxs("option", { value: c.id, children: [c.banco, " - ", c.conta] }, c.id))] }) }), _jsx("div", { className: "col-auto", children: _jsx("input", { className: "form-control form-control-sm", type: "date", value: dataInicio, onChange: (e) => setDataInicio(e.target.value) }) }), _jsx("div", { className: "col-auto", children: _jsx("input", { className: "form-control form-control-sm", type: "date", value: dataFim, onChange: (e) => setDataFim(e.target.value) }) }), _jsx("div", { className: "col-auto", children: _jsxs("select", { className: "form-select form-select-sm", value: reconciled, onChange: (e) => setReconciled(e.target.value), children: [_jsx("option", { value: "all", children: "Todos" }), _jsx("option", { value: "true", children: "Reconciliados" }), _jsx("option", { value: "false", children: "N\u00E3o reconciliados" })] }) }), _jsx("div", { className: "col-auto", children: _jsx("input", { className: "form-control form-control-sm", placeholder: "Tipo (ex: pagamento, transferencia)", value: tipo, onChange: (e) => setTipo(e.target.value) }) }), _jsxs("div", { className: "col-auto", children: [_jsx("button", { className: "btn btn-sm btn-outline-primary", onClick: () => queryClient.invalidateQueries({ queryKey: ['financeiro', 'lancamentos', filtros] }), children: "Buscar" }), _jsx("button", { className: "btn btn-sm btn-outline-secondary ms-2", onClick: () => { setContaSelecionada(null); setDataInicio(''); setDataFim(''); setReconciled('all'); setTipo(''); }, children: "Limpar" })] })] }) }) }), _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: lancamentos.length === 0 ? (_jsx("div", { className: "text-muted", children: "Nenhum lan\u00E7amento encontrado." })) : (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-hover table-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Data" }), _jsx("th", { children: "Descri\u00E7\u00E3o" }), _jsx("th", { children: "Conta" }), _jsx("th", { children: "Tipo" }), _jsx("th", { className: "text-end", children: "Valor" }), _jsx("th", { children: "Reconc." }), _jsx("th", {})] }) }), _jsx("tbody", { children: lancamentos.map((l) => (_jsxs("tr", { className: l.reconciled ? 'table-success' : '', "data-lancamento-id": l.id, children: [_jsx("td", { children: l.data }), _jsx("td", { children: l.descricao }), _jsx("td", { children: l.conta ? `${l.conta.banco} - ${l.conta.conta}` : '' }), _jsx("td", { children: l.tipo }), _jsxs("td", { className: "text-end", children: ["R$ ", l.valor] }), _jsx("td", { children: l.reconciled ? 'Sim' : 'Não' }), _jsx("td", { className: "text-end", children: _jsxs("div", { className: "d-flex justify-content-end align-items-center", children: [_jsx("button", { className: `btn btn-sm ${l.reconciled ? 'btn-success' : 'btn-outline-secondary'} me-2`, onClick: async () => {
                                                                try {
                                                                    await financeiroService.reconcileLancamento(l.id, !l.reconciled);
                                                                    // optimistic update: refresh query
                                                                    queryClient.invalidateQueries({ queryKey: ['financeiro', 'lancamentos', filtros] });
                                                                }
                                                                catch (err) {
                                                                    console.error('Falha ao (des)reconciliar:', err);
                                                                    alert('Falha ao (des)reconciliar lançamento');
                                                                }
                                                            }, children: l.reconciled ? 'Desreconciliar' : 'Reconciliar' }), l.conta && (_jsx("button", { className: "btn btn-sm btn-outline-primary", onClick: () => setDetalheContaId(l.conta.id), children: "Ver conta" }))] }) })] }, l.id))) })] }) })) }) }), detalheContaId && (_jsx(ContaDetalhesModal, { contaId: detalheContaId, onClose: () => setDetalheContaId(null) })), showTransferModal && (_jsx(TransferForm, { onClose: () => setShowTransferModal(false), onSaved: () => { setShowTransferModal(false); queryClient.invalidateQueries({ queryKey: ['financeiro', 'lancamentos'] }); queryClient.invalidateQueries({ queryKey: ['transferencias'] }); } }))] }));
};
export default LivroCaixa;
