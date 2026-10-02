"use client";

import { useEffect, useState } from "react";
import { TOTENS, postoPorId, totemPorId } from "@/data/garca";
import { Teclado } from "@/components/Teclado";
import { Legenda } from "@/components/PainelConversa";
import { Mapa } from "@/components/Mapa";
import { useLigacao } from "@/lib/useLigacao";
import { Protecao } from "@/components/Protecao";
import { useCidade, useHora } from "@/lib/store";
import { useHidratado } from "@/lib/sync";

export default function TotemPagina() {
  const [totemId, setTotemId] = useState(TOTENS[0].id);
  const lig = useLigacao();
  const hidratado = useHidratado();
  const hora = useHora();
  const estoque = useCidade((s) => s.estoque);
  const espera = useCidade((s) => s.espera);
  const funcionando = useCidade((s) => s.funcionando);
  const vacinas = useCidade((s) => s.vacinas);

  // Permite links diretos para cada totem: /totem?id=totem-jafa
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id && totemPorId(id)) setTotemId(id);
  }, []);

  const totem = totemPorId(totemId)!;
  const emCurso = lig.status === "em-curso";
  const postoIndicado = lig.sessao?.postoAtualId ? postoPorId(lig.sessao.postoAtualId) : undefined;
  const iniciar = () => lig.discar({ tipo: "totem", totemId }, totem.nome);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm text-tinta-2 flex items-center gap-2">
          Simular o totem:
          <select
            value={totemId}
            disabled={emCurso}
            onChange={(e) => setTotemId(e.target.value)}
            className="rounded-lg border border-borda bg-cartao px-2 py-1"
          >
            {TOTENS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Moldura física do totem: alto contraste e botões grandes */}
      <div className="rounded-[2rem] bg-[#0b2f22] text-white p-5 md:p-8 shadow-2xl border-8 border-[#0a7a53]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[#7fe0b6] font-bold uppercase tracking-wide text-sm">Saúde Garça · ligação gratuita</p>
            <h1 className="text-3xl md:text-4xl font-bold">{totem.nome}</h1>
          </div>
          <button
            type="button"
            onClick={() => (emCurso ? lig.emergencia() : lig.discar({ tipo: "totem", totemId }, totem.nome, true))}
            disabled={lig.status === "chamando"}
            className="rounded-2xl bg-[#d03b3b] px-6 py-4 text-2xl font-bold shadow-lg disabled:opacity-50"
          >
            🚑 EMERGÊNCIA
          </button>
        </div>

        {!emCurso && lig.status !== "chamando" ? (
          <div className="py-10 text-center space-y-4">
            {lig.status === "samu" && <p className="text-2xl text-[#ffb4b4] font-bold">Ligação transferida para o SAMU 192.</p>}
            <button
              type="button"
              onClick={iniciar}
              className="rounded-3xl bg-[#0ca30c] px-10 py-8 text-3xl md:text-4xl font-bold shadow-xl hover:brightness-110"
            >
              📞 Toque aqui para falar com a Saúde
            </button>
            <p className="text-lg text-[#cfe9dc]">Ou tire o fone do gancho. Funciona por voz, teclado ou pelos botões.</p>
          </div>
        ) : (
          <div className="grid gap-6 mt-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-4">
              <div className="bg-white/10 rounded-2xl p-4 min-h-28">
                {lig.status === "chamando" ? (
                  <p className="text-2xl">Conectando…</p>
                ) : lig.sessao?.tela === "telefone" ? (
                  <p className="text-3xl font-mono">Celular: {lig.sessao.buffer || "_"}</p>
                ) : (
                  <p className="text-2xl leading-snug" aria-live="polite">
                    {lig.legenda.findLast((l) => l.quem === "ura")?.texto}
                  </p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {lig.opcoes
                  .filter((o) => o.tecla !== "0")
                  .map((o) => (
                    <button
                      key={o.tecla}
                      type="button"
                      onClick={() => lig.tecla(o.tecla)}
                      className="flex items-center gap-4 rounded-2xl bg-white text-[#0b2f22] px-4 py-4 text-xl font-bold text-left hover:bg-[#dff3ea]"
                    >
                      <span className="grid place-items-center size-12 shrink-0 rounded-xl bg-[#0b7a53] text-white text-2xl">{o.tecla}</span>
                      {o.rotulo}
                    </button>
                  ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={lig.escutar}
                  aria-pressed={lig.ouvindo}
                  className="rounded-2xl bg-[#2a78d6] px-5 py-3 text-xl font-bold"
                >
                  {lig.ouvindo ? <span key="ouvindo">🎙️ Ouvindo… (toque para parar)</span> : <span key="falar">🎙️ Falar</span>}
                </button>
                <button type="button" onClick={() => lig.mudarVelocidade(lig.velocidade > 0.8 ? 0.75 : 1)} className="rounded-2xl bg-white/15 px-5 py-3 text-xl">
                  {lig.velocidade > 0.8 ? <span key="devagar">🐢 Falar mais devagar</span> : <span key="normal">Velocidade normal</span>}
                </button>
                <button type="button" onClick={lig.desligar} className="rounded-2xl bg-white/15 px-5 py-3 text-xl">
                  Encerrar
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-[#c9d6cf] rounded-2xl p-3 text-neutral-900">
                <Teclado onTecla={lig.tecla} grande />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-cartao border border-borda rounded-2xl p-4">
          <h2 className="font-bold mb-2">Legendas</h2>
          <Protecao nome="Legendas">
            <Legenda linhas={lig.legenda} grande />
          </Protecao>
        </section>
        <section className="bg-cartao border border-borda rounded-2xl p-4">
          <h2 className="font-bold mb-2">
            {postoIndicado ? <span key="caminho">Caminho até: {postoIndicado.apelido}</span> : <span key="aqui">Você está aqui</span>}
          </h2>
          {hidratado && (
            <Mapa
              key={totemId}
              dados={{ estoque, espera, funcionando, vacinas }}
              hora={hora}
              altura={300}
              zoom={totemId === "totem-jafa" ? 15 : 14}
              centro={totem}
              destaqueTotemId={totemId}
              destaquePostoId={postoIndicado?.id}
            />
          )}
        </section>
      </div>
    </div>
  );
}
