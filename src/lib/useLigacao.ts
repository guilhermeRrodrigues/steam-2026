"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { iniciar, processar, processarFala, type Opcao, type Origem, type Resposta, type Sessao } from "@/lib/ivr/machine";
import { contextoAtual, useCidade } from "@/lib/store";
import { falar, mensagemErroVoz, ouvir, pararFala } from "@/lib/speech";
import { tomChamando, tomOcupado, tomTecla } from "@/lib/dtmf";

export type StatusLigacao = "ociosa" | "chamando" | "em-curso" | "samu" | "encerrada";

export interface Linha {
  /** "aviso" = mensagem do sistema (ex.: microfone bloqueado), não faz parte da URA. */
  quem: "ura" | "voce" | "aviso";
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
  const montado = useRef(true);
  const ouvindoRef = useRef(false);

  const mudarStatus = (s: StatusLigacao) => {
    statusRef.current = s;
    if (montado.current) setStatus(s);
  };

  const avisar = (texto: string) => {
    if (montado.current) setLegenda((l) => [...l, { quem: "aviso", texto }]);
  };

  const encerrar = useCallback((motivo: StatusLigacao = "encerrada") => {
    clearTimeout(timer.current);
    pararFala();
    pararOuvir.current();
    try {
      if (chamadaRef.current) useCidade.getState().encerrarChamada(chamadaRef.current);
    } catch (e) {
      console.error("Falha ao registrar fim da ligação", e);
    }
    chamadaRef.current = null;
    if (statusRef.current === "em-curso" && motivo === "encerrada") tomOcupado();
    mudarStatus(motivo);
    if (montado.current) {
      setFalaAtual("");
      setOuvindo(false);
    }
  }, []);

  const aplicar = useCallback(
    (r: Resposta, entrada?: string) => {
      if (!montado.current) return;
      sessaoRef.current = r.sessao;
      setSessao(r.sessao);
      setOpcoes(r.opcoes);
      setLegenda((l) => [
        ...l,
        ...(entrada ? [{ quem: "voce" as const, texto: entrada }] : []),
        ...(r.falas.length ? [{ quem: "ura" as const, texto: r.falas.join(" ") }] : []),
      ]);
      try {
        if (chamadaRef.current) useCidade.getState().aplicarEfeitos(chamadaRef.current, r.efeitos);
      } catch (e) {
        console.error("Falha ao registrar efeitos da ligação", e);
      }

      const desliga = r.efeitos.some((e) => e.tipo === "desligar");
      const samu = r.efeitos.some((e) => e.tipo === "samu");
      if (!r.falas.length) {
        if (desliga) encerrar(samu ? "samu" : "encerrada");
        return;
      }
      // Como numa URA real, apertar uma tecla interrompe a fala anterior.
      setFalaAtual(r.falas[0]);
      falar(r.falas, velocidadeRef.current, (i) => montado.current && setFalaAtual(r.falas[i]))
        .catch(() => {})
        .then(() => {
          if (desliga && sessaoRef.current === r.sessao) encerrar(samu ? "samu" : "encerrada");
        });
    },
    [encerrar],
  );

  /**
   * Executa um passo da URA com rede de segurança: se algo inesperado falhar,
   * a ligação volta ao menu em vez de derrubar a página.
   */
  const executar = useCallback(
    (passo: () => Resposta, entrada?: string) => {
      try {
        aplicar(passo(), entrada);
      } catch (e) {
        console.error("Falha na URA", e);
        const s = sessaoRef.current;
        try {
          if (!s) throw e;
          const menu = processar({ ...s, tela: "menu", buffer: "", pendente: undefined }, "*", contextoAtual());
          aplicar({ ...menu, falas: ["Desculpe, tive um problema.", ...menu.falas] }, entrada);
        } catch {
          avisar("Não consegui continuar a ligação. Desligue e ligue de novo.");
          encerrar();
        }
      }
    },
    [aplicar, encerrar],
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
        executar(() => {
          const ctx = contextoAtual();
          const inicio = iniciar(origem, ctx);
          if (!emergenciaImediata || inicio.sessao.tela !== "menu") return inicio;
          const sos = processar(inicio.sessao, "0", ctx);
          return { ...sos, efeitos: [...inicio.efeitos, ...sos.efeitos] };
        }, emergenciaImediata ? "Botão EMERGÊNCIA" : undefined);
      }, emergenciaImediata ? 600 : 2600);
    },
    [executar],
  );

  const tecla = useCallback(
    (t: string) => {
      tomTecla(t);
      const s = sessaoRef.current;
      if (statusRef.current !== "em-curso" || !s) return;
      executar(() => processar(s, t, contextoAtual()), s.tela === "telefone" ? undefined : `Tecla ${t}`);
    },
    [executar],
  );

  /** Envia uma frase (do microfone ou digitada) como se fosse falada. */
  const dizer = useCallback(
    (texto: string) => {
      const s = sessaoRef.current;
      if (statusRef.current !== "em-curso" || !s || !texto.trim()) return;
      executar(() => processarFala(s, texto, contextoAtual()), `“${texto}”`);
    },
    [executar],
  );

  /** Liga/desliga o microfone. Sempre sai do estado "Ouvindo…", com ou sem erro. */
  const escutar = useCallback(() => {
    if (statusRef.current !== "em-curso") return;
    if (ouvindoRef.current) {
      pararOuvir.current();
      return;
    }
    ouvindoRef.current = true;
    setOuvindo(true);
    pararOuvir.current = ouvir(dizer, (erro) => {
      ouvindoRef.current = false;
      if (!montado.current) return;
      setOuvindo(false);
      const msg = erro ? mensagemErroVoz(erro) : null;
      if (msg) avisar(msg);
    });
  }, [dizer]);

  /** Botão de emergência do totem: funciona de qualquer tela. */
  const emergencia = useCallback(() => {
    const s = sessaoRef.current;
    if (statusRef.current !== "em-curso" || !s) return;
    executar(() => {
      const ctx = contextoAtual();
      // Emergência vale de qualquer ponto do menu, sem depender da tela atual.
      return processar({ ...s, tela: "menu", buffer: "", pendente: undefined, bairroId: s.bairroId ?? "centro" }, "0", ctx);
    }, "Botão EMERGÊNCIA");
  }, [executar]);

  const mudarVelocidade = (v: number) => {
    velocidadeRef.current = v;
    setVelocidade(v);
  };

  useEffect(() => {
    montado.current = true;
    return () => {
      encerrar();
      montado.current = false;
    };
  }, [encerrar]);

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
