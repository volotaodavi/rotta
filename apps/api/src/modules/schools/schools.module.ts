import { Module } from "@nestjs/common";

import { PrismaSchoolAccessPointRepository } from "./repositories/prisma-school-access-point.repository";
import { PrismaSchoolCompanyLinkRepository } from "./repositories/prisma-school-company-link.repository";
import { PrismaSchoolRepository } from "./repositories/prisma-school.repository";
import {
  SCHOOL_ACCESS_POINT_REPOSITORY,
  SCHOOL_COMPANY_LINK_REPOSITORY,
  SCHOOL_REPOSITORY,
} from "./schools.constants";
import { SchoolsController } from "./schools.controller";
import { SchoolsService } from "./schools.service";

import { AuditModule } from "@/modules/audit/audit.module";

/**
 * Módulo Escolas (Dossiê 13, Secao 4 / briefing "Gestão de Escolas") —
 * cadastro, portões/pontos de embarque, vínculo com Empresas,
 * dashboard, busca, importação/exportação. `School`/`SchoolAccessPoint`
 * são catálogo compartilhado (sem RLS — ver nota no model `School`,
 * schema.prisma); só `SchoolCompanyLink` é dado de tenant.
 *
 * Diferente de `VehiclesModule`, NÃO importa `RottaAiModule`: a
 * detecção de duplicidade é implementação própria (`school-duplicate.util`,
 * sem depender de IA/provedor externo) — evita a dependência circular
 * que existiria se `RottaAiModule` precisasse, no futuro, consultar o
 * catálogo de Escolas para detecção de duplicidade (motivo pelo qual
 * essa lógica vive aqui, nunca lá). A análise de endereço
 * (`analyzeSchoolAddress`, stub de geocodificação) é chamada pelo
 * front-end diretamente em `POST /rotta-ai/analyze-school-address`,
 * não por este módulo.
 *
 * Também não importa `UsersModule`/`StorageModule`: não há upload de
 * arquivo armazenado (documentos/fotos) neste módulo ainda, nem
 * verificação de vínculo de Motorista/Monitor via `UsersService` (a
 * checagem de RBAC usa apenas `SchoolCompanyLinkRepository`, já
 * interno a este módulo).
 */
@Module({
  imports: [AuditModule],
  controllers: [SchoolsController],
  providers: [
    SchoolsService,
    { provide: SCHOOL_REPOSITORY, useClass: PrismaSchoolRepository },
    { provide: SCHOOL_ACCESS_POINT_REPOSITORY, useClass: PrismaSchoolAccessPointRepository },
    { provide: SCHOOL_COMPANY_LINK_REPOSITORY, useClass: PrismaSchoolCompanyLinkRepository },
  ],
  // `SCHOOL_REPOSITORY` também é exportado (além de `SchoolsService`)
  // para o `GeoModule` — o Validation AI Agent grava
  // `latitude`/`longitude` diretamente ali quando aprova uma
  // geocodificação (escrita de sistema, sem `AuthenticatedUser`/RBAC
  // humano; a auditoria dessa escrita é o próprio `SchoolCoordinate`,
  // não o `AuditLog` genérico que `SchoolsService.update()` exigiria).
  exports: [SchoolsService, SCHOOL_REPOSITORY],
})
export class SchoolsModule {}
