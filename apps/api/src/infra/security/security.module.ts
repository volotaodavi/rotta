import { Module } from "@nestjs/common";

import { PasswordHasherService } from "./password-hasher.service";
import { SecretCipherService } from "./secret-cipher.service";

/**
 * Infraestrutura de seguranca compartilhada (Dossie 12, Secao 7.1) —
 * hashing de senha (irreversível) e, desde o Dossiê 43, cifra reversível
 * de segredos (`SecretCipherService`, usado hoje pelo segredo TOTP do
 * MFA) — ponto unico de extensao futura (ex. assinatura de link de
 * redefinicao de senha do modulo Auth).
 */
@Module({
  providers: [PasswordHasherService, SecretCipherService],
  exports: [PasswordHasherService, SecretCipherService],
})
export class SecurityModule {}
