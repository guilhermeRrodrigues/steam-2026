"use client";

import { useState } from "react";
import { Carregando } from "@/components/Moldura";
import { useCidade } from "@/lib/store";
import { useHidratado } from "@/lib/sync";

const formatar = (n: string) => (n.length >= 10 ? `(${n.slice(0, 2)}) ${n.slice(2, -4)}-${n.slice(-4)}` : n);

export default function CaixaSms() {
  const hidratado = useHidratado();
  const sms = useCidade((s) => s.sms);
  const limpar = useCidade((s) => s.limparSms);
  const [filtro, setFiltro] = useState("todos");

  if (!hidratado) return <Carregando />;

  const numeros = [...new Set(sms.map((m) => m.para))];
  const lista = filtro === "todos" ? sms : sms.filter((m) => m.para === filtro);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Caixa de SMS simulada</h1>
        <p className="text-tinta-2">
          SMS funciona em qualquer celular, até nos mais simples e sem internet. Aqui aparecem as mensagens que o Saúde Garça
          enviou: endereço do posto, onde retirar o remédio e avisos de reposição.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-sm flex items-center gap-2">
            Número:
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="rounded-lg border border-borda bg-cartao px-2 py-1">
              <option value="todos">Todos ({sms.length})</option>
              {numeros.map((n) => (
                <option key={n} value={n}>
                  {formatar(n)}
                </option>
              ))}
            </select>
          </label>
          {sms.length > 0 && (
            <button type="button" onClick={limpar} className="text-sm px-3 py-1 rounded-lg border border-borda">
              Apagar todos
            </button>
          )}
        </div>
      </div>

      {/* Celular simples com a caixa de entrada */}
      <div className="rounded-[2rem] bg-neutral-900 p-4 shadow-2xl">
        <div className="rounded-xl bg-[#c9dcb5] text-[#1f2d16] p-3 h-[520px] overflow-y-auto font-mono text-sm">
          <p className="font-bold border-b border-[#1f2d16]/30 pb-1 mb-2">✉ Mensagens ({lista.length})</p>
          {lista.length === 0 && <p>Nenhuma mensagem. Faça uma ligação e peça o endereço por SMS (tecla 1).</p>}
          <ul className="space-y-3">
            {lista.map((m) => (
              <li key={m.id} className="border-b border-[#1f2d16]/20 pb-2">
                <p className="text-xs opacity-70">
                  Para {formatar(m.para)} · {new Date(m.quando).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p>{m.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
