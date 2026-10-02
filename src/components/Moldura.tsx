"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSincronizarAbas } from "@/lib/sync";

const LINKS = [
  { href: "/ligar", rotulo: "Ligar" },
  { href: "/totem", rotulo: "Totem" },
  { href: "/posto", rotulo: "Posto" },
  { href: "/prefeitura", rotulo: "Prefeitura" },
  { href: "/sms", rotulo: "SMS" },
];

export function Cabecalho() {
  useSincronizarAbas();
  const atual = usePathname();
  return (
    <header className="bg-cartao border-b border-borda">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span aria-hidden className="grid place-items-center size-8 rounded-lg bg-marca text-white">✚</span>
          Saúde Garça
        </Link>
        <nav aria-label="Telas da simulação" className="flex flex-wrap gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={atual === l.href ? "page" : undefined}
              className={`px-3 py-1.5 rounded-full ${
                atual === l.href ? "bg-marca text-white" : "text-tinta-2 hover:bg-marca-suave"
              }`}
            >
              {l.rotulo}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function Rodape() {
  return (
    <footer className="border-t border-borda text-xs text-tinta-3">
      <div className="max-w-7xl mx-auto px-4 py-4">
        Simulação educacional — projeto STEAM 2026. Nomes e endereços das USFs de Garça-SP vêm de listas públicas;
        coordenadas são aproximadas e estoques, filas e ligações são <strong>dados simulados</strong>. Em emergência
        real, ligue 192.
      </div>
    </footer>
  );
}

export function Cartao({ titulo, children, className = "", acao }: { titulo?: string; children: React.ReactNode; className?: string; acao?: React.ReactNode }) {
  return (
    <section className={`bg-cartao border border-borda rounded-2xl p-4 ${className}`}>
      {(titulo || acao) && (
        <div className="flex items-center justify-between gap-2 mb-3">
          {titulo && <h2 className="font-bold">{titulo}</h2>}
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}

export function Carregando() {
  return <p className="text-tinta-3 p-8 text-center">Carregando dados da cidade…</p>;
}
