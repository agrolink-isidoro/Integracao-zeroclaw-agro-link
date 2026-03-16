import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { GoogleMap, useJsApiLoader, Polygon } from '@react-google-maps/api';
import { useApiQuery } from '../../hooks/useApi';
import { Link } from 'react-router-dom';
// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MAP_CONTAINER_STYLE = { width: '100%', height: 'calc(100vh - 200px)', minHeight: '500px' };
const AREA_COLORS = {
    propria: '#2E7D32',
    arrendada: '#F57F17',
};
const TALHAO_COLOR = '#1565C0';
// Default center: Brazil central
const DEFAULT_CENTER = { lat: -15.8, lng: -47.9 };
// ---------------------------------------------------------------------------
// Helper: convert GeoJSON coordinates to Google Maps LatLng[]
// ---------------------------------------------------------------------------
function coordsToLatLngs(coords) {
    return coords.map(([lng, lat]) => ({ lat, lng }));
}
function getPolygonPaths(geometry) {
    if (geometry.type === 'Polygon') {
        return geometry.coordinates.map(coordsToLatLngs);
    }
    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.flatMap((poly) => poly.map(coordsToLatLngs));
    }
    return [];
}
const FazendaSidePanel = ({ feature, onClose }) => {
    const p = feature.properties;
    const isArea = p.entity_type === 'area';
    const hectares = isArea ? p.area_hectares : p.area_size_ha;
    return (_jsxs("div", { className: "card shadow-lg position-absolute top-0 end-0 m-3", style: { width: '320px', zIndex: 10, maxHeight: 'calc(100% - 24px)', overflowY: 'auto' }, children: [_jsxs("div", { className: "card-header d-flex justify-content-between align-items-center bg-primary text-white", children: [_jsxs("h6", { className: "mb-0", children: [_jsx("i", { className: `bi ${isArea ? 'bi-map' : 'bi-grid-3x3-gap'} me-2` }), p.name] }), _jsx("button", { className: "btn btn-sm btn-light", onClick: onClose, children: _jsx("i", { className: "bi bi-x-lg" }) })] }), _jsxs("div", { className: "card-body", children: [_jsx("table", { className: "table table-sm mb-3", children: _jsxs("tbody", { children: [_jsxs("tr", { children: [_jsx("th", { children: "Tipo" }), _jsx("td", { children: _jsx("span", { className: `badge bg-${isArea ? (p.tipo === 'propria' ? 'success' : 'warning') : 'info'}`, children: isArea ? (p.tipo === 'propria' ? 'Própria' : 'Arrendada') : 'Talhão' }) })] }), _jsxs("tr", { children: [_jsx("th", { children: "Fazenda" }), _jsx("td", { children: p.fazenda_name })] }), !isArea && p.area_name && (_jsxs("tr", { children: [_jsx("th", { children: "\u00C1rea" }), _jsx("td", { children: p.area_name })] })), hectares != null && (_jsxs("tr", { children: [_jsx("th", { children: "Hectares" }), _jsxs("td", { children: [Number(hectares).toLocaleString('pt-BR', { maximumFractionDigits: 2 }), " ha"] })] }))] }) }), _jsxs("div", { className: "d-grid gap-2", children: [isArea ? (_jsxs(Link, { to: `/fazendas/areas`, className: "btn btn-outline-primary btn-sm", children: [_jsx("i", { className: "bi bi-eye me-1" }), "Ver \u00C1reas"] })) : (_jsxs(Link, { to: `/fazendas/talhoes`, className: "btn btn-outline-primary btn-sm", children: [_jsx("i", { className: "bi bi-eye me-1" }), "Ver Talh\u00F5es"] })), _jsxs(Link, { to: `/fazendas/fazendas`, className: "btn btn-outline-secondary btn-sm", children: [_jsx("i", { className: "bi bi-house-door me-1" }), "Ir para Fazenda"] }), _jsxs(Link, { to: "/agricultura/colheitas", className: "btn btn-outline-success btn-sm", children: [_jsx("i", { className: "bi bi-basket me-1" }), "Ver Colheitas"] })] })] })] }));
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
    const [fazendaFilter, setFazendaFilter] = useState(() => {
        try {
            const id = user?.fazenda ?? user?.fazenda_id ?? null;
            return id ? String(id) : '';
        }
        catch {
            return '';
        }
    });
    // Ensure we only auto-focus once per mount
    const didAutoFocusRef = useRef(false);
    // Fetch GeoJSON
    const geoUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (activeLayer !== 'all')
            params.set('layer', activeLayer);
        if (fazendaFilter)
            params.set('fazenda', fazendaFilter);
        const qs = params.toString();
        return `/geo/${qs ? `?${qs}` : ''}`;
    }, [activeLayer, fazendaFilter]);
    const { data: geoData, isLoading: geoLoading } = useApiQuery(['fazendas-geo', activeLayer, fazendaFilter], geoUrl);
    // Compute map bounds from features
    const bounds = useMemo(() => {
        if (!geoData?.features?.length || !isLoaded)
            return null;
        const b = new google.maps.LatLngBounds();
        geoData.features.forEach((f) => {
            const paths = getPolygonPaths(f.geometry);
            paths.forEach((ring) => ring.forEach((pt) => b.extend(pt)));
        });
        return b;
    }, [geoData, isLoaded]);
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
    // Auto-select and focus the user's primary fazenda (if any)
    useEffect(() => {
        if (didAutoFocusRef.current)
            return;
        if (!geoData?.features?.length || !mapRef.current)
            return;
        // Prefer explicit filter or user's primary fazenda; otherwise pick the first fazenda present
        let id = null;
        try {
            id = fazendaFilter ? Number(fazendaFilter) : user?.fazenda ?? null;
        }
        catch {
            id = null;
        }
        if (!id) {
            const firstFeature = geoData.features.find((f) => !!f.properties.fazenda_id);
            if (firstFeature) {
                id = firstFeature.properties.fazenda_id;
                // set the filter so subsequent reloads keep the same fazenda
                setFazendaFilter(String(id));
            }
        }
        if (!id)
            return;
        const target = geoData.features.find((f) => f.properties.fazenda_id === id);
        if (!target)
            return;
        // select feature to open side panel
        setSelectedFeature(target);
        // compute bounds for only this feature and fit
        try {
            const b = new google.maps.LatLngBounds();
            const paths = getPolygonPaths(target.geometry);
            paths.forEach((ring) => ring.forEach((pt) => b.extend(pt)));
            if (!b.isEmpty())
                mapRef.current.fitBounds(b, 60);
        }
        catch (e) {
            console.debug('fitBounds single feature failed', e);
        }
        didAutoFocusRef.current = true;
    }, [geoData, user, fazendaFilter]);
    // Manual center handler used by the UI button
    const centerOnCurrentFazenda = useCallback(() => {
        if (!mapRef.current || !geoData?.features?.length)
            return;
        // Prefer currently selected feature
        let target = selectedFeature ?? null;
        // Otherwise prefer filter/user, otherwise first
        if (!target) {
            const id = fazendaFilter ? Number(fazendaFilter) : user?.fazenda ?? null;
            if (id)
                target = geoData.features.find((f) => f.properties.fazenda_id === id) ?? null;
        }
        if (!target) {
            target = geoData.features.find((f) => !!f.properties.fazenda_id) ?? null;
        }
        if (!target)
            return;
        setSelectedFeature(target);
        try {
            const b = new google.maps.LatLngBounds();
            const paths = getPolygonPaths(target.geometry);
            paths.forEach((ring) => ring.forEach((pt) => b.extend(pt)));
            if (!b.isEmpty())
                mapRef.current.fitBounds(b, 60);
        }
        catch (e) {
            console.debug('centerOnCurrentFazenda failed', e);
        }
    }, [mapRef, geoData, selectedFeature, fazendaFilter, user]);
    // Unique fazendas for filter dropdown
    const fazendaOptions = useMemo(() => {
        if (!geoData?.features)
            return [];
        const map = new Map();
        geoData.features.forEach((f) => {
            map.set(f.properties.fazenda_id, f.properties.fazenda_name);
        });
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    }, [geoData]);
    // ---------------------------------------------------------------------------
    // Fallback: no API key
    // ---------------------------------------------------------------------------
    if (!apiKey) {
        return (_jsxs("div", { className: "container-fluid py-4", children: [_jsxs("div", { className: "alert alert-warning", children: [_jsx("i", { className: "bi bi-exclamation-triangle me-2" }), _jsx("strong", { children: "Google Maps API Key n\u00E3o configurada." }), " Defina", ' ', _jsx("code", { children: "VITE_GOOGLE_MAPS_API_KEY" }), " no arquivo ", _jsx("code", { children: ".env" }), " para habilitar o mapa."] }), _jsx(FallbackFeatureTable, {})] }));
    }
    if (loadError) {
        return (_jsx("div", { className: "container-fluid py-4", children: _jsxs("div", { className: "alert alert-danger", children: [_jsx("i", { className: "bi bi-x-circle me-2" }), "Erro ao carregar Google Maps: ", loadError.message] }) }));
    }
    if (!isLoaded) {
        return (_jsx("div", { className: "d-flex justify-content-center align-items-center", style: { minHeight: 400 }, children: _jsx("div", { className: "spinner-border text-primary", role: "status", children: _jsx("span", { className: "visually-hidden", children: "Carregando mapa..." }) }) }));
    }
    return (_jsxs("div", { className: "container-fluid py-3", children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-3", children: [_jsxs("h4", { className: "mb-0", children: [_jsx("i", { className: "bi bi-map me-2" }), "Mapa de Fazendas"] }), _jsxs("div", { className: "d-flex gap-2", children: [_jsxs("select", { className: "form-select form-select-sm", style: { width: 140 }, value: activeLayer, onChange: (e) => setActiveLayer(e.target.value), children: [_jsx("option", { value: "all", children: "Todas camadas" }), _jsx("option", { value: "areas", children: "\u00C1reas" }), _jsx("option", { value: "talhoes", children: "Talh\u00F5es" })] }), _jsxs("select", { className: "form-select form-select-sm", style: { width: 200 }, value: fazendaFilter, onChange: (e) => setFazendaFilter(e.target.value), children: [_jsx("option", { value: "", children: "Todas fazendas" }), fazendaOptions.map(([id, name]) => (_jsx("option", { value: id, children: name }, id)))] }), _jsx("button", { type: "button", className: "btn btn-outline-secondary btn-sm", title: "Centralizar na propriedade - for\u00E7a o mapa a centralizar na fazenda selecionada", onClick: () => centerOnCurrentFazenda(), children: "Centralizar na propriedade" })] })] }), geoLoading && (_jsxs("div", { className: "text-center text-muted py-2", children: [_jsx("div", { className: "spinner-border spinner-border-sm me-2", role: "status" }), "Carregando dados geogr\u00E1ficos..."] })), _jsxs("div", { className: "position-relative", children: [_jsx(GoogleMap, { mapContainerStyle: MAP_CONTAINER_STYLE, center: DEFAULT_CENTER, zoom: 5, onLoad: onMapLoad, options: {
                            mapTypeId: 'satellite',
                            mapTypeControl: true,
                            streetViewControl: false,
                        }, children: geoData?.features?.map((feature) => {
                            const paths = getPolygonPaths(feature.geometry);
                            if (!paths.length)
                                return null;
                            const isArea = feature.properties.entity_type === 'area';
                            const fillColor = isArea
                                ? AREA_COLORS[feature.properties.tipo || 'propria'] || '#4CAF50'
                                : TALHAO_COLOR;
                            return (_jsx(Polygon, { paths: paths, options: {
                                    fillColor,
                                    fillOpacity: 0.35,
                                    strokeColor: fillColor,
                                    strokeOpacity: 0.8,
                                    strokeWeight: 2,
                                }, onClick: () => setSelectedFeature(feature) }, feature.id));
                        }) }), selectedFeature && (_jsx(FazendaSidePanel, { feature: selectedFeature, onClose: () => setSelectedFeature(null) })), _jsx("div", { className: "card shadow-sm position-absolute bottom-0 start-0 m-3", style: { zIndex: 10, fontSize: '0.85rem' }, children: _jsxs("div", { className: "card-body py-2 px-3", children: [_jsx("strong", { className: "d-block mb-1", children: "Legenda" }), _jsxs("div", { className: "d-flex align-items-center gap-2 mb-1", children: [_jsx("span", { style: { width: 14, height: 14, backgroundColor: AREA_COLORS.propria, display: 'inline-block', borderRadius: 2 } }), "\u00C1rea Pr\u00F3pria"] }), _jsxs("div", { className: "d-flex align-items-center gap-2 mb-1", children: [_jsx("span", { style: { width: 14, height: 14, backgroundColor: AREA_COLORS.arrendada, display: 'inline-block', borderRadius: 2 } }), "\u00C1rea Arrendada"] }), _jsxs("div", { className: "d-flex align-items-center gap-2", children: [_jsx("span", { style: { width: 14, height: 14, backgroundColor: TALHAO_COLOR, display: 'inline-block', borderRadius: 2 } }), "Talh\u00E3o"] })] }) })] }), geoData && (_jsxs("div", { className: "text-muted small mt-2", children: [_jsx("i", { className: "bi bi-geo-alt me-1" }), geoData.features.length, " elemento(s) no mapa"] }))] }));
};
// ---------------------------------------------------------------------------
// Fallback table when Google Maps API key is not set
// ---------------------------------------------------------------------------
const FallbackFeatureTable = () => {
    const { data: geoData, isLoading } = useApiQuery(['fazendas-geo-fallback'], '/geo/');
    if (isLoading)
        return _jsx("div", { className: "spinner-border spinner-border-sm" });
    if (!geoData?.features?.length)
        return _jsx("p", { className: "text-muted", children: "Nenhuma geometria cadastrada." });
    return (_jsx("div", { className: "table-responsive", children: _jsxs("table", { className: "table table-sm table-striped", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Tipo" }), _jsx("th", { children: "Nome" }), _jsx("th", { children: "Fazenda" }), _jsx("th", { children: "Hectares" })] }) }), _jsx("tbody", { children: geoData.features.map((f) => (_jsxs("tr", { children: [_jsx("td", { children: _jsx("span", { className: `badge bg-${f.properties.entity_type === 'area' ? 'success' : 'info'}`, children: f.properties.entity_type === 'area' ? 'Área' : 'Talhão' }) }), _jsx("td", { children: f.properties.name }), _jsx("td", { children: f.properties.fazenda_name }), _jsx("td", { children: (f.properties.area_hectares ?? f.properties.area_size_ha)
                                    ? `${Number(f.properties.area_hectares ?? f.properties.area_size_ha).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha`
                                    : '—' })] }, f.id))) })] }) }));
};
export default FazendaMap;
