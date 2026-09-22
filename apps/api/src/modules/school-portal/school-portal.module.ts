import { Module } from "@nestjs/common";

import { SchoolPortalController } from "./school-portal.controller";
import { SchoolPortalService } from "./school-portal.service";

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
  controllers: [SchoolPortalController],
  providers: [SchoolPortalService],
  exports: [SchoolPortalService],
})
export class SchoolPortalModule {}
