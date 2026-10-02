// Máquina de estados PURA da URA (Unidade de Resposta Audível).
// Não acessa navegador, rede nem relógio: recebe a sessão, a entrada e os dados,
// e devolve a nova sessão, o que deve ser falado e os efeitos a aplicar.
// Por isso o mesmo código serve ao simulador web, ao totem e à rota TwiML.

import {
  BAIRROS,
  CATEGORIAS,
  PAGINAS_BAIRRO,
  REMEDIOS,
  VACINAS,
  bairroPorId,
  postoPorId,
  remedioPorId,
  remediosDaCategoria,
  totemPorId,
  type DadosVivos,
} from "@/data/garca";
import { distanciaFalada, ranquearPostos, type Ponto } from "@/lib/geo";

export type Tela =
  | "bairro"
  | "menu"
  | "posto"
  | "remCategoria"
  | "remLista"
  | "remResultado"
  | "espera"
  | "vacinas"
  | "telefone"
  | "fim";

export interface Origem {
  tipo: "celular" | "totem";
  /** Número de quem ligou (celular) ou informado no totem. */
  telefone?: string;
  totemId?: string;
}

export type AcaoPendente =
  | { tipo: "smsPosto"; postoId: string }
  | { tipo: "smsRemedio"; remedioId: string; postoId: string }
  | { tipo: "aviso"; remedioId: string };

export interface Sessao {
  tela: Tela;
  origem: Origem;
  bairroId?: string;
  pagina: number;
  categoriaId?: string;
  remedioId?: string;
  /** Índice da opção de posto (tecla 2 = "outra opção"). */
  opcaoPosto: number;
  postoAtualId?: string;
  buffer: string;
  pendente?: AcaoPendente;
  /** Última fala, para a tecla 9 (repetir). */
  ultimaFala: string[];
}

export interface Contexto {
  dados: DadosVivos;
  /** Hora do dia (0–23), injetada para manter a função pura e testável. */
  hora: number;
}

export type Efeito =
  | { tipo: "sms"; para: string; texto: string }
  | { tipo: "aviso"; telefone: string; remedioId: string }
  | { tipo: "consulta"; remedioId: string; encontrado: boolean }
  | { tipo: "acao"; descricao: string }
  | { tipo: "localizado"; bairroId: string }
  | { tipo: "samu" }
  | { tipo: "desligar" };

export interface Opcao {
  tecla: string;
  rotulo: string;
}

export interface Resposta {
  sessao: Sessao;
  falas: string[];
  efeitos: Efeito[];
  opcoes: Opcao[];
}

// ---------------------------------------------------------------- utilidades

const REPETIR = "Para repetir, tecle 9.";

function pontoDeOrigem(s: Sessao): Ponto {
  if (s.origem.tipo === "totem" && s.origem.totemId) {
    const t = totemPorId(s.origem.totemId);
    if (t) return t;
  }
  return bairroPorId(s.bairroId ?? "centro") ?? BAIRROS[0];
}

function finalDoNumero(tel: string): string {
  return tel.slice(-4).split("").join(" ");
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ");
}

