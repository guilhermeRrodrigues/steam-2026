"use client";

import dynamic from "next/dynamic";

// Leaflet usa `window`, então o mapa só é carregado no navegador.
export const Mapa = dynamic(() => import("./MapaGarca"), {
  ssr: false,
  loading: () => <div className="h-[300px] rounded-xl bg-trilho animate-pulse" aria-label="Carregando mapa" />,
});

export { LegendaMapa, statusEspera } from "./LegendaMapa";
