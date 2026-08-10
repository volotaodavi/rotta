import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const ENABLED_KEY_PREFIX = "rotta_pin_enabled_";
const HASH_KEY_PREFIX = "rotta_pin_hash_";
const SALT_KEY_PREFIX = "rotta_pin_salt_";

/**
 * Armazenamento do PIN de acesso rápido (Dossiê 42) — 100% local ao
 * aparelho, chaveado por `userId` (`expo-secure-store` já usa Keychain/
 * iOS e Keystore/Android, mesma proteção do `refresh_token` em
 * `packages/auth/src/native/token-store.ts`). NÃO é um mecanismo de
 * autenticação no backend: nunca sai um PIN nem seu hash da rede — a
 * sessão real continua sendo o `refresh_token` já persistido. O PIN só
 * decide se a UI de uma sessão que já existe fica visível ou escondida
 * atrás de uma tela de desbloqueio, então nunca há tentativa remota a
 * limitar/bloquear.
 *
 * Guarda hash (SHA-256 + salt aleatório por usuário) em vez do PIN em
 * texto puro — mesmo já estando em armazenamento criptografado, assim um
 * comprometimento do Keychain/Keystore não expõe o PIN de 4 dígitos que
 * a pessoa pode reusar em outro lugar (ex.: senha do cartão).
 */

function randomSaltHex(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function isPinLockEnabled(userId: string): Promise<boolean> {
  const value = await SecureStore.getItemAsync(ENABLED_KEY_PREFIX + userId);
  return value === "1";
}

/** Cria (ou substitui) o PIN de acesso rápido do usuário e ativa a trava. */
export async function setPinLock(userId: string, pin: string): Promise<void> {
  const salt = randomSaltHex();
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(SALT_KEY_PREFIX + userId, salt);
  await SecureStore.setItemAsync(HASH_KEY_PREFIX + userId, hash);
  await SecureStore.setItemAsync(ENABLED_KEY_PREFIX + userId, "1");
}

/** Desativa a trava e apaga o PIN salvo — próxima ativação exige criar um novo. */
export async function disablePinLock(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(ENABLED_KEY_PREFIX + userId);
  await SecureStore.deleteItemAsync(HASH_KEY_PREFIX + userId);
  await SecureStore.deleteItemAsync(SALT_KEY_PREFIX + userId);
}

export async function verifyPinLock(userId: string, pin: string): Promise<boolean> {
  const [salt, storedHash] = await Promise.all([
    SecureStore.getItemAsync(SALT_KEY_PREFIX + userId),
    SecureStore.getItemAsync(HASH_KEY_PREFIX + userId),
  ]);
  if (!salt || !storedHash) {
    return false;
  }
  const candidateHash = await hashPin(pin, salt);
  return candidateHash === storedHash;
}
