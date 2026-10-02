"use client";

import { useState } from "react";
import { Cartao } from "@/components/Moldura";
import { Teclado } from "@/components/Teclado";
import { ControlesVoz, Legenda, ListaOpcoes } from "@/components/PainelConversa";
import { useLigacao } from "@/lib/useLigacao";

const ROTULO_STATUS = {
  ociosa: "Pronto para ligar",
  chamando: "Chamando 0800 156 1956…",
  "em-curso": "Em ligação — Saúde Garça",
  samu: "Transferido para o SAMU 192",
  encerrada: "Ligação encerrada",
};

function formatarTelefone(n: string) {
  const d = n.replace(/\D/g, "");
  if (d.length < 10) return d;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}

export default function Ligar() {
  const lig = useLigacao();
  const [telefone, setTelefone] = useState("14998765432");
  const emCurso = lig.status === "em-curso";
  const ativo = emCurso || lig.status === "chamando";

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* Celular simples desenhado em CSS */}
      <div className="mx-auto w-full max-w-[340px] rounded-[2.5rem] bg-gradient-to-b from-neutral-800 to-neutral-950 p-5 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-neutral-600" />
        <div className="rounded-xl bg-[#c9dcb5] text-[#1f2d16] p-3 h-40 flex flex-col font-mono text-sm shadow-inner">
          <div className="flex justify-between text-xs">
            <span>▂▄▆ Vivo</span>
            <span>{lig.status === "em-curso" ? "● em ligação" : ""}</span>
          </div>
          <p className="font-bold mt-1">{ROTULO_STATUS[lig.status]}</p>
          <p className="mt-1 line-clamp-3 text-xs leading-snug">
            {lig.sessao?.tela === "telefone" ? `Celular: ${lig.sessao.buffer || "_"}` : lig.falaAtual}
          </p>
        </div>
        <div className="flex justify-between my-4">
          <button
            type="button"
            onClick={() => lig.discar({ tipo: "celular", telefone: telefone.replace(/\D/g, "") }, `Celular ${formatarTelefone(telefone)}`)}
            disabled={ativo}
            aria-label="Ligar"
            className="h-12 w-24 rounded-full bg-green-600 text-white text-2xl disabled:opacity-40"
          >
            📞
          </button>
          <button type="button" onClick={lig.desligar} disabled={!ativo} aria-label="Desligar" className="h-12 w-24 rounded-full bg-red-600 text-white text-2xl disabled:opacity-40">
            ⏻
          </button>
        </div>
        <Teclado onTecla={lig.tecla} />
      </div>

      <div className="space-y-4">
        <Cartao titulo="Quem está ligando">
          <label className="flex flex-wrap items-center gap-3 text-sm">
            Número do celular (identificador de chamada)
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              disabled={ativo}
              inputMode="numeric"
              className="rounded-xl border border-borda bg-fundo px-3 py-2 font-mono"
            />
          </label>
          <p className="text-xs text-tinta-3 mt-2">
            Os SMS enviados para este número aparecem na tela <a href="/sms" className="underline">SMS</a>.
          </p>
        </Cartao>
        <Cartao titulo="Conversa (legendas)">
          <Legenda linhas={lig.legenda} />
        </Cartao>
        {emCurso && (
          <Cartao titulo="Opções agora">
            <ListaOpcoes opcoes={lig.opcoes} onTecla={lig.tecla} />
          </Cartao>
        )}
        <Cartao titulo="Falar em vez de teclar">
          <ControlesVoz
            emCurso={emCurso}
            ouvindo={lig.ouvindo}
            velocidade={lig.velocidade}
            onEscutar={lig.escutar}
            onDizer={lig.dizer}
            onVelocidade={lig.mudarVelocidade}
          />
        </Cartao>
      </div>
    </div>
  );
}
