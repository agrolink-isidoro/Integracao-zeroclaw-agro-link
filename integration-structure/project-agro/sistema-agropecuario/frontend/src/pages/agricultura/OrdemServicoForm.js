import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { TalhoesMultiSelect } from '../../components/agricultura/TalhoesMultiSelect';
export const OrdemServicoForm = ({ plantioId, ordemServico, onClose, onSuccess }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!ordemServico;
    const [formData, setFormData] = useState({
        talhoes: ordemServico?.talhoes || [],
        tarefa: ordemServico?.tarefa || '',
        tipo_manual: ordemServico?.tipo_manual || false,
        maquina: ordemServico?.maquina || '',
        data_inicio: ordemServico?.data_inicio
            ? new Date(ordemServico.data_inicio).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
        data_fim: ordemServico?.data_fim
            ? new Date(ordemServico.data_fim).toISOString().slice(0, 16)
            : undefined,
        status: ordemServico?.status || 'pendente',
    });
    const [safraId, setSafraId] = useState(plantioId);
    const [errors, setErrors] = useState({});
    // Buscar todas as safras (plantios) para seleção opcional
    const { data: safras = [] } = useQuery({
        queryKey: ['plantios'],
        queryFn: async () => {
            const response = await api.get('/agricultura/plantios/');
            return response.data?.results ?? response.data;
        },
    });
    // Buscar todos os talhões (serão agrupados por fazenda no componente)
    const { data: todosTalhoes = [] } = useQuery({
        queryKey: ['talhoes'],
        queryFn: async () => {
            const response = await api.get('/talhoes/');
            return response.data;
        },
    });
    // Buscar dados da safra selecionada (se houver)
    const { data: safra } = useQuery({
        queryKey: ['plantios', safraId],
        queryFn: async () => {
            const response = await api.get(`agricultura/plantios/${safraId}/`);
            return response.data;
        },
        enabled: !!safraId,
    });
    // Compute selected talhões without mutating state inside an effect
    const selectedTalhoes = React.useMemo(() => {
        if (Array.isArray(formData.talhoes) && formData.talhoes.length > 0)
            return formData.talhoes;
        return safra?.talhoes ?? [];
    }, [formData.talhoes, safra]);
    const mutation = useMutation({
        mutationFn: async (data) => {
            if (isEditMode) {
                return api.put(`agricultura/ordens-servico/${ordemServico.id}/`, data);
            }
            return api.post('agricultura/ordens-servico/', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
            onSuccess();
            onClose();
        },
        onError: (error) => {
            // Best-effort narrowing without using `any`
            if (typeof error === 'object' && error !== null) {
                const e = error;
                const resp = e.response;
                const data = resp?.data;
                if (data)
                    setErrors(data);
            }
        },
    });
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };
    const validateForm = () => {
        const newErrors = {};
        if (!formData.fazenda)
            newErrors.fazenda = 'Fazenda é obrigatória';
        if (!formData.tarefa || formData.tarefa.trim().length < 3) {
            newErrors.tarefa = 'Tarefa deve ter pelo menos 3 caracteres';
        }
        if (!formData.talhoes || formData.talhoes.length === 0) {
            newErrors.talhoes = 'Selecione pelo menos um talhão';
        }
        if (!formData.data_inicio)
            newErrors.data_inicio = 'Data de início é obrigatória';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validateForm()) {
            mutation.mutate(formData);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title", children: [_jsx("i", { className: "bi bi-clipboard-check me-2" }), isEditMode ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'] }), _jsx("button", { type: "button", className: "btn-close", onClick: onClose })] }), _jsxs("div", { className: "modal-body p-3 p-md-4", children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-flower1 me-2" }), "Safra (Opcional)"] }), _jsxs("select", { className: "form-select", value: safraId || '', onChange: (e) => {
                                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                                    setSafraId(value);
                                }, children: [_jsx("option", { value: "", children: "Ordem de servi\u00E7o avulsa (selecione talh\u00F5es manualmente)" }), safras.map((s) => (_jsx("option", { value: s.id, children: s.nome_safra || `${s.cultura_nome} - ${new Date(s.data_plantio).toLocaleDateString()}` }, s.id)))] }), _jsx("small", { className: "text-muted", children: safraId
                                    ? 'Talhões da safra pré-selecionados (pode ajustar abaixo)'
                                    : 'Deixe em branco para OS avulsa' })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-list-task me-2" }), "Tarefa ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "text", className: `form-control ${errors.tarefa ? 'is-invalid' : ''}`, value: formData.tarefa, onChange: (e) => handleChange('tarefa', e.target.value), placeholder: "Ex: Pulveriza\u00E7\u00E3o preventiva, Preparo do solo...", required: true }), errors.tarefa && (_jsx("div", { className: "invalid-feedback", children: errors.tarefa }))] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), "Talh\u00F5es ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx(TalhoesMultiSelect, { talhoes: todosTalhoes, selectedIds: selectedTalhoes, onChange: (ids) => {
                                    handleChange('talhoes', ids);
                                    if (errors.talhoes) {
                                        setErrors(prev => ({ ...prev, talhoes: '' }));
                                    }
                                } }), errors.talhoes && (_jsx("div", { className: "invalid-feedback d-block", children: errors.talhoes }))] }), _jsx("div", { className: "row", children: _jsx("div", { className: "col-md-12 mb-3", children: _jsxs("div", { className: "form-check", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: "tipo-manual", checked: formData.tipo_manual, onChange: (e) => handleChange('tipo_manual', e.target.checked) }), _jsx("label", { className: "form-check-label", htmlFor: "tipo-manual", children: "Opera\u00E7\u00E3o Manual (sem uso de m\u00E1quinas)" })] }) }) }), !formData.tipo_manual && (_jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "maquina", className: "form-label", children: [_jsx("i", { className: "bi bi-wrench me-2" }), "M\u00E1quina/Equipamento"] }), _jsx("input", { id: "maquina", type: "text", className: "form-control", value: formData.maquina, onChange: (e) => handleChange('maquina', e.target.value), placeholder: "Ex: Trator John Deere 7515, Pulverizador Jacto..." })] })), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12 col-md-6 mb-3", children: [_jsxs("label", { htmlFor: "data_inicio", className: "form-label", children: [_jsx("i", { className: "bi bi-calendar-event me-2" }), "Data/Hora In\u00EDcio ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { id: "data_inicio", type: "datetime-local", className: `form-control ${errors.data_inicio ? 'is-invalid' : ''}`, value: formData.data_inicio, onChange: (e) => handleChange('data_inicio', e.target.value), required: true }), errors.data_inicio && (_jsx("div", { className: "invalid-feedback", children: errors.data_inicio }))] }), _jsxs("div", { className: "col-12 col-md-6 mb-3", children: [_jsxs("label", { htmlFor: "data_fim", className: "form-label", children: [_jsx("i", { className: "bi bi-calendar-check me-2" }), "Data/Hora Fim (opcional)"] }), _jsx("input", { id: "data_fim", type: "datetime-local", className: "form-control", value: formData.data_fim || '', onChange: (e) => handleChange('data_fim', e.target.value || undefined) })] })] }), _jsx("div", { className: "row g-2 g-md-3", children: _jsxs("div", { className: "col-12 col-md-6 mb-3", children: [_jsxs("label", { htmlFor: "status", className: "form-label", children: [_jsx("i", { className: "bi bi-flag me-2" }), "Status"] }), _jsxs("select", { id: "status", className: "form-select", value: formData.status, onChange: (e) => handleChange('status', e.target.value), children: [_jsx("option", { value: "pendente", children: "Pendente" }), _jsx("option", { value: "aprovada", children: "Aprovada" }), _jsx("option", { value: "ativa", children: "Ativa" }), _jsx("option", { value: "finalizada", children: "Finalizada" })] })] }) })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: onClose, children: "Cancelar" }), _jsx("button", { type: "submit", className: "btn btn-warning", disabled: mutation.isPending, children: mutation.isPending ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2" }), "Salvando..."] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-check-circle me-2" }), isEditMode ? 'Atualizar' : 'Criar Ordem de Serviço'] })) })] })] }));
};
