"use client";

import { useEffect, useRef, useState } from "react";
import type { Opcao } from "@/lib/ivr/machine";
import type { Linha } from "@/lib/useLigacao";
import { temReconhecimento } from "@/lib/speech";

export function Legenda({ linhas, grande }: { linhas: Linha[]; grande?: boolean }) {
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => fim.current?.scrollIntoView({ block: "nearest" }), [linhas]);
  if (!linhas.length) return <p className="text-tinta-3">A conversa aparece aqui, em texto, para quem não ouve bem.</p>;
  return (
    <div className={`space-y-2 overflow-y-auto pr-1 ${grande ? "max-h-[45vh] text-xl" : "max-h-96"}`} aria-live="polite">
      {linhas.map((l, i) => (
        <p
          key={i}
          className={`rounded-xl px-3 py-2 w-fit max-w-[95%] ${
            l.quem === "ura"
              ? "bg-marca-suave text-tinta"
              : l.quem === "aviso"
                ? "mx-auto border border-atencao bg-cartao text-tinta text-sm"
                : "ml-auto bg-serie-1 text-white"
          }`}
          role={l.quem === "aviso" ? "status" : undefined}
        >
          {l.quem === "aviso" && <span aria-hidden>⚠️ </span>}
          <span>{l.texto}</span>
        </p>
      ))}
      <div ref={fim} />
    </div>
  );
}

export function ListaOpcoes({ opcoes, onTecla }: { opcoes: Opcao[]; onTecla: (t: string) => void }) {
  if (!opcoes.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <button
          key={o.tecla}
          type="button"
          onClick={() => onTecla(o.tecla)}
          className={`px-3 py-1.5 rounded-full border text-sm ${
            o.tecla === "0" ? "border-critico text-critico font-bold" : "border-borda hover:bg-marca-suave"
          }`}
        >
          <strong>{o.tecla}</strong> · {o.rotulo}
        </button>
      ))}
    </div>
  );
}

export function ControlesVoz({
  emCurso,
  ouvindo,
  velocidade,
  onEscutar,
  onDizer,
  onVelocidade,
}: {
  emCurso: boolean;
  ouvindo: boolean;
  velocidade: number;
  onEscutar: () => void;
  onDizer: (t: string) => void;
  onVelocidade: (v: number) => void;
}) {
  const [texto, setTexto] = useState("");
  const [microfone, setMicrofone] = useState(false);
  useEffect(() => setMicrofone(temReconhecimento()), []);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          disabled={!emCurso || !microfone}
          onClick={onEscutar}
          aria-pressed={ouvindo}
          className="px-4 py-2 rounded-xl bg-marca text-white font-bold disabled:opacity-40"
        >
          {ouvindo ? <span key="ouvindo">🎙️ Ouvindo… (toque para parar)</span> : <span key="falar">🎙️ Falar</span>}
        </button>
        {!microfone && (
          <span key="sem-mic" className="text-xs text-tinta-3">
            Reconhecimento de voz disponível no Chrome/Edge. Você pode digitar a frase abaixo.
          </span>
        )}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onDizer(texto);
          setTexto("");
        }}
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={!emCurso}
          placeholder='Ou digite o que diria, ex.: "tem dipirona?"'
          className="flex-1 min-w-0 rounded-xl border border-borda bg-fundo px-3 py-2 disabled:opacity-50"
          aria-label="Frase falada"
        />
        <button type="submit" disabled={!emCurso || !texto.trim()} className="px-3 rounded-xl border border-borda disabled:opacity-40">
          Dizer
        </button>
      </form>
      <label className="flex items-center gap-3 text-sm text-tinta-2">
        Velocidade da voz
        <input
          type="range"
          min={0.6}
          max={1.4}
          step={0.1}
          value={velocidade}
          onChange={(e) => onVelocidade(Number(e.target.value))}
          className="accent-[var(--marca)]"
        />
        <span className="tabular-nums w-10">{velocidade.toFixed(1)}×</span>
      </label>
    </div>
  );
}
