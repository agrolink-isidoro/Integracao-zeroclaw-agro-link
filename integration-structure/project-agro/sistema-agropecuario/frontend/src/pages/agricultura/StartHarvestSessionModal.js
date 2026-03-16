import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { t } from '../../i18n';
import { useToast } from '../../hooks/useToast';
const StartHarvestSessionModal = ({ plantioId, onClose, onSuccess }) => {
    const queryClient = useQueryClient();
    const toast = useToast();
    const [formState, setFormState] = useState({
        plantio: plantioId || undefined,
        data_inicio: new Date().toISOString().split('T')[0],
        data_prevista: undefined,
        observacoes: undefined,
        itens: [],
    });
    const { data: plantios = [] } = useQuery({
        queryKey: ['plantios'],
        queryFn: async () => {
            const r = await api.get('/agricultura/plantios/');
            return r.data;
        }
    });
    const mutation = useMutation({
        mutationFn: async (payload) => api.post('agricultura/harvest-sessions/', payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
            toast.showSuccess('Sessão de colheita iniciada');
            onSuccess();
            onClose();
        },
        onError: (err) => {
            const e = err;
            const data = e?.response?.data;
            let msg = 'Erro ao iniciar sessão';
            if (data) {
                if (typeof data === 'string')
                    msg = data;
                else {
                    const dataRecord = data;
                    if ('detail' in dataRecord && typeof dataRecord.detail === 'string') {
                        msg = dataRecord.detail;
                    }
                    else {
                        // extract first field error
                        const keys = Object.keys(dataRecord);
                        if (keys.length > 0) {
                            const firstKey = keys[0];
                            const val = dataRecord[firstKey];
                            if (Array.isArray(val))
                                msg = val.join('; ');
                            else
                                msg = String(val ?? firstKey);
                        }
                    }
                }
            }
            toast.showError(msg);
        }
    });
    const [formError, setFormError] = React.useState(null);
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Only include selected talhões as itens; quantities are not required at session start
        const itensPayload = (formState.itens || []).filter((it) => it.selected).map((it) => ({ talhao: it.talhao }));
        if (itensPayload.length === 0) {
            const errMsg = 'Selecione ao menos um talhão para iniciar a sessão';
            setFormError(errMsg);
            toast.showError(errMsg);
            return;
        }
        setFormError(null);
        const payload = {
            plantio: formState.plantio,
            data_inicio: formState.data_inicio,
            data_prevista: formState.data_prevista,
            observacoes: formState.observacoes,
            itens: itensPayload
        };
        mutation.mutate(payload);
    };
    return (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Iniciar Sess\u00E3o de Colheita" }), _jsx("button", { type: "button", className: "btn-close", onClick: onClose })] }), _jsxs("div", { className: "modal-body p-3 p-md-4", children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { htmlFor: "plantio", className: "form-label", children: "Safra (Plantio)" }), _jsxs("select", { id: "plantio", className: "form-select", value: formState.plantio || '', onChange: (e) => {
                                    const plantioVal = Number(e.target.value) || undefined;
                                    if (!plantioVal) {
                                        setFormState((s) => ({ ...s, plantio: undefined, itens: [] }));
                                        return;
                                    }
                                    const selected = plantios.find((p) => p.id === plantioVal);
                                    if (!selected) {
                                        setFormState((s) => ({ ...s, plantio: plantioVal, itens: [] }));
                                        return;
                                    }
                                    const talhoesList = (selected.talhoes_info && selected.talhoes_info.length > 0)
                                        ? selected.talhoes_info
                                        : (Array.isArray(selected.talhoes) ? selected.talhoes.map((id) => id) : []);
                                    const itens = talhoesList.map((t) => {
                                        if (typeof t === 'object') {
                                            const src = t;
                                            return {
                                                talhao: src.id ?? 'unknown',
                                                nome: src.nome ?? src.name ?? `Talhão ${src.id ?? '?'}`,
                                                selected: false
                                            };
                                        }
                                        return {
                                            talhao: t,
                                            nome: `Talhão ${t}`,
                                            selected: false
                                        };
                                    });
                                    setFormState((s) => ({ ...s, plantio: plantioVal, itens }));
                                }, children: [_jsx("option", { value: "", children: "Selecione a safra" }), plantios.map((p) => (_jsx("option", { value: p.id, children: p.nome_safra || p.cultura_nome || `Safra ${p.cultura}` }, p.id)))] })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { htmlFor: "data_inicio", className: "form-label", children: "Data de In\u00EDcio" }), _jsx("input", { id: "data_inicio", type: "date", className: "form-control", value: formState.data_inicio, onChange: (e) => setFormState((s) => ({ ...s, data_inicio: e.target.value })) })] }), formState.itens && formState.itens.length > 0 && (_jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "talhoes", className: "form-label", children: [t('startSession.selectTalhoesLabel'), " \u2014 ", _jsx("small", { className: "text-muted", children: t('startSession.selectTalhoesNote') }), _jsx("span", { "aria-label": "startsession-tooltip", title: t('startSession.tooltip'), className: "ms-2 text-info", style: { cursor: 'help' }, children: "\u2139\uFE0F" })] }), _jsx("div", { className: "form-text small text-muted mb-2", children: t('startSession.helperText') }), _jsx("div", { className: "border rounded p-2", children: formState.itens.map((it) => (_jsx("div", { className: "d-flex align-items-center gap-3 mb-2", children: _jsxs("div", { className: "form-check", children: [_jsx("input", { "aria-label": `selecionar-session-talhao-${it.talhao}`, className: "form-check-input", type: "checkbox", id: `session-talhao-${it.talhao}`, checked: !!it.selected, onChange: (e) => {
                                                    setFormState((s) => ({ ...s, itens: s.itens.map((x) => x.talhao === it.talhao ? { ...x, selected: e.target.checked } : x) }));
                                                } }), _jsxs("label", { className: "form-check-label", htmlFor: `session-talhao-${it.talhao}`, children: [_jsx("strong", { children: it.nome }), _jsxs("div", { className: "text-muted small", children: ["ID: ", it.talhao] })] })] }) }, it.talhao))) })] })), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { className: "form-control", rows: 3, value: formState.observacoes || '', onChange: (e) => setFormState((s) => ({ ...s, observacoes: e.target.value })) })] })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: onClose, disabled: Boolean(mutation.isLoading), children: "Cancelar" }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: Boolean(mutation.isLoading), "aria-disabled": Boolean(mutation.isLoading), children: mutation.isLoading ? 'Enviando...' : 'Iniciar Sessão' })] }), formError && _jsx("div", { className: "p-3", children: _jsx("div", { className: "alert alert-danger", role: "alert", children: formError }) })] }));
};
export default StartHarvestSessionModal;
