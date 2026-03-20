import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useToast } from '../../hooks/useToast';
const makeInitialState = (s) => ({
    _session_id: s.id,
    plantio: s.plantio,
    data_inicio: s.data_inicio,
    observacoes: s.observacoes,
    itens: (s.itens || []).map(i => ({ talhao: i.talhao, selected: true }))
});
const EditHarvestSessionModal = ({ session, onClose, onSuccess }) => {
    const queryClient = useQueryClient();
    const toast = useToast();
    const [formState, setFormState] = useState(() => makeInitialState(session));
    const mutation = useMutation({
        mutationFn: async (payload) => api.patch(`agricultura/harvest-sessions/${session.id}/`, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['harvest-sessions'] });
            toast.showSuccess('Sessão atualizada');
            onSuccess();
            onClose();
        },
        onError: (err) => {
            const e = err;
            const msg = e?.response?.data?.detail || 'Erro ao atualizar';
            toast.showError(msg);
        }
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        const itensPayload = (formState.itens || []).filter((it) => it.selected).map((it) => ({ talhao: it.talhao }));
        if (itensPayload.length === 0) {
            toast.showError('Selecione ao menos um talhão');
            return;
        }
        mutation.mutate({ plantio: formState.plantio, data_inicio: formState.data_inicio, observacoes: formState.observacoes, itens: itensPayload });
    };
    return (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: "Editar Sess\u00E3o de Colheita" }), _jsx("button", { type: "button", className: "btn-close", onClick: onClose })] }), _jsxs("div", { className: "modal-body p-3 p-md-4", children: [_jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Data de In\u00EDcio" }), _jsx("input", { type: "date", className: "form-control", value: formState.data_inicio, onChange: (e) => setFormState((s) => ({ ...s, data_inicio: e.target.value })) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { className: "form-control", rows: 3, value: formState.observacoes || '', onChange: (e) => setFormState((s) => ({ ...s, observacoes: e.target.value })) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("label", { className: "form-label", children: "Talh\u00F5es" }), _jsx("div", { className: "border rounded p-2", children: formState.itens && formState.itens.map((it) => (_jsxs("div", { className: "form-check mb-2", children: [_jsx("input", { type: "checkbox", className: "form-check-input", id: `edit-talhao-${it.talhao}`, checked: !!it.selected, onChange: (e) => setFormState((s) => ({ ...s, itens: s.itens.map((x) => x.talhao === it.talhao ? { ...x, selected: e.target.checked } : x) })) }), _jsxs("label", { className: "form-check-label", htmlFor: `edit-talhao-${it.talhao}`, children: ["Talh\u00E3o ", it.talhao] })] }, it.talhao))) })] })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { type: "button", className: "btn btn-outline-secondary", onClick: onClose, children: "Cancelar" }), _jsx("button", { type: "submit", className: "btn btn-primary", children: "Salvar" })] })] }));
};
export default EditHarvestSessionModal;
