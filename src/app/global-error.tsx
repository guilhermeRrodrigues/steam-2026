"use client";

import { TelaDeErro } from "@/components/TelaDeErro";
import "./globals.css";

// Última linha de defesa (erro no próprio layout). Substitui a tela em inglês do Next.
export default function ErroGlobal(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR" translate="no">
      <body className="min-h-dvh bg-fundo text-tinta font-sans notranslate">
        <TelaDeErro {...props} />
      </body>
    </html>
  );
}
