import { Module } from "@nestjs/common";


import { PrismaStudentAuthorizedPersonRepository } from "./repositories/prisma-student-authorized-person.repository";
import { PrismaStudentRepository } from "./repositories/prisma-student.repository";
import { STUDENT_AUTHORIZED_PERSON_REPOSITORY, STUDENT_REPOSITORY } from "./students.constants";
import { StudentsController } from "./students.controller";
import { StudentsService } from "./students.service";

import { StorageModule } from "@/infra/storage/storage.module";
import { AuditModule } from "@/modules/audit/audit.module";

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
 */
@Module({
  imports: [AuditModule, StorageModule],
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
