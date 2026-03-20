import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { Link } from 'react-router-dom';
import { useGeoData, computeBoundsFromFeatures, hasRealCoordinates } from '../../hooks/useGeoData';
import GeoPolygonRenderer, { AREA_COLORS, TALHAO_COLOR } from './GeoPolygonRenderer';
import GeoSidePanel from './GeoSidePanel';
// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MAP_CONTAINER_STYLE = { width: '100%', height: 'calc(100vh - 200px)', minHeight: '500px' };
// Default center: Brazil central
const DEFAULT_CENTER = { lat: -15.8, lng: -47.9 };
const GeoLegend = ({ featureCount }) => (_jsxs("div", { className: "card shadow-sm position-absolute bottom-0 start-0 m-3", style: { zIndex: 10, fontSize: '0.85rem' }, children: [_jsxs("div", { className: "card-body py-2 px-3", children: [_jsx("strong", { className: "d-block mb-1", children: "Legenda" }), _jsxs("div", { className: "d-flex align-items-center gap-2 mb-1", children: [_jsx("span", { style: {
                                width: 14,
                                height: 14,
                                backgroundColor: AREA_COLORS.propria,
                                display: 'inline-block',
                                borderRadius: 2,
                            } }), "\u00C1rea Pr\u00F3pria"] }), _jsxs("div", { className: "d-flex align-items-center gap-2 mb-1", children: [_jsx("span", { style: {
                                width: 14,
                                height: 14,
                                backgroundColor: AREA_COLORS.arrendada,
                                display: 'inline-block',
                                borderRadius: 2,
                            } }), "\u00C1rea Arrendada"] }), _jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx("span", { style: {
                                width: 14,
                                height: 14,
                                backgroundColor: TALHAO_COLOR,
                                display: 'inline-block',
                                borderRadius: 2,
                            } }), "Talh\u00E3o"] })] }), featureCount > 0 && (_jsxs("div", { className: "text-muted small px-3 pb-2 border-top pt-2", children: [_jsx("i", { className: "bi bi-geo-alt me-1" }), featureCount, " elemento(s) no mapa"] }))] }));
