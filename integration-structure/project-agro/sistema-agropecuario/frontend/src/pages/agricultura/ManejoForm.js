import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { TalhoesMultiSelect } from '../../components/agricultura/TalhoesMultiSelect';
export const ManejoForm = ({ plantioId, manejo, onClose, onSuccess }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!manejo;
    const [formData, setFormData] = useState({
        plantio: plantioId || manejo?.plantio,
        tipo: manejo?.tipo || 'adubacao_base',
        data_manejo: manejo?.data_manejo || new Date().toISOString().split('T')[0],
        descricao: manejo?.descricao || '',
        equipamento: manejo?.equipamento || '',
        talhoes: manejo?.talhoes || [],
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
    // When a safra is selected via the dropdown we update formData directly in the select handler
    // (avoids calling setState synchronously in an effect which triggers lint warnings).
    const mutation = useMutation({
        mutationFn: async (data) => {
            if (isEditMode) {
                return api.put(`agricultura/manejos/${manejo.id}/`, data);
            }
            return api.post('agricultura/manejos/', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['manejos'] });
            onSuccess();
            onClose();
        },
        onError: (error) => {
            const e = error;
            if (e?.response?.data && typeof e.response.data === 'object') {
                setErrors(e.response.data);
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
        if (!formData.tipo)
            newErrors.tipo = 'Tipo de operação é obrigatório';
        if (!formData.data_manejo)
            newErrors.data_manejo = 'Data é obrigatória';
        if (!formData.talhoes || formData.talhoes.length === 0) {
            newErrors.talhoes = 'Selecione pelo menos um talhão';
        }
        if (!formData.descricao || formData.descricao.trim().length < 3) {
            newErrors.descricao = 'Descrição deve ter pelo menos 3 caracteres';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validateForm()) {
            mutation.mutate(formData);
        }
    };
    const tiposOperacao = [
        { value: 'preparo_solo', label: 'Preparo do Solo', grupo: 'Preparação' },
        { value: 'aracao', label: 'Aração', grupo: 'Preparação' },
        { value: 'gradagem', label: 'Gradagem', grupo: 'Preparação' },
        { value: 'subsolagem', label: 'Subsolagem', grupo: 'Preparação' },
        { value: 'correcao_solo', label: 'Correção do Solo', grupo: 'Preparação' },
        { value: 'calagem', label: 'Calagem', grupo: 'Preparação' },
        { value: 'adubacao_base', label: 'Adubação de Base', grupo: 'Adubação' },
        { value: 'adubacao_cobertura', label: 'Adubação de Cobertura', grupo: 'Adubação' },
        { value: 'adubacao_foliar', label: 'Adubação Foliar', grupo: 'Adubação' },
        { value: 'dessecacao', label: 'Dessecação', grupo: 'Plantio' },
        { value: 'plantio_direto', label: 'Plantio Direto', grupo: 'Plantio' },
        { value: 'plantio_convencional', label: 'Plantio Convencional', grupo: 'Plantio' },
        { value: 'irrigacao', label: 'Irrigação', grupo: 'Tratos' },
        { value: 'poda', label: 'Poda', grupo: 'Tratos' },
        { value: 'desbaste', label: 'Desbaste', grupo: 'Tratos' },
        { value: 'amontoa', label: 'Amontoa', grupo: 'Tratos' },
        { value: 'controle_pragas', label: 'Controle de Pragas', grupo: 'Fitossanitário' },
        { value: 'controle_doencas', label: 'Controle de Doenças', grupo: 'Fitossanitário' },
        { value: 'controle_plantas_daninhas', label: 'Controle de Plantas Daninhas', grupo: 'Fitossanitário' },
        { value: 'pulverizacao', label: 'Pulverização', grupo: 'Fitossanitário' },
        { value: 'aplicacao_herbicida', label: 'Aplicação de Herbicida', grupo: 'Fitossanitário' },
        { value: 'aplicacao_fungicida', label: 'Aplicação de Fungicida', grupo: 'Fitossanitário' },
        { value: 'aplicacao_inseticida', label: 'Aplicação de Inseticida', grupo: 'Fitossanitário' },
        { value: 'capina', label: 'Capina', grupo: 'Mecânica' },
        { value: 'rocada', label: 'Roçada', grupo: 'Mecânica' },
        { value: 'cultivo_mecanico', label: 'Cultivo Mecânico', grupo: 'Mecânica' },
        { value: 'outro', label: 'Outro', grupo: 'Outros' },
    ];
    return (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h5", { className: "modal-title", children: [_jsx("i", { className: "bi bi-tools me-2" }), isEditMode ? 'Editar Manejo' : 'Novo Manejo'] }), _jsx("button", { type: "button", className: "btn-close", onClick: onClose })] }), _jsxs("div", { className: "modal-body p-3 p-md-4", children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-flower1 me-2" }), "Safra (Opcional)"] }), _jsxs("select", { className: "form-select", value: safraId || '', onChange: (e) => {
                                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                                    setSafraId(value);
                                    if (!value) {
                                        setFormData(prev => ({ ...prev, plantio: undefined, talhoes: [] }));
                                        return;
                                    }
                                    const selected = safras.find(s => s.id === value);
                                    if (!selected) {
                                        setFormData(prev => ({ ...prev, plantio: value, talhoes: [] }));
                                        return;
                                    }
                                    setFormData(prev => ({ ...prev, plantio: selected.id, talhoes: selected.talhoes }));
                                }, children: [_jsx("option", { value: "", children: "Opera\u00E7\u00E3o avulsa (selecione talh\u00F5es manualmente)" }), safras.map((s) => (_jsx("option", { value: s.id, children: s.nome_safra || `${s.cultura_nome} - ${new Date(s.data_plantio).toLocaleDateString()}` }, s.id)))] }), _jsx("small", { className: "text-muted", children: safraId
                                    ? 'Talhões da safra pré-selecionados (pode ajustar abaixo)'
                                    : 'Deixe em branco para operação avulsa' })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-tag me-2" }), "Tipo de Opera\u00E7\u00E3o ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { className: `form-select ${errors.tipo ? 'is-invalid' : ''}`, value: formData.tipo, onChange: (e) => handleChange('tipo', e.target.value), required: true, children: [_jsx("option", { value: "", children: "Selecione o tipo" }), Object.entries(tiposOperacao.reduce((acc, tipo) => {
                                        if (!acc[tipo.grupo])
                                            acc[tipo.grupo] = [];
                                        acc[tipo.grupo].push(tipo);
                                        return acc;
                                    }, {})).map(([grupo, tipos]) => (_jsx("optgroup", { label: grupo, children: tipos.map(tipo => (_jsx("option", { value: tipo.value, children: tipo.label }, tipo.value))) }, grupo)))] }), errors.tipo && (_jsx("div", { className: "invalid-feedback", children: errors.tipo }))] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-calendar-event me-2" }), "Data do Manejo ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "date", className: `form-control ${errors.data_manejo ? 'is-invalid' : ''}`, value: formData.data_manejo, onChange: (e) => handleChange('data_manejo', e.target.value), required: true }), errors.data_manejo && (_jsx("div", { className: "invalid-feedback", children: errors.data_manejo }))] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), "Talh\u00F5es ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx(TalhoesMultiSelect, { talhoes: todosTalhoes, selectedIds: formData.talhoes || [], onChange: (ids) => {
                                    handleChange('talhoes', ids);
                                    if (errors.talhoes) {
                                        setErrors(prev => ({ ...prev, talhoes: '' }));
                                    }
                                } }), errors.talhoes && (_jsx("div", { className: "text-danger small mt-1", children: errors.talhoes })), errors.talhoes && (_jsx("div", { className: "text-danger small mt-1", children: errors.talhoes }))] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-text-paragraph me-2" }), "Descri\u00E7\u00E3o ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("textarea", { className: `form-control ${errors.descricao ? 'is-invalid' : ''}`, rows: 3, value: formData.descricao, onChange: (e) => handleChange('descricao', e.target.value), placeholder: "Detalhe o manejo realizado...", required: true }), errors.descricao && (_jsx("div", { className: "invalid-feedback", children: errors.descricao }))] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-wrench me-2" }), "Equipamento Utilizado"] }), _jsx("input", { type: "text", className: "form-control", value: formData.equipamento, onChange: (e) => handleChange('equipamento', e.target.value), placeholder: "Ex: Pulverizador Jacto, Trator John Deere..." })] })] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: onClose, children: "Cancelar" }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: mutation.isPending, children: mutation.isPending ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2" }), "Salvando..."] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-check-circle me-2" }), isEditMode ? 'Atualizar' : 'Adicionar Manejo'] })) })] })] }));
};
