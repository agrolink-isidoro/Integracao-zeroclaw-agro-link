import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useApiCreate, useApiUpdate } from '@/hooks/useApi';
const InstituicaoForm = ({ initialData, onClose, onSaved }) => {
    const isEdit = !!initialData;
    const [codigo, setCodigo] = useState(initialData?.codigo_bacen || '');
    const [nome, setNome] = useState(initialData?.nome || '');
    const [segmento, setSegmento] = useState(initialData?.segmento || 'outros');
    const [municipio, setMunicipio] = useState(initialData?.municipio || '');
    const [uf, setUf] = useState(initialData?.uf || '');
    const [errors, setErrors] = useState({});
    const create = useApiCreate('/comercial/instituicoes-financeiras/', [['instituicoes']]);
    const update = useApiUpdate('/comercial/instituicoes-financeiras/', [['instituicoes']]);
    const validate = () => {
        const e = {};
        if (!codigo || !codigo.trim())
            e.codigo = 'Código BACEN é obrigatório';
        if (!nome || !nome.trim())
            e.nome = 'Nome é obrigatório';
        setErrors(e);
        return Object.keys(e).length === 0;
    };
    // ensure validation runs before save
    const handleSave = async () => {
        if (!validate())
            return;
        const payload = { codigo_bacen: codigo, nome, segmento, municipio, uf };
        try {
            if (isEdit && initialData?.id) {
                await update.mutateAsync({ id: initialData.id, ...payload });
                if (onSaved)
                    onSaved({ id: initialData.id, ...payload });
            }
            else {
                const created = await create.mutateAsync(payload);
                if (onSaved)
                    onSaved(created);
            }
            onClose();
        }
        catch (err) {
            console.error('Erro ao salvar instituição:', err);
            alert('Falha ao salvar: ' + (err?.response?.data?.detail || err?.message || 'erro desconhecido'));
        }
    };
    useEffect(() => {
        if (initialData) {
            setCodigo(initialData.codigo_bacen || '');
            setNome(initialData.nome || '');
            setSegmento(initialData.segmento || 'outros');
            setMunicipio(initialData.municipio || '');
            setUf(initialData.uf || '');
        }
    }, [initialData]);
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-building me-2" }), "C\u00F3digo BACEN"] }), _jsx("input", { name: "codigo_bacen", className: `form-control ${errors.codigo ? 'is-invalid' : ''}`, value: codigo, onChange: (e) => setCodigo(e.target.value) }), errors.codigo && _jsx("div", { className: "invalid-feedback", children: errors.codigo })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-building me-2" }), "Nome"] }), _jsx("input", { name: "nome", placeholder: "Nome", className: `form-control ${errors.nome ? 'is-invalid' : ''}`, value: nome, onChange: (e) => setNome(e.target.value) }), errors.nome && _jsx("div", { className: "invalid-feedback", children: errors.nome })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Segmento" }), _jsxs("select", { className: "form-select", value: segmento, onChange: (e) => setSegmento(e.target.value), children: [_jsx("option", { value: "banco_comercial", children: "Banco Comercial" }), _jsx("option", { value: "banco_multiplo", children: "Banco M\u00FAltiplo" }), _jsx("option", { value: "banco_investimento", children: "Banco de Investimento" }), _jsx("option", { value: "caixa_economica", children: "Caixa Econ\u00F4mica" }), _jsx("option", { value: "outros", children: "Outros" })] })] }), _jsxs("div", { className: "row g-2 mb-3", children: [_jsxs("div", { className: "col", children: [_jsx("label", { className: "form-label", children: "Munic\u00EDpio" }), _jsx("input", { className: "form-control", value: municipio, onChange: (e) => setMunicipio(e.target.value) })] }), _jsxs("div", { className: "col-2", children: [_jsx("label", { className: "form-label", children: "UF" }), _jsx("input", { className: "form-control", value: uf, onChange: (e) => setUf(e.target.value) })] })] }), _jsxs("div", { className: "d-flex justify-content-end gap-2", children: [_jsx("button", { className: "btn btn-outline-secondary", onClick: onClose, children: "Cancelar" }), _jsx("button", { className: "btn btn-primary", onClick: handleSave, children: isEdit ? 'Salvar' : 'Criar' })] })] }));
};
export default InstituicaoForm;
