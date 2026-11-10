import { Module } from "@nestjs/common";

import { PrismaSeteRepository } from "./repositories/prisma-sete.repository";
import { SeteApiClient } from "./sete-api.client";
import { SETE_REPOSITORY } from "./sete.constants";
import { SeteController } from "./sete.controller";
import { SeteService } from "./sete.service";

import { AuditModule } from "@/modules/audit/audit.module";
import { CompaniesModule } from "@/modules/companies/companies.module";

/**
 * Integração com o SETE (FNDE) — `docs/52-integracao-sete.md`.
 *
 * ## Por que um repositório próprio, e não os de Routes/Vehicles/Students
 *
 * Porque o pacote do SETE é uma fotografia COERENTE de um instante: a
 * rota, a van que estava nela, o motorista escalado e os alunos
 * vinculados precisam vir da mesma leitura. Montá-lo a partir de seis
 * serviços deixaria a porta aberta para a rota citar uma van que o
 * gestor removeu no meio do caminho, e o SETE recusa o pacote inteiro
 * por uma ligação órfã.
 *
 * `CompaniesModule` entra pela tag `LICITADA` (RN-SETE-02) e
 * `AuditModule` pelo registro de cada exportação (RN-SETE-06).
 */
@Module({
  imports: [CompaniesModule, AuditModule],
  controllers: [SeteController],
  providers: [
    SeteService,
    SeteApiClient,
    { provide: SETE_REPOSITORY, useClass: PrismaSeteRepository },
  ],
  exports: [SeteService],
})
export class SeteModule {}
