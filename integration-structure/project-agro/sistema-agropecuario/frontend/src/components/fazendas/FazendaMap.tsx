import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { GoogleMap, useJsApiLoader, Polygon } from '@react-google-maps/api';
import { useApiQuery } from '../../hooks/useApi';
import { Link } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface GeoFeatureProperties {
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

interface GeoFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  properties: GeoFeatureProperties;
}

interface GeoFeatureCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MAP_CONTAINER_STYLE = { width: '100%', height: 'calc(100vh - 200px)', minHeight: '500px' };

const AREA_COLORS: Record<string, string> = {
  propria: '#2E7D32',
  arrendada: '#F57F17',
};

const TALHAO_COLOR = '#1565C0';

// Default center: Brazil central
const DEFAULT_CENTER = { lat: -15.8, lng: -47.9 };

// ---------------------------------------------------------------------------
// Helper: convert GeoJSON coordinates to Google Maps LatLng[]
// ---------------------------------------------------------------------------
function coordsToLatLngs(coords: number[][]): google.maps.LatLngLiteral[] {
  return coords.map(([lng, lat]) => ({ lat, lng }));
}

function getPolygonPaths(geometry: GeoFeature['geometry']): google.maps.LatLngLiteral[][] {
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
// Sub-component: Side Panel
// ---------------------------------------------------------------------------
interface SidePanelProps {
  feature: GeoFeature;
  onClose: () => void;
}

const FazendaSidePanel: React.FC<SidePanelProps> = ({ feature, onClose }) => {
  const p = feature.properties;
  const isArea = p.entity_type === 'area';
  const hectares = isArea ? p.area_hectares : p.area_size_ha;

  return (
    <div
      className="card shadow-lg position-absolute top-0 end-0 m-3"
      style={{ width: '320px', zIndex: 10, maxHeight: 'calc(100% - 24px)', overflowY: 'auto' }}
    >
      <div className="card-header d-flex justify-content-between align-items-center bg-primary text-white">
        <h6 className="mb-0">
          <i className={`bi ${isArea ? 'bi-map' : 'bi-grid-3x3-gap'} me-2`}></i>
          {p.name}
        </h6>
        <button className="btn btn-sm btn-light" onClick={onClose}>
          <i className="bi bi-x-lg"></i>
        </button>
      </div>
      <div className="card-body">
        <table className="table table-sm mb-3">
          <tbody>
            <tr>
              <th>Tipo</th>
              <td>
                <span className={`badge bg-${isArea ? (p.tipo === 'propria' ? 'success' : 'warning') : 'info'}`}>
                  {isArea ? (p.tipo === 'propria' ? 'Própria' : 'Arrendada') : 'Talhão'}
                </span>
              </td>
            </tr>
            <tr>
              <th>Fazenda</th>
              <td>{p.fazenda_name}</td>
            </tr>
            {!isArea && p.area_name && (
              <tr>
                <th>Área</th>
                <td>{p.area_name}</td>
              </tr>
            )}
            {hectares != null && (
              <tr>
                <th>Hectares</th>
                <td>{Number(hectares).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="d-grid gap-2">
          {isArea ? (
            <Link to={`/fazendas/areas`} className="btn btn-outline-primary btn-sm">
              <i className="bi bi-eye me-1"></i>Ver Áreas
            </Link>
          ) : (
            <Link to={`/fazendas/talhoes`} className="btn btn-outline-primary btn-sm">
              <i className="bi bi-eye me-1"></i>Ver Talhões
            </Link>
          )}
          <Link to={`/fazendas/fazendas`} className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-house-door me-1"></i>Ir para Fazenda
          </Link>
          <Link to="/agricultura/colheitas" className="btn btn-outline-success btn-sm">
            <i className="bi bi-basket me-1"></i>Ver Colheitas
          </Link>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const FazendaMap: React.FC = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    id: 'fazenda-map',
  });

  const [selectedFeature, setSelectedFeature] = useState<GeoFeature | null>(null);
  const [activeLayer, setActiveLayer] = useState<'all' | 'areas' | 'talhoes'>('all');
  const { user } = useAuthContext();

  const [fazendaFilter, setFazendaFilter] = useState<string>(() => {
    try {
      const id = (user as any)?.fazenda ?? (user as any)?.fazenda_id ?? null;
      return id ? String(id) : '';
    } catch {
      return '';
    }
  });

  // Ensure we only auto-focus once per mount
  const didAutoFocusRef = useRef(false);

  // Fetch GeoJSON
  const geoUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (activeLayer !== 'all') params.set('layer', activeLayer);
    if (fazendaFilter) params.set('fazenda', fazendaFilter);
    const qs = params.toString();
    return `/geo/${qs ? `?${qs}` : ''}`;
  }, [activeLayer, fazendaFilter]);

  const { data: geoData, isLoading: geoLoading } = useApiQuery<GeoFeatureCollection>(
    ['fazendas-geo', activeLayer, fazendaFilter],
    geoUrl
  );

  // Compute map bounds from features
  const bounds = useMemo(() => {
    if (!geoData?.features?.length || !isLoaded) return null;
    const b = new google.maps.LatLngBounds();
    geoData.features.forEach((f) => {
      const paths = getPolygonPaths(f.geometry);
      paths.forEach((ring) => ring.forEach((pt) => b.extend(pt)));
    });
    return b;
  }, [geoData, isLoaded]);

  const mapRef = useRef<google.maps.Map | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (bounds && !bounds.isEmpty()) {
      map.fitBounds(bounds, 50);
    }
  }, [bounds]);

  // Ensure map recenters when geo data / bounds change after initial load
  useEffect(() => {
    if (!mapRef.current || !bounds) return;
    try {
      if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds, 50);
    } catch (e) {
      console.debug('fitBounds failed', e);
    }
  }, [bounds]);

  // Auto-select and focus the user's primary fazenda (if any) - or first available if no user fazenda
  useEffect(() => {
    if (didAutoFocusRef.current) return;
    if (!geoData?.features?.length || !mapRef.current) return;

    // Prefer explicit filter or user's primary fazenda; otherwise pick the first fazenda present
    let id: number | null = null;
    try {
      id = fazendaFilter ? Number(fazendaFilter) : (user as any)?.fazenda ?? null;
    } catch {
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

    if (!id) return;

    // Get all features for this fazenda and compute bounds
    const fazendaFeatures = geoData.features.filter((f) => f.properties.fazenda_id === id);
    if (!fazendaFeatures.length) return;

    // Compute bounds for all features in this fazenda
    const b = new google.maps.LatLngBounds();
    let hasPoints = false;
    fazendaFeatures.forEach((f) => {
      const paths = getPolygonPaths(f.geometry);
      paths.forEach((ring) => {
        ring.forEach((pt) => {
          b.extend(pt);
          hasPoints = true;
        });
      });
    });

    if (hasPoints && !b.isEmpty()) {
      mapRef.current.fitBounds(b, 50);
    }

    // select first feature to open side panel
    setSelectedFeature(fazendaFeatures[0]);

    didAutoFocusRef.current = true;
  }, [geoData, user, fazendaFilter]);

  // Manual center handler used by the UI button
  const centerOnCurrentFazenda = useCallback(() => {
    if (!mapRef.current || !geoData?.features?.length) return;

    // Build bounds for all features of the current fazenda
    let fazendaId: number | null = null;
    
    // Prefer currently selected feature's fazenda
    if (selectedFeature) {
      fazendaId = selectedFeature.properties.fazenda_id;
    } else {
      // Otherwise prefer filter/user, otherwise first
      try {
        fazendaId = fazendaFilter ? Number(fazendaFilter) : (user as any)?.fazenda ?? null;
      } catch {
        fazendaId = null;
      }
    }

    if (!fazendaId) {
      // If no fazenda selected, center on all available features
      const allBounds = new google.maps.LatLngBounds();
      let hasPoints = false;
      geoData.features.forEach((f) => {
        const paths = getPolygonPaths(f.geometry);
        paths.forEach((ring) => {
          ring.forEach((pt) => {
            allBounds.extend(pt);
            hasPoints = true;
          });
        });
      });
      if (hasPoints && !allBounds.isEmpty()) {
        mapRef.current.fitBounds(allBounds, 50);
      }
      return;
    }

    // Get all features for this fazenda
    const fazendaFeatures = geoData.features.filter((f) => f.properties.fazenda_id === fazendaId);
    if (!fazendaFeatures.length) return;

    // Compute bounds for all features in this fazenda
    const b = new google.maps.LatLngBounds();
    let hasPoints = false;
    fazendaFeatures.forEach((f) => {
      const paths = getPolygonPaths(f.geometry);
      paths.forEach((ring) => {
        ring.forEach((pt) => {
          b.extend(pt);
          hasPoints = true;
        });
      });
    });

    if (hasPoints && !b.isEmpty()) {
      mapRef.current.fitBounds(b, 50);
    }
  }, [mapRef, geoData, selectedFeature, fazendaFilter, user]);

  // Unique fazendas for filter dropdown (only those with geometry)
  const fazendaOptions = useMemo(() => {
    if (!geoData?.features) return [];
    const map = new Map<number, string>();
    geoData.features.forEach((f) => {
      // Only include fazendas that have at least one feature with valid geometry
      const paths = getPolygonPaths(f.geometry);
      if (paths.length > 0) {
        map.set(f.properties.fazenda_id, f.properties.fazenda_name);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [geoData]);

  // ---------------------------------------------------------------------------
  // Fallback: no API key
  // ---------------------------------------------------------------------------
  if (!apiKey) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-warning">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <strong>Google Maps API Key não configurada.</strong> Defina{' '}
          <code>VITE_GOOGLE_MAPS_API_KEY</code> no arquivo <code>.env</code> para habilitar o mapa.
        </div>
        {/* Still show a table-based fallback with GeoJSON features */}
        <FallbackFeatureTable />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger">
          <i className="bi bi-x-circle me-2"></i>Erro ao carregar Google Maps: {loadError.message}
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 400 }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando mapa...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">
          <i className="bi bi-map me-2"></i>Mapa de Fazendas
        </h4>
        <div className="d-flex gap-2">
          {/* Layer toggle */}
          <select
            className="form-select form-select-sm"
            style={{ width: 140 }}
            value={activeLayer}
            onChange={(e) => setActiveLayer(e.target.value as 'all' | 'areas' | 'talhoes')}
          >
            <option value="all">Todas camadas</option>
            <option value="areas">Áreas</option>
            <option value="talhoes">Talhões</option>
          </select>

          {/* Fazenda filter */}
          <select
            className="form-select form-select-sm"
            style={{ width: 200 }}
            value={fazendaFilter}
            onChange={(e) => setFazendaFilter(e.target.value)}
            disabled={fazendaOptions.length === 0 || geoLoading}
            title={fazendaOptions.length === 0 ? 'Nenhuma fazenda com coordenadas cadastradas' : ''}
          >
            <option value="">Todas fazendas</option>
            {fazendaOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            title="Centralizar na propriedade - força o mapa a centralizar na fazenda selecionada"
            onClick={() => centerOnCurrentFazenda()}
          >
            Centralizar na propriedade
          </button>
        </div>
      </div>

      {geoLoading && (
        <div className="text-center text-muted py-2">
          <div className="spinner-border spinner-border-sm me-2" role="status"></div>
          Carregando dados geográficos...
        </div>
      )}

      {!geoLoading && geoData?.features?.length === 0 && (
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          Nenhuma área ou talhão com coordenadas (KML/Geometria) cadastrados. 
          Por favor, adicione geometrias aos seus registros para visualizá-los no mapa.
        </div>
      )}

      {!geoLoading && geoData?.features && geoData.features.length > 0 && (
        <div className="position-relative">
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={DEFAULT_CENTER}
            zoom={5}
            onLoad={onMapLoad}
            options={{
              mapTypeId: 'satellite',
              mapTypeControl: true,
              streetViewControl: false,
            }}
          >
            {geoData?.features?.map((feature) => {
              const paths = getPolygonPaths(feature.geometry);
              if (!paths.length) return null;

              const isArea = feature.properties.entity_type === 'area';
              const fillColor = isArea
                ? AREA_COLORS[feature.properties.tipo || 'propria'] || '#4CAF50'
                : TALHAO_COLOR;

              return (
                <Polygon
                  key={feature.id}
                  paths={paths}
                  options={{
                    fillColor,
                    fillOpacity: 0.35,
                    strokeColor: fillColor,
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                  }}
                  onClick={() => setSelectedFeature(feature)}
                />
              );
            })}
          </GoogleMap>

          {/* Side panel */}
          {selectedFeature && (
            <FazendaSidePanel
              feature={selectedFeature}
              onClose={() => setSelectedFeature(null)}
            />
          )}

          {/* Legend */}
          <div
            className="card shadow-sm position-absolute bottom-0 start-0 m-3"
            style={{ zIndex: 10, fontSize: '0.85rem' }}
          >
            <div className="card-body py-2 px-3">
              <strong className="d-block mb-1">Legenda</strong>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span style={{ width: 14, height: 14, backgroundColor: AREA_COLORS.propria, display: 'inline-block', borderRadius: 2 }}></span>
                Área Própria
              </div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span style={{ width: 14, height: 14, backgroundColor: AREA_COLORS.arrendada, display: 'inline-block', borderRadius: 2 }}></span>
                Área Arrendada
              </div>
              <div className="d-flex align-items-center gap-2">
                <span style={{ width: 14, height: 14, backgroundColor: TALHAO_COLOR, display: 'inline-block', borderRadius: 2 }}></span>
                Talhão
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature count */}
      {geoData && (
        <div className="text-muted small mt-2">
          <i className="bi bi-geo-alt me-1"></i>
          {geoData.features.length} elemento(s) no mapa
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Fallback table when Google Maps API key is not set
// ---------------------------------------------------------------------------
const FallbackFeatureTable: React.FC = () => {
  const { data: geoData, isLoading } = useApiQuery<GeoFeatureCollection>(
    ['fazendas-geo-fallback'],
    '/geo/'
  );

  if (isLoading) return <div className="spinner-border spinner-border-sm"></div>;
  if (!geoData?.features?.length) return <p className="text-muted">Nenhuma geometria cadastrada.</p>;

  return (
    <div className="table-responsive">
      <table className="table table-sm table-striped">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Nome</th>
            <th>Fazenda</th>
            <th>Hectares</th>
          </tr>
        </thead>
        <tbody>
          {geoData.features.map((f) => (
            <tr key={f.id}>
              <td>
                <span className={`badge bg-${f.properties.entity_type === 'area' ? 'success' : 'info'}`}>
                  {f.properties.entity_type === 'area' ? 'Área' : 'Talhão'}
                </span>
              </td>
              <td>{f.properties.name}</td>
              <td>{f.properties.fazenda_name}</td>
              <td>
                {(f.properties.area_hectares ?? f.properties.area_size_ha)
                  ? `${Number(f.properties.area_hectares ?? f.properties.area_size_ha).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} ha`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FazendaMap;
