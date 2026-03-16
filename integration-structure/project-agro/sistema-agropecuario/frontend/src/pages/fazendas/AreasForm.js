import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiCreate, useApiUpdate, useApiQuery } from '../../hooks/useApi';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { TIPO_AREA_CHOICES } from '../../utils/constants';
const AreasForm = ({ area, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        proprietario: '',
        fazenda: '',
        name: '',
        tipo: 'propria',
        geom: '',
        custo_arrendamento: ''
    });
    const [errors, setErrors] = useState({});
    const [showManualGeometry, setShowManualGeometry] = useState(false);
    const [geometryInput, setGeometryInput] = useState('');
    const [kmlFile, setKmlFile] = useState(null);
    const [areaHectaresManual, setAreaHectaresManual] = useState('');
    // Queries
    const { data: proprietarios = [], isLoading: loadingProprietarios } = useApiQuery(['proprietarios'], '/proprietarios/');
    const { data: fazendas = [], isLoading: loadingFazendas } = useApiQuery(['fazendas'], '/fazendas/');
    // Mutations
    const queryClient = useQueryClient();
    const createMutation = useApiCreate('/areas/', [['areas']]);
    const updateMutation = useApiUpdate('/areas/', [['areas']]);
    // Initialize form data when editing
    useEffect(() => {
        if (area) {
            setFormData({
                proprietario: area.proprietario?.toString() || '',
                fazenda: area.fazenda.toString(),
                name: area.name,
                tipo: area.tipo || 'propria',
                geom: area.geom || '',
                custo_arrendamento: area.custo_arrendamento?.toString() || ''
            });
        }
    }, [area]);
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };
    const validateForm = () => {
        const newErrors = {};
        if (!formData.proprietario || formData.proprietario === '' || formData.proprietario === '0') {
            newErrors.proprietario = 'Proprietário é obrigatório';
        }
        if (!formData.fazenda || formData.fazenda === '' || formData.fazenda === '0') {
            newErrors.fazenda = 'Fazenda é obrigatória';
        }
        if (!formData.name.trim())
            newErrors.name = 'Nome é obrigatório';
        if (!formData.tipo)
            newErrors.tipo = 'Tipo é obrigatório';
        if (formData.tipo === 'arrendada' && !formData.custo_arrendamento) {
            newErrors.custo_arrendamento = 'Custo de arrendamento é obrigatório para áreas arrendadas';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        // Use FormData if there's a KML file to upload or manual hectares
        if (kmlFile || areaHectaresManual) {
            const formDataToSend = new FormData();
            formDataToSend.append('proprietario', formData.proprietario);
            formDataToSend.append('fazenda', formData.fazenda);
            formDataToSend.append('name', formData.name.trim());
            formDataToSend.append('tipo', formData.tipo);
            if (formData.custo_arrendamento && formData.tipo === 'arrendada') {
                formDataToSend.append('custo_arrendamento', formData.custo_arrendamento);
            }
            if (kmlFile) {
                formDataToSend.append('kml_file', kmlFile);
            }
            if (areaHectaresManual && !kmlFile) {
                formDataToSend.append('area_hectares_manual', areaHectaresManual);
            }
            try {
                if (area?.id) {
                    await api.put(`/areas/${area.id}/`, formDataToSend, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
                else {
                    await api.post('/areas/', formDataToSend, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
                // Invalidar queries para atualizar listas
                queryClient.invalidateQueries({ queryKey: ['areas'] });
                onSuccess();
            }
            catch (error) {
                console.error('Error saving area:', error);
                const err = error;
                if (err.response?.data) {
                    setErrors(err.response.data);
                }
            }
        }
        else {
            // Regular JSON submission
            const submitData = {
                id: area?.id,
                proprietario: parseInt(formData.proprietario),
                fazenda: parseInt(formData.fazenda),
                name: formData.name.trim(),
                tipo: formData.tipo,
                geom: formData.geom || null,
                custo_arrendamento: formData.tipo === 'arrendada' ? parseFloat(formData.custo_arrendamento) : null
            };
            try {
                if (area) {
                    if (!area.id)
                        throw new Error('ID da área não encontrado');
                    await updateMutation.mutateAsync({ ...submitData, id: area.id });
                }
                else {
                    await createMutation.mutateAsync(submitData);
                }
                onSuccess();
            }
            catch (error) {
                console.error('Error saving area:', error);
                const err = error;
                if (err.response?.data) {
                    setErrors(err.response.data);
                }
            }
        }
    };
    if (loadingProprietarios || loadingFazendas) {
        return _jsx(LoadingSpinner, {});
    }
    // Get all error messages
    const errorMessages = Object.entries(errors)
        .filter(([, value]) => value)
        .map(([, value]) => {
        if (typeof value === 'string')
            return value;
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return String(value);
    });
    return (_jsx("form", { onSubmit: handleSubmit, children: _jsxs("div", { className: "card border-0 shadow-sm", children: [_jsxs("div", { className: "card-body p-3 p-md-4", children: [errorMessages.length > 0 && (_jsxs("div", { className: "alert alert-danger mb-3", children: [_jsxs("h6", { className: "alert-heading", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), "Erros de valida\u00E7\u00E3o:"] }), _jsx("ul", { className: "mb-0", children: errorMessages.map((error, idx) => (_jsx("li", { children: error }, idx))) })] })), _jsxs("div", { className: "row g-2 g-md-3", children: [_jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "proprietario", className: "form-label", children: [_jsx("i", { className: "bi bi-person-badge me-2" }), "Propriet\u00E1rio *"] }), _jsxs("select", { id: "proprietario", name: "proprietario", value: formData.proprietario, onChange: handleInputChange, className: `form-select ${errors.proprietario ? 'is-invalid' : ''}`, children: [_jsx("option", { value: "", children: "Selecione um propriet\u00E1rio" }), proprietarios.map(prop => (_jsxs("option", { value: prop.id, children: [prop.nome, " (", prop.cpf_cnpj, ")"] }, prop.id)))] }), errors.proprietario && (_jsx("div", { className: "invalid-feedback d-block", children: errors.proprietario }))] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "fazenda", className: "form-label", children: [_jsx("i", { className: "bi bi-house-door me-2" }), "Fazenda *"] }), _jsxs("select", { id: "fazenda", name: "fazenda", value: formData.fazenda, onChange: handleInputChange, className: `form-select ${errors.fazenda ? 'is-invalid' : ''}`, children: [_jsx("option", { value: "", children: "Selecione uma fazenda" }), fazendas.map(faz => (_jsxs("option", { value: faz.id, children: [faz.name, " (", faz.matricula, ")"] }, faz.id)))] }), errors.fazenda && (_jsx("div", { className: "invalid-feedback d-block", children: errors.fazenda }))] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "name", className: "form-label", children: [_jsx("i", { className: "bi bi-map me-2" }), "Nome da \u00C1rea *"] }), _jsx("input", { type: "text", id: "name", name: "name", value: formData.name, onChange: handleInputChange, className: `form-control ${errors.name ? 'is-invalid' : ''}`, placeholder: "Ex: \u00C1rea Norte, Talh\u00E3o 1" }), errors.name && (_jsx("div", { className: "invalid-feedback", children: errors.name }))] }), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "tipo", className: "form-label", children: [_jsx("i", { className: "bi bi-tag me-2" }), "Tipo *"] }), _jsx("select", { id: "tipo", name: "tipo", value: formData.tipo, onChange: handleInputChange, className: `form-select ${errors.tipo ? 'is-invalid' : ''}`, children: TIPO_AREA_CHOICES.map(choice => (_jsx("option", { value: choice.value, children: choice.label }, choice.value))) }), errors.tipo && (_jsx("div", { className: "invalid-feedback", children: errors.tipo }))] }), formData.tipo === 'arrendada' && (_jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "custo_arrendamento", className: "form-label", children: [_jsx("i", { className: "bi bi-cash-coin me-2" }), "Custo de Arrendamento (sacas/ha) *"] }), _jsx("input", { type: "number", id: "custo_arrendamento", name: "custo_arrendamento", value: formData.custo_arrendamento, onChange: handleInputChange, step: "0.01", min: "0", className: `form-control ${errors.custo_arrendamento ? 'is-invalid' : ''}`, placeholder: "Ex: 2.5" }), errors.custo_arrendamento && (_jsx("div", { className: "invalid-feedback", children: errors.custo_arrendamento }))] })), _jsxs("div", { className: "col-md-6", children: [_jsxs("label", { htmlFor: "area_hectares_manual", className: "form-label", children: [_jsx("i", { className: "bi bi-rulers me-2" }), "\u00C1rea em Hectares (Opcional)"] }), _jsx("input", { type: "number", id: "area_hectares_manual", value: areaHectaresManual, onChange: (e) => setAreaHectaresManual(e.target.value), step: "0.01", min: "0", className: "form-control", placeholder: "Ex: 50.75", disabled: !!kmlFile }), _jsx("div", { className: "form-text", children: kmlFile ? (_jsxs("span", { className: "text-warning", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-1" }), "Desabilitado pois um arquivo KML foi selecionado"] })) : ('Digite o tamanho da área se não tiver KML ou coordenadas. Um polígono aproximado será criado.') })] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { className: "form-label", children: [_jsx("i", { className: "bi bi-geo-alt me-2" }), "Geometria da \u00C1rea (Opcional)"] }), _jsxs("div", { className: "border rounded p-4 bg-light", children: [_jsxs("div", { className: "mb-3", children: [_jsxs("label", { htmlFor: "kml_file", className: "form-label", children: [_jsx("i", { className: "bi bi-file-earmark-arrow-up me-2" }), "Upload de arquivo KML"] }), _jsx("input", { type: "file", className: "form-control", id: "kml_file", accept: ".kml,.kmz", onChange: (e) => {
                                                                setKmlFile(e.target.files?.[0] || null);
                                                                if (e.target.files?.[0]) {
                                                                    setAreaHectaresManual('');
                                                                }
                                                            } }), _jsx("div", { className: "form-text", children: "Importe um arquivo KML/KMZ com o pol\u00EDgono da \u00E1rea" })] }), _jsx("div", { className: "d-flex justify-content-center", children: _jsxs("button", { type: "button", className: "btn btn-outline-secondary", onClick: () => setShowManualGeometry(!showManualGeometry), children: [_jsx("i", { className: "bi bi-code-square me-2" }), showManualGeometry ? 'Ocultar entrada manual' : 'Inserir código de polígono manualmente'] }) }), showManualGeometry && (_jsxs("div", { className: "mt-3", children: [_jsx("label", { htmlFor: "geometry_input", className: "form-label", children: "C\u00F3digo WKT do Pol\u00EDgono" }), _jsx("textarea", { className: "form-control font-monospace", id: "geometry_input", rows: 6, value: geometryInput, onChange: (e) => setGeometryInput(e.target.value), placeholder: "POLYGON((longitude latitude, longitude latitude, ...))" }), _jsxs("div", { className: "mt-2 text-muted small", children: [_jsx("strong", { children: "Exemplo de formato WKT (Well-Known Text):" }), _jsx("pre", { className: "mt-2 p-2 bg-white rounded border", children: _jsx("code", { children: "POLYGON((-47.8919 -15.7942, -47.8919 -15.8042, -47.8819 -15.8042, -47.8819 -15.7942, -47.8919 -15.7942))" }) }), _jsx("p", { className: "mt-1", children: "O primeiro e \u00FAltimo ponto devem ser iguais para fechar o pol\u00EDgono." })] })] }))] })] }), _jsxs("div", { className: "col-12", children: [_jsxs("label", { htmlFor: "geom", className: "form-label", children: [_jsx("i", { className: "bi bi-code-square me-2" }), "Geometria (GeoJSON)"] }), _jsx("textarea", { id: "geom", name: "geom", value: formData.geom, onChange: handleInputChange, rows: 4, className: "form-control font-monospace", placeholder: '{"type": "Polygon", "coordinates": [[[...long, lat...]]]}' }), _jsx("div", { className: "form-text", children: "Opcional: Defina a geometria da \u00E1rea em formato GeoJSON. Pode ser definido posteriormente via upload de KML." })] })] })] }), _jsx("div", { className: "card-footer bg-transparent border-top pt-3", children: _jsxs("div", { className: "d-flex justify-content-end gap-2", children: [_jsxs("button", { type: "button", onClick: onCancel, className: "btn btn-secondary", children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Cancelar"] }), _jsx("button", { type: "submit", disabled: createMutation.isPending || updateMutation.isPending, className: "btn btn-success", children: createMutation.isPending || updateMutation.isPending ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "spinner-border spinner-border-sm me-2", role: "status", "aria-hidden": "true" }), "Salvando..."] })) : (_jsxs(_Fragment, { children: [_jsx("i", { className: "bi bi-check-circle me-2" }), area ? 'Atualizar' : 'Criar'] })) })] }) })] }) }));
};
export default AreasForm;
