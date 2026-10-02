import { describe, expect, it } from "vitest";
import { dadosIniciais } from "@/data/garca";
import { iniciar, processar, processarFala, type Contexto, type Resposta } from "./machine";

const ctx = (hora = 10): Contexto => ({ dados: dadosIniciais(), hora });
const texto = (r: Resposta) => r.falas.join(" ");

function teclar(r: Resposta, teclas: string, c: Contexto): Resposta {
  for (const t of teclas) r = processar(r.sessao, t, c);
  return r;
}

describe("URA Saúde Garça", () => {
  it("no celular pergunta o bairro; no totem já sabe onde está", () => {
    const c = ctx();
    const cel = iniciar({ tipo: "celular", telefone: "14998765432" }, c);
    expect(cel.sessao.tela).toBe("bairro");
    expect(texto(cel)).toContain("escolha o seu bairro");

    const totem = iniciar({ tipo: "totem", totemId: "totem-jafa" }, c);
    expect(totem.sessao.tela).toBe("menu");
    expect(totem.sessao.bairroId).toBe("jafa");
    expect(texto(totem)).toContain("Orelhão Inteligente de Jafa");
  });

  it("indica o posto de Jafa para quem está no orelhão de Jafa", () => {
    const c = ctx();
    const r = teclar(iniciar({ tipo: "totem", totemId: "totem-jafa" }, c), "1", c);
    expect(r.sessao.tela).toBe("posto");
    expect(r.sessao.postoAtualId).toBe("usf-jafa");
  });

  it("prefere um posto com fila menor mesmo que não seja o mais perto", () => {
    const c = ctx();
    c.dados.espera["usf-rebelo"] = 180;
    const r = teclar(iniciar({ tipo: "celular", telefone: "14998765432" }, c), "3" + "1", c); // Vila Rebelo → posto
    expect(r.sessao.postoAtualId).not.toBe("usf-rebelo");
    expect(texto(r)).toContain("não é o mais perto");
  });

  it("à noite indica o pronto atendimento 24h da Santa Casa", () => {
    const c = ctx(23);
    const r = teclar(iniciar({ tipo: "totem", totemId: "totem-praca" }, c), "1", c);
    expect(r.sessao.postoAtualId).toBe("santa-casa");
  });

  it("envia SMS com o endereço para quem liga do celular", () => {
    const c = ctx();
    const r = teclar(iniciar({ tipo: "celular", telefone: "14998765432" }, c), "111", c);
    const sms = r.efeitos.find((e) => e.tipo === "sms");
    expect(sms).toMatchObject({ tipo: "sms", para: "14998765432" });
    expect(r.sessao.tela).toBe("menu");
  });

  it("no totem pede o celular antes de mandar SMS", () => {
    const c = ctx();
    let r = teclar(iniciar({ tipo: "totem", totemId: "totem-praca" }, c), "11", c);
    expect(r.sessao.tela).toBe("telefone");
    r = teclar(r, "123#", c);
    expect(texto(r)).toContain("Número inválido");
    r = teclar(r, "14912345678#", c);
    expect(r.efeitos).toContainEqual(expect.objectContaining({ tipo: "sms", para: "14912345678" }));
    expect(r.sessao.origem.telefone).toBe("14912345678");
  });

  it("encontra remédio disponível e registra a consulta", () => {
    const c = ctx();
    const r = teclar(iniciar({ tipo: "totem", totemId: "totem-praca" }, c), "223", c); // remédios → diabetes → insulina NPH
    expect(texto(r)).toContain("tem sim");
    expect(r.sessao.postoAtualId).toBe("usf-oeste");
    expect(r.efeitos).toContainEqual({ tipo: "consulta", remedioId: "insulina-nph", encontrado: true });
  });

  it("remédio em falta → inscrição para aviso por SMS", () => {
    const c = ctx();
    let r = teclar(iniciar({ tipo: "celular", telefone: "14998765432" }, c), "1" + "242", c); // salbutamol
    expect(texto(r)).toContain("em falta em todos os postos");
    expect(r.efeitos).toContainEqual({ tipo: "consulta", remedioId: "salbutamol", encontrado: false });
    r = teclar(r, "1", c);
    expect(r.efeitos).toContainEqual({ tipo: "aviso", telefone: "14998765432", remedioId: "salbutamol" });
  });

  it("reflete na hora a mudança de estoque feita pelo posto", () => {
    const c = ctx();
    c.dados.estoque["usf-labienopolis"]["salbutamol"] = 10;
    const r = teclar(iniciar({ tipo: "celular", telefone: "14998765432" }, c), "1" + "242", c);
    expect(texto(r)).toContain("tem sim");
    expect(r.sessao.postoAtualId).toBe("usf-labienopolis");
  });

  it("tecla 0 transfere para o SAMU e encerra", () => {
    const c = ctx();
    const r = teclar(iniciar({ tipo: "totem", totemId: "totem-praca" }, c), "0", c);
    expect(r.efeitos).toContainEqual({ tipo: "samu" });
    expect(r.sessao.tela).toBe("fim");
  });

  it("tecla 9 repete e opção inválida não perde o menu", () => {
    const c = ctx();
    const inicio = iniciar({ tipo: "totem", totemId: "totem-praca" }, c);
    const inv = processar(inicio.sessao, "7", c);
    expect(inv.falas[0]).toBe("Opção inválida.");
    const rep = processar(inv.sessao, "9", c);
    expect(rep.falas).toEqual(inicio.sessao.ultimaFala);
  });

  it("entende voz: nome de remédio, bairro e emergência", () => {
    const c = ctx();
    const cel = iniciar({ tipo: "celular", telefone: "14998765432" }, c);
    const bairro = processarFala(cel.sessao, "eu moro na Vila Araceli", c);
    expect(bairro.sessao.bairroId).toBe("araceli");
    const rem = processarFala(bairro.sessao, "tem dipirona?", c);
    expect(rem.sessao.tela).toBe("remResultado");
    expect(rem.sessao.remedioId).toBe("dipirona");
    const sos = processarFala(processar(rem.sessao, "*", c).sessao, "é uma emergência", c);
    expect(sos.efeitos).toContainEqual({ tipo: "samu" });
  });

  it("menu de bairros pagina e aceita 'não sei'", () => {
    const c = ctx();
    const r = teclar(iniciar({ tipo: "celular", telefone: "14998765432" }, c), "552", c);
    expect(r.sessao.bairroId).toBe("centro");
    expect(r.sessao.tela).toBe("menu");
  });
});
