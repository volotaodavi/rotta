import { Module } from "@nestjs/common";

import { PasswordHasherService } from "./password-hasher.service";

/**
 * Infraestrutura de seguranca compartilhada (Dossie 12, Secao 7.1) —
 * hoje apenas hashing de senha; ponto unico de extensao futura (ex.
 * assinatura de link de redefinicao de senha do modulo Auth).
 */
@Module({
  providers: [PasswordHasherService],
  exports: [PasswordHasherService],
})
export class SecurityModule {}
