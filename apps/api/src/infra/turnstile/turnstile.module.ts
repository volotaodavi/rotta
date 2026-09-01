import { Module } from "@nestjs/common";

import { TurnstileService } from "./turnstile.service";

/**
 * Módulo de infraestrutura pura (mesmo raciocínio de `DiditModule`) —
 * `TurnstileService` é consumido por `AuthModule` no cadastro
 * self-service (ver `AuthService.register`/`registerPessoal`/
 * `registerAutonomo`).
 */
@Module({
  providers: [TurnstileService],
  exports: [TurnstileService],
})
export class TurnstileModule {}
