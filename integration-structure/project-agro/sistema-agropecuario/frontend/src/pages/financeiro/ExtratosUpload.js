import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import FileUpload from '@/components/common/FileUpload';
import { useApiQuery } from '@/hooks/useApi';
import useApi from '@/hooks/useApi';
import conciliacaoService from '@/services/conciliacao';
const ExtratosUpload = () => {
    const { data: contas = [] } = useApiQuery(['contas-bancarias'], '/financeiro/contas/');
    const api = useApi();
    const [showModal, setShowModal] = useState(false);
    const [conta, setConta] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [preview, setPreview] = useState([]);
    const [previewErrors, setPreviewErrors] = useState([]);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [loadingImport, setLoadingImport] = useState(false);
    const [loadingConciliacao, setLoadingConciliacao] = useState(false);
    const [lastImportId, setLastImportId] = useState(null);
    const [conciliacaoResult, setConciliacaoResult] = useState(null);
    const resetModal = () => {
        setSelectedFiles([]);
        setPreview([]);
        setPreviewErrors([]);
        setConta('');
        setLastImportId(null);
        setConciliacaoResult(null);
        setShowModal(false);
    };
    const handlePreview = async () => {
        if (!conta)
            return alert('Selecione uma conta bancária');
        if (selectedFiles.length === 0)
            return alert('Selecione um arquivo CSV');
        const file = selectedFiles[0];
        setLoadingPreview(true);
        try {
            const fd = new FormData();
            fd.append('conta', String(conta));
            fd.append('arquivo', file);
            fd.append('dry_run', 'true');
            const resp = await api.client.post('/financeiro/bank-statements/', fd);
            const data = resp.data;
            setPreview(data.preview || []);
            setPreviewErrors(data.errors || []);
        }
        catch (e) {
            console.error('Preview failed', e);
            alert('Falha ao gerar preview: ' + (e?.response?.data?.detail || e?.message || 'erro desconhecido'));
        }
        finally {
            setLoadingPreview(false);
        }
    };
    const handleImport = async () => {
        if (!conta)
            return alert('Selecione uma conta bancária');
        if (selectedFiles.length === 0)
            return alert('Selecione um arquivo CSV');
        const file = selectedFiles[0];
        setLoadingImport(true);
        try {
            const fd = new FormData();
            fd.append('conta', String(conta));
            fd.append('arquivo', file);
            const resp = await api.client.post('/financeiro/bank-statements/', fd);
            const status = resp.status;
            const data = resp.data;
            if (status === 202 && data?.detail === 'enqueued') {
                alert('Importação enfileirada. ID: ' + data.import_id);
                setLastImportId(data.import_id);
            }
            else if (status === 201) {
                alert('Importação concluída com sucesso');
                setLastImportId(data.id);
            }
            else {
                alert('Resposta inesperada: ' + JSON.stringify(data));
            }
            // Não resetar modal para permitir conciliação
            setPreview([]);
            setPreviewErrors([]);
            setSelectedFiles([]);
        }
        catch (e) {
            console.error('Import failed', e);
            alert('Falha na importação: ' + (e?.response?.data?.detail || e?.message || 'erro desconhecido'));
        }
        finally {
            setLoadingImport(false);
        }
    };
    const handleConciliar = async () => {
        if (!lastImportId) {
            alert('Nenhuma importação para conciliar');
            return;
        }
        setLoadingConciliacao(true);
        try {
            const result = await conciliacaoService.conciliarImportacao(lastImportId);
            setConciliacaoResult(result);
            alert(`Conciliação concluída!\n\n` +
                `Itens criados: ${result.itens_criados}\n` +
                `Duplicados: ${result.itens_duplicados}\n` +
                `Erros: ${result.erros?.length || 0}`);
        }
        catch (e) {
            console.error('Conciliação falhou', e);
            alert('Erro na conciliação: ' + (e?.response?.data?.error || e?.message || 'erro desconhecido'));
        }
        finally {
            setLoadingConciliacao(false);
        }
    };
    return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("div", { children: [_jsxs("h2", { children: [_jsx("i", { className: "bi bi-file-earmark-text me-2" }), "Concilia\u00E7\u00E3o Banc\u00E1ria"] }), _jsx("p", { className: "text-muted mb-0", children: "Importe extratos em CSV e reconcilie transa\u00E7\u00F5es." })] }), _jsx("div", { children: _jsxs("button", { className: "btn btn-primary", onClick: () => setShowModal(true), children: [_jsx("i", { className: "bi bi-upload me-1" }), " Novo Extrato"] }) })] }), _jsx("div", { className: "card", children: _jsx("div", { className: "card-body", children: _jsxs("p", { children: ["Use o bot\u00E3o ", _jsx("strong", { children: "Novo Extrato" }), " para carregar um CSV de extrato banc\u00E1rio. Voc\u00EA pode gerar um preview antes de confirmar a importa\u00E7\u00E3o."] }) }) }), showModal && (_jsx("div", { className: "modal d-block", tabIndex: -1, role: "dialog", children: _jsx("div", { className: "modal-dialog modal-dialog-centered modal-lg", role: "document", children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Upload de Extrato" }), _jsx("button", { type: "button", className: "btn-close", "aria-label": "Close", onClick: () => setShowModal(false) })] }), _jsxs("div", { className: "modal-body", children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Conta Banc\u00E1ria" }), _jsxs("select", { className: "form-select", value: conta === '' ? '' : conta, onChange: (e) => setConta(e.target.value === '' ? '' : Number(e.target.value)), children: [_jsx("option", { value: "", children: "Selecione..." }), contas.map((c) => (_jsxs("option", { value: c.id, children: [c.banco, " - Ag: ", c.agencia, " - Conta: ", c.conta] }, c.id)))] })] }), _jsx("div", { className: "mb-3", children: _jsx(FileUpload, { accept: ".csv,.txt", multiple: false, onFileSelect: (files) => setSelectedFiles(files) }) }), _jsxs("div", { className: "mb-3 d-flex gap-2", children: [_jsx("button", { className: "btn btn-outline-primary", onClick: handlePreview, disabled: loadingPreview, children: loadingPreview ? 'Gerando preview...' : 'Preview' }), _jsx("button", { className: "btn btn-primary", onClick: handleImport, disabled: loadingImport, children: loadingImport ? 'Importando...' : 'Importar' }), lastImportId && (_jsx("button", { className: "btn btn-success", onClick: handleConciliar, disabled: loadingConciliacao, children: loadingConciliacao ? 'Conciliando...' : '🔗 Conciliar' }))] }), lastImportId && (_jsxs("div", { className: "alert alert-success", children: [_jsx("i", { className: "bi bi-check-circle me-2" }), _jsxs("strong", { children: ["Importa\u00E7\u00E3o #", lastImportId, " conclu\u00EDda!"] }), !conciliacaoResult && (_jsxs("p", { className: "mb-0 mt-1 small", children: ["Clique em ", _jsx("strong", { children: "Conciliar" }), " para converter as transa\u00E7\u00F5es e executar matching autom\u00E1tico com vencimentos."] }))] })), conciliacaoResult && (_jsx("div", { className: "mt-3", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header", children: _jsx("h6", { className: "mb-0", children: "Resultado da Concilia\u00E7\u00E3o" }) }), _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "row g-3", children: [_jsx("div", { className: "col-md-3", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "display-6 text-primary", children: conciliacaoResult.itens_criados }), _jsx("small", { className: "text-muted", children: "Itens Criados" })] }) }), _jsx("div", { className: "col-md-3", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "display-6 text-success", children: conciliacaoResult.matches_automaticos?.conciliados || 0 }), _jsx("small", { className: "text-muted", children: "Conciliados Auto" })] }) }), _jsx("div", { className: "col-md-3", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "display-6 text-warning", children: conciliacaoResult.matches_automaticos?.sugestoes?.length || 0 }), _jsx("small", { className: "text-muted", children: "Sugest\u00F5es" })] }) }), _jsx("div", { className: "col-md-3", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "display-6 text-secondary", children: conciliacaoResult.itens_duplicados }), _jsx("small", { className: "text-muted", children: "Duplicados" })] }) })] }), conciliacaoResult.matches_automaticos?.sugestoes?.length > 0 && (_jsxs("div", { className: "mt-3", children: [_jsx("h6", { children: "Sugest\u00F5es de Concilia\u00E7\u00E3o Manual" }), _jsx("div", { style: { maxHeight: 200, overflow: 'auto' }, children: _jsxs("table", { className: "table table-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Data" }), _jsx("th", { children: "Extrato" }), _jsx("th", { children: "Vencimento" }), _jsx("th", { children: "Similaridade" })] }) }), _jsx("tbody", { children: conciliacaoResult.matches_automaticos.sugestoes.map((s, i) => (_jsxs("tr", { children: [_jsx("td", { children: s.item_data }), _jsxs("td", { children: [_jsxs("small", { children: [s.item_descricao.substring(0, 30), "..."] }), _jsx("br", {}), _jsxs("strong", { children: ["R$ ", s.item_valor.toFixed(2)] })] }), _jsxs("td", { children: [_jsx("small", { children: s.vencimento_titulo }), _jsx("br", {}), _jsxs("strong", { children: ["R$ ", s.vencimento_valor.toFixed(2)] })] }), _jsx("td", { children: _jsxs("span", { className: `badge ${s.similaridade >= 0.8 ? 'bg-success' : s.similaridade >= 0.6 ? 'bg-warning' : 'bg-secondary'}`, children: [(s.similaridade * 100).toFixed(0), "%"] }) })] }, i))) })] }) }), _jsx("p", { className: "small text-muted mt-2", children: "\uD83D\uDCA1 Revise as sugest\u00F5es e concilie manualmente itens com similaridade < 90%" })] })), conciliacaoResult.erros && conciliacaoResult.erros.length > 0 && (_jsxs("div", { className: "mt-3 alert alert-danger", children: [_jsx("strong", { children: "Erros:" }), _jsx("ul", { className: "mb-0 mt-1", children: conciliacaoResult.erros.map((e, i) => _jsx("li", { children: e }, i)) })] }))] })] }) })), preview && preview.length > 0 && (_jsxs("div", { className: "mt-3", children: [_jsxs("h6", { children: ["Preview (", preview.length, " linhas)"] }), _jsx("div", { style: { maxHeight: 240, overflow: 'auto' }, children: _jsxs("table", { className: "table table-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Data" }), _jsx("th", { children: "Valor" }), _jsx("th", { children: "Descri\u00E7\u00E3o" }), _jsx("th", { children: "ID Externo" }), _jsx("th", { children: "Saldo" })] }) }), _jsx("tbody", { children: preview.map((r, i) => (_jsxs("tr", { children: [_jsx("td", { children: r.date }), _jsx("td", { children: r.amount }), _jsx("td", { children: r.description }), _jsx("td", { children: r.external_id }), _jsx("td", { children: r.balance })] }, i))) })] }) })] })), previewErrors && previewErrors.length > 0 && (_jsxs("div", { className: "mt-3 alert alert-warning", children: [_jsx("strong", { children: "Erros no preview:" }), _jsx("ul", { children: previewErrors.map((e, idx) => _jsxs("li", { children: ["Linha ", e.row, ": ", e.error] }, idx)) })] }))] })] }) }) }))] }));
};
export default ExtratosUpload;
