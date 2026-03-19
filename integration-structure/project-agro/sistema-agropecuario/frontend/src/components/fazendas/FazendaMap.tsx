import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { Link } from 'react-router-dom';
import { useGeoData, GeoFeature, computeBoundsFromFeatures } from '../../hooks/useGeoData';
import GeoPolygonRenderer, { AREA_COLORS, TALHAO_COLOR } from './GeoPolygonRenderer';
import GeoSidePanel from './GeoSidePanel';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MAP_CONTAINER_STYLE = { width: '100%', height: 'calc(100vh - 200px)', minHeight: '500px' };

// Default center: Brazil central
const DEFAULT_CENTER = { lat: -15.8, lng: -47.9 };

// ---------------------------------------------------------------------------
// Component: GeoLegend
// ---------------------------------------------------------------------------
interface GeoLegendProps {
  featureCount: number;
}

const GeoLegend: React.FC<GeoLegendProps> = ({ featureCount }) => (
  <div
    className="card shadow-sm position-absolute bottom-0 start-0 m-3"
    style={{ zIndex: 10, fontSize: '0.85rem' }}
  >
    <div className="card-body py-2 px-3">
      <strong className="d-block mb-1">Legenda</strong>
      <div className="d-flex align-items-center gap-2 mb-1">
        <span
          style={{
            width: 14,
            height: 14,
            backgroundColor: AREA_COLORS.propria,
            display: 'inline-block',
            borderRadius: 2,
          }}
        ></span>
        Área Própria
      </div>
      <div className="d-flex align-items-center gap-2 mb-1">
        <span
          style={{
            width: 14,
            height: 14,
            backgroundColor: AREA_COLORS.arrendada,
            display: 'inline-block',
            borderRadius: 2,
          }}
        ></span>
        Área Arrendada
      </div>
      <div className="d-flex align-items-center gap-2">
        <span
          style={{
            width: 14,
            height: 14,
            backgroundColor: TALHAO_COLOR,
            display: 'inline-block',
            borderRadius: 2,
          }}
        ></span>
        Talhão
      </div>
    </div>
    {featureCount > 0 && (
      <div className="text-muted small px-3 pb-2 border-top pt-2">
        <i className="bi bi-geo-alt me-1"></i>
        {featureCount} elemento(s) no mapa
      </div>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// Component: FallbackFeatureTable
// ---------------------------------------------------------------------------
interface FallbackFeatureTableProps {
  geoData: any;
  isLoading: boolean;
}

const FallbackFeatureTable: React.FC<FallbackFeatureTableProps> = ({ geoData, isLoading }) => {
  if (isLoading) return <div className="spinner-border spinner-border-sm"></div>;
  if (!geoData?.features?.length)
    return <p className="text-muted">Nenhuma geometria cadastrada.</p>;

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
          {geoData.features.map((f: any) => (
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

  // Initialize fazenda filter with user's primary fazenda
  const [fazendaFilter, setFazendaFilter] = useState<string>('');

  // Sync fazenda filter when user loads (handles async auth)
  useEffect(() => {
    if (user && !fazendaFilter) {
      try {
        const primaryFazendaId = (user as any)?.fazenda ?? (user as any)?.fazenda_id ?? null;
        if (primaryFazendaId) {
          setFazendaFilter(String(primaryFazendaId));
        }
      } catch (e) {
        // If we can't get fazenda_id, just leave filter empty
      }
    }
  }, [user?.id]); // Re-run only if user.id changes (not whole user object)

  // Ensure we only auto-focus once per mount
  const didAutoFocusRef = useRef(false);

  // Use the new useGeoData hook
  const { data: geoData, isLoading: geoLoading, fazendaOptions } = useGeoData({
    layer: activeLayer,
    fazendaId: fazendaFilter || null,
  });

  // Compute map bounds from features
  const bounds = useMemo(() => {
    if (!geoData?.features?.length || !isLoaded) return null;
    return computeBoundsFromFeatures(geoData.features);
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

  // Auto-select and focus the user's primary fazenda (if any)
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

    const b = computeBoundsFromFeatures(fazendaFeatures);
    if (b && !b.isEmpty()) {
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
      const allBounds = computeBoundsFromFeatures(geoData.features);
      if (allBounds && !allBounds.isEmpty()) {
        mapRef.current.fitBounds(allBounds, 50);
      }
      return;
    }

    // Get all features for this fazenda
    const fazendaFeatures = geoData.features.filter((f) => f.properties.fazenda_id === fazendaId);
    if (!fazendaFeatures.length) return;

    const b = computeBoundsFromFeatures(fazendaFeatures);
    if (b && !b.isEmpty()) {
      mapRef.current.fitBounds(b, 50);
    }
  }, [mapRef, geoData, selectedFeature, fazendaFilter, user]);

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
        <FallbackFeatureTable geoData={geoData} isLoading={geoLoading} />
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
          Nenhuma área ou talhão com coordenadas (KML/Geometria) cadastrados. Por favor, adicione
          geometrias aos seus registros para visualizá-los no mapa.
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
            {/* Render polygons for all features */}
            <GeoPolygonRenderer
              features={geoData.features}
              onFeatureClick={setSelectedFeature}
            />
          </GoogleMap>

          {/* Side panel */}
          {selectedFeature && (
            <GeoSidePanel
              feature={selectedFeature}
              onClose={() => setSelectedFeature(null)}
            />
          )}

          {/* Legend */}
          <GeoLegend featureCount={geoData.features.length} />
        </div>
      )}
    </div>
  );
};

export default FazendaMap;
