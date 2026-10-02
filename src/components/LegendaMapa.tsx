/** Lotação → cor de status (sempre acompanhada de texto no tooltip e na legenda). */
export function statusEspera(min: number, aberto: boolean) {
  if (!aberto) return { cor: "#8a8f8b", rotulo: "Fechado" };
  if (min <= 20) return { cor: "#0ca30c", rotulo: "Fila curta" };
  if (min <= 45) return { cor: "#fab219", rotulo: "Fila média" };
  return { cor: "#d03b3b", rotulo: "Lotado" };
}

export function LegendaMapa() {
  const itens = [
    { cor: "#0ca30c", rotulo: "Fila curta (até 20 min)" },
    { cor: "#fab219", rotulo: "Fila média (até 45 min)" },
    { cor: "#d03b3b", rotulo: "Lotado" },
    { cor: "#8a8f8b", rotulo: "Fechado" },
    { cor: "#2a78d6", rotulo: "Totem / orelhão" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-2 mt-2">
      {itens.map((i) => (
        <li key={i.rotulo} className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border-2 border-white shadow" style={{ background: i.cor }} />
          {i.rotulo}
        </li>
      ))}
    </ul>
  );
}
