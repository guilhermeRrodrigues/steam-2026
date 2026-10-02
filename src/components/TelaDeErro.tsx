"use client";

import { useEffect, useRef, useState } from "react";
import { ehErroDeDeploy, recarregarUmaVez } from "@/lib/recuperacao";

/**
 * Tela de erro amigável, em português. Tenta se recuperar sozinha uma vez
 * (ou recarrega a página se o erro veio de um deploy novo).
 */
export function TelaDeErro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const tentou = useRef(false);
  const [recuperando, setRecuperando] = useState(true);

  useEffect(() => {
    console.error("Saúde Garça: erro capturado", error);
    if (ehErroDeDeploy(error) && recarregarUmaVez()) return;
    if (tentou.current) {
      setRecuperando(false);
      return;
    }
    tentou.current = true;
    const t = setTimeout(() => {
      reset();
      setRecuperando(false);
    }, 800);
    return () => clearTimeout(t);
  }, [error, reset]);

  return (
    <div role="alert" className="max-w-xl mx-auto my-10 bg-cartao border border-borda rounded-2xl p-6 space-y-4 text-center">
      <p className="text-4xl" aria-hidden>
        🩺
      </p>
      <h1 className="text-2xl font-bold">Algo deu errado nesta tela</h1>
      <p className="text-tinta-2">
        {recuperando ? (
          <span key="rec">Tentando recuperar automaticamente…</span>
        ) : (
          <span key="man">Toque em “Tentar de novo”. Seus dados continuam salvos.</span>
        )}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => reset()} className="px-5 py-3 rounded-xl bg-marca text-white font-bold">
          Tentar de novo
        </button>
        <button type="button" onClick={() => window.location.reload()} className="px-5 py-3 rounded-xl border border-borda font-bold">
          Recarregar página
        </button>
        <a href="/" className="px-5 py-3 rounded-xl border border-borda font-bold">
          Ir para o início
        </a>
      </div>
      <details className="text-left text-xs text-tinta-3">
        <summary className="cursor-pointer">Detalhes técnicos (para informar a equipe)</summary>
        <pre className="whitespace-pre-wrap break-words mt-2">
          {error.name}: {error.message}
          {error.digest ? `\nCódigo: ${error.digest}` : ""}
        </pre>
      </details>
    </div>
  );
}
