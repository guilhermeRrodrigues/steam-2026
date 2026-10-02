"use client";

import { Component, type ReactNode } from "react";

interface Props {
  /** O que mostrar se este bloco falhar (o resto da tela continua funcionando). */
  nome: string;
  children: ReactNode;
}

/**
 * Isola uma parte da tela (mapa, legendas, controles de voz). Se ela quebrar,
 * só ela some — a ligação e o teclado continuam funcionando.
 */
export class Protecao extends Component<Props, { erro: boolean }> {
  state = { erro: false };

  static getDerivedStateFromError() {
    return { erro: true };
  }

  componentDidCatch(erro: unknown) {
    console.error(`Saúde Garça: falha em "${this.props.nome}"`, erro);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div role="status" className="rounded-xl border border-dashed border-borda p-4 text-sm text-tinta-2 flex flex-wrap items-center gap-3">
        <span>{this.props.nome} indisponível no momento.</span>
        <button type="button" onClick={() => this.setState({ erro: false })} className="px-3 py-1 rounded-lg border border-borda">
          Tentar de novo
        </button>
      </div>
    );
  }
}
