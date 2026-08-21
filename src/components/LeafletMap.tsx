import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ROOMS } from "@/lib/rooms";

const TN_CENTER: [number, number] = [21.5942, 105.8482];

function makePinIcon(active: boolean) {
  const size = active ? 44 : 32;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"
      fill="hsl(12 76% 49%)" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
      style="filter: drop-shadow(0 4px 6px rgba(0,0,0,${active ? 0.4 : 0.2})); transition: all .25s ease;">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3" fill="white" stroke="none"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "roomy-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

function FlyToActive({ activeId }: { activeId: string }) {
  const map = useMap();
  useEffect(() => {
    const r = ROOMS.find((x) => x.id === activeId);
    if (r) map.flyTo([r.lat, r.lng], 15, { duration: 0.8 });
  }, [activeId, map]);
  return null;
}

export default function LeafletMap({
  activeId,
  setActiveId,
}: {
  activeId: string;
  setActiveId: (id: string) => void;
}) {
  return (
    <MapContainer
      center={TN_CENTER}
      zoom={13}
      scrollWheelZoom={false}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {ROOMS.map((r) => (
        <Marker
          key={r.id}
          position={[r.lat, r.lng]}
          icon={makePinIcon(activeId === r.id)}
          eventHandlers={{ click: () => setActiveId(r.id) }}
          zIndexOffset={activeId === r.id ? 1000 : 0}
        />
      ))}
      <FlyToActive activeId={activeId} />
    </MapContainer>
  );
}
