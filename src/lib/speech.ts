"use client";

// Voz do navegador (Web Speech API): grátis e sem servidor.
// Se o navegador não tiver voz, a legenda na tela continua funcionando.

let vozCache: SpeechSynthesisVoice | null | undefined;

function vozPtBr(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (vozCache) return vozCache;
  try {
    const vozes = window.speechSynthesis.getVoices();
    vozCache = vozes.find((v) => v.lang === "pt-BR") ?? vozes.find((v) => v.lang.startsWith("pt")) ?? null;
  } catch {
    vozCache = null;
  }
  return vozCache;
}

export const temVoz = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function pararFala() {
  try {
    if (temVoz()) window.speechSynthesis.cancel();
  } catch {
    // Sem voz disponível: nada a interromper.
  }
}

/** Fala as frases em sequência. Resolve quando terminar (ou for interrompida). */
export function falar(frases: string[], velocidade = 1, onFrase?: (i: number) => void): Promise<void> {
  if (!frases.length) return Promise.resolve();
  if (!temVoz()) {
    // Sem voz: simula a duração para o fluxo continuar igual.
    return new Promise((ok) => setTimeout(ok, Math.min(4000, frases.join(" ").length * 30)));
  }
  pararFala();
  const voz = vozPtBr();
  return new Promise((ok) => {
    // Rede de segurança: alguns navegadores nunca disparam "onend" sem voz instalada.
    setTimeout(ok, (frases.join(" ").length * 90) / velocidade + 2000);
    frases.forEach((texto, i) => {
      const u = new SpeechSynthesisUtterance(texto.replace(/\*/g, " asterisco ").replace(/#/g, " sustenido "));
      u.lang = "pt-BR";
      if (voz) u.voice = voz;
      u.rate = velocidade;
      u.onstart = () => onFrase?.(i);
      if (i === frases.length - 1) {
        u.onend = () => ok();
        u.onerror = () => ok();
      }
      try {
        window.speechSynthesis.speak(u);
      } catch {
        ok(); // a legenda continua funcionando mesmo sem voz
      }
    });
  });
}

// ------------------------------------------------------- reconhecimento de voz

type Reconhecedor = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};

function construtor(): (new () => Reconhecedor) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Reconhecedor) | null;
}

export const temReconhecimento = () => construtor() !== null;

/** Mensagens em português para cada falha do reconhecimento de voz do navegador. */
export function mensagemErroVoz(codigo: string): string | null {
  switch (codigo) {
    case "not-allowed":
    case "service-not-allowed":
      return "Permita o uso do microfone no navegador (ícone ao lado do endereço do site) ou use o teclado.";
    case "no-speech":
      return "Não ouvi nada. Aperte Falar e fale logo em seguida, ou use o teclado.";
    case "audio-capture":
      return "Nenhum microfone encontrado. Use o teclado.";
    case "network":
      return "Sem internet para reconhecer a voz agora. Use o teclado.";
    case "aborted":
      return null;
    default:
      return "Não foi possível usar o microfone agora. Use o teclado.";
  }
}

let ativo: Reconhecedor | null = null;
const LIMITE_ESCUTA_MS = 12_000;

function pararReconhecedor(r: Reconhecedor | null) {
  try {
    r?.abort ? r.abort() : r?.stop();
  } catch {
    // já estava parado
  }
}

/**
 * Escuta uma frase em português. Sempre chama `onFim` exatamente uma vez
 * (com o código do erro, se houver), para a tela nunca ficar presa em "Ouvindo…".
 * Devolve uma função para cancelar.
 */
export function ouvir(onTexto: (texto: string) => void, onFim: (erro?: string) => void): () => void {
  let rec: Reconhecedor | null = null;
  let limite: ReturnType<typeof setTimeout> | undefined;
  let terminou = false;
  const fim = (erro?: string) => {
    if (terminou) return;
    terminou = true;
    clearTimeout(limite);
    if (ativo === rec) ativo = null;
    onFim(erro);
  };

  const R = construtor();
  if (!R) {
    fim("indisponivel");
    return () => {};
  }

  pararFala();
  pararReconhecedor(ativo); // nunca dois reconhecimentos ao mesmo tempo
  try {
    rec = new R();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      try {
        const texto = e.results?.[0]?.[0]?.transcript ?? "";
        if (texto.trim()) onTexto(texto);
      } catch {
        fim("erro");
      }
    };
    rec.onerror = (e) => fim(e?.error ?? "erro");
    rec.onend = () => fim();
    ativo = rec;
    rec.start();
    limite = setTimeout(() => {
      pararReconhecedor(rec);
      fim("no-speech");
    }, LIMITE_ESCUTA_MS);
  } catch {
    pararReconhecedor(rec);
    fim("erro");
  }

  return () => {
    pararReconhecedor(rec);
    fim("aborted");
  };
}
