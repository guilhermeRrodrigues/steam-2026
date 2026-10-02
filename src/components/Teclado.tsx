"use client";

const TECLAS: [string, string][] = [
  ["1", ""], ["2", "ABC"], ["3", "DEF"],
  ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
  ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
  ["*", ""], ["0", "+"], ["#", ""],
];

export function Teclado({ onTecla, desativado, grande }: { onTecla: (t: string) => void; desativado?: boolean; grande?: boolean }) {
  return (
    <div className={`grid grid-cols-3 ${grande ? "gap-3" : "gap-2"}`} role="group" aria-label="Teclado do telefone">
      {TECLAS.map(([t, letras]) => (
        <button
          key={t}
          type="button"
          disabled={desativado}
          onClick={() => onTecla(t)}
          aria-label={t === "*" ? "asterisco" : t === "#" ? "sustenido" : `tecla ${t}`}
          className={`rounded-xl bg-white/90 text-neutral-900 shadow-[inset_0_-3px_0_rgba(0,0,0,.15)] active:translate-y-px active:shadow-none disabled:opacity-40 flex flex-col items-center justify-center ${
            grande ? "h-16 text-3xl" : "h-12 text-2xl"
          }`}
        >
          <span className="font-bold leading-none">{t}</span>
          {letras && <span className="text-[10px] tracking-widest text-neutral-500">{letras}</span>}
        </button>
      ))}
    </div>
  );
}
