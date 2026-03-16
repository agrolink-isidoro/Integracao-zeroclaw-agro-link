import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useApiCreate, useApiQuery } from '@/hooks/useApi';
import { TalhoesMultiSelect } from '@/components/agricultura/TalhoesMultiSelect';
const DRIVER_OPTIONS = [
    { value: 'area', label: 'Área (ha)' },
    { value: 'producao', label: 'Produção (kg)' },
    { value: 'horas_maquina', label: 'Horas de Máquina' },
    { value: 'uniforme', label: 'Uniforme' },
];
const DespesaForm = ({ onClose }) => {
    /* ── Queries ── */
    const { data: centros = [] } = useApiQuery(['centros-custo'], '/administrativo/centros-custo/');
    const { data: fornecedores = [] } = useApiQuery(['fornecedores'], '/comercial/fornecedores/');
    const { data: safras = [] } = useApiQuery(['plantios'], '/agricultura/plantios/');
    const { data: todosTalhoes = [] } = useApiQuery(['talhoes'], '/talhoes/');
    const createDespesa = useApiCreate('/administrativo/despesas/', [['despesas']]);
    /* ── State ── */
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [valor, setValor] = useState('0.00');
    const [data, setData] = useState(new Date().toISOString().slice(0, 10));
    const [centro, setCentro] = useState('');
    const [fornecedor, setFornecedor] = useState('');
    const [safra, setSafra] = useState('');
    const [talhoes, setTalhoes] = useState([]);
    const [documentoReferencia, setDocumentoReferencia] = useState('');
    const [driverRateio, setDriverRateio] = useState('area');
    const [autoRateio, setAutoRateio] = useState(false);
    const [pendenteRateio, setPendenteRateio] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    /* ── Submit ── */
    async function handleSubmit(e) {
        e.preventDefault();
        if (!centro) {
            alert('Selecione um centro de custo');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                titulo,
                descricao: descricao || undefined,
                valor,
                data,
                centro,
                auto_rateio: autoRateio,
                pendente_rateio: pendenteRateio,
                driver_de_rateio: driverRateio,
            };
            if (fornecedor)
                payload.fornecedor = fornecedor;
            if (safra)
                payload.safra = safra;
            if (talhoes.length)
                payload.talhoes = talhoes;
            if (documentoReferencia)
                payload.documento_referencia = documentoReferencia;
            await createDespesa.mutateAsync(payload);
            alert('Despesa criada com sucesso');
            onClose?.();
        }
        catch (err) {
            console.error(err);
            alert('Erro ao criar despesa: ' + (err.response?.data?.detail || err.message));
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", htmlFor: "titulo", children: [_jsx("i", { className: "bi bi-tag me-2" }), "T\u00EDtulo"] }), _jsx("input", { id: "titulo", className: "form-control", value: titulo, onChange: (e) => setTitulo(e.target.value), required: true })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", htmlFor: "descricao", children: [_jsx("i", { className: "bi bi-card-text me-2" }), "Descri\u00E7\u00E3o"] }), _jsx("textarea", { id: "descricao", className: "form-control", rows: 2, value: descricao, onChange: (e) => setDescricao(e.target.value), placeholder: "Opcional" })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-6 mb-3", children: [_jsxs("label", { className: "form-label", htmlFor: "valor", children: [_jsx("i", { className: "bi bi-cash me-2" }), "Valor (R$)"] }), _jsx("input", { id: "valor", type: "number", step: "0.01", min: "0", className: "form-control", value: valor, onChange: (e) => setValor(e.target.value), required: true })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsxs("label", { className: "form-label", htmlFor: "data", children: [_jsx("i", { className: "bi bi-calendar me-2" }), "Data"] }), _jsx("input", { id: "data", type: "date", className: "form-control", value: data, onChange: (e) => setData(e.target.value), required: true })] })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-6 mb-3", children: [_jsxs("label", { className: "form-label", htmlFor: "centro", children: [_jsx("i", { className: "bi bi-diagram-3 me-2" }), "Centro de Custo"] }), _jsxs("select", { id: "centro", className: "form-select", value: centro === '' ? '' : String(centro), onChange: (e) => setCentro(e.target.value ? Number(e.target.value) : ''), required: true, children: [_jsx("option", { value: "", children: "-- selecione --" }), centros.map(c => (_jsxs("option", { value: c.id, children: [c.codigo, " - ", c.nome] }, c.id)))] })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsxs("label", { className: "form-label", htmlFor: "fornecedor", children: [_jsx("i", { className: "bi bi-person-lines-fill me-2" }), "Fornecedor"] }), _jsxs("select", { id: "fornecedor", className: "form-select", value: fornecedor === '' ? '' : String(fornecedor), onChange: (e) => setFornecedor(e.target.value ? Number(e.target.value) : ''), children: [_jsx("option", { value: "", children: "-- nenhum --" }), fornecedores.map(f => (_jsxs("option", { value: f.id, children: [f.nome, f.cpf_cnpj ? ` (${f.cpf_cnpj})` : ''] }, f.id)))] })] })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", htmlFor: "docRef", children: [_jsx("i", { className: "bi bi-file-earmark-text me-2" }), "Documento de Refer\u00EAncia"] }), _jsx("input", { id: "docRef", className: "form-control", value: documentoReferencia, onChange: (e) => setDocumentoReferencia(e.target.value), placeholder: "NF-e, Fatura, Boleto...", maxLength: 100 })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-6 mb-3", children: [_jsxs("label", { className: "form-label", htmlFor: "safra", children: [_jsx("i", { className: "bi bi-calendar-range me-2" }), "Safra"] }), _jsxs("select", { id: "safra", className: "form-select", value: safra === '' ? '' : String(safra), onChange: (e) => setSafra(e.target.value ? Number(e.target.value) : ''), children: [_jsx("option", { value: "", children: "-- nenhuma --" }), safras.map(p => (_jsxs("option", { value: p.id, children: ["Safra #", p.id, " - ", p.cultura_nome || p.descricao || p.id] }, p.id)))] })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsxs("label", { className: "form-label", htmlFor: "driver", children: [_jsx("i", { className: "bi bi-gear me-2" }), "Driver de Rateio"] }), _jsx("select", { id: "driver", className: "form-select", value: driverRateio, onChange: (e) => setDriverRateio(e.target.value), children: DRIVER_OPTIONS.map(o => (_jsx("option", { value: o.value, children: o.label }, o.value))) })] })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-grid-3x3 me-2" }), "Talh\u00F5es"] }), _jsx(TalhoesMultiSelect, { talhoes: todosTalhoes, selectedIds: talhoes, onChange: (ids) => setTalhoes(ids) })] }), _jsxs("div", { className: "row mb-3", children: [_jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "form-check", children: [_jsx("input", { className: "form-check-input", type: "checkbox", checked: autoRateio, onChange: (e) => setAutoRateio(e.target.checked), id: "autoRateio" }), _jsxs("label", { className: "form-check-label", htmlFor: "autoRateio", children: [_jsx("i", { className: "bi bi-lightning me-1" }), "Gerar rateio automaticamente"] })] }) }), _jsx("div", { className: "col-md-6", children: _jsxs("div", { className: "form-check", children: [_jsx("input", { className: "form-check-input", type: "checkbox", checked: pendenteRateio, onChange: (e) => setPendenteRateio(e.target.checked), id: "pendenteRateio" }), _jsxs("label", { className: "form-check-label", htmlFor: "pendenteRateio", children: [_jsx("i", { className: "bi bi-hourglass-split me-1" }), "Marcar como pendente de rateio"] })] }) })] }), _jsxs("div", { className: "d-flex flex-column flex-sm-row justify-content-end gap-2", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: () => onClose?.(), disabled: submitting, children: "Cancelar" }), _jsxs("button", { type: "submit", className: "btn btn-primary", disabled: submitting, children: [_jsx("i", { className: "bi bi-check-lg me-1" }), submitting ? 'Enviando...' : 'Criar Despesa'] })] })] }));
};
export default DespesaForm;
