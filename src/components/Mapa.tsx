"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { Protecao } from "./Protecao";

// Leaflet usa `window`, então o mapa só é carregado no navegador.
const MapaGarca = dynamic(() => import("./MapaGarca"), {
  ssr: false,
  loading: () => <div className="h-[300px] rounded-xl bg-trilho animate-pulse" aria-label="Carregando mapa" />,
});

/** Mapa isolado: se o Leaflet falhar, só o mapa some e o resto da tela continua. */
export function Mapa(props: ComponentProps<typeof MapaGarca>) {
  return (
    <Protecao nome="Mapa">
      <MapaGarca {...props} />
    </Protecao>
  );
}

export { LegendaMapa, statusEspera } from "./LegendaMapa";
