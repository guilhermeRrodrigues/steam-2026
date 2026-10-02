"use client";

import { useState } from "react";
import { CATEGORIAS, POSTOS, REMEDIOS, VACINAS, postoPorId } from "@/data/garca";
import { Carregando, Cartao } from "@/components/Moldura";
import { statusEspera } from "@/components/Mapa";
import { estaAberto } from "@/lib/geo";
import { useCidade, useHora } from "@/lib/store";
import { useHidratado } from "@/lib/sync";

export default function PainelPosto() {
  const hidratado = useHidratado();
  const [postoId, setPostoId] = useState("usf-labienopolis");
  const hora = useHora();
  const s = useCidade();

  if (!hidratado) return <Carregando />;

  const posto = postoPorId(postoId)!;
  const estoque = s.estoque[postoId] ?? {};
  const espera = s.espera[postoId] ?? 0;
  const aberto = estaAberto(posto, s, hora);
  const st = statusEspera(espera, aberto);
  const avisosPendentes = (remedioId: string) => s.avisos.filter((a) => a.remedioId === remedioId && !a.atendidoEm).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-tinta-3">Painel do funcionário</p>
          <h1 className="text-2xl font-bold">{posto.nome}</h1>
          <p className="text-tinta-2">{posto.endereco}</p>
        </div>
        <label className="text-sm flex flex-col gap-1">
          Posto
          <select value={postoId} onChange={(e) => setPostoId(e.target.value)} className="rounded-xl border border-borda bg-cartao px-3 py-2">
            {POSTOS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Cartao titulo="Funcionamento">
          <p className="flex items-center gap-2 text-lg font-bold">
            <span className="size-3 rounded-full" style={{ background: st.cor }} />
            {aberto ? "Aberto agora" : "Fechado agora"}
          </p>
          <p className="text-sm text-tinta-2 mt-1">
            {posto.h24 ? "24 horas" : `Seg a sex, ${posto.abre}h às ${posto.fecha}h`} · agora são {hora}h
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.funcionando[postoId]}
              onChange={(e) => s.setFuncionando(postoId, e.target.checked)}
              className="size-5 accent-[var(--marca)]"
            />
            Atendendo hoje (desmarque se faltar médico, reforma etc.)
          </label>
        </Cartao>

        <Cartao titulo="Fila de espera agora">
          <p className="text-4xl font-bold tabular-nums">
            {espera} <span className="text-lg font-normal text-tinta-2">min</span>
          </p>
          <p className="text-sm text-tinta-2">{st.rotulo}</p>
          <input
            type="range"
            min={0}
            max={180}
            step={5}
            value={espera}
            onChange={(e) => s.setEspera(postoId, Number(e.target.value))}
            className="w-full mt-2 accent-[var(--marca)]"
            aria-label="Tempo de espera em minutos"
          />
        </Cartao>

        <Cartao titulo="Vacinas disponíveis">
          <div className="space-y-1">
            {VACINAS.map((v) => (
              <label key={v.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={s.vacinas[postoId]?.includes(v.id) ?? false}
                  onChange={() => s.alternarVacina(postoId, v.id)}
                  className="size-5 accent-[var(--marca)]"
                />
                {v.nome}
              </label>
            ))}
          </div>
        </Cartao>
      </div>

      <Cartao titulo="Estoque da farmácia">
        {!posto.farmacia ? (
          <p className="text-tinta-2">Esta unidade não tem farmácia. A URA indica outro posto para retirar remédios.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {CATEGORIAS.map((c) => (
              <div key={c.id}>
                <h3 className="text-sm font-bold text-tinta-2 mb-2">{c.nome}</h3>
                <ul className="divide-y divide-borda">
                  {REMEDIOS.filter((r) => r.categoriaId === c.id).map((r) => {
                    const qtd = estoque[r.id] ?? 0;
                    const espera = avisosPendentes(r.id);
                    return (
                      <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                        <span className="flex-1 min-w-40">
                          {r.nome}
                          {qtd === 0 && <span className="ml-2 text-xs font-bold text-critico">● EM FALTA</span>}
                          {espera > 0 && (
                            <span className="block text-xs text-tinta-3">
                              {espera} pessoa{espera > 1 ? "s" : ""} esperando aviso por SMS
                            </span>
                          )}
                        </span>
                        <button type="button" onClick={() => s.setEstoque(postoId, r.id, 0)} className="text-xs px-2 py-1 rounded-lg border border-borda">
                          Zerar
                        </button>
                        <button type="button" onClick={() => s.setEstoque(postoId, r.id, qtd - 10)} className="size-8 rounded-lg border border-borda" aria-label={`Tirar 10 de ${r.nome}`}>
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={qtd}
                          onChange={(e) => s.setEstoque(postoId, r.id, Number(e.target.value))}
                          className="w-20 rounded-lg border border-borda bg-fundo px-2 py-1 text-right tabular-nums"
                          aria-label={`Quantidade de ${r.nome}`}
                        />
                        <button type="button" onClick={() => s.setEstoque(postoId, r.id, qtd + 10)} className="size-8 rounded-lg border border-borda" aria-label={`Adicionar 10 de ${r.nome}`}>
                          +
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-tinta-3 mt-3">
          Ao repor um remédio que estava em falta, quem pediu aviso recebe um SMS na hora. Na vida real estes números viriam do
          sistema de farmácia do SUS, sem digitação.
        </p>
      </Cartao>
    </div>
  );
}
