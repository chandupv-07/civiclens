// @ts-nocheck
"use client";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const colors = ["", "#22c55e", "#84cc16", "#eab308", "#f97316", "#dc2626"];

export default function MapView({ reports }) {
  const c = reports[0] ? [reports[0].lat, reports[0].lng] : [12.9716, 77.5946];
  return (
    <MapContainer center={c} zoom={12} style={{ height: 420, width: "100%" }} className="rounded border">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      {reports.map((r) => (
        <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={10}
          pathOptions={{ color: colors[r.severity], fillColor: colors[r.severity], fillOpacity: 0.8 }}>
          <Popup>
            <b>{r.category}</b> · severity {r.severity}/5<br />{r.severity_reason}<br />{r.department ?? "Human review"}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
