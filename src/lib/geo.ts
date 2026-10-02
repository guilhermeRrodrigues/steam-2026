import { POSTOS, type DadosVivos, type Posto } from "@/data/garca";

export interface Ponto {
  lat: number;
  lng: number;
}

/** Distância em km entre dois pontos (fórmula de haversine). */
export function distanciaKm(a: Ponto, b: Ponto): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "800 metros" ou "1,2 quilômetros" — pronto para ser falado. */
export function distanciaFalada(km: number): string {
  if (km < 1) return `${Math.max(100, Math.round((km * 1000) / 100) * 100)} metros`;
  return `${km.toFixed(1).replace(".", ",")} quilômetros`;
}

export function estaAberto(posto: Posto, dados: DadosVivos, hora: number): boolean {
  if (!dados.funcionando[posto.id]) return false;
  if (posto.h24) return true;
  return hora >= posto.abre && hora < posto.fecha;
}

export interface PostoRanqueado {
  posto: Posto;
  km: number;
  espera: number;
  /** Minutos estimados até ser atendido: caminhada (12 min/km) + fila. */
  tempoTotal: number;
}

interface OpcoesRanking {
  hora: number;
  somenteAbertos?: boolean;
  /** Exige estoque deste remédio. */
  remedioId?: string;
  /** Exige esta vacina. */
  vacinaId?: string;
  incluirHospital?: boolean;
}

/**
 * Ordena os postos pelo tempo total até o atendimento, não só pela distância:
 * um posto 300 m mais longe e com fila de 5 minutos é melhor que um vizinho lotado.
 */
export function ranquearPostos(origem: Ponto, dados: DadosVivos, opcoes: OpcoesRanking): PostoRanqueado[] {
  const { hora, somenteAbertos = true, remedioId, vacinaId, incluirHospital = true } = opcoes;
  return POSTOS.filter((p) => {
    if (!incluirHospital && p.tipo === "Hospital") return false;
    if (somenteAbertos && !estaAberto(p, dados, hora)) return false;
    if (remedioId && !(p.farmacia && (dados.estoque[p.id]?.[remedioId] ?? 0) > 0)) return false;
    if (vacinaId && !dados.vacinas[p.id]?.includes(vacinaId)) return false;
    return true;
  })
    .map((posto) => {
      const km = distanciaKm(origem, posto);
      const espera = dados.espera[posto.id] ?? 0;
      return { posto, km, espera, tempoTotal: Math.round(km * 12 + espera) };
    })
    .sort((a, b) => a.tempoTotal - b.tempoTotal);
}
