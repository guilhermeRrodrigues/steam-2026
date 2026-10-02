// Ponte para o mundo real: a MESMA máquina de estados da simulação responde
// no formato TwiML, usado por plataformas de telefonia (Twilio e compatíveis).
// Basta apontar o webhook de voz de um número para esta rota.
//
// A rota é sem estado: a sessão da URA viaja codificada na URL de cada passo.
// Na simulação os dados vêm do exemplo (o servidor não enxerga o localStorage);
// num piloto real viriam de um banco atualizado pelos postos.

import { dadosIniciais } from "@/data/garca";
import { iniciar, processar, processarFala, type Contexto, type Resposta, type Sessao } from "@/lib/ivr/machine";

export const dynamic = "force-dynamic";

const escapar = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const codificar = (s: Sessao) => Buffer.from(JSON.stringify(s)).toString("base64url");
const decodificar = (t: string): Sessao | null => {
  try {
    return JSON.parse(Buffer.from(t, "base64url").toString("utf8")) as Sessao;
  } catch {
    return null;
  }
};

function contexto(): Contexto {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()),
  );
  return { dados: dadosIniciais(), hora: hora % 24 };
}

function twiml(r: Resposta, base: string): string {
  const say = r.falas.map((f) => `<Say language="pt-BR" voice="Polly.Camila">${escapar(f)}</Say>`).join("");
  const efeitos = r.efeitos.length ? `<!-- efeitos: ${escapar(JSON.stringify(r.efeitos))} -->` : "";

  if (r.efeitos.some((e) => e.tipo === "samu")) {
    // Num piloto real: <Dial>192</Dial>. Aqui só encerra para não discar de verdade.
    return `<?xml version="1.0" encoding="UTF-8"?><Response>${efeitos}${say}<Hangup/></Response>`;
  }
  const acao = escapar(`${base}?estado=${codificar(r.sessao)}`);
  const coleta =
    r.sessao.tela === "telefone"
      ? `finishOnKey="#" timeout="10"`
      : `numDigits="1" timeout="8" speechTimeout="auto" hints="posto, remédio, vacina, emergência"`;
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${efeitos}<Gather input="dtmf speech" language="pt-BR" ${coleta} action="${acao}" method="POST">${say}</Gather><Redirect method="POST">${acao}</Redirect></Response>`;
}

async function atender(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const form = req.method === "POST" ? await req.formData().catch(() => null) : null;
  const campo = (k: string) => (form?.get(k) as string | null) ?? url.searchParams.get(k) ?? "";

  const ctx = contexto();
  const sessao = decodificar(campo("estado"));
  const digitos = campo("Digits");
  const fala = campo("SpeechResult");

  let r: Resposta;
  if (!sessao) {
    const telefone = campo("From").replace(/\D/g, "").slice(-11) || undefined;
    r = iniciar({ tipo: "celular", telefone }, ctx);
  } else if (sessao.tela === "telefone" && digitos) {
    r = processar({ ...sessao, buffer: digitos.replace(/\D/g, "") }, "#", ctx);
  } else if (digitos) {
    r = processar(sessao, digitos[0], ctx);
  } else if (fala) {
    r = processarFala(sessao, fala, ctx);
  } else {
    // Silêncio: repete a última fala (no pedido de telefone, cancela).
    r = processar(sessao, sessao.tela === "telefone" ? "*" : "9", ctx);
  }

  return new Response(twiml(r, `${url.origin}${url.pathname}`), {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export const GET = atender;
export const POST = atender;
