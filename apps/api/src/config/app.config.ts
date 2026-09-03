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

/**
 * Origens de produção conhecidas, sempre liberadas independente de
 * `CORS_ORIGINS` estar certo no Render (achado real 02-03/09/2026: o
 * admin ficou bloqueado por CORS horas seguidas por causa de um espaço
 * a mais digitado naquela variável — `parseCorsOrigins` já corrige o
 * parsing, mas isto aqui é uma segunda camada de segurança: mesmo que a
 * variável do Render venha vazia, incompleta ou mal digitada de novo no
 * futuro, o próprio site e o próprio painel admin da Rotta NUNCA ficam
 * de fora — só depende de um `git push`, não de reconfigurar nada
 * manualmente numa plataforma externa. Nunca inclui domínio de
 * terceiro/preview — sempre os mesmos domínios institucionais da Rotta.
 */
const KNOWN_PRODUCTION_ORIGINS = [
  "https://rottabr.com.br",
  "https://www.rottabr.com.br",
  "https://admin.rottabr.com.br",
  "https://rotta-web.vercel.app",
  "https://rotta-admin.vercel.app",
];

/** Configuracao geral da aplicacao (Dossie 12, Secao 12.4). */
export default registerAs("app", (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3333),
  apiPrefix: process.env.API_PREFIX ?? "v1",
  corsOrigins: [
    ...new Set([...KNOWN_PRODUCTION_ORIGINS, ...parseCorsOrigins(process.env.CORS_ORIGINS ?? "")]),
  ],
  corsOriginRegex: process.env.CORS_ORIGIN_REGEX
    ? new RegExp(process.env.CORS_ORIGIN_REGEX)
    : undefined,
}));
