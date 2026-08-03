import { Module } from "@nestjs/common";

import {
  COMPANY_REPOSITORY,
  COMPANY_SETTING_REPOSITORY,
  PLAN_REPOSITORY,
} from "./companies.constants";
import { CompaniesController } from "./companies.controller";
import { CompaniesService } from "./companies.service";
import { PrismaCompanySettingRepository } from "./repositories/prisma-company-setting.repository";
import { PrismaCompanyRepository } from "./repositories/prisma-company.repository";
import { PrismaPlanRepository } from "./repositories/prisma-plan.repository";

import { StorageModule } from "@/infra/storage/storage.module";
import { AuditModule } from "@/modules/audit/audit.module";
import { UsersModule } from "@/modules/users/users.module";
import { VehiclesModule } from "@/modules/vehicles/vehicles.module";

/**
 * Módulo Empresas (Dossiê 13, Seção 3 / Dossiê 16) — dono do ciclo de
 * vida do tenant. Toda a estrutura organizacional da plataforma
 * (Motoristas, Veículos, Alunos, Rotas...) depende de `Company.id` como
 * `tenant_id`.
 *
 * RBAC por endpoint (`companies.controller.ts`), resumo:
 * - Criar/listar globalmente/suspender/reativar/excluir: só
 *   `Role.ADMIN_ROTTA` (dono da relação comercial com o cliente Rotta).
 * - Ver/editar a própria empresa, trocar o próprio plano, configurações,
 *   dashboard, uploads, histórico: `Role.EMPRESA`/`Role.GESTOR`
 *   (e leitura básica também para os demais papéis do tenant), sempre
 *   restrito à própria empresa (`CompaniesService.assertCanAccessCompany`).
 *
 * `UsersModule`/`AuditModule` são importados (nunca reimplementados
 * aqui) — este módulo não conhece `Prisma.user`/`Prisma.membership`/
 * `Prisma.auditLog` diretamente. `VehiclesModule` é importado só para o
 * campo "Veículos" do dashboard (`getDashboard`) reusar
 * `VehiclesService.countActive`, em vez de reimplementar a contagem ou
 * deixá-la hardcoded em zero.
 */
@Module({
  imports: [UsersModule, AuditModule, StorageModule, VehiclesModule],
  controllers: [CompaniesController],
  providers: [
    CompaniesService,
    { provide: COMPANY_REPOSITORY, useClass: PrismaCompanyRepository },
    { provide: COMPANY_SETTING_REPOSITORY, useClass: PrismaCompanySettingRepository },
    { provide: PLAN_REPOSITORY, useClass: PrismaPlanRepository },
  ],
  exports: [CompaniesService],
})
export class CompaniesModule {}
