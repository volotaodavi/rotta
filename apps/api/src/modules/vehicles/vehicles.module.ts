import { Module } from "@nestjs/common";

import { PrismaVehicleAssignmentRepository } from "./repositories/prisma-vehicle-assignment.repository";
import { PrismaVehicleChecklistRepository } from "./repositories/prisma-vehicle-checklist.repository";
import { PrismaVehicleDocumentRepository } from "./repositories/prisma-vehicle-document.repository";
import { PrismaVehicleMaintenanceRepository } from "./repositories/prisma-vehicle-maintenance.repository";
import { PrismaVehicleOccurrenceRepository } from "./repositories/prisma-vehicle-occurrence.repository";
import { PrismaVehicleReminderRepository } from "./repositories/prisma-vehicle-reminder.repository";
import { PrismaVehicleRepository } from "./repositories/prisma-vehicle.repository";
import { VehicleCategoryClassifierService } from "./vehicle-category-classifier.service";
import { VehiclePlateLookupService } from "./vehicle-plate-lookup.service";
import {
  VEHICLE_ASSIGNMENT_REPOSITORY,
  VEHICLE_CHECKLIST_REPOSITORY,
  VEHICLE_DOCUMENT_REPOSITORY,
  VEHICLE_MAINTENANCE_REPOSITORY,
  VEHICLE_OCCURRENCE_REPOSITORY,
  VEHICLE_REMINDER_REPOSITORY,
  VEHICLE_REPOSITORY,
} from "./vehicles.constants";
import { VehiclesController } from "./vehicles.controller";
import { VehiclesService } from "./vehicles.service";

import { StorageModule } from "@/infra/storage/storage.module";
import { AuditModule } from "@/modules/audit/audit.module";
import { RottaAiModule } from "@/modules/rotta-ai/rotta-ai.module";
import { UsersModule } from "@/modules/users/users.module";

/**
 * Módulo Veículos (Dossiê 13, Seção 9 / briefing "Gestão de Veículos") —
 * cadastro, documentação, manutenção, lembretes, vinculação a
 * Motorista/Monitor, checklist e ocorrências. Todo veículo pertence a um
 * único tenant (`Vehicle.companyId`), nunca compartilhado entre
 * empresas.
 *
 * RBAC por endpoint (`vehicles.controller.ts`), resumo:
 * - Cadastrar/editar/excluir/manutenção/lembretes/vincular: `Role.EMPRESA`/
 *   `Role.GESTOR` (e `Role.ADMIN_ROTTA` para todos exceto criação, que
 *   exige um tenant próprio).
 * - Listar/pesquisar/dashboard/exportar: `Role.ADMIN_ROTTA`/`Role.EMPRESA`/
 *   `Role.GESTOR`.
 * - Motorista/Monitor: somente o próprio veículo vinculado
 *   (`VehiclesService.fetchOrThrow`), nunca a listagem geral.
 *
 * `UsersModule` (checar vínculo do Motorista/Monitor antes de vincular),
 * `AuditModule`, `StorageModule` (fotos/documentos) e `RottaAiModule`
 * (análise de documento) são importados — nunca reimplementados aqui.
 *
 * `VehiclePlateLookupService` (pedido do usuário: "buscar em todos os
 * detrans, para a análise ser rápida") — provider próprio, sem imports
 * extra (só `ConfigService`, já global). Ver a nota completa no
 * arquivo dele sobre por que não existe uma API oficial gratuita.
 *
 * `VehicleCategoryClassifierService` (Frente AL — "a IA faça a análise
 * e coloque a categoria do veículo automaticamente") — também sem
 * imports extra: determinístico, sem config, sem chamada externa. Ver
 * a nota completa no arquivo dele.
 */
@Module({
  imports: [UsersModule, AuditModule, StorageModule, RottaAiModule],
  controllers: [VehiclesController],
  providers: [
    VehiclesService,
    VehiclePlateLookupService,
    VehicleCategoryClassifierService,
    { provide: VEHICLE_REPOSITORY, useClass: PrismaVehicleRepository },
    { provide: VEHICLE_DOCUMENT_REPOSITORY, useClass: PrismaVehicleDocumentRepository },
    { provide: VEHICLE_MAINTENANCE_REPOSITORY, useClass: PrismaVehicleMaintenanceRepository },
    { provide: VEHICLE_REMINDER_REPOSITORY, useClass: PrismaVehicleReminderRepository },
    { provide: VEHICLE_ASSIGNMENT_REPOSITORY, useClass: PrismaVehicleAssignmentRepository },
    { provide: VEHICLE_CHECKLIST_REPOSITORY, useClass: PrismaVehicleChecklistRepository },
    { provide: VEHICLE_OCCURRENCE_REPOSITORY, useClass: PrismaVehicleOccurrenceRepository },
  ],
  exports: [VehiclesService],
})
export class VehiclesModule {}
