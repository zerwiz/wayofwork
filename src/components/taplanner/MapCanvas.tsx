import React, { useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapCanvasProps {
    onCapture: (canvas: HTMLDivElement) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({ onCapture }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const [markers, setMarkers] = useState<[number, number][]>([]);

    const MapEvents = () => {
        useMapEvents({
            click(e) {
                setMarkers(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
            },
        });
        return null;
    };

    return (
        <div ref={mapRef} className="h-96 w-full relative">
            <MapContainer center={[59.3293, 18.0686]} zoom={13} className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapEvents />
                {markers.map((pos, idx) => (
                    <Marker key={idx} position={pos} />
                ))}
            </MapContainer>
            <button
                onClick={() => mapRef.current && onCapture(mapRef.current)}
                className="absolute top-2 right-2 z-[1000] bg-[#ea580c] text-white px-3 py-1 rounded shadow-lg text-xs"
            >
                Capture Screenshot
            </button>
        </div>
    );
};
