import { generateKeyPairSync } from "node:crypto";

/**
 * Executado pelo Jest (`setupFiles`) antes de qualquer módulo da
 * aplicação ser importado nos testes E2E — garante que
 * `ConfigModule`/`env.validation.ts` encontrem variáveis válidas
 * (Dossiê 12, Secao 12.4: "a aplicacao falha ao iniciar" sem elas).
 *
 * Gera um par de chaves RS256 novo a cada execução de teste (nunca
 * reaproveita uma chave real/commitada) — suficiente para assinar e
 * validar tokens de teste dentro do mesmo processo.
 */
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

process.env.NODE_ENV = "test";
process.env.PORT = "3399";
process.env.API_PREFIX = "v1";
process.env.CORS_ORIGINS = "http://localhost:3000";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://rotta:rotta_dev_only@localhost:5432/rotta_test?schema=public";
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6379";
process.env.JWT_PRIVATE_KEY = privateKey;
process.env.JWT_PUBLIC_KEY = publicKey;
process.env.JWT_ACCESS_TOKEN_TTL = "15m";
process.env.JWT_REFRESH_TOKEN_TTL = "30d";
process.env.SUPABASE_STORAGE_BUCKET = "rotta-documents";
process.env.LOG_LEVEL = "error";
