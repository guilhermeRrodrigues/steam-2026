"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BAIRROS,
  POSTOS,
  REMEDIOS,
  TOTENS,
  dadosIniciais,
  postoPorId,
  remedioPorId,
  type DadosVivos,
} from "@/data/garca";
import type { Contexto, Efeito, Origem } from "@/lib/ivr/machine";

export interface Chamada {
  id: string;
  inicio: number;
  fim?: number;
  origem: Origem["tipo"];
  origemNome: string;
  telefone?: string;
  bairroId?: string;
  acoes: string[];
  consultas: { remedioId: string; encontrado: boolean }[];
  emergencia: boolean;
}

export interface Sms {
  id: string;
  para: string;
  texto: string;
  quando: number;
}

export interface Aviso {
  id: string;
  telefone: string;
  remedioId: string;
  criadoEm: number;
  atendidoEm?: number;
}

interface Estado extends DadosVivos {
  chamadas: Chamada[];
  sms: Sms[];
  avisos: Aviso[];
  /** null = usa o relógio real. Útil para demonstrar o atendimento noturno. */
  horaSimulada: number | null;

  setEstoque: (postoId: string, remedioId: string, qtd: number) => void;
  setEspera: (postoId: string, minutos: number) => void;
  setFuncionando: (postoId: string, ok: boolean) => void;
  alternarVacina: (postoId: string, vacinaId: string) => void;
  setHoraSimulada: (hora: number | null) => void;
  iniciarChamada: (origem: Origem, origemNome: string) => string;
  aplicarEfeitos: (chamadaId: string, efeitos: Efeito[]) => void;
  encerrarChamada: (chamadaId: string) => void;
  simularMovimento: (quantidade: number) => void;
  limparSms: () => void;
  restaurar: () => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const LIMITE_HISTORICO = 500;

function estadoInicial() {
  return { ...dadosIniciais(), chamadas: [] as Chamada[], sms: [] as Sms[], avisos: [] as Aviso[], horaSimulada: null };
}

export const useCidade = create<Estado>()(
  persist(
    (set, get) => ({
      ...estadoInicial(),

      setEstoque: (postoId, remedioId, qtd) => {
        const novo = Math.max(0, Math.round(qtd));
        const antes = get().estoque[postoId]?.[remedioId] ?? 0;
        set((s) => ({ estoque: { ...s.estoque, [postoId]: { ...s.estoque[postoId], [remedioId]: novo } } }));
        // Reposição: avisa por SMS quem pediu para ser avisado.
        if (antes === 0 && novo > 0) {
          const posto = postoPorId(postoId)!;
          const remedio = remedioPorId(remedioId)!;
          const agora = Date.now();
          const pendentes = get().avisos.filter((a) => a.remedioId === remedioId && !a.atendidoEm);
          if (!pendentes.length) return;
          set((s) => ({
            avisos: s.avisos.map((a) => (pendentes.includes(a) ? { ...a, atendidoEm: agora } : a)),
            sms: [
              ...pendentes.map((a) => ({
                id: uid(),
                para: a.telefone,
                quando: agora,
                texto: `Saúde Garça: chegou ${remedio.nome} no ${posto.nome}, ${posto.endereco}. Leve receita e cartão SUS.`,
              })),
              ...s.sms,
            ],
          }));
        }
      },

      setEspera: (postoId, minutos) => set((s) => ({ espera: { ...s.espera, [postoId]: Math.max(0, minutos) } })),
      setFuncionando: (postoId, ok) => set((s) => ({ funcionando: { ...s.funcionando, [postoId]: ok } })),
      alternarVacina: (postoId, vacinaId) =>
        set((s) => {
          const atual = s.vacinas[postoId] ?? [];
          const nova = atual.includes(vacinaId) ? atual.filter((v) => v !== vacinaId) : [...atual, vacinaId];
          return { vacinas: { ...s.vacinas, [postoId]: nova } };
        }),
      setHoraSimulada: (hora) => set({ horaSimulada: hora }),

      iniciarChamada: (origem, origemNome) => {
        const id = uid();
        const chamada: Chamada = {
          id,
          inicio: Date.now(),
          origem: origem.tipo,
          origemNome,
          telefone: origem.telefone,
          acoes: [],
          consultas: [],
          emergencia: false,
        };
        set((s) => ({ chamadas: [chamada, ...s.chamadas].slice(0, LIMITE_HISTORICO) }));
        return id;
      },

      aplicarEfeitos: (chamadaId, efeitos) => {
        if (!efeitos.length) return;
        const agora = Date.now();
        set((s) => {
          const novosSms: Sms[] = [];
          const novosAvisos: Aviso[] = [];
          const chamadas = s.chamadas.map((c) => {
            if (c.id !== chamadaId) return c;
            const nova = { ...c, acoes: [...c.acoes], consultas: [...c.consultas] };
            for (const e of efeitos) {
              if (e.tipo === "acao") nova.acoes.push(e.descricao);
              if (e.tipo === "localizado") nova.bairroId = e.bairroId;
              if (e.tipo === "consulta") {
                nova.consultas.push({ remedioId: e.remedioId, encontrado: e.encontrado });
                nova.acoes.push(`${e.encontrado ? "Encontrou" : "Em falta"}: ${remedioPorId(e.remedioId)?.nome}`);
              }
              if (e.tipo === "samu") nova.emergencia = true;
              if (e.tipo === "sms") nova.acoes.push("SMS enviado");
              if (e.tipo === "aviso") nova.acoes.push("Pediu aviso de reposição");
            }
            return nova;
          });
          for (const e of efeitos) {
            if (e.tipo === "sms") novosSms.push({ id: uid(), para: e.para, texto: e.texto, quando: agora });
            if (e.tipo === "aviso") novosAvisos.push({ id: uid(), telefone: e.telefone, remedioId: e.remedioId, criadoEm: agora });
          }
          return {
            chamadas,
            sms: [...novosSms, ...s.sms].slice(0, LIMITE_HISTORICO),
            avisos: [...s.avisos, ...novosAvisos],
          };
        });
      },

      encerrarChamada: (chamadaId) =>
        set((s) => ({ chamadas: s.chamadas.map((c) => (c.id === chamadaId && !c.fim ? { ...c, fim: Date.now() } : c)) })),

      simularMovimento: (quantidade) => {
        const agora = Date.now();
        const s = get();
        const novas: Chamada[] = Array.from({ length: quantidade }, () => {
          const doTotem = Math.random() < 0.35;
          const totem = TOTENS[Math.floor(Math.random() * TOTENS.length)];
          const bairro = doTotem ? totem.bairroId : BAIRROS[Math.floor(Math.random() * BAIRROS.length)].id;
          const inicio = agora - Math.floor(Math.random() * 8 * 3600 * 1000);
          const consultas: Chamada["consultas"] = [];
          const acoes: string[] = [];
          const tipo = Math.random();
          if (tipo < 0.5) {
            const r = REMEDIOS[Math.floor(Math.random() * REMEDIOS.length)];
            const encontrado = POSTOS.some((p) => (s.estoque[p.id]?.[r.id] ?? 0) > 0);
            consultas.push({ remedioId: r.id, encontrado });
            acoes.push(`${encontrado ? "Encontrou" : "Em falta"}: ${r.nome}`);
          } else if (tipo < 0.8) {
            acoes.push("Posto indicado (simulado)");
          } else if (tipo < 0.95) {
            acoes.push("Consultou vacinas");
          }
          const emergencia = tipo >= 0.97;
          if (emergencia) acoes.push("Transferido ao SAMU 192");
          return {
            id: uid(),
            inicio,
            fim: inicio + 40_000 + Math.floor(Math.random() * 120_000),
            origem: doTotem ? "totem" : "celular",
            origemNome: doTotem ? totem.nome : "Celular (simulado)",
            bairroId: bairro,
            acoes,
            consultas,
            emergencia,
          } satisfies Chamada;
        });
        set((st) => ({
          chamadas: [...novas, ...st.chamadas].sort((a, b) => b.inicio - a.inicio).slice(0, LIMITE_HISTORICO),
        }));
      },

      limparSms: () => set({ sms: [] }),
      restaurar: () => set(estadoInicial()),
    }),
    { name: "saude-garca", version: 1 },
  ),
);

/** Contexto para a URA a partir do estado atual da cidade. */
export function contextoAtual(): Contexto {
  const s = useCidade.getState();
  return {
    dados: { estoque: s.estoque, espera: s.espera, funcionando: s.funcionando, vacinas: s.vacinas },
    hora: s.horaSimulada ?? new Date().getHours(),
  };
}

export function useHora(): number {
  const simulada = useCidade((s) => s.horaSimulada);
  return simulada ?? new Date().getHours();
}
