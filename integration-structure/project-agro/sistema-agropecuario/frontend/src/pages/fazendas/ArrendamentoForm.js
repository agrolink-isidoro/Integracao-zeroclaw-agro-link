import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
        talhoes: [],
        start_date: '',
        end_date: '',
        custo_sacas_hectare: ''
    });
    const [customErrors, setCustomErrors] = useState({});
    const [invalidTalhoesWarning, setInvalidTalhoesWarning] = useState('');
    const validationRules = {
        arrendador: { required: true },
        arrendatario: { required: true },
        fazenda: { required: true },
        talhoes: { required: true, minLength: 1 },
        start_date: { required: true },
        custo_sacas_hectare: { required: true, min: 0.01 }
    };
    const { validate, validateSingle, getFieldError, clearErrors } = useFormValidation(validationRules);
    // Queries
    const { data: proprietarios = [] } = useApiQuery(['proprietarios'], '/proprietarios/');
    const { data: fazendas = [] } = useApiQuery(['fazendas'], '/fazendas/');
    const { data: talhoes = [] } = useApiQuery(['talhoes'], '/talhoes/');
    // Garantir arrays
    const proprietariosArray = Array.isArray(proprietarios) ? proprietarios : [];
    const fazendasArray = Array.isArray(fazendas) ? fazendas : [];
    const talhoesArray = Array.isArray(talhoes) ? talhoes : [];
    // Debug: Monitorar carregamento de fazendas e áreas
    useEffect(() => {
        if (fazendasArray.length > 0) {
            console.log('Fazendas carregadas:', fazendasArray.map(f => ({
                id: f.id,
                name: f.name,
                areas_count: Array.isArray(f.areas) ? f.areas.length : 0,
                areas: f.areas
            })));
        }
    }, [fazendasArray]);
    // Re-validar talhões quando fazendas são carregadas (em caso de race condition)
    useEffect(() => {
        if (formData.fazenda && formData.talhoes.length > 0 && fazendasArray.length > 0) {
            const fazenda = fazendasArray.find(f => f.id === formData.fazenda);
            if (fazenda && fazenda.areas_ids) {
                const fazendasAreaIds = fazenda.areas_ids;
                const invalidTalhoes = formData.talhoes.filter(id => !fazendasAreaIds.includes(id));
                if (invalidTalhoes.length > 0) {
                    const msg = `⚠️ Detectados ${invalidTalhoes.length} talhão(ões) que não pertencem à fazenda selecionada. Foram removidos automaticamente.`;
                    setInvalidTalhoesWarning(msg);
                    console.warn(msg);
                    setFormData(prev => ({ ...prev, talhoes: [] }));
                }
                else {
                    setInvalidTalhoesWarning('');
                }
            }
        }
    }, [fazendasArray, formData.fazenda]);
    // Mutations
    const createMutation = useApiCreate('/arrendamentos/', [['arrendamentos']]);
    const updateMutation = useApiUpdate('/arrendamentos/', [['arrendamentos']]);
    // Inicializar form data quando arrendamento muda
    useEffect(() => {
        if (arrendamento) {
            const fazendaId = arrendamento.fazenda || 0;
            const areaIds = arrendamento.areas || [];
            // Validação: Verificar se as áreas carregadas pertencem à fazenda
            const fazenda = fazendasArray.find(f => f.id === fazendaId);
            let validTalhoes = areaIds;
            if (fazenda && fazenda.areas_ids) {
                const fazendasAreaIds = fazenda.areas_ids;
                const invalidTalhoes = areaIds.filter(id => !fazendasAreaIds.includes(id));
                if (invalidTalhoes.length > 0) {
                    const msg = `⚠️ Detectados ${invalidTalhoes.length} talhão(ões) que não pertencem à fazenda selecionada. Foram removidos automaticamente.`;
                    setInvalidTalhoesWarning(msg);
                    console.warn(msg);
                    validTalhoes = areaIds.filter(id => fazendasAreaIds.includes(id));
                }
                else {
                    setInvalidTalhoesWarning('');
                }
            }
            setFormData({
                arrendador: arrendamento.arrendador || 0,
                arrendatario: arrendamento.arrendatario || 0,
                fazenda: fazendaId,
                talhoes: validTalhoes,
                start_date: arrendamento.start_date || '',
                end_date: arrendamento.end_date || '',
                custo_sacas_hectare: arrendamento.custo_sacas_hectare?.toString() || ''
            });
            clearErrors();
        }
    }, [arrendamento, fazendasArray, clearErrors]);
    // Filtrar fazendas - usando useMemo para evitar re-renders desnecessários
    const filteredFazendas = useMemo(() => {
        if (!formData.arrendador)
            return [];
        return fazendasArray.filter(f => f.proprietario === formData.arrendador);
    }, [formData.arrendador, fazendasArray]);
    // Filtrar talhões - usando useMemo para evitar re-renders desnecessários
    const filteredTalhoes = useMemo(() => {
        if (!formData.fazenda)
            return [];
        // Buscar a fazenda selecionada
        const fazenda = fazendasArray.find(f => f.id === formData.fazenda);
        if (!fazenda)
            return [];
        // Obter IDs de todas as áreas que pertencem à fazenda
        // O backend retorna areas_ids como um array simples de IDs para facilitar filtragem
        const areaIds = fazenda.areas_ids || [];
        // Rastreamento: Talhão → area_id → Área (que pertence à Fazenda)
        // Filtrar apenas talhões que tem area_id válido vinculado à fazenda
        if (areaIds.length > 0) {
            return talhoesArray.filter(t => areaIds.includes(t.area_id));
        }
        // Se não há áreas carregadas, tentar fallback por fazenda_id se existir
        // Alguns APIs retornam fazenda_id diretamente no Talhão
        const hasDirectFazendaId = talhoesArray.length > 0 && 'fazenda_id' in talhoesArray[0];
        if (hasDirectFazendaId) {
            console.info(`Fallback: filtrando talhões por fazenda_id (áreas não carregadas para fazenda ${formData.fazenda})`);
            return talhoesArray.filter(t => t.fazenda_id === formData.fazenda);
        }
        // Se não conseguimos rastrear a relação, não mostrar talhões para evitar dados inválidos
        console.warn(`Aviso: Não foi possível filtrar talhões para fazenda ${formData.fazenda}. Áreas não carregadas ([${areaIds}]) e talhões não têm fazenda_id.`);
        return [];
    }, [formData.fazenda, fazendasArray, talhoesArray]);
    // Callback para mudar fazenda - limpa talhões se necessário
    const handleFazendaChange = useCallback((value) => {
        const newFazendaId = Number(value);
        setFormData(prev => ({
            ...prev,
            fazenda: newFazendaId,
            talhoes: [] // Limpar talhões ao mudar fazenda
        }));
        validateSingle('fazenda', value);
    }, [validateSingle]);
    // Callback para mudar arrendador - limpa fazenda e talhões
    const handleArrendadorChange = useCallback((value) => {
        const arrendadorId = Number(value);
        setFormData(prev => ({
            ...prev,
            arrendador: arrendadorId,
            fazenda: 0,
            talhoes: []
        }));
        validateSingle('arrendador', value);
        // Validação customizada
        if (arrendadorId === formData.arrendatario) {
            setCustomErrors({ arrendador: 'Arrendador não pode ser o mesmo que arrendatário' });
        }
        else {
            setCustomErrors({});
        }
    }, [formData.arrendatario, validateSingle]);
    // Callback para mudar arrendatário
    const handleArrendatarioChange = useCallback((value) => {
        const arrendatarioId = Number(value);
        setFormData(prev => ({ ...prev, arrendatario: arrendatarioId }));
        validateSingle('arrendatario', value);
        // Validação customizada
        if (arrendatarioId === formData.arrendador) {
            setCustomErrors({ arrendatario: 'Arrendatário não pode ser o mesmo que arrendador' });
        }
        else {
            setCustomErrors({});
        }
    }, [formData.arrendador, validateSingle]);
    // Callback para mudar talhões
    const handleTalhoesChange = useCallback((e) => {
        const options = e.target.options;
        const selectedTalhoes = [];
        for (let i = 0; i < options.length; i++) {
            if (options[i].selected) {
                selectedTalhoes.push(Number(options[i].value));
            }
        }
        setFormData(prev => ({ ...prev, talhoes: selectedTalhoes }));
        validateSingle('talhoes', selectedTalhoes);
    }, [validateSingle]);
    // Callback para mudar input
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        validateSingle(name, value);
    }, [validateSingle]);
    // Callback para mudar data
    const handleDateChange = useCallback((name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        validateSingle(name, value);
        // Validar datas
        if (name === 'start_date' && formData.end_date) {
            if (new Date(value) >= new Date(formData.end_date)) {
                setCustomErrors(prev => ({ ...prev, start_date: 'Data de início deve ser anterior à data de fim' }));
            }
            else {
                setCustomErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.start_date;
                    return newErrors;
                });
            }
        }
        if (name === 'end_date' && formData.start_date) {
            if (new Date(value) <= new Date(formData.start_date)) {
                setCustomErrors(prev => ({ ...prev, end_date: 'Data de fim deve ser posterior à data de início' }));
            }
            else {
                setCustomErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.end_date;
                    return newErrors;
                });
            }
        }
    }, [formData.end_date, formData.start_date, validateSingle]);
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
        if (formData.talhoes.length === 0) {
            setCustomErrors({ talhoes: 'Selecione ao menos um talhão' });
            return;
        }
        if (!validate(formData)) {
            return;
        }
        try {
            // Converter Talhão IDs para Area IDs
            const areaIds = formData.talhoes.map(talhaoId => {
                const talhao = talhoesArray.find(t => t.id === talhaoId);
                return talhao ? talhao.area_id : null;
            }).filter(id => id !== null);
            // Debug: Log dos dados antes de enviar
            const submitData = {
                arrendador: formData.arrendador,
                arrendatario: formData.arrendatario,
                fazenda: formData.fazenda,
                areas: areaIds, // Agora é Array de Area IDs, não Talhão IDs
                start_date: formData.start_date,
                end_date: formData.end_date || null,
                custo_sacas_hectare: parseFloat(formData.custo_sacas_hectare)
            };
            console.log('Antes de enviar:', {
                fazenda_id: formData.fazenda,
                talhao_ids: formData.talhoes,
                area_ids: areaIds,
                talhao_detalhes: formData.talhoes.map(id => {
                    const t = talhoesArray.find(t => t.id === id);
                    return t ? `${t.name} (area_id: ${t.area_id})` : `ID ${id} não encontrado`;
                })
            });
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
            if (error.response?.data) {
                const backendErrors = error.response.data;
                if (backendErrors.non_field_errors) {
                    alert('Erro de validação:\n\n' + backendErrors.non_field_errors.join('\n'));
                }
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
    const proprietarioOptions = useMemo(() => proprietariosArray.map(p => ({
        value: p.id.toString(),
        label: `${p.nome} (${p.cpf_cnpj})`
    })), [proprietariosArray]);
    const fazendaOptions = useMemo(() => filteredFazendas.map(f => ({
        value: f.id.toString(),
        label: `${f.name} (${f.matricula})`
    })), [filteredFazendas]);
    const talhoesOptions = useMemo(() => filteredTalhoes.map(t => ({
        value: t.id.toString(),
        label: `${t.name} - ${t.area_name} ${t.area_size ? `(${t.area_size} ha)` : ''}`
    })), [filteredTalhoes]);
    return (_jsx("form", { onSubmit: handleSubmit, children: _jsxs("div", { className: "card border-0 shadow-sm", children: [_jsx("div", { className: "card-body p-3 p-md-4", children: _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-person-badge me-2" }), "Arrendador (propriet\u00E1rio da terra) ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx(SelectDropdown, { value: formData.arrendador.toString(), onChange: (value) => handleArrendadorChange(value), options: proprietarioOptions, placeholder: "Selecione o propriet\u00E1rio da terra", error: getFieldError('arrendador') || customErrors.arrendador }), _jsx("small", { className: "form-text text-muted", children: "Pessoa que \u00E9 dona da terra e vai ceder para uso" }), (getFieldError('arrendador') || customErrors.arrendador) && (_jsx("div", { className: "text-danger small mt-1", children: getFieldError('arrendador') || customErrors.arrendador }))] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-person-check me-2" }), "Arrendat\u00E1rio (produtor que usa/paga) ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx(SelectDropdown, { value: formData.arrendatario.toString(), onChange: (value) => handleArrendatarioChange(value), options: proprietarioOptions, placeholder: "Selecione quem vai usar a terra", error: getFieldError('arrendatario') || customErrors.arrendatario }), _jsx("small", { className: "form-text text-muted", children: "Produtor rural que vai pagar para cultivar na terra" }), (getFieldError('arrendatario') || customErrors.arrendatario) && (_jsx("div", { className: "text-danger small mt-1", children: getFieldError('arrendatario') || customErrors.arrendatario }))] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-house-door me-2" }), "Fazenda (do arrendador) ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx(SelectDropdown, { value: formData.fazenda.toString(), onChange: (value) => handleFazendaChange(value), options: fazendaOptions, placeholder: formData.arrendador ? "Selecione a fazenda" : "Selecione o arrendador primeiro", error: getFieldError('fazenda') }), _jsx("small", { className: "form-text text-muted", children: formData.arrendador ? (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "Mostrando apenas fazendas do arrendador selecionado (", filteredFazendas.length, " dispon\u00EDvel", filteredFazendas.length !== 1 ? 'is' : '', ")"] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-exclamation-circle me-1" }), "Selecione primeiro o arrendador (propriet\u00E1rio da terra)"] })) }), getFieldError('fazenda') && (_jsx("div", { className: "text-danger small mt-1", children: getFieldError('fazenda') }))] }), _jsxs("div", { className: "col-12", children: [invalidTalhoesWarning && (_jsx("div", { className: "alert alert-warning mb-2", children: invalidTalhoesWarning })), _jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-grid-3x3-gap me-2" }), "Talh\u00F5es que ser\u00E3o arrendados ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("select", { className: `form-select ${getFieldError('talhoes') || customErrors.talhoes ? 'is-invalid' : ''}`, multiple: true, size: Math.min(5, Math.max(2, filteredTalhoes.length || 3)), value: formData.talhoes.map(t => t.toString()), onChange: handleTalhoesChange, disabled: !formData.fazenda, children: !formData.fazenda ? (_jsx("option", { disabled: true, children: "Selecione uma fazenda primeiro" })) : filteredTalhoes.length === 0 ? (_jsx("option", { disabled: true, children: "Nenhum talh\u00E3o dispon\u00EDvel para esta fazenda" })) : (filteredTalhoes.map(talhao => (_jsxs("option", { value: talhao.id, children: [talhao.name, " ", talhao.area_name ? `- ${talhao.area_name}` : '', " ", talhao.area_size ? `(${talhao.area_size} ha)` : ''] }, talhao.id)))) }), (getFieldError('talhoes') || customErrors.talhoes) && (_jsx("div", { className: "invalid-feedback d-block", children: getFieldError('talhoes') || customErrors.talhoes })), _jsxs("small", { className: "form-text text-muted", children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "Segure Ctrl (Cmd no Mac) para selecionar m\u00FAltiplos talh\u00F5es da fazenda"] })] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-calendar-event me-2" }), "Data de In\u00EDcio ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx(DatePicker, { value: formData.start_date, onChange: (value) => handleDateChange('start_date', value), error: getFieldError('start_date') || customErrors.start_date || undefined }), (getFieldError('start_date') || customErrors.start_date) && (_jsx("div", { className: "text-danger small mt-1", children: getFieldError('start_date') || customErrors.start_date }))] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-calendar-check me-2" }), "Data de Fim (opcional)"] }), _jsx(DatePicker, { value: formData.end_date, onChange: (value) => handleDateChange('end_date', value), error: getFieldError('end_date') || customErrors.end_date || undefined }), (getFieldError('end_date') || customErrors.end_date) && (_jsx("div", { className: "text-danger small mt-1", children: getFieldError('end_date') || customErrors.end_date }))] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "custo_sacas_hectare", className: "form-label", children: [_jsx("i", { className: "bi bi-cash-coin me-2" }), "Custo do Arrendamento (sacas/hectare) ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "number", step: "0.01", min: "0.01", className: `form-control ${getFieldError('custo_sacas_hectare') ? 'is-invalid' : ''}`, id: "custo_sacas_hectare", name: "custo_sacas_hectare", value: formData.custo_sacas_hectare, onChange: handleInputChange, placeholder: "Ex: 8.5" }), getFieldError('custo_sacas_hectare') && (_jsx("div", { className: "invalid-feedback", children: getFieldError('custo_sacas_hectare') })), _jsxs("small", { className: "form-text text-muted", children: [_jsx("i", { className: "bi bi-info-circle me-1" }), "Valor que o ", _jsx("strong", { children: "arrendat\u00E1rio paga" }), " ao arrendador, em sacas de soja por hectare"] })] }), arrendamento?.custo_total_atual && (_jsx("div", { className: "col-12", children: _jsxs("div", { className: "alert alert-info mb-0", children: [_jsx("i", { className: "bi bi-info-circle me-2" }), _jsx("strong", { children: "Custo Total Estimado:" }), " R$ ", arrendamento.custo_total_atual.toFixed(2), _jsx("br", {}), _jsx("small", { children: "Baseado na cota\u00E7\u00E3o mais recente da saca de soja" })] }) })), (createMutation.isError || updateMutation.isError) && (_jsx("div", { className: "col-12", children: _jsx(ErrorMessage, { message: createMutation.error?.message ||
                                        updateMutation.error?.message ||
                                        'Erro ao salvar arrendamento' }) }))] }) }), _jsx("div", { className: "card-footer bg-transparent border-top pt-3", children: _jsxs("div", { className: "d-flex justify-content-end gap-2", children: [_jsxs("button", { type: "button", onClick: onSuccess, className: "btn btn-secondary", disabled: createMutation.isPending || updateMutation.isPending, children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsx("button", { type: "submit", className: "btn btn-success", disabled: createMutation.isPending || updateMutation.isPending, children: createMutation.isPending || updateMutation.isPending ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2", role: "status", "aria-hidden": "true" }), "Salvando..."] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-check-circle me-2" }), arrendamento ? 'Atualizar' : 'Salvar'] })) })] }) })] }) }));
};
export default ArrendamentoForm;