const FallbackFeatureTable = ({ geoData, isLoading }) => {
    if (isLoading)
        return _jsx("div", { className: "spinner-border spinner-border-sm" });
    if (!geoData?.features?.length)
        return _jsx("p", { className: "text-muted", children: "Nenhuma geometria cadastrada." });
    return (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-sm table-striped", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Tipo" }), _jsx("th", { children: "Nome" }), _jsx("th", { children: "Fazenda" }), _jsx("th", { children: "Hectares" })] }) }), _jsx("tbody", { children: geoData.features.map((f) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("span", { className: `badge bg-${f.properties.entity_type === 'area' ? 'success' : 'info'}`, children: f.properties.entity_type === 'area' ? 'Área' : 'Talhão' }) }), _jsx("td", { children: f.properties.name }), _jsx("td", { children: f.properties.fazenda_name }), _jsx("td", { children: (f.properties.area_hectares ?? f.properties.area_size_ha)
                                    ? `${Number(f.properties.area_hectares ?? f.properties.area_size_ha).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha`
                                    : '—' })] }, f.id))) })] }) }));
};
// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const FazendaMap = () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: apiKey,
        id: 'fazenda-map',
    });
    const [selectedFeature, setSelectedFeature] = useState(null);
    const [activeLayer, setActiveLayer] = useState('all');
    const { user } = useAuthContext();
    // Initialize fazenda filter empty so we load ALL available KML on first render
    const [fazendaFilter, setFazendaFilter] = useState('');
    // Alert state: shown when API returns zero features
    const [showNoGeoAlert, setShowNoGeoAlert] = useState(false);
    // Ensure we only auto-focus once per mount
    const didAutoFocusRef = useRef(false);
    // Use the new useGeoData hook
    const { data: geoData, isLoading: geoLoading, fazendaOptions } = useGeoData({
        layer: activeLayer,
        fazendaId: fazendaFilter || null,
    });
    // Features with real KML coordinates (excluding 0,0 placeholders)
    const realFeatures = useMemo(() => {
        if (!geoData?.features?.length)
            return [];
        return geoData.features.filter(hasRealCoordinates);
    }, [geoData]);
    // Compute map bounds from real KML features only
    const bounds = useMemo(() => {
        if (!realFeatures.length || !isLoaded)
            return null;
        return computeBoundsFromFeatures(realFeatures);
    }, [realFeatures, isLoaded]);
    const mapRef = useRef(null);
    const onMapLoad = useCallback((map) => {
        mapRef.current = map;
        if (bounds && !bounds.isEmpty()) {
            map.fitBounds(bounds, 50);
        }
    }, [bounds]);
    // Ensure map recenters when geo data / bounds change after initial load
    useEffect(() => {
        if (!mapRef.current || !bounds)
            return;
        try {
            if (!bounds.isEmpty())
                mapRef.current.fitBounds(bounds, 50);
        }
        catch (e) {
            console.debug('fitBounds failed', e);
        }
    }, [bounds]);
    // Auto-center on real KML features when data first loads
    useEffect(() => {
        if (didAutoFocusRef.current)
            return;
        if (geoLoading)
            return;
        // Data loaded — check for real KML coordinates
        if (realFeatures.length === 0) {
            setShowNoGeoAlert(true);
            didAutoFocusRef.current = true;
            return;
        }
        setShowNoGeoAlert(false);
        if (!mapRef.current || !isLoaded)
            return;
        // Center only on features with real KML coordinates
        const realBounds = computeBoundsFromFeatures(realFeatures);
        if (realBounds && !realBounds.isEmpty()) {
            mapRef.current.fitBounds(realBounds, 50);
        }
        didAutoFocusRef.current = true;
    }, [geoData, geoLoading, isLoaded, realFeatures]);
    // Manual center handler used by the UI button
    const centerOnCurrentFazenda = useCallback(() => {
        if (!mapRef.current || !geoData?.features?.length)
            return;
        // Build bounds for all features of the current fazenda
        let fazendaId = null;
        // Prefer currently selected feature's fazenda
        if (selectedFeature) {
            fazendaId = selectedFeature.properties.fazenda_id;
        }
        else {
            // Otherwise prefer filter/user, otherwise first
            try {
                fazendaId = fazendaFilter ? Number(fazendaFilter) : user?.fazenda ?? null;
            }
            catch {
                fazendaId = null;
            }
        }
        if (!fazendaId) {
            // If no fazenda selected, center on all available features
            const allBounds = computeBoundsFromFeatures(geoData.features);
            if (allBounds && !allBounds.isEmpty()) {
                mapRef.current.fitBounds(allBounds, 50);
            }
            return;
        }
        // Get all features for this fazenda
        const fazendaFeatures = geoData.features.filter((f) => f.properties.fazenda_id === fazendaId);
        if (!fazendaFeatures.length)
            return;
        const b = computeBoundsFromFeatures(fazendaFeatures);
        if (b && !b.isEmpty()) {
            mapRef.current.fitBounds(b, 50);
        }
    }, [mapRef, geoData, selectedFeature, fazendaFilter, user]);
    // ---------------------------------------------------------------------------
    // Fallback: no API key
    // ---------------------------------------------------------------------------
    if (!apiKey) {
        return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "alert alert-warning", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), _jsx("strong", { children: "Google Maps API Key n\u00E3o configurada." }), " Defina", ' ', _jsx("code", { children: "VITE_GOOGLE_MAPS_API_KEY" }), " no arquivo ", _jsx("code", { children: ".env" }), " para habilitar o mapa."] }), _jsx(FallbackFeatureTable, { geoData: geoData, isLoading: geoLoading })] }));
    }
    if (loadError) {
        return (_jsx("div", { className: "container-fluid py-4", children: _jsxs("div", { className: "alert alert-danger", children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Erro ao carregar Google Maps: ", loadError.message] }) }));
    }
    if (!isLoaded) {
        return (_jsx("div", { className: "d-flex justify-content-center align-items-center", style: { minHeight: 400 }, children: _jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Carregando mapa..." }) }) }));
    }
    return (_jsxs("div", { className: "container-fluid py-3", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("h4", { className: "mb-0", children: [_jsx("i", { className: "bi bi-map me-2" }), "Mapa de Fazendas"] }), _jsxs("div", { className: "d-flex gap-2", children: [_jsxs("select", { className: "form-select form-select-sm", style: { width: 140 }, value: activeLayer, onChange: (e) => setActiveLayer(e.target.value), children: [_jsx("option", { value: "all", children: "Todas camadas" }), _jsx("option", { value: "areas", children: "\u00C1reas" }), _jsx("option", { value: "talhoes", children: "Talh\u00F5es" })] }), _jsxs("select", { className: "form-select form-select-sm", style: { width: 200 }, value: fazendaFilter, onChange: (e) => setFazendaFilter(e.target.value), disabled: fazendaOptions.length === 0 || geoLoading, title: fazendaOptions.length === 0 ? 'Nenhuma fazenda com coordenadas cadastradas' : '', children: [_jsx("option", { value: "", children: "Todas fazendas" }), fazendaOptions.map(([id, name]) => (_jsx("option", { value: id, children: name }, id)))] }), _jsx("button", { type: "button", className: "btn btn-outline-secondary btn-sm", title: "Centralizar na propriedade - for\u00E7a o mapa a centralizar na fazenda selecionada", onClick: () => centerOnCurrentFazenda(), children: "Centralizar na propriedade" })] })] }), geoLoading && (_jsxs("div", { className: "text-center text-muted py-2", children: [_jsx("div", { className: "spinner-border spinner-border-sm me-2", role: "status" }), "Carregando dados geogr\u00E1ficos..."] })), !geoLoading && showNoGeoAlert && (_jsxs("div", { className: "alert alert-warning d-flex align-items-center", role: "alert", children: [_jsx("i", { className: "bi bi-exclamation-triangle-fill me-2 fs-5" }), _jsx("span", { children: "N\u00E3o existe coordenada geogr\u00E1fica dispon\u00EDvel para centralizar" })] })), !geoLoading && geoData?.features && geoData.features.length > 0 && (_jsxs("div", { className: "position-relative", children: [_jsx(GoogleMap, { mapContainerStyle: MAP_CONTAINER_STYLE, center: DEFAULT_CENTER, zoom: 5, onLoad: onMapLoad, options: {
                            mapTypeId: 'satellite',
                            mapTypeControl: true,
                            streetViewControl: false,
                        }, children: _jsx(GeoPolygonRenderer, { features: geoData.features, onFeatureClick: setSelectedFeature }) }), selectedFeature && (_jsx(GeoSidePanel, { feature: selectedFeature, onClose: () => setSelectedFeature(null) })), _jsx(GeoLegend, { featureCount: geoData.features.length })] }))] }));
};
export default FazendaMap;
