import * as SecureStore from "expo-secure-store";

const ENABLED_KEY_PREFIX = "rotta_biometric_enabled_";

/**
 * Estado do "Entrar com Face ID/digital" (pedido do usuário 05/09/2026:
 * "pode colocar digital?"), mesmo papel de `pin-lock-store.ts` — só
 * guarda o opt-in local por usuário. A verificação em si é feita pelo
 * sistema operacional (`expo-local-authentication`/`useBiometricAuth`),
 * nunca por nós: nenhum dado biométrico passa perto do app ou do
 * servidor da Rotta.
 */
export async function isBiometricLockEnabled(userId: string): Promise<boolean> {
  const value = await SecureStore.getItemAsync(ENABLED_KEY_PREFIX + userId);
  return value === "1";
}

export async function setBiometricLockEnabled(userId: string, enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(ENABLED_KEY_PREFIX + userId, "1");
  } else {
    await SecureStore.deleteItemAsync(ENABLED_KEY_PREFIX + userId);
  }
}