export function opcoesDaTela(s: Sessao, ctx?: Contexto): Opcao[] {
  switch (s.tela) {
    case "bairro": {
      const pagina = PAGINAS_BAIRRO[s.pagina] ?? [];
      const ops = pagina.map((id, i) => ({ tecla: String(i + 1), rotulo: bairroPorId(id)!.nome }));
      if (s.pagina === PAGINAS_BAIRRO.length - 1) {
        ops.push({ tecla: String(pagina.length + 1), rotulo: "Não sei / outro" });
        ops.push({ tecla: "5", rotulo: "Voltar ao início da lista" });
      } else {
        ops.push({ tecla: "5", rotulo: "Mais bairros" });
      }
      return ops;
    }
    case "menu":
      return [
        { tecla: "1", rotulo: "Posto mais próximo" },
        { tecla: "2", rotulo: "Tem remédio?" },
        { tecla: "3", rotulo: "Tempo de espera" },
        { tecla: "4", rotulo: "Vacinas e horários" },
        { tecla: "0", rotulo: "EMERGÊNCIA (SAMU 192)" },
        { tecla: "9", rotulo: "Repetir" },
      ];
    case "posto": {
      const ops: Opcao[] = [];
      if (s.postoAtualId) ops.push({ tecla: "1", rotulo: "Receber endereço por SMS" });
      if (ctx && s.postoAtualId && rankingPostos(s, ctx).length > s.opcaoPosto + 1)
        ops.push({ tecla: "2", rotulo: "Outra opção de posto" });
      return [...ops, { tecla: "*", rotulo: "Menu principal" }, { tecla: "9", rotulo: "Repetir" }];
    }
    case "remCategoria":
      return [
        ...CATEGORIAS.map((c, i) => ({ tecla: String(i + 1), rotulo: c.nome })),
        { tecla: "*", rotulo: "Menu principal" },
        { tecla: "9", rotulo: "Repetir" },
      ];
    case "remLista":
      return [
        ...remediosDaCategoria(s.categoriaId ?? "").map((r, i) => ({ tecla: String(i + 1), rotulo: r.nome })),
        { tecla: "8", rotulo: "Outra categoria" },
        { tecla: "*", rotulo: "Menu principal" },
        { tecla: "9", rotulo: "Repetir" },
      ];
    case "remResultado":
      return [
        { tecla: "1", rotulo: s.postoAtualId ? "Receber endereço por SMS" : "Avisar por SMS quando chegar" },
        { tecla: "2", rotulo: "Consultar outro remédio" },
        { tecla: "*", rotulo: "Menu principal" },
        { tecla: "9", rotulo: "Repetir" },
      ];
    case "espera":
    case "vacinas":
      return [
        { tecla: "*", rotulo: "Menu principal" },
        { tecla: "9", rotulo: "Repetir" },
      ];
    case "telefone":
      return [
        { tecla: "#", rotulo: "Confirmar número" },
        { tecla: "*", rotulo: "Cancelar" },
      ];
    case "fim":
      return [];
  }
}

function resposta(sessao: Sessao, falas: string[], efeitos: Efeito[], ctx: Contexto): Resposta {
  const s = { ...sessao, ultimaFala: falas };
  return { sessao: s, falas, efeitos, opcoes: opcoesDaTela(s, ctx) };
}

function rankingPostos(s: Sessao, ctx: Contexto) {
  const origem = pontoDeOrigem(s);
  // Atenção básica primeiro; o hospital só entra quando nenhuma USF está aberta.
  const usfs = ranquearPostos(origem, ctx.dados, { hora: ctx.hora, incluirHospital: false });
  return usfs.length ? usfs : ranquearPostos(origem, ctx.dados, { hora: ctx.hora });
}

// ------------------------------------------------------------------ telas

