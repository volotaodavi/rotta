import { Module } from "@nestjs/common";

import { PrismaSchoolPortalRepository } from "./repositories/prisma-school-portal.repository";
import { SCHOOL_PORTAL_REPOSITORY } from "./school-portal.constants";
import { SchoolPortalController } from "./school-portal.controller";
import { SchoolPortalService } from "./school-portal.service";

import { UsersModule } from "@/modules/users/users.module";

/**
 * Portal da Escola (22/09/2026) — área somente leitura de `Role.ESCOLA`.
 *
 * Não importa `SchoolsModule` de propósito: aquele módulo é o CRUD de
 * escolas do ponto de vista da transportadora e do Admin, e se isola
 * por `companyId`. Este aqui responde a outra pergunta, com outro
 * escopo — "quais dos MEUS alunos estão no ônibus hoje, venham de qual
 * transportadora vierem". Misturar os dois acabaria com uma consulta
 * pegando o isolamento do outro, que é como vazamento entre tenants
 * costuma nascer.
 */
@Module({
  // `UsersModule` entrou em 22/09/2026 com a criação direta de contas
  // do portal (fluxo público — o Admin da Rotta abre o acesso de cada
  // escola do município, e o diretor abre o dos colegas). É a única
  // dependência deste módulo, e é de ESCRITA de usuário.
  //
  // As LEITURAS ficam em `SCHOOL_PORTAL_REPOSITORY`, próprio deste
  // módulo (auditoria 26/09/2026, item 5). Não são os repositórios de
  // Schools/Students de propósito: aqueles se isolam por `companyId`,
  // que é o isolamento errado para esta pergunta — ver a nota da
  // interface.
  imports: [UsersModule],
  controllers: [SchoolPortalController],
  providers: [
    SchoolPortalService,
    { provide: SCHOOL_PORTAL_REPOSITORY, useClass: PrismaSchoolPortalRepository },
  ],
  exports: [SchoolPortalService],
})
export class SchoolPortalModule {}
