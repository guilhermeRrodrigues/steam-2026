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
      if (e.key === useCidade.persist.getOptions().name) useCidade.persist.rehydrate();
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
    return useCidade.persist.onFinishHydration(() => setOk(true));
  }, []);
  return ok;
}
