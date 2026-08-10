import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Sentry from "@sentry/node";

import type { ObservabilityConfig } from "@/config/observability.config";

/**
 * Rastreamento de erros não tratados (Sentry) — Dossiê 33 (Prompt 23,
 * observabilidade). Antes desta entrega, um 500 real só existia no log
 * estruturado (`nestjs-pino`, texto), sem alerta nem agrupamento — a
 * única forma de saber que algo quebrou em produção era alguém ler o
 * log manualmente ou um usuário reclamar.
 *
 * Mesmo padrão de `SupabaseStorageService`/`DiditService`: `SENTRY_DSN`
 * é opcional — sem ele, a aplicação sobe normalmente e este serviço
 * simplesmente não envia nada (`captureException` vira no-op), com um
 * aviso claro no boot em vez de uma ausência silenciosa.
 *
 * `tracesSampleRate: 0` — só rastreamento de erro, sem tracing de
 * performance (custo/complexidade adicional fora do escopo desta
 * entrega; ver plano de evolução no Dossiê 33).
 */
@Injectable()
export class ErrorTrackingService implements OnModuleInit {
  private readonly logger = new Logger(ErrorTrackingService.name);
  private readonly config: ObservabilityConfig;
  private enabled = false;

  constructor(configService: ConfigService) {
    this.config = configService.get<ObservabilityConfig>("observability")!;
  }

  onModuleInit(): void {
    if (!this.config.sentryDsn) {
      this.logger.warn(
        "Rastreamento de erros (Sentry) NÃO está configurado neste ambiente (SENTRY_DSN ausente) — " +
          "erros 500 continuam logados (nestjs-pino) mas sem alerta nem agrupamento automático. " +
          "Ver Dossiê 33 para o passo a passo de configuração.",
      );
      return;
    }

    Sentry.init({
      dsn: this.config.sentryDsn,
      environment: this.config.environment,
      tracesSampleRate: 0,
    });
    this.enabled = true;
  }

  /**
   * Captura um erro não tratado (500) — chamado só por
   * `AllExceptionsFilter`, nunca diretamente por um módulo de domínio
   * (eles já lançam `HttpException`s específicas, que não chegam aqui).
   * No-op silencioso se Sentry não estiver configurado.
   */
  captureException(
    exception: unknown,
    context: { correlationId: string; method: string; url: string },
  ): void {
    if (!this.enabled) {
      return;
    }

    Sentry.captureException(exception, {
      tags: { correlationId: context.correlationId },
      extra: { method: context.method, url: context.url },
    });
  }
}
