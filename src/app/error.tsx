"use client";

import { TelaDeErro } from "@/components/TelaDeErro";

// Erros dentro de uma tela ficam presos aqui: cabeçalho e navegação continuam funcionando.
export default function Erro(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <TelaDeErro {...props} />;
}
