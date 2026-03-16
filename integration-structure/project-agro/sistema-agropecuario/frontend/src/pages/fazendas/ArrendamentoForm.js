import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useApiCreate, useApiUpdate, useApiQuery } from '../../hooks/useApi';
import SelectDropdown from '../../components/common/SelectDropdown';
import DatePicker from '../../components/common/DatePicker';
import ErrorMessage from '../../components/common/ErrorMessage';
import LoadingSpinner from '../../components/common/LoadingSpinner';
const ArrendamentoForm = ({ arrendamento, onSuccess }) => {
    const [formData, setFormData] = useState({
        arrendador: 0,
        arrendatario: 0,
        fazenda: 0,
        areas: [],
        start_date: '',
        end_date: '',
        custo_sacas_hectare: ''
    });
    const [filteredAreas, setFilteredAreas] = useState([]);
    const [filteredFazendas, setFilteredFazendas] = useState([]);
    const validationRules = {
        arrendador: { required: true },
        arrendatario: { required: true },
        fazenda: { required: true },
        areas: { required: true, minLength: 1 },
        start_date: { required: true },
        custo_sacas_hectare: { required: true, min: 0.01 }
    };
    const { validate, validateSingle, getFieldError, clearErrors } = useFormValidation(validationRules);
    const [customErrors, setCustomErrors] = useState({});
    // Queries
    const { data: proprietarios = [], isLoading: loadingProprietarios } = useApiQuery(['proprietarios'], '/proprietarios/');
    const { data: fazendas = [], isLoading: loadingFazendas } = useApiQuery(['fazendas'], '/fazendas/');
    // Query áreas - API retorna GeoJSON FeatureCollection
    const { data: areasData, isLoading: loadingAreas } = useApiQuery(['areas'], '/areas/');
    // Extrair áreas do GeoJSON FeatureCollection
    const allAreasArray = (areasData?.features || []).map(feature => ({
        ...feature.properties,
        id: feature.id
    }));
    // Garantir que os dados sejam arrays
    const proprietariosArray = Array.isArray(proprietarios) ? proprietarios : [];
    const fazendasArray = Array.isArray(fazendas) ? fazendas : [];
    // Mutations
    const createMutation = useApiCreate('/arrendamentos/', [['arrendamentos']]);
    const updateMutation = useApiUpdate('/arrendamentos/', [['arrendamentos']]);
    useEffect(() => {
        if (arrendamento) {
            setFormData({
                arrendador: arrendamento.arrendador || 0,
                arrendatario: arrendamento.arrendatario || 0,
                fazenda: arrendamento.fazenda || 0,
                areas: arrendamento.areas || [],
                start_date: arrendamento.start_date || '',
                end_date: arrendamento.end_date || '',
                custo_sacas_hectare: arrendamento.custo_sacas_hectare?.toString() || ''
            });
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [arrendamento]);
    // Filtrar fazendas pelo arrendador selecionado
    useEffect(() => {
        if (formData.arrendador) {
            const fazendas = fazendasArray.filter(f => f.proprietario === formData.arrendador);
            setFilteredFazendas(fazendas);
            // Limpar fazenda selecionada se não pertencer ao arrendador
            if (formData.fazenda && !fazendas.some(f => f.id === formData.fazenda)) {
                // Mostrar alerta ao usuário
                if (arrendamento) {
                    alert('Atenção: Ao mudar o arrendador, você precisa selecionar uma nova fazenda e áreas que pertencem a ele.');
                }
                setFormData(prev => ({ ...prev, fazenda: 0, areas: [] }));
            }
        }
        else {
            setFilteredFazendas([]);
            setFormData(prev => ({ ...prev, fazenda: 0, areas: [] }));
        }
    }, [formData.arrendador, fazendasArray, formData.fazenda]);
    // Filtrar áreas pela fazenda selecionada
    useEffect(() => {
        if (formData.fazenda && areasData?.features) {
            const areas = allAreasArray.filter(area => area.fazenda === formData.fazenda);
            setFilteredAreas(areas);
            // Limpar áreas selecionadas se não pertencerem à fazenda
            if (formData.areas.length > 0) {
                const validAreas = formData.areas.filter(areaId => areas.some(a => a.id === areaId));
                if (validAreas.length !== formData.areas.length) {
                    setFormData(prev => ({ ...prev, areas: validAreas }));
                }
            }
        }
        else {
            setFilteredAreas([]);
        }
    }, [formData.fazenda, areasData, formData.areas]);
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        validateSingle(name, value);
    };
    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: Number(value) }));
        validateSingle(name, value);
        // Validações customizadas
        if (name === 'arrendatario' && Number(value) === formData.arrendador) {
            setCustomErrors({ arrendatario: 'Arrendatário não pode ser o mesmo que arrendador' });
        }
        else if (name === 'arrendador' && Number(value) === formData.arrendatario) {
            setCustomErrors({ arrendador: 'Arrendador não pode ser o mesmo que arrendatário' });
        }
        else {
            setCustomErrors({});
        }
    };
    const handleDateChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        validateSingle(name, value);
        // Validar datas
        if (name === 'start_date' && formData.end_date) {
            if (new Date(value) >= new Date(formData.end_date)) {
                setCustomErrors({ start_date: 'Data de início deve ser anterior à data de fim' });
            }
            else {
                setCustomErrors({});
            }
        }
        if (name === 'end_date' && formData.start_date) {
            if (new Date(value) <= new Date(formData.start_date)) {
                setCustomErrors({ end_date: 'Data de fim deve ser posterior à data de início' });
            }
            else {
                setCustomErrors({});
            }
        }
    };
    const handleAreasChange = (e) => {
        const options = e.target.options;
        const selectedAreas = [];
        for (let i = 0; i < options.length; i++) {
            if (options[i].selected) {
                selectedAreas.push(Number(options[i].value));
            }
        }
        setFormData(prev => ({ ...prev, areas: selectedAreas }));
        validateSingle('areas', selectedAreas);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        // Validações customizadas
        if (formData.arrendador === formData.arrendatario) {
            setCustomErrors({ arrendatario: 'Arrendador e arrendatário não podem ser a mesma pessoa' });
            return;
        }
        if (formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
            setCustomErrors({ start_date: 'Data de início deve ser anterior à data de fim' });
            return;
        }
        if (formData.areas.length === 0) {
            setCustomErrors({ areas: 'Selecione ao menos uma área' });
            return;
        }
        if (!validate(formData)) {
            return;
        }
        try {
            const submitData = {
                arrendador: formData.arrendador,
                arrendatario: formData.arrendatario,
                fazenda: formData.fazenda,
                areas: formData.areas,
                start_date: formData.start_date,
                end_date: formData.end_date || null,
                custo_sacas_hectare: parseFloat(formData.custo_sacas_hectare)
            };
            if (arrendamento) {
                await updateMutation.mutateAsync({ id: arrendamento.id, ...submitData });
            }
            else {
                await createMutation.mutateAsync(submitData);
            }
            onSuccess();
        }
        catch (error) {
            console.error('Erro ao salvar arrendamento:', error);
            // Mostrar erros de validação do backend
            if (error.response?.data) {
                const backendErrors = error.response.data;
                // Erros não relacionados a campos específicos
                if (backendErrors.non_field_errors) {
                    alert('Erro de validação:\n\n' + backendErrors.non_field_errors.join('\n'));
                }
                // Erros em campos específicos
                const fieldErrors = {};
                Object.keys(backendErrors).forEach(field => {
                    if (field !== 'non_field_errors') {
                        fieldErrors[field] = Array.isArray(backendErrors[field])
                            ? backendErrors[field].join('\n')
                            : backendErrors[field];
                    }
                });
                if (Object.keys(fieldErrors).length > 0) {
                    setCustomErrors(fieldErrors);
                }
            }
        }
    };
    const proprietarioOptions = proprietariosArray.map(p => ({
        value: p.id.toString(),
        label: `${p.nome} (${p.cpf_cnpj})`
    }));
    const fazendaOptions = filteredFazendas.map(f => ({
        value: f.id.toString(),
        label: `${f.name} (${f.matricula})`
    }));
    if (loadingProprietarios || loadingFazendas || loadingAreas) {
        return (_jsx("div", { className: "d-flex justify-content-center py-5", children: _jsx(LoadingSpinner, {}) }));
    }
    return (_jsx("form", { onSubmit: handleSubmit, children: _jsxs("div", { className: "card border-0 shadow-sm", children: [_jsx("div", { className: "card-body p-3 p-md-4", children: _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-person-badge me-2" }), "Arrendador (propriet\u00E1rio da terra) ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx(SelectDropdown, { value: formData.arrendador.toString(), onChange: (value) => handleSelectChange('arrendador', value), options: proprietarioOptions, placeholder: "Selecione o propriet\u00E1rio da terra", error: getFieldError('arrendador') || customErrors.arrendador }), _jsx("small", { className: "form-text text-muted", children: "Pessoa que \u00E9 dona da terra e vai ceder para uso" }), (getFieldError('arrendador') || customErrors.arrendador) && (_jsx("div", { className: "text-danger small mt-1", children: getFieldError('arrendador') || customErrors.arrendador }))] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-person-check me-2" }), "Arrendat\u00E1rio (produtor que usa/paga) ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx(SelectDropdown, { value: formData.arrendatario.toString(), onChange: (value) => handleSelectChange('arrendatario', value), options: proprietarioOptions, placeholder: "Selecione quem vai usar a terra", error: getFieldError('arrendatario') || customErrors.arrendatario }), _jsx("small", { className: "form-text text-muted", children: "Produtor rural que vai pagar para cultivar na terra" }), (getFieldError('arrendatario') || customErrors.arrendatario) && (_jsx("div", { className: "text-danger small mt-1", children: getFieldError('arrendatario') || customErrors.arrendatario }))] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-house-door me-2" }), "Fazenda (do arrendador) ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx(SelectDropdown, { value: formData.fazenda.toString(), onChange: (value) => handleSelectChange('fazenda', value), options: fazendaOptions, placeholder: formData.arrendador ? "Selecione a fazenda" : "Selecione o arrendador primeiro", error: getFieldError('fazenda') }), _jsx("small", { className: "form-text text-muted", children: formData.arrendador ? (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "Mostrando apenas fazendas do arrendador selecionado (", filteredFazendas.length, " dispon\u00EDvel", filteredFazendas.length !== 1 ? 'is' : '', ")"] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-exclamation-circle me-1" }), "Selecione primeiro o arrendador (propriet\u00E1rio da terra)"] })) }), getFieldError('fazenda') && (_jsx("div", { className: "text-danger small mt-1", children: getFieldError('fazenda') }))] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-map me-2" }), "\u00C1reas que ser\u00E3o arrendadas ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("select", { className: `form-select ${getFieldError('areas') || customErrors.areas ? 'is-invalid' : ''}`, multiple: true, size: 5, value: formData.areas.map(a => a.toString()), onChange: handleAreasChange, disabled: !formData.fazenda, children: filteredAreas.length === 0 ? (_jsx("option", { disabled: true, children: "Selecione uma fazenda primeiro" })) : (filteredAreas.map(area => (_jsxs("option", { value: area.id, children: [area.name, " (", area.area_hectares ? `${area.area_hectares} ha` : 'Área não calculada', ")"] }, area.id)))) }), (getFieldError('areas') || customErrors.areas) && (_jsx("div", { className: "invalid-feedback d-block", children: getFieldError('areas') || customErrors.areas })), _jsxs("small", { className: "form-text text-muted", children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "Segure Ctrl (Cmd no Mac) para selecionar m\u00FAltiplas \u00E1reas da fazenda"] })] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-calendar-event me-2" }), "Data de In\u00EDcio ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx(DatePicker, { value: formData.start_date, onChange: (value) => handleDateChange('start_date', value), error: getFieldError('start_date') || customErrors.start_date || undefined }), (getFieldError('start_date') || customErrors.start_date) && (_jsx("div", { className: "text-danger small mt-1", children: getFieldError('start_date') || customErrors.start_date }))] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-calendar-check me-2" }), "Data de Fim (opcional)"] }), _jsx(DatePicker, { value: formData.end_date, onChange: (value) => handleDateChange('end_date', value), error: getFieldError('end_date') || customErrors.end_date || undefined }), (getFieldError('end_date') || customErrors.end_date) && (_jsx("div", { className: "text-danger small mt-1", children: getFieldError('end_date') || customErrors.end_date }))] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "custo_sacas_hectare", className: "form-label", children: [_jsx("i", { className: "bi bi-cash-coin me-2" }), "Custo do Arrendamento (sacas/hectare) ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "number", step: "0.01", min: "0.01", className: `form-control ${getFieldError('custo_sacas_hectare') ? 'is-invalid' : ''}`, id: "custo_sacas_hectare", name: "custo_sacas_hectare", value: formData.custo_sacas_hectare, onChange: handleInputChange, placeholder: "Ex: 8.5" }), getFieldError('custo_sacas_hectare') && (_jsx("div", { className: "invalid-feedback", children: getFieldError('custo_sacas_hectare') })), _jsxs("small", { className: "form-text text-muted", children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "Valor que o ", _jsx("strong", { children: "arrendat\u00E1rio paga" }), " ao arrendador, em sacas de soja por hectare"] })] }), arrendamento?.custo_total_atual && (_jsx("div", { className: "col-12", children: _jsxs("div", { className: "alert alert-info mb-0", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), _jsx("strong", { children: "Custo Total Estimado:" }), " R$ ", arrendamento.custo_total_atual.toFixed(2), _jsx("br", {}), _jsx("small", { children: "Baseado na cota\u00E7\u00E3o mais recente da saca de soja" })] }) })), (createMutation.isError || updateMutation.isError) && (_jsx("div", { className: "col-12", children: _jsx(ErrorMessage, { message: createMutation.error?.message ||
                                        updateMutation.error?.message ||
                                        'Erro ao salvar arrendamento' }) }))] }) }), _jsx("div", { className: "card-footer bg-transparent border-top pt-3", children: _jsxs("div", { className: "d-flex justify-content-end gap-2", children: [_jsxs("button", { type: "button", onClick: onSuccess, className: "btn btn-secondary", disabled: createMutation.isPending || updateMutation.isPending, children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsx("button", { type: "submit", className: "btn btn-success", disabled: createMutation.isPending || updateMutation.isPending, children: createMutation.isPending || updateMutation.isPending ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2", role: "status", "aria-hidden": "true" }), "Salvando..."] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-check-circle me-2" }), arrendamento ? 'Atualizar' : 'Salvar'] })) })] }) })] }) }));
};
export default ArrendamentoForm;
