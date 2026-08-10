import {
  Injectable,
  InternalServerErrorException,
  Logger,
  type OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { StorageConfig } from "@/config/storage.config";

/**
 * Upload de arquivos via Supabase Storage (decisão de tecnologia oficial
 * — Dossiê 16: logo/foto de Empresa; Dossiê 31: Postgres também na
 * Supabase). Único ponto do sistema que conhece o SDK do Supabase —
 * qualquer módulo futuro (Documentos, Dossiê 20) reutiliza este service
 * em vez de reimplementar o cliente.
 *
 * Constrói o cliente preguiçosamente (getter, não no construtor) para
 * que a aplicação suba normalmente mesmo sem `SUPABASE_URL`/
 * `SUPABASE_SERVICE_ROLE_KEY` configurados (ambiente de desenvolvimento
 * sem um projeto Supabase real provisionado) — o erro só aparece se um
 * upload for de fato tentado, nunca no boot.
 *
 * `onModuleInit` (Dossiê 31 §4 — gap encontrado em produção: as
 * credenciais nunca foram configuradas no Render, e como o erro só
 * aparecia dentro de um upload real, ninguém percebeu até checar o
 * painel da Supabase e ver "zero atividade") loga um AVISO explícito no
 * boot quando a configuração está ausente — visível direto no log de
 * deploy, em vez de só aparecer silenciosamente no primeiro upload que
 * um usuário tentar.
 */
@Injectable()
export class SupabaseStorageService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly config: StorageConfig;
  private client: SupabaseClient | null = null;

  constructor(configService: ConfigService) {
    this.config = configService.get<StorageConfig>("storage")!;
  }

  onModuleInit(): void {
    if (!this.config.supabaseUrl || !this.config.supabaseServiceRoleKey) {
      this.logger.warn(
        "Armazenamento de arquivos (Supabase Storage) NÃO está configurado neste ambiente " +
          "(SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes) — todo upload (logo/foto de empresa, " +
          "documentos de motorista/veículo, foto de aluno) vai falhar com 503 até isso ser corrigido. " +
          "Ver Dossiê 31 para o passo a passo de configuração.",
      );
    }
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
