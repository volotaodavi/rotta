#!/usr/bin/env node
import { spawn } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";

/**
 * Sobe a API para os testes de interface do painel e do admin.
 *
 * ## Por que um script, e não `pnpm dev` com um `.env`
 *
 * Porque `pnpm dev` lê o `.env` da máquina de quem está rodando, e
 * nenhum teste pode depender disso: nem do banco que está lá, nem das
 * chaves. Pior, um `.env` apontando para produção faria o teste de
 * interface escrever dado de verdade — exatamente o que o seed de E2E
 * recusa fazer, e que não teria graça recusar de um lado e permitir do
 * outro.
 *
 * Aqui tudo que a API precisa é montado na hora, e o que ela NÃO tem
 * fica deliberadamente vazio (QStash, Supabase, Asaas, Lytex, push):
 * cada um desses módulos degrada com um aviso em vez de falhar o boot
 * — é o padrão "stub honesto" da casa — e nenhum teste de fluxo
 * crítico depende deles.
 *
 * ## As chaves são novas a cada execução
 *
 * Mesmo mecanismo de `test/setup-env.ts`, pelo mesmo motivo: nunca
 * reaproveitar uma chave real, e nunca ter uma chave commitada.
 */

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const BANCO_PADRAO = "postgresql://rotta:rotta_dev_only@localhost:5432/rotta_e2e?schema=public";

const banco = process.env.E2E_DATABASE_URL ?? BANCO_PADRAO;

// Mesma trava do seed, e aqui ela também vale: a API em modo de teste
// aceita cadastro sem confirmação nenhuma, então apontá-la para um
// banco real seria pior do que inútil.
const nomeDoBanco = new URL(banco).pathname.replace(/^\//, "");
if (!/e2e|test|_ci\b/i.test(nomeDoBanco)) {
  console.error(
    `[api-e2e] Recusado: o banco "${nomeDoBanco}" não parece de teste. Defina E2E_DATABASE_URL para um banco de teste local.`,
  );
  process.exit(1);
}

const porta = process.env.E2E_API_PORT ?? "3399";

const ambiente = {
  ...process.env,
  NODE_ENV: "test",
  PORT: porta,
  API_PREFIX: "v1",
  // As duas portas que os testes servem: painel e admin.
  CORS_ORIGINS: "http://localhost:3100,http://localhost:3101",
  DATABASE_URL: banco,
  DIRECT_URL: banco,
  REDIS_URL: process.env.E2E_REDIS_URL ?? "redis://localhost:6379",
  JWT_PRIVATE_KEY: privateKey,
  JWT_PUBLIC_KEY: publicKey,
  JWT_ACCESS_TOKEN_TTL: "15m",
  JWT_REFRESH_TOKEN_TTL: "30d",
  SUPABASE_STORAGE_BUCKET: "rotta-documents",
  // `error`: o que importa na saída de um teste de interface é a falha,
  // não o rastro de cada requisição.
  LOG_LEVEL: "error",
};

const filho = spawn("npx", ["nest", "start"], {
  cwd: new URL("..", import.meta.url).pathname,
  env: ambiente,
  stdio: "inherit",
});

for (const sinal of ["SIGINT", "SIGTERM"]) {
  process.on(sinal, () => filho.kill(sinal));
}

filho.on("exit", (codigo) => process.exit(codigo ?? 0));
