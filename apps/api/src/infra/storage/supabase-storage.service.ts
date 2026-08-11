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
 *
 * Dois métodos de upload, dois buckets (Dossiê 32 — auditoria de
 * segurança de dado pessoal): `upload()` grava no bucket PÚBLICO
 * (`publicBucket`, ex. logo/foto de empresa e do veículo — ativos de
 * marca, sem dado pessoal de terceiro) e devolve uma URL pública fixa.
 * `uploadPrivate()` grava no bucket PRIVADO (`bucket`, ex. CNH/documento
 * de motorista/veículo, foto de aluno — dado pessoal, em alguns casos de
 * criança/adolescente, art. 14 da LGPD) e devolve `{ path, url }`: o
 * `path` é o que os módulos chamadores devem persistir (`filePath`/
 * `fotoPath`); a `url` assinada de curta validade retornada aqui só
 * serve para exibição IMEDIATA logo após o upload — nunca deve ser
 * armazenada como se fosse durável.
 *
 * `getSignedUrl(path)` (Dossiê 45, achado C3 da auditoria de
 * consistência Legal↔Produto: a versão anterior gerava uma URL de 10
 * anos NO UPLOAD e a reexibia como estava salva — contrariando
 * diretamente a promessa de "curto período" em `/legal/seguranca`) é o
 * método a chamar em TODA leitura de um documento/foto privado: assina
 * uma URL nova, de validade curta (`SHORT_SIGNED_URL_TTL_SECONDS`), a
 * cada vez. `DriversService`/`VehiclesService`/`StudentsService` chamam
 * isso ao montar a resposta de listagem/detalhe sempre que a linha tem
 * `filePath`/`fotoPath` preenchido; linhas antigas (só com a URL longa
 * já persistida, sem `path`) continuam sendo servidas como estavam até
 * a URL de 10 anos expirar — dívida técnica documentada, não um bug
 * novo.
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

  /**
   * Envia um arquivo de MARCA (sem dado pessoal — logo/foto de empresa,
   * foto de veículo) ao bucket PÚBLICO e retorna a URL pública fixa.
   * `path` inclui o tenant (ex. `companies/{id}/logo.png`).
   */
  async upload(path: string, file: Buffer, contentType: string): Promise<string> {
    const client = this.getClient();

    const { error } = await client.storage
      .from(this.config.publicBucket)
      .upload(path, file, { contentType, upsert: true });

    if (error) {
      throw new InternalServerErrorException(`Falha ao enviar arquivo: ${error.message}`);
    }

    const { data } = client.storage.from(this.config.publicBucket).getPublicUrl(path);
    return data.publicUrl;
  }

  /**
   * Envia um arquivo com DADO PESSOAL (CNH/documento de motorista ou
   * veículo, foto de aluno) ao bucket PRIVADO. Nunca usa `getPublicUrl`,
   * que exporia o arquivo a qualquer um capaz de adivinhar `path` (ex.
   * `students/{id}/foto.png` é só o id do aluno) sem exigir autenticação
   * nenhuma. Retorna `path` (o que deve ser persistido, ex.
   * `filePath`/`fotoPath`) e `url` (assinada, curta duração — só para a
   * exibição imediata da própria resposta deste upload; releituras
   * futuras devem chamar `getSignedUrl(path)`, nunca reusar esta `url`).
   */
  async uploadPrivate(
    path: string,
    file: Buffer,
    contentType: string,
  ): Promise<{ path: string; url: string }> {
    const client = this.getClient();

    const { error } = await client.storage
      .from(this.config.bucket)
      .upload(path, file, { contentType, upsert: true });

    if (error) {
      throw new InternalServerErrorException(`Falha ao enviar arquivo: ${error.message}`);
    }

    return { path, url: await this.getSignedUrl(path) };
  }

  /**
   * Assina uma URL de curta validade para um `path` já existente no
   * bucket PRIVADO (Dossiê 45, achado C3) — chamar a cada leitura de um
   * documento/foto privado, nunca persistir o resultado como se fosse
   * durável.
   */
  async getSignedUrl(
    path: string,
    expiresInSeconds = SupabaseStorageService.SHORT_SIGNED_URL_TTL_SECONDS,
  ): Promise<string> {
    const client = this.getClient();

    const { data, error: signError } = await client.storage
      .from(this.config.bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (signError || !data) {
      throw new InternalServerErrorException(
        `Falha ao gerar URL assinada: ${signError?.message ?? "resposta vazia"}`,
      );
    }

    return data.signedUrl;
  }

  /** 15 minutos — suficiente para uma sessão de visualização, curto o bastante para fechar a janela de exposição de uma URL vazada (Dossiê 45, achado C3). */
  private static readonly SHORT_SIGNED_URL_TTL_SECONDS = 60 * 15;
}
