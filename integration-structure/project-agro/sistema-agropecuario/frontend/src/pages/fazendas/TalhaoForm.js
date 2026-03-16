import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../hooks/useToast';
import { useFormValidation } from '../../hooks/useFormValidation';
import { useApiCreate, useApiUpdate, useApiQuery } from '../../hooks/useApi';
import api from '../../services/api';
import SelectDropdown from '../../components/common/SelectDropdown';
import ErrorMessage from '../../components/common/ErrorMessage';
import LoadingSpinner from '../../components/common/LoadingSpinner';
const TalhaoForm = ({ talhao, onSuccess }) => {
    const [formData, setFormData] = useState({
        area: 0,
        name: '',
        area_size: ''
    });
    const [showManualGeometry, setShowManualGeometry] = useState(false);
    const [geometryInput, setGeometryInput] = useState('');
    const [kmlFile, setKmlFile] = useState(null);
    const [customErrors, setCustomErrors] = useState({});
    // Regras de validação dinâmicas baseadas em KML
    const getValidationRules = () => {
        const rules = {
            area: { required: true },
            name: { required: true, minLength: 2, maxLength: 200 }
        };
        // area_size só é obrigatório se não houver KML
        if (!kmlFile) {
            rules.area_size = { required: true, min: 0.01 };
        }
        return rules;
    };
    const { validate, validateSingle, getFieldError, clearErrors } = useFormValidation(getValidationRules());
    // Query áreas - API retorna GeoJSON FeatureCollection
    const { data: areasData, isLoading: loadingAreas } = useApiQuery(['areas'], '/areas/');
    // Extrair áreas do GeoJSON FeatureCollection
    const areas = (areasData?.features || []).map(feature => ({
        ...feature.properties,
        id: feature.id
    }));
    // Mutations
    const queryClient = useQueryClient();
    const createMutation = useApiCreate('/talhoes/', [['talhoes']]);
    const updateMutation = useApiUpdate('/talhoes/', [['talhoes']]);
    const toast = useToast();
    useEffect(() => {
        if (talhao) {
            setFormData({
                area: talhao.area || 0,
                name: talhao.name,
                area_size: talhao.area_size?.toString() || ''
            });
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [talhao]);
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        validateSingle(name, value);
    };
    const handleAreaChange = (value) => {
        setFormData(prev => ({ ...prev, area: Number(value) }));
        validateSingle('area', value);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate(formData)) {
            return;
        }
        try {
            const submitFormData = new FormData();
            submitFormData.append('area', formData.area.toString());
            submitFormData.append('name', formData.name);
            // Adicionar KML se fornecido
            if (kmlFile) {
                submitFormData.append('kml_file', kmlFile);
            }
            // Se não tem KML mas tem area_size, enviar como area_size_manual
            else if (formData.area_size && formData.area_size.trim() !== '') {
                submitFormData.append('area_size_manual', formData.area_size);
            }
            // Use mutations (supporting FormData) to keep behavior consistent
            if (talhao) {
                // useApiUpdate expects { id, ...data } and supports formData via data.formData
                await updateMutation.mutateAsync({ id: talhao.id, formData: submitFormData });
                toast.showSuccess('Talhão atualizado com sucesso');
            }
            else {
                // For create, pass FormData directly
                await createMutation.mutateAsync(submitFormData);
                toast.showSuccess('Talhão criado com sucesso');
            }
            // Invalidar queries para atualizar listas
            queryClient.invalidateQueries({ queryKey: ['talhoes'] });
            queryClient.invalidateQueries({ queryKey: ['areas'] });
            onSuccess();
        }
        catch (error) {
            console.error('Erro ao salvar talhão:', error);
            console.error('Resposta do backend:', error.response?.data);
            console.error('Status:', error.response?.status);
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
    const areaOptions = areas.map(area => ({
        value: area.id.toString(),
        label: `${area.name} - ${area.fazenda_detail?.name || 'Fazenda'}`,
        group: area.fazenda_detail?.name
    }));
    if (loadingAreas) {
        return (_jsx("div", { className: "d-flex justify-content-center py-5", children: _jsx(LoadingSpinner, {}) }));
    }
    return (_jsx("form", { onSubmit: handleSubmit, children: _jsxs("div", { className: "card border-0 shadow-sm", children: [_jsx("div", { className: "card-body p-3 p-md-4", children: _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-12", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-map me-2" }), "\u00C1rea ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx(SelectDropdown, { value: formData.area.toString(), onChange: handleAreaChange, options: areaOptions, placeholder: "Selecione uma \u00E1rea", error: getFieldError('area') || customErrors.area }), (getFieldError('area') || customErrors.area) && (_jsx("div", { className: "text-danger small mt-1", children: getFieldError('area') || customErrors.area }))] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "name", className: "form-label", children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), "Nome do Talh\u00E3o ", _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "text", className: `form-control ${getFieldError('name') || customErrors.name ? 'is-invalid' : ''}`, id: "name", name: "name", value: formData.name, onChange: handleInputChange, placeholder: "Ex: Talh\u00E3o A1" }), (getFieldError('name') || customErrors.name) && (_jsx("div", { className: "invalid-feedback", children: getFieldError('name') || customErrors.name }))] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "area_size", className: "form-label", children: [_jsx("i", { className: "bi bi-rulers me-2" }), "Tamanho (hectares) ", !kmlFile && _jsx("span", { className: "text-danger", children: "*" })] }), _jsx("input", { type: "number", step: "0.01", min: "0.01", className: `form-control ${getFieldError('area_size') || customErrors.area_size ? 'is-invalid' : ''}`, id: "area_size", name: "area_size", value: formData.area_size, onChange: handleInputChange, placeholder: "Ex: 25.50", disabled: !!kmlFile }), (getFieldError('area_size') || customErrors.area_size) && (_jsx("div", { className: "invalid-feedback", children: getFieldError('area_size') || customErrors.area_size })), _jsx("small", { className: "form-text text-muted", children: kmlFile ? 'Área será calculada automaticamente do arquivo KML' : 'Área em hectares deste talhão (obrigatório se não fornecer KML)' })] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-map me-2" }), "Geometria do Talh\u00E3o (Opcional)"] }), _jsxs("div", { className: "border rounded p-3 bg-light", children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "kml_file", className: "form-label", children: [_jsx("i", { className: "bi bi-file-earmark-arrow-up me-2" }), "Upload de arquivo KML"] }), _jsx("input", { type: "file", className: "form-control", id: "kml_file", accept: ".kml,.kmz", onChange: (e) => {
                                                            const file = e.target.files?.[0] || null;
                                                            setKmlFile(file);
                                                            // Se selecionou KML, limpar area_size
                                                            if (file) {
                                                                setFormData(prev => ({ ...prev, area_size: '' }));
                                                            }
                                                        } }), _jsx("small", { className: "form-text text-muted", children: kmlFile ? (_jsxs("span", { className: "text-success", children: [_jsx("i", { className: "bi bi-check-circle me-1" }), "Arquivo selecionado: ", kmlFile.name, " - A \u00E1rea ser\u00E1 calculada automaticamente"] })) : ('Importe um arquivo KML/KMZ com o polígono do talhão (geometria da área de trabalho agrícola)') })] }), _jsx("div", { className: "d-flex justify-content-center", children: _jsxs("button", { type: "button", className: "btn btn-sm btn-outline-secondary", onClick: () => setShowManualGeometry(!showManualGeometry), children: [_jsx("i", { className: "bi bi-code-square me-2" }), showManualGeometry ? 'Ocultar entrada manual' : 'Inserir código de polígono manualmente'] }) }), showManualGeometry && (_jsxs("div", { className: "mt-3", children: [_jsx("label", { htmlFor: "geometry_input", className: "form-label", children: "C\u00F3digo WKT do Pol\u00EDgono" }), _jsx("textarea", { className: "form-control font-monospace", id: "geometry_input", rows: 6, value: geometryInput, onChange: (e) => setGeometryInput(e.target.value), placeholder: "POLYGON((longitude latitude, longitude latitude, ...))" }), _jsxs("small", { className: "form-text text-muted", children: [_jsx("strong", { children: "Exemplo de formato WKT (Well-Known Text):" }), _jsx("br", {}), _jsx("code", { className: "d-block bg-white p-2 mt-1 rounded border", children: "POLYGON((-47.8919 -15.7942, -47.8919 -15.8042, -47.8819 -15.8042, -47.8819 -15.7942, -47.8919 -15.7942))" }), _jsx("br", {}), "O primeiro e \u00FAltimo ponto devem ser iguais para fechar o pol\u00EDgono."] })] }))] })] }), (createMutation.isError || updateMutation.isError) && (_jsx("div", { className: "col-12", children: _jsx(ErrorMessage, { message: createMutation.error?.message ||
                                        updateMutation.error?.message ||
                                        'Erro ao salvar talhão' }) }))] }) }), _jsx("div", { className: "card-footer bg-transparent border-top pt-3", children: _jsxs("div", { className: "d-flex justify-content-end gap-2", children: [_jsxs("button", { type: "button", onClick: onSuccess, className: "btn btn-secondary", disabled: createMutation.isPending || updateMutation.isPending, children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsx("button", { type: "submit", className: "btn btn-success", disabled: createMutation.isPending || updateMutation.isPending, children: createMutation.isPending || updateMutation.isPending ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2", role: "status", "aria-hidden": "true" }), "Salvando..."] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-check-circle me-2" }), talhao ? 'Atualizar' : 'Salvar'] })) })] }) })] }) }));
};
export default TalhaoForm;
