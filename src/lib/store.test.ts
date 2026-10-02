import { describe, expect, it } from "vitest";
import { POSTOS, REMEDIOS, dadosIniciais } from "@/data/garca";
import { sanear } from "./store";

describe("sanear (dados salvos no navegador)", () => {
  it("ignora lixo e devolve vazio", () => {
    expect(sanear(null)).toEqual({});
    expect(sanear("texto")).toEqual({});
    expect(sanear([1, 2])).toEqual({});
  });

  it("completa versões antigas com os dados de exemplo", () => {
    const r = sanear({ estoque: null, chamadas: "x", sms: [{ id: 1 }], horaSimulada: 99 });
    const base = dadosIniciais();
    expect(r.estoque).toEqual(base.estoque);
    expect(r.chamadas).toEqual([]);
    expect(r.sms).toEqual([]);
    expect(r.horaSimulada).toBeNull();
    expect(Object.keys(r.estoque!)).toHaveLength(POSTOS.length);
    expect(Object.keys(r.estoque![POSTOS[0].id])).toHaveLength(REMEDIOS.length);
  });

  it("mantém valores válidos e descarta inválidos campo a campo", () => {
    const r = sanear({
      estoque: { "usf-jafa": { dipirona: 7, losartana: -3, metformina: "10" } },
      espera: { "usf-jafa": 42, "usf-oeste": Number.NaN },
      vacinas: { "usf-jafa": ["gripe", "inventada"] },
      horaSimulada: 23,
    });
    const base = dadosIniciais();
    expect(r.estoque!["usf-jafa"].dipirona).toBe(7);
    expect(r.estoque!["usf-jafa"].losartana).toBe(base.estoque["usf-jafa"].losartana);
    expect(r.estoque!["usf-jafa"].metformina).toBe(base.estoque["usf-jafa"].metformina);
    expect(r.espera!["usf-jafa"]).toBe(42);
    expect(r.espera!["usf-oeste"]).toBe(base.espera["usf-oeste"]);
    expect(r.vacinas!["usf-jafa"]).toEqual(["gripe"]);
    expect(r.horaSimulada).toBe(23);
  });

  it("encerra ligações antigas que ficaram abertas", () => {
    const antiga = Date.now() - 2 * 3600_000;
    const r = sanear({ chamadas: [{ id: "a", inicio: antiga, origem: "hacker", acoes: [1, "ok"] }] });
    expect(r.chamadas![0]).toMatchObject({ fim: antiga, origem: "celular", acoes: ["ok"], consultas: [] });
  });
});