function falasDaTela(s: Sessao, ctx: Contexto): { falas: string[]; efeitos: Efeito[]; sessao: Sessao } {
  const efeitos: Efeito[] = [];
  switch (s.tela) {
    case "bairro": {
      const pagina = PAGINAS_BAIRRO[s.pagina];
      const itens = pagina.map((id, i) => `Tecle ${i + 1} para ${bairroPorId(id)!.nome}.`);
      const ultima = s.pagina === PAGINAS_BAIRRO.length - 1;
      const extra = ultima
        ? [`Tecle ${pagina.length + 1} se não souber ou se seu bairro não está na lista.`, "Tecle 5 para ouvir a lista de novo."]
        : ["Tecle 5 para mais bairros."];
      const intro = s.pagina === 0 ? ["Para achar o posto mais perto de você, escolha o seu bairro."] : [];
      return { sessao: s, efeitos, falas: [...intro, ...itens, ...extra] };
    }
    case "menu":
      return {
        sessao: s,
        efeitos,
        falas: [
          "Menu principal.",
          "Tecle 1 para o posto de saúde mais indicado agora.",
          "Tecle 2 para saber se tem um remédio.",
          "Tecle 3 para o tempo de espera nos postos.",
          "Tecle 4 para vacinas e horários.",
          "Em caso de emergência, tecle 0.",
          REPETIR,
        ],
      };
    case "posto": {
      const ranking = rankingPostos(s, ctx);
      const item = ranking[s.opcaoPosto];
      if (!item) {
        return {
          sessao: { ...s, postoAtualId: undefined },
          efeitos: [{ tipo: "acao", descricao: "Nenhum posto aberto" }],
          falas: [
            "Neste horário não há nenhum posto de saúde aberto.",
            "Se for uma emergência, tecle asterisco e depois 0, ou ligue 192.",
          ],
        };
      }
      const p = item.posto;
      const falas: string[] = [];
      if (s.opcaoPosto === 0) {
        falas.push(`O posto mais indicado agora é o ${p.apelido}, a ${distanciaFalada(item.km)}.`);
        const maisPerto = [...ranking].sort((a, b) => a.km - b.km)[0];
        if (maisPerto.posto.id !== p.id) {
          falas.push(`Ele não é o mais perto, mas a fila é menor que no ${maisPerto.posto.apelido}.`);
        }
      } else {
        falas.push(`Outra opção é o ${p.apelido}, a ${distanciaFalada(item.km)}.`);
      }
      falas.push(`A espera estimada é de ${item.espera} minutos.`);
      falas.push(`Endereço: ${p.endereco}.`);
      falas.push(p.h24 ? "Funciona 24 horas." : `Funciona até as ${p.fecha} horas.`);
      falas.push("Tecle 1 para receber o endereço por SMS.");
      if (ranking.length > s.opcaoPosto + 1) falas.push("Tecle 2 para ouvir outra opção.");
      falas.push("Tecle asterisco para voltar ao menu.");
      efeitos.push({ tipo: "acao", descricao: `Posto indicado: ${p.apelido}` });
      return { sessao: { ...s, postoAtualId: p.id }, efeitos, falas };
    }
    case "remCategoria":
      return {
        sessao: s,
        efeitos,
        falas: [
          "Qual tipo de remédio?",
          ...CATEGORIAS.map((c, i) => `Tecle ${i + 1} para ${c.nome}.`),
          "Se preferir, fale o nome do remédio.",
        ],
      };
    case "remLista": {
      const lista = remediosDaCategoria(s.categoriaId ?? "");
      return {
        sessao: s,
        efeitos,
        falas: [
          ...lista.map((r, i) => `Tecle ${i + 1} para ${r.falado}.`),
          "Tecle 8 para outra categoria.",
          REPETIR,
        ],
      };
    }
    case "remResultado": {
      const r = remedioPorId(s.remedioId ?? "")!;
      const origem = pontoDeOrigem(s);
      const abertos = ranquearPostos(origem, ctx.dados, { hora: ctx.hora, remedioId: r.id });
      if (abertos.length) {
        const item = abertos[0];
        efeitos.push({ tipo: "consulta", remedioId: r.id, encontrado: true });
        return {
          sessao: { ...s, postoAtualId: item.posto.id },
          efeitos,
          falas: [
            `${r.falado}: tem sim!`,
            `O posto aberto mais indicado com esse remédio é o ${item.posto.apelido}, a ${distanciaFalada(item.km)}, com espera de ${item.espera} minutos.`,
            "Leve a receita e o cartão do SUS.",
            "Tecle 1 para receber o endereço por SMS. Tecle 2 para consultar outro remédio.",
          ],
        };
      }
      const fechados = ranquearPostos(origem, ctx.dados, { hora: ctx.hora, remedioId: r.id, somenteAbertos: false });
      if (fechados.length) {
        const item = fechados[0];
        efeitos.push({ tipo: "consulta", remedioId: r.id, encontrado: true });
        return {
          sessao: { ...s, postoAtualId: item.posto.id },
          efeitos,
          falas: [
            `Agora nenhum posto aberto tem ${r.falado}.`,
            `O ${item.posto.apelido} tem, e abre às ${item.posto.abre} horas.`,
            "Tecle 1 para receber o endereço por SMS. Tecle 2 para consultar outro remédio.",
          ],
        };
      }
      efeitos.push({ tipo: "consulta", remedioId: r.id, encontrado: false });
      return {
        sessao: { ...s, postoAtualId: undefined },
        efeitos,
        falas: [
          `Infelizmente ${r.falado} está em falta em todos os postos da cidade.`,
          "Tecle 1 para receber um SMS assim que chegar. Tecle 2 para consultar outro remédio.",
        ],
      };
    }
    case "espera": {
      const ranking = rankingPostos(s, ctx).slice(0, 4);
      efeitos.push({ tipo: "acao", descricao: "Consultou tempo de espera" });
      if (!ranking.length) {
        return { sessao: s, efeitos, falas: ["Neste horário não há postos abertos.", "Tecle asterisco para voltar."] };
      }
      return {
        sessao: s,
        efeitos,
        falas: [
          "Tempo de espera agora nos postos mais indicados para você:",
          ...ranking.map((i) => `${i.posto.apelido}: ${i.espera} minutos, a ${distanciaFalada(i.km)}.`),
          "Tecle asterisco para voltar ao menu.",
        ],
      };
    }
    case "vacinas": {
      const origem = pontoDeOrigem(s);
      const falas = ["Campanhas de vacinação ativas:"];
      for (const v of VACINAS) {
        const onde = ranquearPostos(origem, ctx.dados, { hora: ctx.hora, vacinaId: v.id, somenteAbertos: false })[0];
        if (onde) falas.push(`${v.nome}, para ${v.publico}. Mais perto: ${onde.posto.apelido}.`);
      }
      falas.push(
        "Os postos funcionam de segunda a sexta, das 7 às 17 horas; alguns até as 19.",
        "O pronto atendimento da Santa Casa funciona 24 horas.",
        "Leve a carteira de vacinação e um documento.",
        "Tecle asterisco para voltar ao menu.",
      );
      efeitos.push({ tipo: "acao", descricao: "Consultou vacinas" });
      return { sessao: s, efeitos, falas };
    }
    case "telefone":
      return {
        sessao: { ...s, buffer: "" },
        efeitos,
        falas: ["Digite o número do seu celular com DDD e depois tecle sustenido.", "Para cancelar, tecle asterisco."],
      };
    case "fim":
      return { sessao: s, efeitos, falas: [] };
  }
}

