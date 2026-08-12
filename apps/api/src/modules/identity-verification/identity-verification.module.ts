import { Module } from "@nestjs/common";


import { IdentityVerificationController } from "./identity-verification.controller";
import { IdentityVerificationService } from "./identity-verification.service";

import { DiditModule } from "@/infra/didit/didit.module";

/**
 * Verificação de identidade hospedada via Didit (Motorista/Empresa-
 * Gestor) — módulo de domínio próprio (não dentro de `DiditModule`,
 * que fica só infraestrutura pura, mesmo raciocínio de `RottaAiModule`
 * consumir `DiditService` por fora). `PrismaService` vem de
 * `PrismaModule`, `@Global()` — não precisa import explícito aqui.
 */
@Module({
  imports: [DiditModule],
  controllers: [IdentityVerificationController],
  providers: [IdentityVerificationService],
})
export class IdentityVerificationModule {}
