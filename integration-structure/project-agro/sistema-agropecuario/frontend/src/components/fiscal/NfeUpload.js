import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import FileUpload from '../common/FileUpload';
import { uploadXml } from '../../services/fiscal';
import { useToast } from '../../hooks/useToast';
const NfeUpload = () => {
    const [file, setFile] = useState(null);
    const [badFields, setBadFields] = useState([]);
    const { showSuccess, showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [clearKey, setClearKey] = useState(0);
    const onFileSelect = (files) => {
        setBadFields([]);
        setFile(files[0] ?? null);
    };
    const handleSubmit = async () => {
        if (!file) {
            showError('Selecione um arquivo XML antes de enviar');
            return;
        }
        const form = new FormData();
        form.append('xml_file', file);
        try {
            setLoading(true);
            await uploadXml(form);
            showSuccess('XML processado com sucesso');
            // limpar formulário após upload bem-sucedido
            setFile(null);
            setBadFields([]);
            setClearKey(k => k + 1);
            // poderia atualizar lista/estado conforme necessário
        }
        catch (err) {
            const data = err?.response?.data;
            if (data && data.error === 'validation_error' && Array.isArray(data.bad_fields)) {
                setBadFields(data.bad_fields);
            }
            else {
                showError(data?.detail || 'Erro ao enviar XML');
            }
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "card", children: [_jsx("div", { className: "card-header d-flex justify-content-between align-items-center", children: _jsx("h5", { className: "mb-0", children: "Upload de NF-e (XML)" }) }), _jsxs("div", { className: "card-body", children: [_jsx(FileUpload, { accept: ".xml", multiple: false, onFileSelect: onFileSelect, label: "Arquivo XML", resetKey: clearKey }), badFields.length > 0 && (_jsxs("div", { className: "mt-3", children: [_jsx("h6", { className: "text-danger", children: "Erros de valida\u00E7\u00E3o:" }), _jsx("ul", { children: badFields.map((b, i) => (_jsxs("li", { children: [_jsx("strong", { children: b.field }), ": ", b.message] }, i))) })] })), _jsxs("div", { className: "mt-3 d-flex gap-2", children: [_jsx("button", { className: "btn btn-primary", onClick: handleSubmit, disabled: loading, children: loading ? 'Enviando...' : 'Enviar XML' }), _jsx("button", { className: "btn btn-outline-secondary", onClick: () => { setFile(null); setBadFields([]); setClearKey(k => k + 1); }, children: "Limpar" })] })] })] }));
};
export default NfeUpload;
