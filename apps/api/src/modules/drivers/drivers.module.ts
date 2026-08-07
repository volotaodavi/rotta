import { Module } from "@nestjs/common";

import { DRIVER_DOCUMENT_REPOSITORY } from "./drivers.constants";
import { DriversController } from "./drivers.controller";
import { DriversService } from "./drivers.service";
import { PrismaDriverDocumentRepository } from "./repositories/prisma-driver-document.repository";

import { StorageModule } from "@/infra/storage/storage.module";
import { AuditModule } from "@/modules/audit/audit.module";
import { RottaAiModule } from "@/modules/rotta-ai/rotta-ai.module";
import { UsersModule } from "@/modules/users/users.module";


/**
 * Modulo Drivers (Dossie 13, Secao 5) — documentacao de
 * habilitacao/qualificacao do motorista (CNH, EAR, cursos obrigatórios
 * — Dossiê 28).
 *
 * ESTADO ATUAL: expõe só `DriverDocument` (upload/listagem/remoção,
 * mesmo padrão de `VehicleDocument` em `VehiclesModule`). Cadastro
 * completo do motorista já vive em `Membership`/`User` (Dossiê 8 §2 —
 * motorista é `User` + `Membership.role = MOTORISTA`, não uma entidade
 * própria); disponibilidade/status derivado (ex. "motorista disponível
 * hoje") ainda não têm pedido concreto que os justifique — ficam para
 * quando o módulo de Escalas/Rotas precisar consultar isso.
 *
 * `UsersModule` (checar vínculo Motorista/Monitor antes de expor
 * documento de terceiro), `AuditModule`, `StorageModule` (upload) e
 * `RottaAiModule` (`validateDocument`, reaproveitado do check de
 * identidade) são importados — nunca reimplementados aqui.
 */
@Module({
  imports: [UsersModule, AuditModule, StorageModule, RottaAiModule],
  controllers: [DriversController],
  providers: [
    DriversService,
    { provide: DRIVER_DOCUMENT_REPOSITORY, useClass: PrismaDriverDocumentRepository },
  ],
  exports: [DriversService],
})
export class DriversModule {}
