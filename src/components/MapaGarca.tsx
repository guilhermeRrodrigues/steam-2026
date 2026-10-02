"use client";

import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from "react-leaflet";
import { CENTRO_GARCA, POSTOS, TOTENS, type DadosVivos } from "@/data/garca";
import { estaAberto } from "@/lib/geo";
import { statusEspera } from "./LegendaMapa";

interface Props {
  dados: DadosVivos;
  hora: number;
  altura?: number;
  zoom?: number;
  destaqueTotemId?: string;
  destaquePostoId?: string;
  centro?: { lat: number; lng: number };
}

export default function MapaGarca({ dados, hora, altura = 420, zoom = 14, destaqueTotemId, destaquePostoId, centro }: Props) {
  const totem = TOTENS.find((t) => t.id === destaqueTotemId);
  const posto = POSTOS.find((p) => p.id === destaquePostoId);
  return (
    <div style={{ height: altura }} className="rounded-xl overflow-hidden border border-borda">
      {/* Sem animações: o Leaflet falha ("_leaflet_pos") se a tela é trocada no meio de um zoom animado. */}
      <MapContainer
        center={centro ?? CENTRO_GARCA}
        zoom={zoom}
        scrollWheelZoom={false}
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {totem && posto && (
          <Polyline positions={[totem, posto]} pathOptions={{ color: "#2a78d6", weight: 3, dashArray: "6 6" }} />
        )}
        {POSTOS.map((p) => {
          const aberto = estaAberto(p, dados, hora);
          const st = statusEspera(dados.espera[p.id] ?? 0, aberto);
          const destaque = p.id === destaquePostoId;
          return (
            <CircleMarker
              key={p.id}
              center={p}
              radius={destaque ? 14 : p.tipo === "Hospital" ? 11 : 9}
              pathOptions={{ color: destaque ? "#111" : "#fff", weight: destaque ? 3 : 2, fillColor: st.cor, fillOpacity: 0.95 }}
            >
              <Tooltip>
                <strong>{p.nome}</strong>
                <br />
                {p.endereco}
                <br />
                {st.rotulo}
                {aberto ? ` · espera ${dados.espera[p.id]} min` : ""}
              </Tooltip>
            </CircleMarker>
          );
        })}
        {TOTENS.map((t) => (
          <CircleMarker
            key={t.id}
            center={t}
            radius={t.id === destaqueTotemId ? 10 : 7}
            pathOptions={{ color: "#fff", weight: 2, fillColor: "#2a78d6", fillOpacity: 1 }}
          >
            <Tooltip>{t.nome}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
