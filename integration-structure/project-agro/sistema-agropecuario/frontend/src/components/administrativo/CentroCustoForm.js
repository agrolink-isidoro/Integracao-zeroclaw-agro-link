import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useApiCreate } from '@/hooks/useApi';
const CentroCustoForm = ({ onClose }) => {
    const create = useApiCreate('/administrativo/centros-custo/', [['centros-custo']]);
    const [codigo, setCodigo] = useState('');
    const [nome, setNome] = useState('');
    const [categoria, setCategoria] = useState('administrativo');
    const [ativo, setAtivo] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        try {
            await create.mutateAsync({ codigo, nome, categoria, ativo });
            alert('Centro criado');
            onClose?.();
        }
        catch (err) {
            const extractDetail = (e) => {
                if (!e || typeof e !== 'object')
                    return String(e);
                const ae = e;
                if (ae.response && typeof ae.response.data === 'object' && ae.response.data !== null && 'detail' in ae.response.data) {
                    const d = ae.response.data['detail'];
                    return typeof d === 'string' ? d : JSON.stringify(d);
                }
                return JSON.stringify(ae.response?.data) || ae.message || 'Erro desconhecido';
            };
            const detail = extractDetail(err);
            const ae2 = err;
            console.error('Erro ao criar centro:', ae2.response?.data);
            alert('Erro ao criar centro: ' + detail);
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsxs("div", { className: "card border-0 shadow-sm", children: [_jsxs("div", { className: "card-header bg-info text-white d-flex align-items-center", children: [_jsx("i", { className: "bi bi-diagram-3 me-2" }), _jsx("h5", { className: "mb-0", children: "Novo Centro de Custo" })] }), _jsx("div", { className: "card-body p-3 p-md-4", children: _jsx("form", { onSubmit: handleSubmit, children: _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "codigo", className: "form-label", children: [_jsx("i", { className: "bi bi-hash me-1" }), "C\u00F3digo"] }), _jsx("input", { id: "codigo", className: "form-control", value: codigo, onChange: (e) => setCodigo(e.target.value), required: true })] }), _jsxs("div", { className: "col-12 col-md-6", children: [_jsxs("label", { htmlFor: "nome", className: "form-label", children: [_jsx("i", { className: "bi bi-tag me-1" }), "Nome"] }), _jsx("input", { id: "nome", className: "form-control", value: nome, onChange: (e) => setNome(e.target.value), required: true })] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { htmlFor: "categoria", className: "form-label", children: [_jsx("i", { className: "bi bi-list-ul me-1" }), "Categoria"] }), _jsxs("select", { id: "categoria", className: "form-select", value: categoria, onChange: (e) => setCategoria(e.target.value), children: [_jsx("option", { value: "administrativo", children: "Administrativo" }), _jsx("option", { value: "transporte", children: "Transporte" }), _jsx("option", { value: "manutencao", children: "Manuten\u00E7\u00E3o" }), _jsx("option", { value: "frete", children: "Frete" }), _jsx("option", { value: "outro", children: "Outro" })] })] }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "form-check mt-2", children: [_jsx("input", { className: "form-check-input", type: "checkbox", checked: ativo, onChange: (e) => setAtivo(e.target.checked), id: "ativo" }), _jsxs("label", { className: "form-check-label", htmlFor: "ativo", children: [_jsx("i", { className: "bi bi-toggle-on me-1" }), "Ativo"] })] }) }), _jsx("div", { className: "col-12", children: _jsxs("div", { className: "d-flex flex-column flex-sm-row gap-2 justify-content-end mt-3", children: [_jsxs("button", { type: "button", className: "btn btn-outline-secondary", onClick: () => onClose?.(), disabled: submitting, children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsxs("button", { type: "submit", className: "btn btn-info text-white", disabled: submitting, children: [_jsx("i", { className: "bi bi-check-circle me-2" }), submitting ? 'Enviando...' : 'Criar'] })] }) })] }) }) })] }));
};
export default CentroCustoForm;
