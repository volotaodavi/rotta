import { randomInt } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";

import { PasswordHasherService } from "@/infra/security/password-hasher.service";
import { SecretCipherService } from "@/infra/security/secret-cipher.service";

const RECOVERY_CODE_COUNT = 10;
// Sem caracteres ambíguos (0/O, 1/I/L) — código é lido/digitado por uma
// pessoa em pânico (perdeu o autenticador), não por máquina.
const RECOVERY_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * MFA por TOTP (Dossiê 43 — "Google Authenticator/Authy", exatamente
 * como previsto desde o Dossiê 12 §4.5). Camada fina sobre `otplib`
 * (RFC 6238 — implementação de terceiro auditada, nunca HMAC/OTP
 * reimplementado à mão para um primitivo de segurança). Fixado em
 * `otplib@12` (singleton `authenticator`, CommonJS puro) em vez da v13
 * mais recente — a v13 reescreveu a lib sobre `@scure/*`/`@noble/*`,
 * pacotes ESM-only que quebram o `require()` deste projeto (CJS) tanto
 * em teste (Jest) quanto em runtime; v12 é madura, amplamente usada em
 * produção e não tem essa dependência.
 *
 * Também usa `qrcode` (renderiza o provisioning URI como PNG data URL,
 * para o painel exibir sem precisar de nenhuma lib de QR no frontend) +
 * `SecretCipherService` (cifra reversível do segredo) +
 * `PasswordHasherService` (hash irreversível dos códigos de recuperação
 * — nunca reversível, ao contrário do segredo TOTP: um código de
 * recuperação usado uma vez nunca precisa ser lido de volta).
 */
@Injectable()
export class MfaService {
  constructor(
    private readonly secretCipher: SecretCipherService,
    private readonly passwordHasher: PasswordHasherService,
  ) {
    // Tolera 1 passo (30s) de dessincronia de relógio entre o app
    // autenticador do usuário e este servidor — sem isso, um relógio de
    // celular alguns segundos atrasado/adiantado já rejeitaria códigos
    // válidos (fricção real de qualquer implementação TOTP).
    authenticator.options = { window: 1 };
  }

  generateSecret(): string {
    return authenticator.generateSecret();
  }

  /** `accountLabel` aparece no app autenticador (ex. "admin@rotta.com.br") sob o emissor "Rotta". */
  buildOtpAuthUrl(secretPlain: string, accountLabel: string): string {
    return authenticator.keyuri(accountLabel, "Rotta", secretPlain);
  }

  buildQrCodeDataUrl(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }

  verifyCode(secretPlain: string, code: string): boolean {
    try {
      return authenticator.check(code.trim(), secretPlain);
    } catch {
      // otplib lança se `code` não for numérico/tamanho esperado —
      // tratado como código inválido, nunca como erro 500 do servidor.
      return false;
    }
  }

  encryptSecret(secretPlain: string): string {
    return this.secretCipher.encrypt(secretPlain);
  }

  decryptSecret(secretCiphered: string): string {
    return this.secretCipher.decrypt(secretCiphered);
  }

  /** Códigos de recuperação em texto puro — só existem em memória entre aqui e a resposta HTTP; nunca persistidos assim. */
  generateRecoveryCodes(count: number = RECOVERY_CODE_COUNT): string[] {
    return Array.from({ length: count }, () => this.randomRecoveryCode());
  }

  async hashRecoveryCodes(codesPlain: string[]): Promise<string[]> {
    return Promise.all(
      codesPlain.map((code) => this.passwordHasher.hash(this.normalizeRecoveryCode(code))),
    );
  }

  /** Retorna o índice do hash correspondente (para o chamador remover só aquele código, uso único) ou `null` se nenhum bater. */
  async matchRecoveryCode(candidateCode: string, hashes: string[]): Promise<number | null> {
    const normalized = this.normalizeRecoveryCode(candidateCode);
    for (let index = 0; index < hashes.length; index += 1) {
      // Sequencial de propósito (nunca Promise.all): early-return no
      // primeiro match evita hashear os códigos restantes à toa; argon2
      // já é muito mais caro que a diferença de tempo entre "bateu no
      // código 1" vs "bateu no código 10" ser observável importar (o
      // atacante não escolhe QUAL código tentar, só se um bateu).
      // eslint-disable-next-line no-await-in-loop
      const matches = await this.passwordHasher.verify(hashes[index]!, normalized);
      if (matches) {
        return index;
      }
    }
    return null;
  }

  private randomRecoveryCode(): string {
    const part = (): string =>
      Array.from(
        { length: 4 },
        () => RECOVERY_CODE_ALPHABET[randomInt(RECOVERY_CODE_ALPHABET.length)],
      ).join("");
    return `${part()}-${part()}`;
  }

  private normalizeRecoveryCode(code: string): string {
    return code.trim().toUpperCase();
  }
}
