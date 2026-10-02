"use client";

// Barras horizontais de série única: rótulo e valor em texto (nunca só cor),
// barra fina com ponta arredondada e tooltip ao passar o mouse.

export interface ItemBarra {
  rotulo: string;
  valor: number;
  detalhe?: string;
}

export function Barras({ itens, cor = "var(--serie-1)", vazio = "Sem dados ainda.", unidade = "" }: { itens: ItemBarra[]; cor?: string; vazio?: string; unidade?: string }) {
  if (!itens.length) return <p className="text-sm text-tinta-3">{vazio}</p>;
  const max = Math.max(...itens.map((i) => i.valor), 1);
  return (
    <ul className="space-y-1.5" role="list">
      {itens.map((i) => (
        <li
          key={i.rotulo}
          className="group grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-2 text-sm rounded-md px-1 hover:bg-marca-suave/60"
          title={`${i.rotulo}: ${i.valor}${unidade}${i.detalhe ? ` — ${i.detalhe}` : ""}`}
        >
          <span className="truncate text-tinta-2">{i.rotulo}</span>
          <span className="h-3 bg-trilho rounded-r-[4px]">
            <span className="block h-full rounded-r-[4px] group-hover:brightness-110" style={{ width: `${(i.valor / max) * 100}%`, background: cor }} />
          </span>
          <span className="text-right tabular-nums font-bold">
            {i.valor}
            {unidade}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Indicador({ rotulo, valor, detalhe, alerta }: { rotulo: string; valor: string | number; detalhe?: string; alerta?: boolean }) {
  return (
    <div className="bg-cartao border border-borda rounded-2xl p-4">
      <p className="text-sm text-tinta-2">{rotulo}</p>
      <p className={`text-3xl font-bold tabular-nums mt-1 ${alerta ? "text-critico" : ""}`}>
        {alerta && <span aria-hidden>▲ </span>}
        {valor}
      </p>
      {detalhe && <p className="text-xs text-tinta-3 mt-1">{detalhe}</p>}
    </div>
  );
}
