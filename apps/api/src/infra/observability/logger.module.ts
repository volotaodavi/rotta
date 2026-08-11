import { randomUUID } from "node:crypto";

import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";

import { ErrorTrackingService } from "./error-tracking.service";
import { IntegrationHealthService } from "./integration-health.service";

import type { IncomingMessage } from "node:http";

/**
 * Logger estruturado (Dossie 12, Secao 10.3) — todo log e um objeto JSON,
 * nunca `console.log` de string livre. O id de correlacao e gerado (ou
 * propagado, se o cliente ja enviou `x-correlation-id`) e anexado
 * automaticamente a cada linha de log daquela requisicao.
 *
 * Mascaramento de dado sensivel (Dossie 12, Secao 17.3): nenhum log
 * grava senha, token ou CPF completo — os `redact` abaixo cobrem os
 * campos mais obvios; cada modulo de negocio e responsavel por nao logar
 * dado sensivel adicional especifico do seu dominio.
 *
 * `@Global()` (mesmo padrão de `RedisModule`): `IntegrationHealthService`
 * (PROMPT — ROTTA INTEGRATION & INTELLIGENCE AUDIT ENGINE, Seção 34) é
 * consumido por módulos de domínio espalhados (`BillingModule`,
 * `WalletModule`, `GeoModule`) — exigir import explícito de
 * `LoggerModule` em cada um seria fricção sem benefício real, já que
 * este módulo em si não tem estado por-módulo.
 */
@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get<string>("LOG_LEVEL") ?? "info",
          genReqId: (req: IncomingMessage) => {
            const correlationId = req.headers["x-correlation-id"];
            return (
              (Array.isArray(correlationId) ? correlationId[0] : correlationId) ?? randomUUID()
            );
          },
          redact: [
            "req.headers.authorization",
            "req.headers.cookie",
            "req.body.senha",
            "req.body.password",
            "req.body.token",
          ],
          transport:
            process.env.NODE_ENV !== "production"
              ? { target: "pino-pretty", options: { singleLine: true } }
              : undefined,
        },
      }),
    }),
  ],
  providers: [ErrorTrackingService, IntegrationHealthService],
  exports: [PinoLoggerModule, ErrorTrackingService, IntegrationHealthService],
})
export class LoggerModule {}