function entrar(s: Sessao, tela: Tela, ctx: Contexto, antes: string[] = [], efeitosAntes: Efeito[] = []): Resposta {
  const r = falasDaTela({ ...s, tela }, ctx);
  return resposta(r.sessao, [...antes, ...r.falas], [...efeitosAntes, ...r.efeitos], ctx);
}

// --------------------------------------------------------------- execução

function executarPendente(s: Sessao, telefone: string, ctx: Contexto): Resposta {
  const p = s.pendente;
  const base: Sessao = { ...s, pendente: undefined, buffer: "", origem: { ...s.origem, telefone } };
  const fim = `para o número terminado em ${finalDoNumero(telefone)}.`;
  if (!p) return entrar(base, "menu", ctx);

  if (p.tipo === "aviso") {
    const r = remedioPorId(p.remedioId)!;
    return entrar(
      base,
      "menu",
      ctx,
      [`Combinado! Quando ${r.falado} chegar em algum posto, enviaremos um SMS ${fim}`],
      [
        { tipo: "aviso", telefone, remedioId: r.id },
        { tipo: "sms", para: telefone, texto: `Saúde Garça: você será avisado(a) quando ${r.nome} chegar em um posto.` },
      ],
    );
  }

  const posto = postoPorId(p.postoId)!;
  const espera = ctx.dados.espera[posto.id] ?? 0;
  const horario = posto.h24 ? "24h" : `${posto.abre}h às ${posto.fecha}h`;
  const texto =
    p.tipo === "smsRemedio"
      ? `Saúde Garça: ${remedioPorId(p.remedioId)!.nome} disponível em ${posto.nome}, ${posto.endereco} (${horario}). Leve receita e cartão SUS.`
      : `Saúde Garça: ${posto.nome}, ${posto.endereco}. Espera aprox. ${espera} min. Horário: ${horario}. Leve cartão SUS.`;
  return entrar(base, "menu", ctx, [`Pronto! Enviamos o endereço por SMS ${fim}`], [{ tipo: "sms", para: telefone, texto }]);
}

/** Pede o telefone se ainda não sabemos; senão executa a ação direto. */
function comTelefone(s: Sessao, acao: AcaoPendente, ctx: Contexto): Resposta {
  const comPendente = { ...s, pendente: acao };
  if (s.origem.telefone) return executarPendente(comPendente, s.origem.telefone, ctx);
  return entrar(comPendente, "telefone", ctx);
}

function definirBairro(s: Sessao, bairroId: string, ctx: Contexto, antes: string[] = []): Resposta {
  const b = bairroPorId(bairroId)!;
  return entrar({ ...s, bairroId }, "menu", ctx, [...antes, `Certo, bairro ${b.nome}.`], [{ tipo: "localizado", bairroId }]);
}

