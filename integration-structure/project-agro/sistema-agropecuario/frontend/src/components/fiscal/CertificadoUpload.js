import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import FileUpload from '../common/FileUpload';
import { uploadCert, listCertificados } from '../../services/fiscal';
import { useToast } from '../../hooks/useToast';
const CertificadoUpload = () => {
    const [file, setFile] = useState(null);
    const { showSuccess, showError } = useToast();
    const [loading, setLoading] = useState(false);
    const onFileSelect = (files) => {
        setFile(files[0] ?? null);
    };
    const handleSubmit = async () => {
        if (!file) {
            showError('Selecione um certificado (.p12/.pfx) antes de enviar');
            return;
        }
        const form = new FormData();
        form.append('nome', file.name);
        form.append('arquivo', file);
        try {
            setLoading(true);
            await uploadCert(form);
            showSuccess('Certificado enviado com sucesso');
            // opcional: refresh da lista
            await listCertificados();
        }
        catch (err) {
            const data = err?.response?.data;
            if (data && data.error) {
                if (data.error === 'invalid_file_type') {
                    showError('Tipo de arquivo inválido. Envie .p12 ou .pfx');
                }
                else if (data.error === 'file_too_large') {
                    showError('Arquivo muito grande. Verifique o limite');
                }
                else {
                    showError('Erro ao enviar certificado');
                }
            }
            else {
                showError('Erro ao enviar certificado');
            }
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "card mt-3", children: [_jsx("div", { className: "card-header d-flex justify-content-between align-items-center", children: _jsx("h5", { className: "mb-0", children: "Upload de Certificado SEFAZ" }) }), _jsxs("div", { className: "card-body", children: [_jsx(FileUpload, { accept: ".p12,.pfx", multiple: false, onFileSelect: onFileSelect, label: "Certificado (.p12/.pfx)" }), _jsx("div", { className: "mt-3 d-flex gap-2", children: _jsx("button", { className: "btn btn-primary", onClick: handleSubmit, disabled: loading, children: loading ? 'Enviando...' : 'Enviar Certificado' }) })] })] }));
};
export default CertificadoUpload;
