import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta do Painel Web.
 *
 * ## O que estes testes são, e o que não são
 *
 * São cinco fluxos — os que, quebrados, param o negócio: entrar,
 * cadastrar-se, cadastrar um ônibus, pré-cadastrar um aluno e vincular
 * esse aluno pelo código. Não são cobertura: 25 arquivos de teste de
 * componente já cuidam de unidade, e tentar cobrir telas aqui produz
 * uma suíte lenta que ninguém espera terminar.
 *
 * ## Nunca contra produção
 *
 * O servidor da API é subido por `scripts/subir-para-e2e.mjs`, que
 * RECUSA um banco cujo nome não pareça de teste, e o seed
 * (`prisma/seed-e2e.ts`) recusa pelo mesmo critério e também por host.
 * Não é convenção, é recusa: o teste APAGA e ESCREVE dados.
 *
 * ## Um navegador, não três
 *
 * Chromium só. A compatibilidade entre navegadores do painel é
 * responsabilidade do CSS e do Next, e três vezes o mesmo fluxo
 * triplica o tempo da CI sem responder uma pergunta nova. Se um defeito
 * de Safari aparecer, aí entra WebKit, com o fluxo que o pegou.
 */

const PORTA_WEB = Number(process.env.E2E_WEB_PORT ?? 3100);
const PORTA_API = Number(process.env.E2E_API_PORT ?? 3399);
const URL_DA_API = `http://localhost:${PORTA_API}/v1`;

export default defineConfig({
  testDir: "./e2e",
  // Tempo de sobra por teste: o primeiro acesso a uma rota do Next
  // compila sob demanda, e o painel espera a resposta da API.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // Nenhum `test.only` esquecido passa na CI.
  forbidOnly: !!process.env.CI,
  // Uma repetição na CI, zero localmente. Teste de interface tem
  // flutuação real (animação, rede), e repetir uma vez é mais honesto
  // que marcar o fluxo como instável; localmente, repetir esconde o
  // defeito de quem está consertando.
  retries: process.env.CI ? 1 : 0,
  // Serial de propósito: os fluxos compartilham UM banco semeado, e
  // paralelizar faria o teste de cadastro de ônibus disputar lista com
  // o de pré-cadastro.
  workers: 1,
  reporter: process.env.CI
    ? [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]]
    : [["list"]],
  use: {
    baseURL: `http://localhost:${PORTA_WEB}`,
    // Rastro só do que falhou, e na primeira repetição: é o que se abre
    // para entender a falha, e guardar o do que passou enche o
    // artefato de megabytes inúteis.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    // O container de CI e este ambiente trazem o Chromium num caminho
    // próprio; sem a variável, usa o que o Playwright instalou.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, args: ["--no-sandbox"] }
      : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node ../api/scripts/subir-para-e2e.mjs",
      url: `${URL_DA_API}/health`,
      // A API compila TypeScript antes de abrir a porta.
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      // `start`, não `dev`: é o mesmo caminho de código que a Vercel
      // publica, inclusive o que acontece na geração estática. Um
      // defeito que só aparece no build de produção — e já aconteceu
      // duas vezes neste repositório — não pode escapar do E2E.
      command: `npx next start --port ${PORTA_WEB}`,
      url: `http://localhost:${PORTA_WEB}/entrar`,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: { NEXT_PUBLIC_API_URL: URL_DA_API },
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
