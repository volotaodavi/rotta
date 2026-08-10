import { registerAs } from "@nestjs/config";

export interface StorageConfig {
  supabaseUrl: string | undefined;
  supabaseServiceRoleKey: string | undefined;
  /** Bucket PRIVADO — CNH/documentos de motorista/veículo, foto de aluno (Dossiê 32). */
  bucket: string;
  /** Bucket público — só ativos de marca sem dado pessoal sensível (logo/foto de empresa/veículo). */
  publicBucket: string;
}

/**
 * Configuracao de armazenamento de arquivos (Supabase Storage, decisao
 * de tecnologia oficial — Dossie 16, uploads de logo/foto de Empresa;
 * Dossie 32, separacao publico/privado para dado pessoal sensivel).
 * `supabaseUrl`/`supabaseServiceRoleKey` sao opcionais: um ambiente sem
 * Supabase configurado (ex. este monorepo antes do primeiro projeto
 * Supabase real ser provisionado) sobe normalmente, e
 * `SupabaseStorageService` recusa uploads com um erro claro em vez de
 * falhar ao iniciar a aplicacao inteira.
 */
export default registerAs("storage", (): StorageConfig => ({
  supabaseUrl: process.env.SUPABASE_URL || undefined,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
  bucket: process.env.SUPABASE_STORAGE_BUCKET ?? "rotta-documents",
  publicBucket: process.env.SUPABASE_STORAGE_PUBLIC_BUCKET ?? "rotta-public",
}));
