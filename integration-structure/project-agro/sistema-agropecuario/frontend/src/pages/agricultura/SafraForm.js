import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import SelectFK from '../../components/common/SelectFK';
export const SafraForm = ({ plantio, onClose, onSuccess }) => {
    const queryClient = useQueryClient();
    const isEditMode = !!plantio;
    const [formData, setFormData] = useState({
        fazenda: plantio?.fazenda || undefined,
        cultura: plantio?.cultura || undefined,
        data_plantio: plantio?.data_plantio || new Date().toISOString().split('T')[0],
        observacoes: plantio?.observacoes || '',
        status: plantio?.status || 'planejado',
    });
    // Separate state for talhão + variedade pairs (write field)
    const [talhoesList, setTalhoesList] = useState(() => {
        if (plantio?.talhoes_info && plantio.talhoes_info.length > 0) {
            return plantio.talhoes_info.map(ti => ({ talhao: ti.id, variedade: ti.variedade || '' }));
        }
        if (plantio?.talhoes) {
            return plantio.talhoes.map(id => ({ talhao: id, variedade: '' }));
        }
        return [];
    });
    const [errors, setErrors] = useState({});
    // Sync form data when editing an existing plantio (safra) prop changes
    React.useEffect(() => {
        if (plantio) {
            setFormData({
                fazenda: plantio.fazenda || undefined,
                cultura: plantio.cultura || undefined,
                data_plantio: plantio.data_plantio || new Date().toISOString().split('T')[0],
                observacoes: plantio.observacoes || '',
                status: plantio.status || 'planejado',
            });
            if (plantio.talhoes_info && plantio.talhoes_info.length > 0) {
                setTalhoesList(plantio.talhoes_info.map(ti => ({ talhao: ti.id, variedade: ti.variedade || '' })));
            }
            else if (plantio.talhoes) {
                setTalhoesList(plantio.talhoes.map(id => ({ talhao: id, variedade: '' })));
            }
            setErrors({});
        }
    }, [plantio]);
    // Buscar culturas
    const { data: culturas = [] } = useQuery({
        queryKey: ['culturas'],
        queryFn: async () => {
            const response = await api.get('/agricultura/culturas/');
            return response.data;
        },
    });
    // Variedades disponíveis para a cultura selecionada
    const variedadesOpcoes = React.useMemo(() => {
        const cultura = culturas.find(c => c.id === formData.cultura);
        if (!cultura?.variedades)
            return [];
        return cultura.variedades.split(',').map(v => v.trim()).filter(Boolean);
    }, [culturas, formData.cultura]);
    // Buscar talhões da fazenda
    const { data: talhoes = [] } = useQuery({
        queryKey: ['talhoes', formData.fazenda],
        queryFn: async () => {
            const response = await api.get('/talhoes/', {
                params: { fazenda: formData.fazenda }
            });
            return response.data;
        },
        enabled: !!formData.fazenda,
    });
    // Mutation para criar/editar
    const mutation = useMutation({
        mutationFn: async () => {
            const payload = {
                ...formData,
                talhoes_variedades: talhoesList.map(tv => ({
                    talhao: tv.talhao,
                    variedade: tv.variedade || '',
                })),
            };
            if (isEditMode) {
                return api.put(`/agricultura/plantios/${plantio.id}/`, payload);
            }
            return api.post('/agricultura/plantios/', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['plantios'] });
            onSuccess();
            onClose();
        },
        onError: (error) => {
            const err = error;
            if (err?.response?.data) {
                setErrors(err.response.data);
            }
        },
    });
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };
    const handleTalhaoToggle = (talhaoId, checked) => {
        if (checked) {
            setTalhoesList(prev => [...prev, { talhao: talhaoId, variedade: '' }]);
        }
        else {
            setTalhoesList(prev => prev.filter(tv => tv.talhao !== talhaoId));
        }
        if (errors.talhoes_variedades) {
            setErrors(prev => ({ ...prev, talhoes_variedades: '' }));
        }
    };
    const handleVariedadeChange = (talhaoId, variedade) => {
        setTalhoesList(prev => prev.map(tv => tv.talhao === talhaoId ? { ...tv, variedade } : tv));
    };
    const validateForm = () => {
        const newErrors = {};
        if (!formData.fazenda)
            newErrors.fazenda = 'Fazenda é obrigatória';
        if (!formData.cultura)
            newErrors.cultura = 'Cultura é obrigatória';
        if (talhoesList.length === 0) {
            newErrors.talhoes_variedades = 'Selecione pelo menos um talhão';
        }
        if (!formData.data_plantio)
            newErrors.data_plantio = 'Data do plantio é obrigatória';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (validateForm()) {
            mutation.mutate();
        }
    };
    const selectedTalhaoIds = talhoesList.map(tv => tv.talhao);
    const areaTotalSelecionada = talhoes
        .filter((t) => selectedTalhaoIds.includes(t.id))
        .reduce((sum, t) => sum + (t.area_hectares || t.area_size || 0), 0);
    return (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "modal-header", children: [_jsx("h5", { className: "modal-title", children: isEditMode ? 'Editar Safra' : 'Nova Safra' }), _jsx("button", { type: "button", className: "btn-close", onClick: onClose })] }), _jsxs("div", { className: "modal-body p-3 p-md-4", children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-building me-2" }), "Fazenda ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx(SelectFK, { endpoint: "/fazendas/", value: formData.fazenda, onChange: (value) => {
                                    handleChange('fazenda', typeof value === 'string' ? parseInt(value) : value);
                                    setTalhoesList([]); // Limpar talhões ao mudar fazenda
                                }, labelKey: "name", placeholder: "Selecione a fazenda" }), errors.fazenda && (_jsx("div", { className: "invalid-feedback d-block", children: errors.fazenda }))] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-flower1 me-2" }), "Cultura ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsxs("select", { className: `form-select ${errors.cultura ? 'is-invalid' : ''}`, value: formData.cultura || '', onChange: (e) => {
                                    handleChange('cultura', parseInt(e.target.value));
                                    // Reset variedades dos talhões ao trocar cultura
                                    setTalhoesList(prev => prev.map(tv => ({ ...tv, variedade: '' })));
                                }, required: true, children: [_jsx("option", { value: "", children: "Selecione a cultura" }), culturas.map((cultura) => (_jsxs("option", { value: cultura.id, children: [cultura.nome, " ", cultura.ciclo_dias ? `(${cultura.ciclo_dias} dias)` : ''] }, cultura.id)))] }), errors.cultura && (_jsx("div", { className: "invalid-feedback", children: errors.cultura }))] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), "Talh\u00F5es ", _jsx("span", { className: "text-danger", children: "*" })] }), !formData.fazenda ? (_jsx("div", { className: "alert alert-info py-2", children: "Selecione uma fazenda primeiro" })) : talhoes.length === 0 ? (_jsx("div", { className: "alert alert-warning py-2", children: "Nenhum talh\u00E3o cadastrado nesta fazenda" })) : (_jsx("div", { className: "border rounded p-3", style: { maxHeight: '200px', overflowY: 'auto' }, children: talhoes.map((talhao) => (_jsxs("div", { className: "form-check", children: [_jsx("input", { className: "form-check-input", type: "checkbox", id: `talhao-${talhao.id}`, checked: selectedTalhaoIds.includes(talhao.id), onChange: (e) => handleTalhaoToggle(talhao.id, e.target.checked) }), _jsxs("label", { className: "form-check-label", htmlFor: `talhao-${talhao.id}`, children: [_jsx("strong", { children: talhao.name }), ' ', "(", (talhao.area_hectares || talhao.area_size || talhao.area || 0).toFixed(2), " ha)"] })] }, talhao.id))) })), errors.talhoes_variedades && (_jsx("div", { className: "invalid-feedback d-block", children: errors.talhoes_variedades }))] }), talhoesList.length > 0 && (_jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-tags me-2" }), "Variedade por Talh\u00E3o", _jsx("small", { className: "text-muted ms-2", children: "(opcional)" })] }), _jsxs("div", { className: "border rounded p-3", children: [talhoesList.map((tv) => {
                                        const talhaoObj = talhoes.find(t => t.id === tv.talhao);
                                        return (_jsxs("div", { className: "row align-items-center mb-2", children: [_jsx("div", { className: "col-5", children: _jsx("small", { className: "fw-semibold text-secondary", children: talhaoObj?.name || `Talhão #${tv.talhao}` }) }), _jsx("div", { className: "col-7", children: variedadesOpcoes.length > 0 ? (_jsxs("select", { className: "form-select form-select-sm", value: tv.variedade, onChange: (e) => handleVariedadeChange(tv.talhao, e.target.value), children: [_jsx("option", { value: "", children: "\u2014 Sem variedade \u2014" }), variedadesOpcoes.map(v => (_jsx("option", { value: v, children: v }, v)))] })) : (_jsx("input", { type: "text", className: "form-control form-control-sm", placeholder: "Ex: M6210", value: tv.variedade, onChange: (e) => handleVariedadeChange(tv.talhao, e.target.value) })) })] }, tv.talhao));
                                    }), _jsxs("div", { className: "mt-2 text-muted small border-top pt-2", children: [_jsx("i", { className: "bi bi-rulers me-1" }), _jsx("strong", { children: "\u00C1rea total:" }), " ", areaTotalSelecionada.toFixed(2), " ha em ", talhoesList.length, " talh\u00E3o(\u00F5es)"] })] })] })), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-calendar-event me-2" }), "Data do Plantio ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "date", className: `form-control ${errors.data_plantio ? 'is-invalid' : ''}`, value: formData.data_plantio, onChange: (e) => handleChange('data_plantio', e.target.value), required: true }), errors.data_plantio && (_jsx("div", { className: "invalid-feedback", children: errors.data_plantio }))] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-flag me-2" }), "Status"] }), _jsxs("select", { className: "form-select", value: formData.status, onChange: (e) => handleChange('status', e.target.value), children: [_jsx("option", { value: "planejado", children: "Planejado" }), _jsx("option", { value: "em_andamento", children: "Em Andamento" }), _jsx("option", { value: "colhido", children: "Colhido" }), _jsx("option", { value: "perdido", children: "Perdido" })] })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-text-paragraph me-2" }), "Observa\u00E7\u00F5es"] }), _jsx("textarea", { className: "form-control", rows: 3, value: formData.observacoes, onChange: (e) => handleChange('observacoes', e.target.value), placeholder: "Informa\u00E7\u00F5es adicionais sobre o plantio..." })] }), formData.cultura && talhoesList.length > 0 && (_jsxs("div", { className: "alert alert-success py-2", children: [_jsx("strong", { children: "Preview:" }), ' ', "Safra ", culturas.find(c => c.id === formData.cultura)?.nome, " \u2014", ' ', areaTotalSelecionada.toFixed(2), " ha em ", talhoesList.length, " talh\u00E3o(\u00F5es)", talhoesList.some(tv => tv.variedade) && (_jsx("div", { className: "mt-1", children: talhoesList.filter(tv => tv.variedade).map(tv => {
                                    const t = talhoes.find(x => x.id === tv.talhao);
                                    return (_jsxs("span", { className: "badge bg-success me-1", children: [t?.name, ": ", tv.variedade] }, tv.talhao));
                                }) }))] }))] }), _jsxs("div", { className: "modal-footer", children: [_jsx("button", { type: "button", className: "btn btn-secondary", onClick: onClose, children: "Cancelar" }), _jsx("button", { type: "submit", className: "btn btn-primary", disabled: mutation.isPending, children: mutation.isPending ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2" }), "Salvando..."] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-check-circle me-2" }), isEditMode ? 'Atualizar' : 'Criar Safra'] })) })] })] }));
};
