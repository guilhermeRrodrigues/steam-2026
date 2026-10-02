"use client";

// Tons DTMF reais: cada tecla soma uma frequência baixa e uma alta.
const FREQ: Record<string, [number, number]> = {
  "1": [697, 1209], "2": [697, 1336], "3": [697, 1477],
  "4": [770, 1209], "5": [770, 1336], "6": [770, 1477],
  "7": [852, 1209], "8": [852, 1336], "9": [852, 1477],
  "*": [941, 1209], "0": [941, 1336], "#": [941, 1477],
};

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  try {
    ctx ??= new AudioContext();
    // O Chrome cria o áudio "suspenso" até o primeiro clique.
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** Os tons são enfeite: se o áudio falhar, a ligação continua normalmente. */
function tocar(freqs: number[], duracao: number, volume = 0.08, inicio = 0) {
  try {
    tocarSemProtecao(freqs, duracao, volume, inicio);
  } catch {
    // ignora
  }
}

function tocarSemProtecao(freqs: number[], duracao: number, volume: number, inicio: number) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + inicio;
  const ganho = a.createGain();
  ganho.gain.setValueAtTime(volume, t0);
  ganho.gain.setValueAtTime(0, t0 + duracao);
  ganho.connect(a.destination);
  for (const f of freqs) {
    const o = a.createOscillator();
    o.frequency.value = f;
    o.connect(ganho);
    o.start(t0);
    o.stop(t0 + duracao);
  }
}

export function tomTecla(tecla: string) {
  const f = FREQ[tecla];
  if (f) tocar(f, 0.12);
}

/** Toque de chamada brasileiro (425 Hz, 1 s ligado). */
export function tomChamando(vezes = 2) {
  for (let i = 0; i < vezes; i++) tocar([425], 1, 0.06, i * 1.6);
}

export function tomOcupado() {
  for (let i = 0; i < 3; i++) tocar([425], 0.25, 0.06, i * 0.5);
}
