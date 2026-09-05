import { Module } from "@nestjs/common";

import { BACKOFFICE_REPOSITORY } from "./backoffice.constants";
import { BackofficeController } from "./backoffice.controller";
import { BackofficeService } from "./backoffice.service";
import { PrismaBackofficeRepository } from "./repositories/prisma-backoffice.repository";

import { AuditModule } from "@/modules/audit/audit.module";
import { CompaniesModule } from "@/modules/companies/companies.module";

/**
 * Módulo Backoffice (Prompt 21 / Dossiê 29) — "tela inicial" do Admin
 * Rotta (`ADM-01`, Dossiê 11 §6.1) e o mecanismo auditado de "Acessar
 * como suporte". `CompaniesModule` é importado (nunca reimplementado)
 * para a ficha do tenant no acesso auditado; `AuditModule` para a
 * trilha de auditoria — mesmo padrão de `DriversModule`/`CompaniesModule`.
 *
 * `BackofficeService` é exportado (Prompt 22/Dossiê 30) para o
 * `AnalyticsModule` reusar `getDashboard()` como a base operacional dos
 * KPIs nacionais — nunca reimplementando as mesmas contagens
 * cross-tenant, só compondo a camada de negócio (MRR/ARR/churn/
 * comparação de períodos) por cima.
 */
@Module({
  imports: [AuditModule, CompaniesModule],
  controllers: [BackofficeController],
  providers: [
    BackofficeService,
    { provide: BACKOFFICE_REPOSITORY, useClass: PrismaBackofficeRepository },
  ],
  exports: [BackofficeService],
})
export class BackofficeModule {}
