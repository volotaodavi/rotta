import { registerAs } from "@nestjs/config";

export interface RedisConfig {
  url: string;
}

/** Configuracao de cache/filas (Dossie 8 Secao 20, Dossie 14). */
export default registerAs(
  "redis",
  (): RedisConfig => ({
    url: process.env.REDIS_URL ?? "",
  }),
);
