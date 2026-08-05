import { Global, Module } from "@nestjs/common";

import { QstashPublisherService } from "./qstash/qstash-publisher.service";
import { QstashScheduleService } from "./qstash/qstash-schedule.service";
import { QstashSignatureGuard } from "./qstash/qstash-signature.guard";

/**
 * Modulo de filas (Dossie 14) — motor QStash (Upstash), nao BullMQ: a
 * implantacao de producao roda 100% na Vercel (funcoes serverless),
 * onde nao existe processo Node permanente para um Worker classico
 * ficar escutando o Redis (ver racional completo em
 * `infra/queue/qstash/qstash-publisher.service.ts`). Cada modulo que
 * precisa publicar um job importa `QueueModule` e injeta
 * `QstashPublisherService`; os "workers" viram endpoints HTTP publicos
 * (`/internal/queue/<rota>`, protegidos por `QstashSignatureGuard`) nos
 * proprios modulos de dominio (`NotificationsModule`, `GeoModule`).
 *
 * `@Global()` porque toda a plataforma compartilha a mesma instancia
 * (mesmo padrao de `RedisModule`) — nenhum modulo de dominio registra
 * sua propria conexao com o QStash.
 */
@Global()
@Module({
  providers: [QstashPublisherService, QstashScheduleService, QstashSignatureGuard],
  exports: [QstashPublisherService, QstashScheduleService, QstashSignatureGuard],
})
export class QueueModule {}
