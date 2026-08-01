import { registerAs } from "@nestjs/config";

export interface DatabaseConfig {
  url: string;
}

/** Configuracao de banco de dados (Dossie 8 e Dossie 12, Secao 6). */
export default registerAs("database", (): DatabaseConfig => ({
  url: process.env.DATABASE_URL ?? "",
}));
