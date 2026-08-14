import { Module } from "@nestjs/common";

import { PrismaStudentAuthorizedPersonRepository } from "./repositories/prisma-student-authorized-person.repository";
import { PrismaStudentRepository } from "./repositories/prisma-student.repository";
import { STUDENT_AUTHORIZED_PERSON_REPOSITORY, STUDENT_REPOSITORY } from "./students.constants";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

import { StorageModule } from "@/infra/storage/storage.module";
import { AuditModule } from "@/modules/audit/audit.module";
import { MessagePersonalizationModule } from "@/modules/notifications/message-personalization.module";
import { SchoolsModule } from "@/modules/schools/schools.module";
import { StudentPreRegistrationsModule } from "@/modules/student-pre-registrations/student-pre-registrations.module";

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
 */
@Module({
  imports: [
    AuditModule,
    StorageModule,
    MessagePersonalizationModule,
    SchoolsModule,
    StudentPreRegistrationsModule,
  ],
  controllers: [StudentsController],
  providers: [
    StudentsService,
    { provide: STUDENT_REPOSITORY, useClass: PrismaStudentRepository },
    {
      provide: STUDENT_AUTHORIZED_PERSON_REPOSITORY,
      useClass: PrismaStudentAuthorizedPersonRepository,
    },
  ],
  exports: [StudentsService],
})
export class StudentsModule {}
