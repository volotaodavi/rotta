import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { StorageConfig } from "@/config/storage.config";

/**
 * Upload de arquivos via Supabase Storage (decisão de tecnologia oficial
 * — Dossiê 16: logo/foto de Empresa). Único ponto do sistema que conhece
 * o SDK do Supabase — qualquer módulo futuro (Documentos, Dossiê 20)
 * reutiliza este service em vez de reimplementar o cliente.
 *
 * Constrói o cliente perguiçosamente (getter, não no construtor) para
 * que a aplicação suba normalmente mesmo sem `SUPABASE_URL`/
 * `SUPABASE_SERVICE_ROLE_KEY` configurados (ambiente de desenvolvimento
 * sem um projeto Supabase real provisionado) — o erro só aparece se um
 * upload for de fato tentado, nunca no boot.
 */
@Injectable()
export class SupabaseStorageService {
  private readonly config: StorageConfig;
  private client: SupabaseClient | null = null;

  constructor(configService: ConfigService) {
    this.config = configService.get<StorageConfig>("storage")!;
  }

  private getClient(): SupabaseClient {
    if (!this.config.supabaseUrl || !this.config.supabaseServiceRoleKey) {
      throw new ServiceUnavailableException(
        "Armazenamento de arquivos não configurado neste ambiente (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes).",
      );
    }

    this.client ??= createClient(this.config.supabaseUrl, this.config.supabaseServiceRoleKey);
    return this.client;
  }

  /** Envia um arquivo e retorna a URL pública. `path` inclui o tenant (ex. `companies/{id}/logo.png`). */
  async upload(path: string, file: Buffer, contentType: string): Promise<string> {
    const client = this.getClient();

    const { error } = await client.storage
      .from(this.config.bucket)
      .upload(path, file, { contentType, upsert: true });

    if (error) {
      throw new InternalServerErrorException(`Falha ao enviar arquivo: ${error.message}`);
    }

    const { data } = client.storage.from(this.config.bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
