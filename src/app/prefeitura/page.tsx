"use client";

import { BAIRROS, POSTOS, REMEDIOS, bairroPorId } from "@/data/garca";
import { Carregando, Cartao } from "@/components/Moldura";
import { Barras, Indicador, type ItemBarra } from "@/components/Barras";
import { LegendaMapa, Mapa } from "@/components/Mapa";
import { estaAberto } from "@/lib/geo";
import { useCidade, useHora } from "@/lib/store";
import { useHidratado } from "@/lib/sync";

const HORAS = [
  { valor: "", rotulo: "Relógio real" },
  { valor: "8", rotulo: "08h (manhã)" },
  { valor: "12", rotulo: "12h (meio-dia)" },
  { valor: "18", rotulo: "18h (fim de tarde)" },
  { valor: "23", rotulo: "23h (noite)" },
];

function contar<T>(lista: T[], chave: (t: T) => string | undefined): Map<string, number> {
  const m = new Map<string, number>();
  for (const item of lista) {
    const k = chave(item);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

const topo = (m: Map<string, number>, nome: (k: string) => string, n = 8): ItemBarra[] =>
  [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => ({ rotulo: nome(k), valor: v }));

export default function PainelPrefeitura() {
  const hidratado = useHidratado();
  const s = useCidade();
  const hora = useHora();
  if (!hidratado) return <Carregando />;

  const inicioDoDia = new Date().setHours(0, 0, 0, 0);
  const hoje = s.chamadas.filter((c) => c.inicio >= inicioDoDia);
  const consultas = hoje.flatMap((c) => c.consultas);
  const encontrados = consultas.filter((c) => c.encontrado).length;
  const farmacias = POSTOS.filter((p) => p.farmacia);
  const emFaltaNaCidade = REMEDIOS.filter((r) => farmacias.every((p) => (s.estoque[p.id]?.[r.id] ?? 0) === 0));
  const aguardando = s.avisos.filter((a) => !a.atendidoEm).length;
  const abertos = POSTOS.filter((p) => estaAberto(p, s, hora));
  const esperaMedia = abertos.length ? Math.round(abertos.reduce((t, p) => t + (s.espera[p.id] ?? 0), 0) / abertos.length) : 0;
  const nomeRemedio = (id: string) => REMEDIOS.find((r) => r.id === id)?.nome ?? id;

  const procurados = topo(contar(consultas, (c) => c.remedioId), nomeRemedio);
  const naoEncontrados = topo(contar(consultas.filter((c) => !c.encontrado), (c) => c.remedioId), nomeRemedio);
  const porBairro = topo(contar(hoje, (c) => c.bairroId), (k) => bairroPorId(k)?.nome ?? k, BAIRROS.length);
  const doTotem = hoje.filter((c) => c.origem === "totem").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-tinta-3">Secretaria Municipal de Saúde</p>
          <h1 className="text-2xl font-bold">Painel da prefeitura</h1>
        </div>
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <label className="flex items-center gap-2">
            Hora simulada
            <select
              value={s.horaSimulada ?? ""}
              onChange={(e) => s.setHoraSimulada(e.target.value === "" ? null : Number(e.target.value))}
              className="rounded-lg border border-borda bg-cartao px-2 py-1.5"
            >
              {HORAS.map((h) => (
                <option key={h.valor} value={h.valor}>
                  {h.rotulo}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => s.simularMovimento(40)} className="px-3 py-1.5 rounded-lg bg-marca text-white font-bold">
            Simular dia movimentado (+40 ligações)
          </button>
          <button
            type="button"
            onClick={() => confirm("Apagar ligações, SMS e voltar o estoque ao exemplo?") && s.restaurar()}
            className="px-3 py-1.5 rounded-lg border border-borda"
          >
            Restaurar dados de exemplo
          </button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Indicador rotulo="Ligações hoje" valor={hoje.length} detalhe={`${doTotem} por totem · ${hoje.length - doTotem} por telefone`} />
        <Indicador
          rotulo="Remédio encontrado"
          valor={consultas.length ? `${Math.round((encontrados / consultas.length) * 100)}%` : "—"}
          detalhe={`${encontrados} de ${consultas.length} consultas`}
        />
        <Indicador rotulo="Em falta na cidade" valor={emFaltaNaCidade.length} alerta={emFaltaNaCidade.length > 0} detalhe={emFaltaNaCidade.map((r) => r.nome).join(", ") || "Nenhum"} />
        <Indicador rotulo="Aguardando aviso por SMS" valor={aguardando} detalhe="Pessoas esperando reposição" />
        <Indicador rotulo="Espera média agora" valor={`${esperaMedia} min`} detalhe={`${abertos.length} de ${POSTOS.length} unidades abertas às ${hora}h`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Cartao titulo="Mapa da lotação">
          <Mapa dados={s} hora={hora} altura={420} />
          <LegendaMapa />
        </Cartao>
        <div className="space-y-4">
          <Cartao titulo="Remédios mais procurados hoje">
            <Barras itens={procurados} vazio="Nenhuma consulta de remédio ainda." />
          </Cartao>
          <Cartao titulo="Procurados e NÃO encontrados">
            <Barras itens={naoEncontrados} cor="var(--critico)" vazio="Nenhuma falta registrada. 🎉" />
            <p className="text-xs text-tinta-3 mt-2">Sinal para antecipar a compra antes que a fila de reclamações cresça.</p>
          </Cartao>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Cartao titulo="Ligações por bairro (hoje)">
          <Barras itens={porBairro} vazio="Sem ligações hoje." />
          <p className="text-xs text-tinta-3 mt-2">Bairros com muita procura e postos lotados indicam onde reforçar equipes.</p>
        </Cartao>
        <Cartao titulo="Ligações ao vivo">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="text-left text-tinta-3 sticky top-0 bg-cartao">
                <tr>
                  <th className="py-1 pr-2 font-normal">Hora</th>
                  <th className="py-1 pr-2 font-normal">Origem</th>
                  <th className="py-1 pr-2 font-normal">Bairro</th>
                  <th className="py-1 font-normal">O que aconteceu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {s.chamadas.slice(0, 40).map((c) => (
                  <tr key={c.id} className={c.emergencia ? "text-critico font-bold" : ""}>
                    <td className="py-1.5 pr-2 tabular-nums whitespace-nowrap">
                      {new Date(c.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {!c.fim && <span className="ml-1 text-ok" title="Em andamento">●</span>}
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{c.origem === "totem" ? `🗼 ${c.origemNome}` : "📞 Telefone"}</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{bairroPorId(c.bairroId ?? "")?.nome ?? "—"}</td>
                    <td className="py-1.5">{c.acoes.join(" · ") || "Só ouviu o menu"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!s.chamadas.length && <p className="text-tinta-3 text-sm py-4">Nenhuma ligação ainda. Faça uma em “Ligar” ou simule um dia movimentado.</p>}
          </div>
        </Cartao>
      </div>
      <p className="text-xs text-tinta-3">
        Nenhum dado pessoal aparece aqui: a prefeitura vê só números agregados (LGPD). Telefones ficam apenas na fila de SMS.
      </p>
    </div>
  );
}
