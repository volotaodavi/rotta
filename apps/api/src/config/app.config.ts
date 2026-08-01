import { registerAs } from "@nestjs/config";

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
}

/** Configuracao geral da aplicacao (Dossie 12, Secao 12.4). */
export default registerAs("app", (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3333),
  apiPrefix: process.env.API_PREFIX ?? "v1",
  corsOrigins: (process.env.CORS_ORIGINS ?? "").split(",").filter(Boolean),
}));
