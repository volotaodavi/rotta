import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta do Painel Administrativo da Rotta.
 *
 * ## Por que o Admin tem suíte própria
 *
 * Porque o que se faz aqui ninguém mais faz, e um erro não aparece em
 * tela nenhuma: credenciar o IMEI de um rastreador amarra um aparelho a
 * um ônibus. IMEI trocado significa a família de uma criança
 * acompanhando o ônibus de outra, sem nada na interface indicando o
 * erro — e é por isso que este é o fluxo que vale um teste de
 * interface, mesmo sendo feito uma vez por aparelho.
 *
 * Reaproveita a mesma API e o mesmo seed do painel
 * (`apps/api/scripts/subir-para-e2e.mjs`), que recusam banco que não
 * pareça de teste. Porta 3101 para poder rodar ao lado do painel.
 */

const PORTA_ADMIN = Number(process.env.E2E_ADMIN_PORT ?? 3101);
const PORTA_API = Number(process.env.E2E_API_PORT ?? 3399);
const URL_DA_API = `http://localhost:${PORTA_API}/v1`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["html", { outputFolder: "playwright-report", open: "never" }], ["list"]]
    : [["list"]],
  use: {
    baseURL: `http://localhost:${PORTA_ADMIN}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, args: ["--no-sandbox"] }
      : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node ../api/scripts/subir-para-e2e.mjs",
      url: `${URL_DA_API}/health`,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: `npx next start --port ${PORTA_ADMIN}`,
      url: `http://localhost:${PORTA_ADMIN}/entrar`,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: { NEXT_PUBLIC_API_URL: URL_DA_API },
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
