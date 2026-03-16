import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import useApi from '@/hooks/useApi';
import { useApiQuery } from '@/hooks/useApi';
const FormaOptions = [
    { value: 'pix', label: 'PIX' },
    { value: 'ted', label: 'TED' },
    { value: 'doc', label: 'DOC' },
    { value: 'interno', label: 'Interno' }
];
const FolhaPagarBatchModal = ({ folhaId, items, onClose, onComplete }) => {
    const api = useApi();
    const { data: contas = [] } = useApiQuery(['contas-bancarias'], '/financeiro/contas/?page_size=1000');
    const [contaOrigem, setContaOrigem] = useState(contas && contas.length ? contas[0].id : null);
    const [rows, setRows] = useState(items.map((it) => ({ funcionario_id: it.funcionario.id, valor: Number(it.liquido || 0), forma: 'pix', dados_bancarios_override: {}, client_tx_id: null })));
    const [submitting, setSubmitting] = useState(false);
    const [results, setResults] = useState(null);
    const [errors, setErrors] = useState({});
    const updateRow = (idx, patch) => setRows(r => r.map((rr, i) => i === idx ? { ...rr, ...patch } : rr));
    function validateRow(r) {
        // require conta_destino for TED/DOC and for PIX (to avoid null FK)
        if (r.forma === 'pix') {
            if (!r.dados_bancarios_override?.pix_key && !r.dados_bancarios_override?.conta_destino) {
                return 'PIX requer chave PIX ou conta destino';
            }
        }
        if (r.forma === 'ted' || r.forma === 'doc') {
            if (!r.dados_bancarios_override?.conta_destino) {
                return 'TED/DOC requer conta destino';
            }
        }
        if (!r.valor || Number(r.valor) <= 0)
            return 'Valor deve ser maior que zero';
        return null;
    }
    function validateAll() {
        const newErrors = {};
        rows.forEach((r, idx) => {
            const err = validateRow(r);
            if (err)
                newErrors[idx] = err;
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }
    async function handleSubmit() {
        if (!contaOrigem) {
            alert('Selecione uma conta de origem');
            return;
        }
        if (!validateAll()) {
            alert('Existem erros no formulário. Corrija antes de enviar.');
            return;
        }
        setSubmitting(true);
        try {
            const payload = { conta_origem: contaOrigem, pagamentos: rows };
            const res = await api.post(`/administrativo/folha-pagamento/${folhaId}/pagar_por_transferencia/`, payload);
            setResults(res.data.results || null);
            onComplete?.();
        }
        catch (err) {
            console.error('Erro ao enviar lote', err);
            alert('Erro ao enviar lote de pagamentos');
        }
        finally {
            setSubmitting(false);
        }
    }
    async function reprocessFailed() {
        if (!results)
            return;
        const failed = results.filter(r => !r.success).map((r, i) => {
            // find corresponding row by funcionario_id
            const idx = rows.findIndex(rr => rr.funcionario_id === r.funcionario_id);
            return rows[idx];
        }).filter(Boolean);
        if (failed.length === 0)
            return alert('Nenhuma falha para reprocessar');
        try {
            setSubmitting(true);
            const payload = { conta_origem: contaOrigem, pagamentos: failed };
            const res = await api.post(`/administrativo/folha-pagamento/${folhaId}/pagar_por_transferencia/`, payload);
            // merge results: replace failed with new responses
            const newResults = [...(results || [])];
            (res.data.results || []).forEach((nr) => {
                const pos = newResults.findIndex((x) => x.funcionario_id === nr.funcionario_id);
                if (pos >= 0)
                    newResults[pos] = nr;
            });
            setResults(newResults);
            onComplete?.();
        }
        catch (err) {
            console.error('Erro ao reprocessar', err);
            alert('Erro ao reprocessar falhas');
        }
        finally {
            setSubmitting(false);
        }
    }
    function downloadCsv() {
        if (!results)
            return alert('Nenhum resultado para exportar');
        const headers = ['funcionario_id', 'success', 'transfer_id', 'error'];
        const lines = [headers.join(',')];
        results.forEach((r) => lines.push([r.funcionario_id, r.success, r.transfer_id || '', r.error || ''].join(',')));
        const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `folha_${folhaId}_results.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
    return (_jsx("div", { className: "modal d-block", role: "dialog", tabIndex: -1, children: _jsx("div", { className: "modal-dialog modal-lg modal-dialog-scrollable", role: "document", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header bg-warning", children: [_jsxs("h5", { className: "modal-title d-flex align-items-center", children: [_jsx("i", { className: "bi bi-currency-dollar me-2" }), "Pagar Folha por Transfer\u00EAncia"] }), _jsx("button", { type: "button", className: "btn-close", "aria-label": "Close", onClick: onClose })] }), _jsxs("div", { className: "modal-body p-3 p-md-4", children: [_jsx("div", { className: "row g-2 g-md-3", children: _jsxs("div", { className: "col-12", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-bank me-1" }), "Conta origem"] }), _jsxs("select", { className: "form-select", value: contaOrigem ?? '', onChange: (e) => setContaOrigem(Number(e.target.value)), children: [_jsx("option", { value: "", children: "(selecione)" }), contas.map(c => _jsxs("option", { value: c.id, children: [c.banco, " ", c.agencia, "/", c.conta] }, c.id))] })] }) }), _jsx("div", { className: "table-responsive mt-3", children: _jsxs("table", { className: "table table-hover table-sm", children: [_jsx("thead", { className: "table-light", children: _jsxs("tr", { children: [_jsxs("th", { children: [_jsx("i", { className: "bi bi-person me-1" }), "Funcion\u00E1rio"] }), _jsxs("th", { children: [_jsx("i", { className: "bi bi-cash me-1" }), "Valor"] }), _jsxs("th", { children: [_jsx("i", { className: "bi bi-credit-card me-1" }), "Forma"] }), _jsxs("th", { children: [_jsx("i", { className: "bi bi-qr-code me-1" }), "PIX / Override"] })] }) }), _jsx("tbody", { children: rows.map((r, idx) => {
                                                const rowError = errors[idx];
                                                return (_jsxs("tr", { className: rowError ? 'table-danger' : '', children: [_jsxs("td", { children: [items[idx].funcionario.nome, rowError && _jsxs("div", { className: "text-danger small mt-1", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-1" }), rowError] })] }), _jsx("td", { children: _jsx("input", { type: "number", step: "0.01", className: `form-control ${rowError ? 'is-invalid' : ''}`, value: String(r.valor), onChange: (e) => updateRow(idx, { valor: Number(e.target.value) }) }) }), _jsx("td", { children: _jsx("select", { className: `form-select ${rowError ? 'is-invalid' : ''}`, value: r.forma, onChange: (e) => updateRow(idx, { forma: e.target.value }), children: FormaOptions.map(o => _jsx("option", { value: o.value, children: o.label }, o.value)) }) }), _jsxs("td", { children: [_jsx("input", { placeholder: "pix_key", className: `form-control mb-1 ${rowError ? 'is-invalid' : ''}`, value: r.dados_bancarios_override?.pix_key || '', onChange: (e) => updateRow(idx, { dados_bancarios_override: { ...(r.dados_bancarios_override || {}), pix_key: e.target.value } }) }), _jsxs("select", { className: `form-select ${rowError ? 'is-invalid' : ''}`, value: r.dados_bancarios_override?.conta_destino || '', onChange: (e) => updateRow(idx, { dados_bancarios_override: { ...(r.dados_bancarios_override || {}), conta_destino: e.target.value ? Number(e.target.value) : null } }), children: [_jsx("option", { value: "", children: "(n\u00E3o informar)" }), contas.map(c => _jsxs("option", { value: c.id, children: [c.banco, " ", c.agencia, "/", c.conta] }, c.id))] })] })] }, r.funcionario_id));
                                            }) })] }) }), results && (_jsxs("div", { className: "mt-3 p-3 bg-light rounded", children: [_jsxs("h6", { className: "d-flex align-items-center", children: [_jsx("i", { className: "bi bi-list-check me-2" }), "Resultados"] }), _jsxs("div", { className: "d-flex flex-column flex-sm-row gap-2 mb-2", children: [_jsxs("button", { className: "btn btn-sm btn-outline-secondary", onClick: downloadCsv, children: [_jsx("i", { className: "bi bi-download me-1" }), "Download CSV"] }), _jsxs("button", { className: "btn btn-sm btn-outline-primary", onClick: reprocessFailed, disabled: submitting, children: [_jsx("i", { className: "bi bi-arrow-clockwise me-1" }), "Reprocessar falhas"] })] }), _jsx("ul", { children: results.map((r, i) => (_jsx("li", { className: r.success ? 'text-success' : 'text-danger', children: `Funcionario ${r.funcionario_id}: ${r.success ? `Sucesso (Transfer ${r.transfer_id || '-'})` : `Erro: ${r.error}`}` }, i))) })] }))] }), _jsxs("div", { className: "modal-footer bg-light", children: [_jsxs("button", { type: "button", className: "btn btn-outline-secondary", onClick: onClose, disabled: submitting, children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsxs("button", { type: "button", className: "btn btn-warning", onClick: handleSubmit, disabled: submitting, children: [_jsx("i", { className: "bi bi-send me-2" }), submitting ? 'Enviando...' : 'Enviar Lote'] })] })] }) }) }));
};
export default FolhaPagarBatchModal;
