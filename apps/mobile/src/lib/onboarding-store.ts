import * as SecureStore from "expo-secure-store";

const ONBOARDING_SEEN_KEY = "rotta_onboarding_seen";

/**
 * Flag "usuário já viu o onboarding" (Dossiê 24 — primeira experiência).
 * `expo-secure-store` em vez de `AsyncStorage` só para não adicionar uma
 * nova dependência: o app já usa `SecureStore` para a sessão
 * (`packages/auth/src/native/token-store.ts`), e um valor booleano não
 * sensível funciona igualmente bem ali — evita duplicar mecanismo de
 * persistência local só para este flag.
 */
export async function getHasSeenOnboarding(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(ONBOARDING_SEEN_KEY);
  return value === "1";
}

export async function setHasSeenOnboarding(): Promise<void> {
  await SecureStore.setItemAsync(ONBOARDING_SEEN_KEY, "1");
}
