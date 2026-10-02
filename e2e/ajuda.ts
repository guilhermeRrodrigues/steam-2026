import { test as base, expect, type Page } from "@playwright/test";

// PNG 1x1 cinza: substitui os tiles do OpenStreetMap, com atraso, para o mapa
// se comportar como na internet real (carregando enquanto o usuário navega).
const TILE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGO4c+cOAAWAAr9bCHvIAAAAAElFTkSuQmCC",
  "base64",
);

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(/tile\.openstreetmap\.org/, async (rota) => {
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 300));
      await rota.fulfill({ body: TILE, contentType: "image/png" }).catch(() => {});
    });
    await use(context);
  },
});
export { expect };

/**
 * Imita a tradução automática do Chrome/Edge: troca cada nó de texto por
 * <font><font>texto</font></font> e continua traduzindo o conteúdo novo.
 * É exatamente o que quebra o React ("removeChild"/"insertBefore") em sites reais.
 */
export async function simularTradutor(page: Page, forcar = false) {
  await page.addInitScript((forcar) => {
    const traduzir = (raiz: Node) => {
      const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
      const textos: Text[] = [];
      while (walker.nextNode()) {
        const t = walker.currentNode as Text;
        const pai = t.parentElement;
        if (!pai || !t.data.trim() || pai.closest("font, script, style, title")) continue;
        textos.push(t);
      }
      for (const t of textos) {
        const externo = document.createElement("font");
        const interno = document.createElement("font");
        interno.textContent = t.data;
        externo.appendChild(interno);
        t.parentNode?.replaceChild(externo, t);
      }
    };
    const iniciar = () => {
      // O Chrome respeita translate="no"; extensões às vezes não (forcar = pior caso).
      if (!forcar && document.documentElement.getAttribute("translate") === "no") return;
      if (!forcar && document.querySelector('meta[name="google"][content="notranslate"]')) return;
      traduzir(document.body);
      new MutationObserver((mudancas) => {
        for (const m of mudancas) {
          m.addedNodes.forEach((n) => traduzir(n.nodeType === Node.TEXT_NODE ? n.parentNode ?? n : n));
          if (m.type === "characterData" && m.target.parentNode) traduzir(m.target.parentNode);
        }
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    };
    // O tradutor age depois que a página carrega, como no Chrome.
    window.addEventListener("load", () => setTimeout(iniciar, 300));
  }, forcar);
}

/** Microfone falso: devolve uma frase, ou falha como o Chrome faz sem permissão. */
export async function microfoneFalso(page: Page, modo: { frase?: string; erro?: string; lancar?: boolean }) {
  await page.addInitScript((m) => {
    class Falso {
      lang = "";
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        if (m.lancar) throw new DOMException("recognition has already started", "InvalidStateError");
        setTimeout(() => {
          if (m.erro) this.onerror?.({ error: m.erro });
          else this.onresult?.({ results: [[{ transcript: m.frase ?? "" }]] });
          this.onend?.();
        }, 200);
      }
      stop() {}
      abort() {}
    }
    Object.assign(window, { SpeechRecognition: Falso, webkitSpeechRecognition: Falso });
  }, modo);
}

/** Coleta erros de JavaScript e garante que a tela de erro do Next não apareceu. */
export function vigiarErros(page: Page) {
  const erros: string[] = [];
  page.on("pageerror", (e) => erros.push(e.message));
  return {
    erros,
    async semQueda() {
      await expect(page.getByText(/couldn.t load|Algo deu errado/i)).toHaveCount(0);
      expect(erros, erros.join("\n")).toEqual([]);
    },
  };
}

export async function ligarDoCelular(page: Page) {
  await page.bringToFront(); // o Chromium adia a inicialização de abas em segundo plano
  await page.goto("/ligar");
  // Repete o clique até a página terminar de carregar (hidratar) e a chamada começar.
  await expect(async () => {
    await page.getByRole("button", { name: "Ligar", exact: true }).click({ timeout: 1000 }).catch(() => {});
    await expect(page.getByText(/Chamando 0800|Em ligação — Saúde Garça/).first()).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await expect(page.getByText("Em ligação — Saúde Garça")).toBeVisible({ timeout: 10_000 });
}

export async function teclar(page: Page, teclas: string) {
  for (const t of teclas) {
    const nome = t === "*" ? "asterisco" : t === "#" ? "sustenido" : `tecla ${t}`;
    await page.getByRole("button", { name: nome, exact: true }).click();
    await page.waitForTimeout(120);
  }
}
