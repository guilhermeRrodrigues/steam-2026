"use client";

import { useEffect, useState } from "react";
import { useCidade } from "@/lib/store";

/**
 * Sincroniza as abas: quando o painel do posto (em outra aba) altera o
 * localStorage, esta aba recarrega o estado na hora.
 */
export function useSincronizarAbas() {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== useCidade.persist.getOptions().name) return;
      // Falha ao ler a outra aba não pode afetar esta: mantém o estado atual.
      Promise.resolve(useCidade.persist.rehydrate()).catch((erro) => console.error("Falha ao sincronizar abas", erro));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}

/** Evita diferença entre o HTML do servidor e o estado salvo no navegador. */
export function useHidratado(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (useCidade.persist.hasHydrated()) setOk(true);
    const cancelar = useCidade.persist.onFinishHydration(() => setOk(true));
    // Nunca ficar preso em "Carregando…": segue com os dados de exemplo.
    const limite = setTimeout(() => setOk(true), 1500);
    return () => {
      cancelar();
      clearTimeout(limite);
    };
  }, []);
  return ok;
}
