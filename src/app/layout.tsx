import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible } from "next/font/google";
import { Cabecalho, Rodape } from "@/components/Moldura";
import "./globals.css";

// Fonte desenhada para leitura por pessoas com baixa visão.
const fonte = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-texto" });

export const metadata: Metadata = {
  title: "Saúde Garça — atendimento por telefone",
  description:
    "Simulação de um serviço público de informações de saúde por telefone e totens para Garça-SP: posto mais indicado, remédios, vacinas e emergência, sem precisar de internet.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={fonte.variable}>
      <body className="min-h-dvh flex flex-col font-sans">
        <Cabecalho />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6">{children}</main>
        <Rodape />
      </body>
    </html>
  );
}
