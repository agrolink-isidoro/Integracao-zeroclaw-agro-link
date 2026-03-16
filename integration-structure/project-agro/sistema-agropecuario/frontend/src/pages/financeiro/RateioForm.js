import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiCreate, useApiQuery } from '@/hooks/useApi';
import { TalhoesMultiSelect } from '@/components/agricultura/TalhoesMultiSelect';
const RateioForm = ({ onClose }) => {
    const navigate = useNavigate();
    const { data: centros = [] } = useApiQuery(['centros-custo'], '/administrativo/centros-custo/');
    const { data: plantios = [] } = useApiQuery(['plantios'], '/agricultura/plantios/');
    const { data: todosTalhoes = [] } = useApiQuery(['talhoes'], '/talhoes/');
    const createRateio = useApiCreate('/financeiro/rateios/', [['financeiro', 'rateios']]);
    const [titulo, setTitulo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [valor, setValor] = useState('0.00');
    const [dataRateio, setDataRateio] = useState(new Date().toISOString().slice(0, 10));
    const [destino, setDestino] = useState('operacional');
    const [driver, setDriver] = useState('area');
    const [centro, setCentro] = useState('');
    const [safra, setSafra] = useState('');
    const [talhoes, setTalhoes] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        // validations
        if (driver === 'area' && talhoes.length === 0) {
            alert('Driver "area" requer pelo menos um talhão selecionado.');
            return;
        }
        if ((destino === 'despesa_adm' || destino === 'financeiro') && !centro) {
            alert('Centro de custo obrigatório para despesas administrativas/financeiras.');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                titulo,
                descricao,
                valor_total: Number(valor),
                data_rateio: dataRateio,
                destino,
                driver_de_rateio: driver,
                talhoes,
            };
            if (centro)
                payload.centro_custo = Number(centro);
            if (safra)
                payload.safra = Number(safra);
            const res = await createRateio.mutateAsync(payload);
            alert('Rateio criado com sucesso');
            if (onClose) {
                onClose();
            }
            else if (res && res.id) {
                navigate(`/financeiro/rateios/${res.id}`);
            }
            else {
                navigate('/financeiro');
            }
        }
        catch (err) {
            console.error(err);
            alert('Erro ao criar rateio: ' + (err.response?.data?.detail || err.message || err));
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", htmlFor: "titulo", children: [_jsx("i", { className: "bi bi-tag me-2" }), "T\u00EDtulo"] }), _jsx("input", { id: "titulo", className: "form-control", value: titulo, onChange: (e) => setTitulo(e.target.value), required: true })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", htmlFor: "descricao", children: [_jsx("i", { className: "bi bi-tag me-2" }), "Descri\u00E7\u00E3o"] }), _jsx("textarea", { id: "descricao", className: "form-control", value: descricao, onChange: (e) => setDescricao(e.target.value) })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-4 mb-3", children: [_jsxs("label", { className: "form-label", htmlFor: "valor", children: [_jsx("i", { className: "bi bi-cash me-2" }), "Valor total (R$)"] }), _jsx("input", { id: "valor", type: "number", step: "0.01", className: "form-control", value: valor, onChange: (e) => setValor(e.target.value), required: true })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsxs("label", { className: "form-label", htmlFor: "dataRateio", children: [_jsx("i", { className: "bi bi-calendar me-2" }), "Data do rateio"] }), _jsx("input", { id: "dataRateio", type: "date", className: "form-control", value: dataRateio, onChange: (e) => setDataRateio(e.target.value), required: true })] }), _jsxs("div", { className: "col-md-4 mb-3", children: [_jsx("label", { className: "form-label", htmlFor: "destino", children: "Destino" }), _jsxs("select", { id: "destino", className: "form-select", value: destino, onChange: (e) => setDestino(e.target.value), children: [_jsx("option", { value: "operacional", children: "Operacional / Lavoura" }), _jsx("option", { value: "manutencao", children: "Manuten\u00E7\u00E3o" }), _jsx("option", { value: "despesa_adm", children: "Despesa Administrativa" }), _jsx("option", { value: "investimento", children: "Investimento" }), _jsx("option", { value: "benfeitoria", children: "Benfeitoria" }), _jsx("option", { value: "financeiro", children: "Financeiro / Juros" })] })] })] }), _jsxs("div", { className: "row", children: [_jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", htmlFor: "driver", children: "Driver de rateio" }), _jsxs("select", { id: "driver", className: "form-select", value: driver, onChange: (e) => setDriver(e.target.value), children: [_jsx("option", { value: "area", children: "\u00C1rea (ha)" }), _jsx("option", { value: "producao", children: "Produ\u00E7\u00E3o (kg)" }), _jsx("option", { value: "horas_maquina", children: "Horas de M\u00E1quina" }), _jsx("option", { value: "uniforme", children: "Uniforme" })] })] }), _jsxs("div", { className: "col-md-6 mb-3", children: [_jsx("label", { className: "form-label", htmlFor: "centro", children: "Centro de Custo (opcional)" }), _jsxs("select", { id: "centro", className: "form-select", value: String(centro === '' ? '' : centro), onChange: (e) => setCentro(e.target.value ? Number(e.target.value) : ''), children: [_jsx("option", { value: "", children: "-- selecione --" }), centros.map(c => (_jsxs("option", { value: c.id, children: [c.codigo, " - ", c.nome] }, c.id)))] })] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", htmlFor: "safra", children: "Safra (opcional)" }), _jsxs("select", { id: "safra", className: "form-select", value: String(safra === '' ? '' : safra), onChange: (e) => setSafra(e.target.value ? Number(e.target.value) : ''), children: [_jsx("option", { value: "", children: "-- selecione --" }), plantios.map(p => (_jsxs("option", { value: p.id, children: ["Safra #", p.id, " - ", p.cultura_nome || p.descricao || p.id] }, p.id)))] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Talh\u00F5es" }), _jsx(TalhoesMultiSelect, { talhoes: todosTalhoes, selectedIds: talhoes, onChange: (ids) => setTalhoes(ids) })] }), _jsxs("div", { className: "d-flex flex-column flex-sm-row justify-content-end gap-2", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: () => onClose ? onClose() : navigate('/financeiro'), disabled: submitting, children: "Cancelar" }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: submitting, children: submitting ? 'Enviando...' : 'Criar Rateio' })] })] }));
};
export default RateioForm;
