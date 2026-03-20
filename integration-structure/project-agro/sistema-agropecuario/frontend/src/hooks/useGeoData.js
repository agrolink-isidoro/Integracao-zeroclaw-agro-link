import { useMemo } from 'react';
import { useApiQuery } from './useApi';
// ---------------------------------------------------------------------------
// Hook: useGeoData
// Abstracts API query for GeoJSON features with caching & memoization
// ---------------------------------------------------------------------------
export function useGeoData({ layer = 'all', fazendaId }) {
    // Build query URL with params
    const geoUrl = useMemo(() => {
        const params = new URLSearchParams();
        if (layer !== 'all')
            params.set('layer', layer);
        if (fazendaId)
            params.set('fazenda', fazendaId);
        const qs = params.toString();
        return `/geo/${qs ? `?${qs}` : ''}`;
    }, [layer, fazendaId]);
    // Fetch from API
    const { data: geoData, isLoading, error } = useApiQuery(['fazendas-geo', layer, fazendaId], geoUrl);
    // Extract unique fazendas with valid geometry (memoized)
    const fazendaOptions = useMemo(() => {
        if (!geoData?.features)
            return [];
        const map = new Map();
        geoData.features.forEach((f) => {
            // Only include fazendas with at least one feature with valid geometry
            if (f.properties.fazenda_id) {
                map.set(f.properties.fazenda_id, f.properties.fazenda_name);
            }
        });
        return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    }, [geoData]);
    return {
        data: geoData || null,
        isLoading,
        error: error,
        fazendaOptions,
    };
}
// ---------------------------------------------------------------------------
// Utility: Convert GeoJSON coordinates to Google Maps LatLng[]
// ---------------------------------------------------------------------------
export function coordsToLatLngs(coords) {
    return coords.map(([lng, lat]) => ({ lat, lng }));
}
// ---------------------------------------------------------------------------
// Utility: Get polygon paths from GeoJSON geometry
// ---------------------------------------------------------------------------
export function getPolygonPaths(geometry) {
    if (geometry.type === 'Polygon') {
        return geometry.coordinates.map(coordsToLatLngs);
    }
    if (geometry.type === 'MultiPolygon') {
        return geometry.coordinates.flatMap((poly) => poly.map(coordsToLatLngs));
    }
    return [];
}
// ---------------------------------------------------------------------------
// Utility: Check if a feature has real KML coordinates (not near 0,0 placeholder)
// ---------------------------------------------------------------------------
export function hasRealCoordinates(feature) {
    const paths = getPolygonPaths(feature.geometry);
    for (const ring of paths) {
        for (const pt of ring) {
            if (Math.abs(pt.lat) > 0.01 || Math.abs(pt.lng) > 0.01)
                return true;
        }
    }
    return false;
}
// ---------------------------------------------------------------------------
// Utility: Compute bounds from features
// ---------------------------------------------------------------------------
export function computeBoundsFromFeatures(features, filter) {
    if (!features.length)
        return null;
    const b = new google.maps.LatLngBounds();
    let hasPoints = false;
    const featuresToProcess = filter ? features.filter(filter) : features;
    featuresToProcess.forEach((f) => {
        const paths = getPolygonPaths(f.geometry);
        paths.forEach((ring) => {
            ring.forEach((pt) => {
                b.extend(pt);
                hasPoints = true;
            });
        });
    });
    return hasPoints && !b.isEmpty() ? b : null;
}
