import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
const MapViewer = ({ farms }) => {
    return (_jsxs(MapContainer, { center: [-15.7801, -47.9292], zoom: 4, style: { height: '400px' }, children: [_jsx(TileLayer, { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: '\u00A9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }), farms.map(farm => (_jsx(Marker, { position: [farm.lat, farm.lng], children: _jsx(Popup, { children: farm.name }) }, farm.id)))] }));
};
export default MapViewer;
