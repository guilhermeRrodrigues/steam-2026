"use client";

// Regras de recuperação compartilhadas pelas telas de erro.

const CHAVE_RECARGA = "saude-garca:recarregou";

/** Erro de "pedaço" do site que sumiu após um novo deploy na Vercel. */
export function ehErroDeDeploy(erro: unknown): boolean {
  const e = erro as { name?: string; message?: string } | null;
  return e?.name === "ChunkLoadError" || /Loading (CSS )?chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(e?.message ?? "");
}

/** Recarrega a página uma única vez por sessão (evita ciclo infinito). */
export function recarregarUmaVez(): boolean {
  try {
    if (sessionStorage.getItem(CHAVE_RECARGA)) return false;
    sessionStorage.setItem(CHAVE_RECARGA, String(Date.now()));
  } catch {
    // sem sessionStorage: recarrega mesmo assim
  }
  window.location.reload();
  return true;
}

/** Depois de um carregamento bem-sucedido, libera nova recarga automática no futuro. */
export function liberarRecarga() {
  try {
    sessionStorage.removeItem(CHAVE_RECARGA);
  } catch {
    // ignora
  }
}
