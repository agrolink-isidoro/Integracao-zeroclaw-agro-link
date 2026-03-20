import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useMemo } from 'react';
import { Polygon } from '@react-google-maps/api';
import { getPolygonPaths } from '../../hooks/useGeoData';
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const AREA_COLORS = {
    propria: '#2E7D32',
    arrendada: '#F57F17',
};
export const TALHAO_COLOR = '#1565C0';
// ---------------------------------------------------------------------------
// Component: GeoPolygonRenderer
// Renders polygons on Google Maps from GeoFeatures
// ---------------------------------------------------------------------------
const GeoPolygonRenderer = ({ features, onFeatureClick }) => {
    const polygons = useMemo(() => {
        return features.map((feature) => {
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
                }, onClick: () => onFeatureClick(feature) }, feature.id));
        });
    }, [features, onFeatureClick]);
    return _jsx(_Fragment, { children: polygons });
};
export default GeoPolygonRenderer;