function consultarRemedio(s: Sessao, remedioId: string, ctx: Contexto): Resposta {
  const r = remedioPorId(remedioId)!;
  return entrar({ ...s, remedioId, categoriaId: r.categoriaId }, "remResultado", ctx);
}

/** Repete o menu atual sem perder a "última fala" (a tecla 9 continua funcionando). */
const naoEntendi = (s: Sessao, ctx: Contexto, aviso = "Opção inválida."): Resposta => ({
  sessao: s,
  falas: [aviso, ...s.ultimaFala],
  efeitos: [],
  opcoes: opcoesDaTela(s, ctx),
});

// ------------------------------------------------------------------- API

export function iniciar(origem: Origem, ctx: Contexto): Resposta {
  const s: Sessao = { tela: "menu", origem, pagina: 0, opcaoPosto: 0, buffer: "", ultimaFala: [] };
  const boasVindas = ["Olá! Você ligou para o Saúde Garça, o serviço gratuito de informações de saúde da prefeitura."];
  if (origem.tipo === "totem" && origem.totemId) {
    const t = totemPorId(origem.totemId)!;
    return entrar({ ...s, bairroId: t.bairroId }, "menu", ctx, [...boasVindas, `Você está no ${t.nome}.`], [
      { tipo: "localizado", bairroId: t.bairroId },
    ]);
  }
  return entrar(s, "bairro", ctx, boasVindas);
}

export function processar(s: Sessao, tecla: string, ctx: Contexto): Resposta {
  if (s.tela === "fim") return resposta(s, [], [], ctx);

  if (s.tela === "telefone") {
    if (tecla === "*") return entrar({ ...s, pendente: undefined, buffer: "" }, "menu", ctx, ["Cancelado."]);
    if (tecla === "#") {
      const numero = s.buffer;
      if (numero.length >= 10 && numero.length <= 11) return executarPendente(s, numero, ctx);
      return resposta({ ...s, buffer: "" }, ["Número inválido. Digite o celular com DDD, por exemplo 14 9 8765 4321, e tecle sustenido."], [], ctx);
    }
    if (/^\d$/.test(tecla)) {
      const sessao = { ...s, buffer: s.buffer + tecla };
      return { sessao, falas: [], efeitos: [], opcoes: opcoesDaTela(sessao, ctx) };
    }
    return resposta(s, [], [], ctx);
  }

  if (tecla === "9") return resposta(s, s.ultimaFala, [], ctx);
  if (tecla === "*" && s.tela !== "bairro") return entrar({ ...s, opcaoPosto: 0 }, "menu", ctx);

  switch (s.tela) {
    case "bairro": {
      const pagina = PAGINAS_BAIRRO[s.pagina];
      const ultima = s.pagina === PAGINAS_BAIRRO.length - 1;
      if (tecla === "5") return entrar({ ...s, pagina: ultima ? 0 : s.pagina + 1 }, "bairro", ctx);
      const n = Number(tecla);
      if (n >= 1 && n <= pagina.length) return definirBairro(s, pagina[n - 1], ctx);
      if (ultima && n === pagina.length + 1)
        return definirBairro(s, "centro", ctx, ["Sem problemas, vamos usar o Centro como referência."]);
      return naoEntendi(s, ctx);
    }
    case "menu":
      switch (tecla) {
        case "1":
          return entrar({ ...s, opcaoPosto: 0 }, "posto", ctx);
        case "2":
          return entrar(s, "remCategoria", ctx);
        case "3":
          return entrar(s, "espera", ctx);
        case "4":
          return entrar(s, "vacinas", ctx);
        case "0":
          return resposta(
            { ...s, tela: "fim" },
            [
              "Atenção: se a pessoa não respira, está desacordada, com dor forte no peito ou sangramento intenso, fique na linha.",
              "Transferindo sua ligação para o SAMU, 192.",
            ],
            [{ tipo: "samu" }, { tipo: "acao", descricao: "Transferido ao SAMU 192" }, { tipo: "desligar" }],
            ctx,
          );
      }
      return naoEntendi(s, ctx);
    case "posto":
      if (tecla === "1" && s.postoAtualId) return comTelefone(s, { tipo: "smsPosto", postoId: s.postoAtualId }, ctx);
      if (tecla === "2" && rankingPostos(s, ctx).length > s.opcaoPosto + 1)
        return entrar({ ...s, opcaoPosto: s.opcaoPosto + 1 }, "posto", ctx);
      return naoEntendi(s, ctx);
    case "remCategoria": {
      const c = CATEGORIAS[Number(tecla) - 1];
      if (c) return entrar({ ...s, categoriaId: c.id }, "remLista", ctx);
      return naoEntendi(s, ctx);
    }
    case "remLista": {
      if (tecla === "8") return entrar(s, "remCategoria", ctx);
      const r = remediosDaCategoria(s.categoriaId ?? "")[Number(tecla) - 1];
      if (r) return consultarRemedio(s, r.id, ctx);
      return naoEntendi(s, ctx);
    }
    case "remResultado":
      if (tecla === "1") {
        const acao: AcaoPendente = s.postoAtualId
          ? { tipo: "smsRemedio", remedioId: s.remedioId!, postoId: s.postoAtualId }
          : { tipo: "aviso", remedioId: s.remedioId! };
        return comTelefone(s, acao, ctx);
      }
      if (tecla === "2") return entrar(s, "remCategoria", ctx);
      return naoEntendi(s, ctx);
    default:
      return naoEntendi(s, ctx);
  }
}

