import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { AuthConfig } from "@/config/auth.config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // recomendado para GCM (NIST SP 800-38D)
const AUTH_TAG_LENGTH_BYTES = 16;

/**
 * Cifra segredos reversíveis em repouso (Dossiê 43 — hoje só o segredo
 * TOTP do MFA, `User.totpSecretCriptografado`). Diferente de
 * `PasswordHasherService` (Argon2, irreversível): aqui a aplicação
 * PRECISA recuperar o valor original (comparar o código de 6 dígitos a
 * cada login), então é criptografia simétrica reversível, nunca hash.
 *
 * AES-256-GCM (autenticado — detecta adulteração do texto cifrado, ao
 * contrário de CBC puro) com a chave vinda de `MFA_ENCRYPTION_KEY`
 * (32 bytes, base64 — nunca derivada de outro segredo já em uso, como o
 * par de chaves JWT, para que a rotação de um não afete o outro).
 * `iv` (nonce) é gerado aleatoriamente a cada `encrypt`, prefixado ao
 * resultado junto da tag de autenticação — nunca reutilizado entre
 * chamadas, requisito de segurança do GCM.
 *
 * Mesmo padrão "stub honesto" de `LytexProviderService`/`DiditService`:
 * sem `MFA_ENCRYPTION_KEY` configurada, lança um erro claro na hora do
 * uso — nunca falha o boot da aplicação (env.validation.ts trata a
 * variável como opcional).
 */
@Injectable()
export class SecretCipherService {
  constructor(private readonly configService: ConfigService) {}

  private resolveKey(): Buffer {
    const keyBase64 = this.configService.get<AuthConfig>("auth")?.mfaEncryptionKey;
    if (!keyBase64) {
      throw new Error(
        "MFA_ENCRYPTION_KEY não configurada — não é possível cifrar/decifrar segredos de MFA neste ambiente.",
      );
    }
    const key = Buffer.from(keyBase64, "base64");
    if (key.length !== 32) {
      throw new Error(
        "MFA_ENCRYPTION_KEY inválida — precisa decodificar para exatamente 32 bytes (AES-256).",
      );
    }
    return key;
  }

  /** Retorna `iv:authTag:cipherText`, tudo em base64, separado por `:` (formato só interno, nunca exposto). */
  encrypt(plainText: string): string {
    const key = this.resolveKey();
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(
      ":",
    );
  }

  decrypt(cipherPackage: string): string {
    const key = this.resolveKey();
    const [ivB64, authTagB64, encryptedB64] = cipherPackage.split(":");
    if (!ivB64 || !authTagB64 || !encryptedB64) {
      throw new Error("Formato de segredo cifrado inválido.");
    }
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    if (authTag.length !== AUTH_TAG_LENGTH_BYTES) {
      throw new Error("Formato de segredo cifrado inválido.");
    }
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedB64, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }
}
