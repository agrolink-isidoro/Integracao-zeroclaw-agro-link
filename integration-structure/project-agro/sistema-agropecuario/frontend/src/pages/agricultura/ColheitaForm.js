import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { UNIT_LABELS } from '../../utils/units';
import { useToast } from '../../hooks/useToast';
import TransportFields from '../../components/TransportFields';
export const ColheitaForm = ({ plantioId, preselectedTalhao, preselectedQuantidade, preselectedSessionItem, onClose, onSuccess }) => {
    const queryClient = useQueryClient();
    // Initialize itens/state from incoming props to avoid setting state inside effects
    const initialItens = preselectedTalhao ? [{ talhao: preselectedTalhao, quantidade_colhida: preselectedQuantidade ?? '' }] : [];
    const [formData, setFormData] = useState(() => ({
        plantio: plantioId,
        data_colheita: new Date().toISOString().split('T')[0],
        quantidade_colhida: preselectedQuantidade ?? undefined,
        unidade: 'kg',
        qualidade: undefined,
        observacoes: undefined,
        transportes: [{ placa: '', tara: undefined, peso_bruto: undefined, custo_transporte: undefined }],
        itens: initialItens,
        destino_tipo: 'armazenagem_interna',
        local_tipo: 'silo_bolsa',
        local_destino: undefined,
        empresa_destino: undefined,
        nf_provisoria: undefined,
        peso_estimado: undefined,
        _session_item: preselectedSessionItem ?? undefined
    }));
    // State is initialized from props above; avoid setting state in an effect to prevent cascading renders.
    const [errors, setErrors] = useState({});
    // Buscar plantios (safras)
    const { data: plantios = [] } = useQuery({
        queryKey: ['plantios'],
        queryFn: async () => {
            const response = await api.get('/agricultura/plantios/');
            return response.data;
        },
    });
    // typed queries for locais and empresas
    const { data: locais = [] } = useQuery({ queryKey: ['locais-armazenamento'], queryFn: async () => { const r = await api.get('estoque/locais-armazenamento/'); return r.data; } });
    const { data: empresas = [] } = useQuery({ queryKey: ['empresas'], queryFn: async () => { const r = await api.get('comercial/empresas/'); return r.data; } });
    // Derived talhões for selected plantio
    const selectedPlantio = plantios.find(p => p.id === formData.plantio);
    const talhoesInfo = selectedPlantio?.talhoes_info || [];
    const { showError, showSuccess } = useToast();
    const mutation = useMutation({
        mutationFn: async (data) => {
            return api.post('/agricultura/colheitas/', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['colheitas'] });
            showSuccess('Colheita registrada com sucesso');
            onSuccess();
            onClose();
        },
        onError: (error) => {
            const e = error;
            const data = e?.response?.data;
            if (data) {
                // try to set server-side validation errors as record
                if (typeof data === 'object') {
                    setErrors(data);
                }
                const getErrorMessage = (d) => {
                    if (typeof d === 'string')
                        return d;
                    if (typeof d === 'object' && d !== null) {
                        const r = d;
                        if (typeof r.detail === 'string')
                            return r.detail;
                    }
                    return 'Erro ao registrar colheita';
                };
                showError(getErrorMessage(data));
            }
            else {
                showError('Erro ao registrar colheita');
            }
        },
    });
    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field])
            setErrors((prev) => ({ ...prev, [field]: '' }));
    };
    const validateForm = () => {
        const newErrors = {};
        if (!formData.plantio)
            newErrors.plantio = 'Safra (plantio) é obrigatória';
        if (!formData.data_colheita)
            newErrors.data_colheita = 'Data é obrigatória';
        // if itens exist, their sum should provide quantidade, otherwise require quantidade_colhida explicitly
        const itensSum = (formData.itens || []).reduce((s, it) => s + (Number(it.quantidade_colhida) || 0), 0);
        if (!formData.quantidade_colhida && itensSum === 0)
            newErrors.quantidade_colhida = 'Quantidade é obrigatória';
        // Destination-specific validations
        if (formData.destino_tipo === 'armazenagem_interna' && !formData.local_destino) {
            newErrors.local_destino = 'Selecione o local de armazenamento';
        }
        if ((formData.destino_tipo === 'contrato_industria' || formData.destino_tipo === 'armazenagem_geral') && !formData.empresa_destino) {
            newErrors.empresa_destino = 'Selecione a empresa/prestador responsável';
        }
        if ((formData.destino_tipo === 'contrato_industria' || formData.destino_tipo === 'armazenagem_geral') && !formData.peso_estimado) {
            newErrors.peso_estimado = 'Informe o peso estimado (kg)';
        }
        // Per-talhão validation: if a talhão is selected, require quantidade_colhida for it
        (formData.itens || []).forEach((it) => {
            if (it.talhao && (it.quantidade_colhida === undefined || it.quantidade_colhida === '' || Number(it.quantidade_colhida) <= 0)) {
                newErrors[`itens_${it.talhao}`] = 'Informe a quantidade colhida para o talhão';
            }
        });
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            console.debug('[ColheitaForm] validation errors', newErrors);
            showError('Preencha os campos obrigatórios antes de enviar');
        }
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            console.debug('[ColheitaForm] validation failed', errors);
            return;
        }
        // If itens are provided, sum their quantities into quantidade_colhecida
        const itensPayload = (formData.itens || []).map((i) => ({ talhao: i.talhao, quantidade_colhida: i.quantidade_colhida }));
        const totalFromItens = itensPayload.reduce((s, it) => s + (Number(it.quantidade_colhida) || 0), 0);
        const payload = {
            plantio: formData.plantio,
            data_colheita: formData.data_colheita,
            quantidade_colhida: formData.quantidade_colhida || (totalFromItens || undefined),
            unidade: formData.unidade,
            qualidade: formData.qualidade,
            observacoes: formData.observacoes,
            itens: itensPayload,
            transportes: formData.transportes ? formData.transportes.map((t) => ({
                placa: t.placa,
                tara: t.tara,
                peso_bruto: t.peso_bruto,
                custo_transporte: t.custo_transporte
            })) : [],
            destino_tipo: formData.destino_tipo,
            local_tipo: formData.local_tipo || null,
            local_destino: formData.local_destino || null,
            empresa_destino: formData.empresa_destino || null,
            nf_provisoria: formData.nf_provisoria || null,
            peso_estimado: formData.peso_estimado || null
        };
        console.debug('[ColheitaForm] submitting payload:', payload);
        mutation.mutate(payload);
    };
    const firstTransporte = (formData.transportes && formData.transportes[0]) || {}; // kept for compatibility with TransportFields
    return (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Finalizar Talh\u00E3o" }), _jsx("button", { type: "button", className: "btn-close", onClick: onClose })] }), _jsxs("div", { className: "modal-body p-3 p-md-4", children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "plantio", className: "form-label", children: [_jsx("i", { className: "bi bi-flower1 me-2" }), "Safra (Plantio) ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { id: "plantio", "aria-label": "Safra (Plantio)", className: `form-select ${errors.plantio ? 'is-invalid' : ''}`, value: formData.plantio || '', onChange: (e) => {
                                    handleChange('plantio', Number(e.target.value) || undefined);
                                    // Reset itens when plantio changes
                                    setFormData((prev) => ({ ...prev, itens: [] }));
                                }, children: [_jsx("option", { value: "", children: "Selecione a safra" }), plantios.map((p) => (_jsx("option", { value: p.id, children: p.nome_safra || p.cultura_nome || `Safra ${p.cultura}` }, p.id)))] }), errors.plantio && _jsx("div", { className: "invalid-feedback d-block", children: errors.plantio })] }), talhoesInfo.length > 0 && (_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), "Talh\u00F5es colhidos"] }), _jsx("small", { className: "text-muted d-block mb-2", children: "Preencha a quantidade colhida por talh\u00E3o na unidade selecionada (kg, t, sacas 60kg). Este valor representa a quantidade colhida de produto, n\u00E3o a \u00E1rea (hectares)." }), _jsx("div", { className: "border rounded p-2", children: talhoesInfo.map((t) => {
                                    const existing = (formData.itens || []).find((i) => i.talhao === t.id) || { quantidade_colhida: '' };
                                    const isPreselect = !!preselectedTalhao && preselectedTalhao === t.id;
                                    return (_jsxs("div", { className: "d-flex align-items-center gap-3 mb-2", children: [_jsxs("div", { className: "form-check", children: [_jsx("input", { "aria-label": `selecionar-talhao-${t.id}`, className: "form-check-input", type: "checkbox", id: `talhao-${t.id}`, checked: (formData.itens || []).some((i) => i.talhao === t.id), onChange: (e) => {
                                                            if (isPreselect)
                                                                return; // prevent unchecking when preselected
                                                            if (e.target.checked) {
                                                                setFormData((prev) => ({ ...prev, itens: [...(prev.itens || []), { talhao: t.id, quantidade_colhida: '' }] }));
                                                            }
                                                            else {
                                                                setFormData((prev) => ({ ...prev, itens: (prev.itens || []).filter((i) => i.talhao !== t.id) }));
                                                            }
                                                        }, disabled: isPreselect }), _jsxs("label", { className: "form-check-label", htmlFor: `talhao-${t.id}`, children: [t.nome || t.name, " (", ((t.area_hectares || t.area_size || 0)).toFixed(2), " ha)"] })] }), (!isPreselect && (formData.itens || []).some((i) => i.talhao === t.id)) && (_jsxs("div", { style: { width: 220 }, children: [_jsx("input", { "aria-label": `quantidade-talhao-${t.id}`, placeholder: formData.unidade === 'kg' ? 'kg' : formData.unidade === 't' ? 't' : 'sacas (60kg)', type: "number", step: "0.01", className: `form-control ${errors[`itens_${t.id}`] ? 'is-invalid' : ''}`, value: existing.quantidade_colhida || '', onChange: (e) => {
                                                            const val = e.target.value;
                                                            setFormData((prev) => ({ ...prev, itens: (prev.itens || []).map((i) => i.talhao === t.id ? { ...i, quantidade_colhida: Number(val) } : i) }));
                                                        } }), errors[`itens_${t.id}`] && _jsx("div", { className: "invalid-feedback d-block", children: errors[`itens_${t.id}`] })] }))] }, t.id));
                                }) })] })), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-calendar-event me-2" }), "Data da Colheita ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { "aria-label": "Data da Colheita", type: "date", className: `form-control ${errors.data_colheita ? 'is-invalid' : ''}`, value: formData.data_colheita, onChange: (e) => handleChange('data_colheita', e.target.value) }), errors.data_colheita && _jsx("div", { className: "invalid-feedback d-block", children: errors.data_colheita })] }), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6 mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-box-seam me-2" }), "Quantidade Colhida ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { "aria-label": "Quantidade Colhida", type: "number", step: "0.01", className: `form-control ${errors.quantidade_colhida ? 'is-invalid' : ''}`, value: formData.quantidade_colhida ?? '', onChange: (e) => handleChange('quantidade_colhida', Number(e.target.value)) }), errors.quantidade_colhida && _jsx("div", { className: "invalid-feedback d-block", children: errors.quantidade_colhida })] }), _jsxs("div", { className: "col-12 col-md-6 mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-tag me-2" }), "Unidade"] }), _jsx("select", { "aria-label": "Unidade", className: "form-select", value: formData.unidade || 'kg', onChange: (e) => handleChange('unidade', e.target.value), children: Object.entries(UNIT_LABELS).map(([k, label]) => (_jsx("option", { value: k, children: label }, k))) })] })] }), !preselectedSessionItem && (_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Qualidade" }), _jsx("input", { className: "form-control", value: formData.qualidade || '', onChange: (e) => handleChange('qualidade', e.target.value) })] })), _jsx("hr", {}), !preselectedSessionItem && (_jsxs(_Fragment, { children: [_jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-truck me-2" }), "Transporte (opcional)"] }), _jsx("div", { children: _jsx(TransportFields, { value: firstTransporte, onChange: (v) => {
                                        const rest = (formData.transportes || []).slice(1);
                                        setFormData((prev) => ({ ...prev, transportes: [{ ...(prev.transportes && prev.transportes[0] ? prev.transportes[0] : {}), ...v }, ...rest] }));
                                    }, showMotorista: true, showDescontos: true, showCusto: true }) }), _jsx("hr", {})] })), _jsxs("h6", { className: "text-primary mb-3", children: [_jsx("i", { className: "bi bi-pin-map me-2" }), "Destino da produ\u00E7\u00E3o"] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Tipo de destino" }), _jsxs("select", { "aria-label": "Tipo de destino", className: "form-select", value: formData.destino_tipo, onChange: (e) => handleChange('destino_tipo', e.target.value), children: [_jsx("option", { value: "armazenagem_interna", children: "Armazenamento na propriedade" }), _jsx("option", { value: "contrato_industria", children: "Contrato direto com ind\u00FAstria" }), _jsx("option", { value: "armazenagem_geral", children: "Armaz\u00E9m geral (terceiro)" })] })] }), formData.destino_tipo === 'armazenagem_interna' && (_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Tipo de local" }), _jsxs("select", { "aria-label": "Tipo de local", className: "form-select", value: formData.local_tipo, onChange: (e) => handleChange('local_tipo', e.target.value), children: [_jsx("option", { value: "silo_bolsa", children: "Silo Bolsa" }), _jsx("option", { value: "armazem", children: "Armaz\u00E9m" })] }), _jsxs("label", { className: "form-label mt-2", children: ["Local de destino ", _jsx("span", { className: "text-danger", children: "*" })] }), locais.length === 0 ? (_jsx("select", { className: "form-select", disabled: true, children: _jsx("option", { children: "Nenhum local de armazenamento cadastrado" }) })) : (_jsxs("select", { "aria-label": "Local de destino", className: `form-select ${errors.local_destino ? 'is-invalid' : ''}`, value: formData.local_destino || '', onChange: (e) => handleChange('local_destino', Number(e.target.value)), children: [_jsx("option", { value: "", children: "Selecione um local" }), locais.map((l) => (_jsxs("option", { value: l.id, children: [l.nome, " (", l.tipo, ")"] }, l.id)))] })), errors.local_destino && _jsx("div", { className: "invalid-feedback d-block", children: errors.local_destino })] })), (formData.destino_tipo === 'contrato_industria' || formData.destino_tipo === 'armazenagem_geral') && (_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: ["Empresa/Prestador ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { "aria-label": "Empresa/Prestador", className: `form-select ${errors.empresa_destino ? 'is-invalid' : ''}`, value: formData.empresa_destino || '', onChange: (e) => handleChange('empresa_destino', Number(e.target.value)), children: [_jsx("option", { value: "", children: "Selecione uma empresa" }), empresas.map((emp) => (_jsx("option", { value: emp.id, children: emp.nome }, emp.id)))] }), _jsx("label", { className: "form-label mt-2", children: "NF provis\u00F3ria (opcional)" }), _jsx("input", { "aria-label": "NF provis\u00F3ria", className: "form-control", value: formData.nf_provisoria || '', onChange: (e) => handleChange('nf_provisoria', e.target.value) }), _jsxs("label", { className: "form-label mt-2", children: ["Peso estimado (kg) ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { "aria-label": "Peso estimado", type: "number", step: "0.01", className: `form-control ${errors.peso_estimado ? 'is-invalid' : ''}`, value: formData.peso_estimado ?? '', onChange: (e) => handleChange('peso_estimado', Number(e.target.value)) })] })), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-text-paragraph me-2" }), "Observa\u00E7\u00F5es"] }), _jsx("textarea", { className: "form-control", rows: 3, value: formData.observacoes || '', onChange: (e) => handleChange('observacoes', e.target.value) })] })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: onClose, children: "Cancelar" }), _jsx("button", { type: "submit", className: "btn btn-success", disabled: mutation.status === 'pending', children: mutation.status === 'pending' ? 'Enviando...' : (preselectedSessionItem ? 'Finalizar Talhão' : 'Registrar') })] })] }));
};
export default ColheitaForm;
