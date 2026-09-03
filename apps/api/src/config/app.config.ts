import { registerAs } from "@nestjs/config";

import { parseCorsOrigins } from "./cors-origin.util";

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  /** Regex opcional (ver `main.ts`) — casa origens que não dá para listar uma a uma, ex. deployments de Preview da Vercel (subdomínio novo a cada PR). */
  corsOriginRegex: RegExp | undefined;
}

/** Configuracao geral da aplicacao (Dossie 12, Secao 12.4). */
export default registerAs("app", (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3333),
  apiPrefix: process.env.API_PREFIX ?? "v1",
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS ?? ""),
  corsOriginRegex: process.env.CORS_ORIGIN_REGEX
    ? new RegExp(process.env.CORS_ORIGIN_REGEX)
    : undefined,
}));
