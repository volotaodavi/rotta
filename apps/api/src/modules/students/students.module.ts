import { Module } from "@nestjs/common";

import { PrismaStudentAddressOverrideRecurrenceRepository } from "./repositories/prisma-student-address-override-recurrence.repository";
import { PrismaStudentAddressOverrideRepository } from "./repositories/prisma-student-address-override.repository";
import { PrismaStudentAuthorizedPersonRepository } from "./repositories/prisma-student-authorized-person.repository";
import { PrismaStudentRepository } from "./repositories/prisma-student.repository";
import {
  STUDENT_ADDRESS_OVERRIDE_RECURRENCE_REPOSITORY,
  STUDENT_ADDRESS_OVERRIDE_REPOSITORY,
  STUDENT_AUTHORIZED_PERSON_REPOSITORY,
  STUDENT_REPOSITORY,
} from "./students.constants";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

import { StorageModule } from "@/infra/storage/storage.module";
import { AuditModule } from "@/modules/audit/audit.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";
import { SchoolsModule } from "@/modules/schools/schools.module";
import { StudentPreRegistrationsModule } from "@/modules/student-pre-registrations/student-pre-registrations.module";
import { UsersModule } from "@/modules/users/users.module";

/**
 * Módulo Alunos (briefing "Marketplace" §"CADASTRO DO ALUNO") —
 * `Student`/`StudentAuthorizedPerson` são propriedade do Responsável,
 * sem RLS (ver nota no model `Student`, schema.prisma). Não importa
 * `MarketplaceModule` (ainda a ser criado): o RBAC de leitura por
 * Empresa/Motorista/Monitor consulta `contracts` diretamente via
 * relação do Prisma dentro de `PrismaStudentRepository`, evitando a
 * dependência circular que existiria se `MarketplaceModule` (que
 * PRECISA de `StudentsService` para montar contratos) fosse importado
 * de volta por aqui.
 *
 * `SchoolsModule` importado (achado desta auditoria: `create`/`update`
 * aceitavam qualquer `schoolId`, inclusive inexistente, e o Postgres
 * devolvia um 500 de violação de FK em vez de um erro claro) — sem
 * risco de ciclo, `SchoolsModule` não depende de `StudentsModule`.
 *
 * Importa `MessagePersonalizationModule` (nunca `NotificationsModule`
 * inteiro, ver nota em `notifications.module.ts`) só para
 * `MessagePersonalizationService` (compor `novoAluno`); `EventEmitter2`
 * (emitir `communication.requested` em `create` — evento `NOVO_ALUNO`) é
 * injetado sem import extra, já que `EventEmitterModule.forRoot()` é
 * global (`AppModule`). Nunca chama `NotificationsService` diretamente.
 *
 * `StudentPreRegistrationsModule` importado só por
 * `STUDENT_PRE_REGISTRATION_REPOSITORY` (fluxo "código do transporte +
 * celular", pedido do usuário) — sem risco de ciclo, aquele módulo só
 * depende de `CompaniesModule`.
 *
 * `StudentAddressOverride` (pedido do usuário: "informar se algum dia
 * ele irá para outro endereço") não importa `RoutesModule`/`TripsModule`
 * (ciclo real — ambos já importam `StudentsModule`): a checagem "viagem
 * de hoje já começou" em `StudentsService` lê `RouteStudent`/`Trip`
 * direto via `PrismaService` (`withBypass`, mesmo padrão de
 * `CompaniesService.getNomeFantasia`), nunca via `RoutesService`/
 * `TripsService`.
 *
 * `AuthModule`/`UsersModule` importados pra `createForCompany`
 * (`StudentsService.createResponsavelOnTheFly`/`AuthService.
 * forgotPassword`, pedido do usuário 02/09/2026: "Admin pode criar a
 * conta do Responsável na hora") — sem risco de ciclo: `AuthModule` só
 * importa `SecurityModule`/`UsersModule`/`CompaniesModule`/
 * `MessagePersonalizationModule`/`AuditModule`/
 * `StudentPreRegistrationsModule`/`CompanyJoinRequestsModule`/
 * `EmailModule`/`TurnstileModule` — nenhum deles depende de
 * `StudentsModule` de volta.
 */
@Module({
  imports: [
    AuditModule,
    StorageModule,
    MessagePersonalizationModule,
    SchoolsModule,
    StudentPreRegistrationsModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [StudentsController],
  providers: [
    StudentsService,
    { provide: STUDENT_REPOSITORY, useClass: PrismaStudentRepository },
    {
      provide: STUDENT_AUTHORIZED_PERSON_REPOSITORY,
      useClass: PrismaStudentAuthorizedPersonRepository,
    },
    {
      provide: STUDENT_ADDRESS_OVERRIDE_REPOSITORY,
      useClass: PrismaStudentAddressOverrideRepository,
    },
    {
      provide: STUDENT_ADDRESS_OVERRIDE_RECURRENCE_REPOSITORY,
      useClass: PrismaStudentAddressOverrideRecurrenceRepository,
    },
  ],
  exports: [StudentsService],
})
export class StudentsModule {}
