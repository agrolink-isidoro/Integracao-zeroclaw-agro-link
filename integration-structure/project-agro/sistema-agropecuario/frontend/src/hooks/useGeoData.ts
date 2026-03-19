import { useMemo } from 'react';
import { useApiQuery } from './useApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface GeoFeatureProperties {
  entity_type: 'area' | 'talhao';
  id: number;
  name: string;
  tipo?: string;
  fazenda_id: number;
  fazenda_name: string;
  area_hectares?: number;
  area_size_ha?: number | null;
  area_id?: number;
  area_name?: string;
}

export interface GeoFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  properties: GeoFeatureProperties;
}

export interface GeoFeatureCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

export interface UseGeoDataParams {
  layer?: 'all' | 'areas' | 'talhoes';
  fazendaId?: string | null;
}

export interface UseGeoDataResult {
  data: GeoFeatureCollection | null;
  isLoading: boolean;
  error: Error | null;
  fazendaOptions: Array<[number, string]>;
}

// ---------------------------------------------------------------------------
// Hook: useGeoData
// Abstracts API query for GeoJSON features with caching & memoization
// ---------------------------------------------------------------------------
export function useGeoData({ layer = 'all', fazendaId }: UseGeoDataParams): UseGeoDataResult {
  // Build query URL with params
  const geoUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (layer !== 'all') params.set('layer', layer);
    if (fazendaId) params.set('fazenda', fazendaId);
    const qs = params.toString();
    return `/geo/${qs ? `?${qs}` : ''}`;
  }, [layer, fazendaId]);

  // Fetch from API
  const { data: geoData, isLoading, error } = useApiQuery<GeoFeatureCollection>(
    ['fazendas-geo', layer, fazendaId],
    geoUrl
  );

  // Extract unique fazendas with valid geometry (memoized)
  const fazendaOptions = useMemo(() => {
    if (!geoData?.features) return [];
    const map = new Map<number, string>();
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
    error: error as Error | null,
    fazendaOptions,
  };
}

// ---------------------------------------------------------------------------
// Utility: Convert GeoJSON coordinates to Google Maps LatLng[]
// ---------------------------------------------------------------------------
export function coordsToLatLngs(coords: number[][]): google.maps.LatLngLiteral[] {
  return coords.map(([lng, lat]) => ({ lat, lng }));
}

// ---------------------------------------------------------------------------
// Utility: Get polygon paths from GeoJSON geometry
// ---------------------------------------------------------------------------
export function getPolygonPaths(geometry: GeoFeature['geometry']): google.maps.LatLngLiteral[][] {
  if (geometry.type === 'Polygon') {
    return (geometry.coordinates as number[][][]).map(coordsToLatLngs);
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as number[][][][]).flatMap((poly) =>
      poly.map(coordsToLatLngs)
    );
  }
  return [];
}

// ---------------------------------------------------------------------------
// Utility: Compute bounds from features
// ---------------------------------------------------------------------------
export function computeBoundsFromFeatures(
  features: GeoFeature[],
  filter?: (f: GeoFeature) => boolean
): google.maps.LatLngBounds | null {
  if (!features.length) return null;

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
