import { Module } from "@nestjs/common";

import { MessagePersonalizationService } from "./message-personalization.service";

/**
 * `MessagePersonalizationService` isolado em seu próprio módulo (nunca
 * dentro de `NotificationsModule` diretamente) porque não tem NENHUMA
 * dependência própria (puro, sem repositório/serviço externo) — módulos
 * de domínio que só precisam compor `titulo`/`corpo` antes de emitir
 * `communication.requested` (ver `events/communication-requested.event.ts`)
 * importam este módulo leve, nunca `NotificationsModule` inteiro (que
 * traz `CompaniesModule` e, por tabela, `VehiclesModule`/`RottaAiModule`/
 * `GeoModule` — cadeia que, para `SchoolsModule`, fecharia um ciclo:
 * `SchoolsModule -> NotificationsModule -> CompaniesModule ->
 * VehiclesModule -> RottaAiModule -> GeoModule -> SchoolsModule`).
 * `NotificationsModule` também importa este módulo (nunca duplica o
 * provider) e reexporta para quem já importa `NotificationsModule`
 * inteiro.
 */
@Module({
  providers: [MessagePersonalizationService],
  exports: [MessagePersonalizationService],
})
export class MessagePersonalizationModule {}
