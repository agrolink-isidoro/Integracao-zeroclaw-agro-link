import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery } from '@/hooks/useApi';
import financeiroService from '@/services/financeiro';
import TransferForm from '@/components/financeiro/TransferForm';
const TransferenciasList = () => {
    const qc = useQueryClient();
    const { data: transfers = [], isLoading } = useApiQuery(['transferencias'], '/financeiro/transferencias/?status=pending');
    const [showTransferModal, setShowTransferModal] = React.useState(false);
    // use financeiroService.marcarTransferenciaSettled to mark as settled
    const handleMarkSettled = async (id) => {
        const payload = { external_reference: '', taxa_bancaria: '0.00' };
        try {
            // call dedicated service (use financeiroService for clarity)
            await financeiroService.marcarTransferenciaSettled(id, payload);
            qc.invalidateQueries({ queryKey: ['transferencias'] });
            qc.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] });
            alert('Transferência marcada como liquidada');
        }
        catch (e) {
            alert('Erro marcando transferência: ' + e?.response?.data || e);
        }
    };
    if (isLoading)
        return _jsx("div", { children: "Carregando transfer\u00EAncias..." });
    return (_jsxs("div", { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsx("h5", { children: "Transfer\u00EAncias Pendentes" }), _jsx("div", { children: _jsx("button", { className: "btn btn-sm btn-primary me-2", onClick: () => setShowTransferModal(true), children: "Nova Transfer\u00EAncia" }) })] }), transfers.length === 0 && _jsx("div", { className: "alert alert-info", children: "Nenhuma transfer\u00EAncia pendente encontrada." }), transfers.length > 0 && (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "Tipo" }), _jsx("th", { children: "Valor" }), _jsx("th", { children: "Conta Origem" }), _jsx("th", { children: "Conta Destino" }), _jsx("th", { children: "Descri\u00E7\u00E3o" }), _jsx("th", { children: "A\u00E7\u00F5es" })] }) }), _jsx("tbody", { children: transfers.map((t) => (_jsxs("tr", { children: [_jsx("td", { children: t.id }), _jsx("td", { children: t.tipo_transferencia }), _jsxs("td", { children: ["R$ ", t.valor] }), _jsx("td", { children: t.conta_origem_display }), _jsx("td", { children: t.conta_destino_display }), _jsx("td", { children: t.descricao }), _jsx("td", { children: _jsx("button", { className: "btn btn-sm btn-outline-success", onClick: () => handleMarkSettled(t.id), children: "Marcar liquidado" }) })] }, t.id))) })] }) })), showTransferModal && (_jsx(TransferForm, { onClose: () => setShowTransferModal(false), onSaved: () => { setShowTransferModal(false); qc.invalidateQueries({ queryKey: ['transferencias'] }); qc.invalidateQueries({ queryKey: ['financeiro', 'vencimentos'] }); } }))] }));
};
export default TransferenciasList;