// ------------------------------------------------------- reconhecimento de voz

const NUMEROS: Record<string, string> = {
  zero: "0", um: "1", uma: "1", dois: "2", duas: "2", tres: "3", quatro: "4",
  cinco: "5", seis: "6", sete: "7", oito: "8", nove: "9",
};

const PALAVRAS_CHAVE: [RegExp, string, Tela[]][] = [
  [/\b(emergencia|socorro|samu|urgente|infarto|desmaio)/, "0", ["menu"]],
  [/\b(repet|nao entendi|de novo)/, "9", []],
  [/\b(voltar|menu|inicio|cancela)/, "*", []],
  [/\b(posto|perto|proximo|medico|consulta)/, "1", ["menu"]],
  [/\b(remedio|medicamento|farmacia)/, "2", ["menu"]],
  [/\b(espera|fila|demora|lotad)/, "3", ["menu"]],
  [/\b(vacina|horario)/, "4", ["menu"]],
  [/\b(sms|mensagem|sim|quero|avisa)/, "1", ["posto", "remResultado"]],
  [/\b(outro|outra)/, "2", ["posto", "remResultado"]],
];

/**
 * Converte uma frase falada em ação. Reconhece nomes de remédios e bairros em
 * qualquer momento ("tem dipirona?"), palavras-chave e números falados.
 */
export function processarFala(s: Sessao, texto: string, ctx: Contexto): Resposta {
  const t = normalizar(texto);

  if (s.tela === "telefone") {
    const digitos = t.split(/\s+/).map((p) => NUMEROS[p] ?? p.replace(/\D/g, "")).join("");
    if (digitos.length >= 10) return processar({ ...s, buffer: digitos.slice(0, 11) }, "#", ctx);
  }

  if (s.tela !== "fim") {
    const sinonimos = REMEDIOS.flatMap((r) => r.sinonimos.map((sin) => ({ r, sin: normalizar(sin) }))).sort(
      (a, b) => b.sin.length - a.sin.length,
    );
    const achou = sinonimos.find(({ sin }) => t.includes(sin));
    if (achou && s.tela !== "telefone") {
      const comBairro = s.tela === "bairro" ? { ...s, bairroId: "centro" } : s;
      return consultarRemedio(comBairro, achou.r.id, ctx);
    }
  }

  if (s.tela === "bairro") {
    const b = BAIRROS.find((b) => t.includes(normalizar(b.nome)) || t.includes(normalizar(b.nome.split(" ").pop()!)));
    if (b) return definirBairro(s, b.id, ctx);
  }

  for (const [re, tecla, telas] of PALAVRAS_CHAVE) {
    if (re.test(t) && (telas.length === 0 || telas.includes(s.tela))) return processar(s, tecla, ctx);
  }

  const numero = t.split(/\s+/).map((p) => NUMEROS[p] ?? (/^\d$/.test(p) ? p : "")).find(Boolean);
  if (numero) return processar(s, numero, ctx);

  return naoEntendi(s, ctx, "Desculpe, não entendi. Você pode usar o teclado.");
}
