import { expect, ligarDoCelular, microfoneFalso, simularTradutor, teclar, test, vigiarErros } from "./ajuda";

test.describe("estabilidade", () => {
  test("Chrome com tradução automática: Falar e trocar de tela não derrubam a página", async ({ page }) => {
    const v = vigiarErros(page);
    await simularTradutor(page);
    await microfoneFalso(page, { frase: "tem dipirona?" });
    await ligarDoCelular(page);
    await teclar(page, "1");
    await page.getByRole("button", { name: /Falar/ }).click();
    await expect(page.getByText(/Dipirona/).first()).toBeVisible();
    for (const rota of ["/posto", "/prefeitura", "/ligar", "/totem", "/sms", "/"]) {
      await page.getByRole("link", { name: rota === "/" ? "Saúde Garça" : new RegExp(`^${rota.slice(1)}$`, "i") }).first().click();
      await page.waitForURL(`**${rota}`);
      await page.waitForTimeout(400);
    }
    await v.semQueda();
  });

  test("pior caso: tradução forçada (extensão) também não derruba", async ({ page }) => {
    const v = vigiarErros(page);
    await simularTradutor(page, true);
    await microfoneFalso(page, { frase: "posto" });
    await ligarDoCelular(page);
    await teclar(page, "1");
    await page.getByRole("button", { name: /Falar/ }).click();
    await page.waitForTimeout(600);
    await teclar(page, "*2");
    for (const nome of ["Posto", "Prefeitura", "Ligar"]) {
      await page.getByRole("link", { name: nome, exact: true }).click();
      await page.waitForTimeout(500);
    }
    await expect(page.getByText(/couldn.t load/i)).toHaveCount(0);
    // A página pode se recuperar sozinha, mas nunca ficar presa na tela de erro.
    await expect(page.getByRole("button", { name: "Ligar", exact: true })).toBeVisible();
  });

  test("microfone sem permissão: mensagem amigável e a ligação continua", async ({ page }) => {
    const v = vigiarErros(page);
    await microfoneFalso(page, { erro: "not-allowed" });
    await ligarDoCelular(page);
    await page.getByRole("button", { name: /Falar/ }).click();
    await expect(page.getByText(/Permita o uso do microfone/)).toBeVisible();
    await teclar(page, "1");
    await expect(page.getByText(/Menu principal/).first()).toBeVisible();
    await v.semQueda();
  });

  test("reconhecimento de voz que lança erro ao iniciar não quebra nada", async ({ page }) => {
    const v = vigiarErros(page);
    await microfoneFalso(page, { lancar: true });
    await ligarDoCelular(page);
    await page.getByRole("button", { name: /Falar/ }).click();
    await page.getByRole("button", { name: /Falar/ }).click();
    await expect(page.getByText(/microfone/i).first()).toBeVisible();
    await teclar(page, "1");
    await v.semQueda();
  });

  test("localStorage corrompido ou de versão antiga: app abre normalmente", async ({ page }) => {
    const v = vigiarErros(page);
    await page.goto("/");
    for (const valor of ["{isso não é json", JSON.stringify({ state: { estoque: null, chamadas: "x" }, version: 0 })]) {
      await page.evaluate((v) => localStorage.setItem("saude-garca", v), valor);
      for (const rota of ["/posto", "/prefeitura", "/sms"]) {
        await page.goto(rota);
        await expect(page.locator("main h1").first()).toBeVisible({ timeout: 10_000 });
        await expect(page.locator("main")).not.toContainText("Carregando dados");
      }
      await ligarDoCelular(page);
      await teclar(page, "1224"); // Centro → remédios → diabetes → insulina regular
      await expect(page.getByText(/Insulina regular/).first()).toBeVisible();
    }
    await v.semQueda();
  });

  test("zoom e arraste no mapa seguidos de troca de tela (erro _leaflet_pos)", async ({ page }) => {
    const v = vigiarErros(page);
    for (let i = 0; i < 6; i++) {
      await page.goto("/prefeitura");
      await page.waitForTimeout(250);
      await page.getByRole("button", { name: "Zoom in" }).click();
      await page.mouse.move(400, 500);
      await page.mouse.down();
      await page.mouse.move(300, 420, { steps: 3 });
      await page.mouse.up();
      await page.getByRole("link", { name: ["Posto", "Totem", "Ligar"][i % 3], exact: true }).click();
      await page.waitForTimeout(300);
    }
    await page.waitForTimeout(800);
    await v.semQueda();
  });

  test("trocar de tela 20 vezes no meio da ligação", async ({ page }) => {
    const v = vigiarErros(page);
    await ligarDoCelular(page);
    await teclar(page, "11");
    for (let i = 0; i < 20; i++) {
      const nome = ["Posto", "Prefeitura", "Totem", "SMS", "Ligar"][i % 5];
      await page.getByRole("link", { name: nome, exact: true }).click();
      await page.waitForTimeout(150);
    }
    await v.semQueda();
  });

  test("fluxo completo: falta → aviso → reposição → SMS → tem sim", async ({ context }) => {
    const ligar = await context.newPage();
    const posto = await context.newPage();
    const v = vigiarErros(ligar);
    await posto.goto("/posto");
    await ligarDoCelular(ligar);
    await teclar(ligar, "1242");
    await expect(ligar.getByText(/em falta em todos os postos/).first()).toBeVisible();
    await teclar(ligar, "1");
    await expect(ligar.getByText(/Combinado!/).first()).toBeVisible();
    await posto.bringToFront();
    await posto.getByRole("button", { name: "Adicionar 10 de Salbutamol spray" }).click();
    const sms = await context.newPage();
    await sms.goto("/sms");
    await expect(sms.getByText(/chegou Salbutamol spray/)).toBeVisible();
    await ligar.bringToFront();
    await ligar.getByLabel("Frase falada").fill("tem bombinha de asma?");
    await ligar.getByRole("button", { name: "Dizer" }).click();
    await expect(ligar.getByText(/tem sim!/).first()).toBeVisible();
    await v.semQueda();
  });
});
