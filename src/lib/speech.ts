"use client";

// Voz do navegador (Web Speech API): grátis e sem servidor.
// Se o navegador não tiver voz, a legenda na tela continua funcionando.

let vozCache: SpeechSynthesisVoice | null | undefined;

function vozPtBr(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (vozCache) return vozCache;
  const vozes = window.speechSynthesis.getVoices();
  vozCache = vozes.find((v) => v.lang === "pt-BR") ?? vozes.find((v) => v.lang.startsWith("pt")) ?? null;
  return vozCache;
}

export const temVoz = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function pararFala() {
  if (temVoz()) window.speechSynthesis.cancel();
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
      window.speechSynthesis.speak(u);
    });
  });
}

// ------------------------------------------------------- reconhecimento de voz

type Reconhecedor = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function construtor(): (new () => Reconhecedor) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Reconhecedor) | null;
}

export const temReconhecimento = () => construtor() !== null;

/** Escuta uma frase em português. Devolve uma função para cancelar. */
export function ouvir(onTexto: (texto: string) => void, onFim: () => void): () => void {
  const R = construtor();
  if (!R) {
    onFim();
    return () => {};
  }
  pararFala();
  const rec = new R();
  rec.lang = "pt-BR";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => onTexto(e.results[0][0].transcript);
  rec.onerror = () => onFim();
  rec.onend = () => onFim();
  rec.start();
  return () => rec.stop();
}
