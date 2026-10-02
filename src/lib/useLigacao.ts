"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { iniciar, processar, processarFala, type Opcao, type Origem, type Resposta, type Sessao } from "@/lib/ivr/machine";
import { contextoAtual, useCidade } from "@/lib/store";
import { falar, ouvir, pararFala } from "@/lib/speech";
import { tomChamando, tomOcupado, tomTecla } from "@/lib/dtmf";

export type StatusLigacao = "ociosa" | "chamando" | "em-curso" | "samu" | "encerrada";

export interface Linha {
  quem: "ura" | "voce";
  texto: string;
}

export function useLigacao() {
  const [status, setStatus] = useState<StatusLigacao>("ociosa");
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [legenda, setLegenda] = useState<Linha[]>([]);
  const [falaAtual, setFalaAtual] = useState("");
  const [ouvindo, setOuvindo] = useState(false);
  const [velocidade, setVelocidade] = useState(1);

  const sessaoRef = useRef<Sessao | null>(null);
  const chamadaRef = useRef<string | null>(null);
  const statusRef = useRef<StatusLigacao>("ociosa");
  const velocidadeRef = useRef(1);
  const pararOuvir = useRef<() => void>(() => {});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const mudarStatus = (s: StatusLigacao) => {
    statusRef.current = s;
    setStatus(s);
  };

  const encerrar = useCallback((motivo: StatusLigacao = "encerrada") => {
    clearTimeout(timer.current);
    pararFala();
    pararOuvir.current();
    if (chamadaRef.current) useCidade.getState().encerrarChamada(chamadaRef.current);
    chamadaRef.current = null;
    if (statusRef.current === "em-curso" && motivo === "encerrada") tomOcupado();
    mudarStatus(motivo);
    setFalaAtual("");
  }, []);

  const aplicar = useCallback(
    (r: Resposta, entrada?: string) => {
      sessaoRef.current = r.sessao;
      setSessao(r.sessao);
      setOpcoes(r.opcoes);
      setLegenda((l) => [
        ...l,
        ...(entrada ? [{ quem: "voce" as const, texto: entrada }] : []),
        ...(r.falas.length ? [{ quem: "ura" as const, texto: r.falas.join(" ") }] : []),
      ]);
      if (chamadaRef.current) useCidade.getState().aplicarEfeitos(chamadaRef.current, r.efeitos);

      const desliga = r.efeitos.some((e) => e.tipo === "desligar");
      const samu = r.efeitos.some((e) => e.tipo === "samu");
      if (!r.falas.length) {
        if (desliga) encerrar(samu ? "samu" : "encerrada");
        return;
      }
      // Como numa URA real, apertar uma tecla interrompe a fala anterior.
      setFalaAtual(r.falas[0]);
      falar(r.falas, velocidadeRef.current, (i) => setFalaAtual(r.falas[i])).then(() => {
        if (desliga && sessaoRef.current === r.sessao) encerrar(samu ? "samu" : "encerrada");
      });
    },
    [encerrar],
  );

  const discar = useCallback(
    (origem: Origem, origemNome: string, emergenciaImediata = false) => {
      if (statusRef.current === "chamando" || statusRef.current === "em-curso") return;
      setLegenda([]);
      mudarStatus("chamando");
      tomChamando(2);
      timer.current = setTimeout(() => {
        chamadaRef.current = useCidade.getState().iniciarChamada(origem, origemNome);
        mudarStatus("em-curso");
        const ctx = contextoAtual();
        const inicio = iniciar(origem, ctx);
        if (emergenciaImediata && inicio.sessao.tela === "menu") {
          const sos = processar(inicio.sessao, "0", ctx);
          aplicar({ ...sos, efeitos: [...inicio.efeitos, ...sos.efeitos] }, "Botão EMERGÊNCIA");
        } else {
          aplicar(inicio);
        }
      }, emergenciaImediata ? 600 : 2600);
    },
    [aplicar],
  );

  const tecla = useCallback(
    (t: string) => {
      tomTecla(t);
      const s = sessaoRef.current;
      if (statusRef.current !== "em-curso" || !s) return;
      aplicar(processar(s, t, contextoAtual()), s.tela === "telefone" ? undefined : `Tecla ${t}`);
    },
    [aplicar],
  );

  /** Envia uma frase (do microfone ou digitada) como se fosse falada. */
  const dizer = useCallback(
    (texto: string) => {
      const s = sessaoRef.current;
      if (statusRef.current !== "em-curso" || !s || !texto.trim()) return;
      aplicar(processarFala(s, texto, contextoAtual()), `“${texto}”`);
    },
    [aplicar],
  );

  const escutar = useCallback(() => {
    if (statusRef.current !== "em-curso") return;
    setOuvindo(true);
    pararOuvir.current = ouvir(dizer, () => setOuvindo(false));
  }, [dizer]);

  /** Botão de emergência do totem: funciona de qualquer tela. */
  const emergencia = useCallback(() => {
    const s = sessaoRef.current;
    if (statusRef.current !== "em-curso" || !s) return;
    const ctx = contextoAtual();
    const menu =
      s.tela === "menu"
        ? s
        : s.tela === "bairro"
          ? { ...s, tela: "menu" as const, bairroId: s.bairroId ?? "centro" }
          : processar(s, "*", ctx).sessao;
    aplicar(processar(menu, "0", ctx), "Botão EMERGÊNCIA");
  }, [aplicar]);

  const mudarVelocidade = (v: number) => {
    velocidadeRef.current = v;
    setVelocidade(v);
  };

  useEffect(() => () => encerrar(), [encerrar]);

  return {
    status,
    sessao,
    opcoes,
    legenda,
    falaAtual,
    ouvindo,
    velocidade,
    discar,
    tecla,
    dizer,
    escutar,
    emergencia,
    desligar: () => encerrar(),
    mudarVelocidade,
  };
}
