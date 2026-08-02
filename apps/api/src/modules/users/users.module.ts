import { Module } from "@nestjs/common";


import { PrismaMembershipRepository } from "./repositories/prisma-membership.repository";
import { PrismaUserRepository } from "./repositories/prisma-user.repository";
import { MEMBERSHIP_REPOSITORY, USER_REPOSITORY } from "./users.constants";
import { UsersService } from "./users.service";

import { SecurityModule } from "@/infra/security/security.module";

/**
 * Modulo Users (Dossie 13, Secao 2) — dados de identidade da pessoa
 * (`Usuario`, `VinculoPapel`), independente de papel/tenant.
 *
 * ESTADO ATUAL: expoe `UsersService` (criacao de identidade + vinculo)
 * para consumo interno de outros modulos via DI — ainda sem
 * `UsersController` publico. O CRUD/perfil/troca de senha expostos via
 * HTTP pertencem ao modulo Auth (Dossie 15), fora do escopo desta
 * entrega (Dossie 16 — modulo de Empresas).
 */
@Module({
  imports: [SecurityModule],
  providers: [
    UsersService,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: MEMBERSHIP_REPOSITORY, useClass: PrismaMembershipRepository },
  ],
  exports: [UsersService],
})
export class UsersModule {}
