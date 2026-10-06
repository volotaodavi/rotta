import { defineConfig } from "vitest/config";

/**
 * Até 06/10/2026 o `test` deste pacote era um `echo`, e isso cobrou
 * juros no mesmo dia: o app parou de abrir porque o teto de tempo das
 * requisições (60s) era menor que o cold start da API no plano gratuito
 * do Render (~89s). Um número menor que o outro, dentro deste pacote,
 * sem nada que travasse a relação entre os dois.
 *
 * Ambiente `node` porque aqui não há componente: é cliente HTTP e
 * política de retentativa, lógica pura.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});
