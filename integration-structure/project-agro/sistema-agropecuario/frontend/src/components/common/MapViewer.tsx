import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Farm {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

interface MapViewerProps {
  farms: Farm[];
}

const MapViewer: React.FC<MapViewerProps> = ({ farms }) => {
  return (
    <MapContainer center={[-15.7801, -47.9292]} zoom={4} style={{ height: '400px' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {farms.map(farm => (
        <Marker key={farm.id} position={[farm.lat, farm.lng]}>
          <Popup>{farm.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapViewer;