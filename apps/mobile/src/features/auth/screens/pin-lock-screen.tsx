import { useAuth } from "@rotta/auth/native";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";


import { AuthButton, AuthScreen } from "../components";
import { PinCodeInput } from "../components/pin-code-input";
import { verifyPinLock } from "../pin-lock-store";

import { useTheme } from "@/providers/theme-provider";

/**
 * Tela de desbloqueio por PIN (Dossiê 42) — aparece no lugar do
 * navigator do papel ativo (`RootNavigator`) enquanto `usePinLock`
 * reporta `isLocked`. Nunca chama o backend: comparar o PIN é 100%
 * local (`verifyPinLock`), a sessão real nunca é reautenticada aqui.
 * "Sair" existe como saída de emergência para quem esqueceu o PIN —
 * volta para a tela de Entrar normal (usuário/senha).
 */
export function PinLockScreen({ onUnlock }: { onUnlock: () => void }): JSX.Element {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const [pin, setPin] = useState("");
  const [shakeSignal, setShakeSignal] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  async function handleComplete(candidate: string): Promise<void> {
    if (!user) {
      return;
    }
    setIsVerifying(true);
    const isValid = await verifyPinLock(user.id, candidate);
    setIsVerifying(false);
    if (isValid) {
      onUnlock();
      return;
    }
    setErrorMessage("PIN incorreto. Tente de novo.");
    setShakeSignal((value) => value + 1);
    setPin("");
  }

  return (
    <AuthScreen>
      <Text style={[styles.title, { color: theme.colors.text, textAlign: "center" }]}>
        Olá, {user?.nome.split(" ")[0]}
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted, textAlign: "center" }]}>
        Digite seu PIN para continuar
      </Text>

      <PinCodeInput
        value={pin}
        onChangeValue={setPin}
        shakeSignal={shakeSignal}
        onComplete={(candidate) => void handleComplete(candidate)}
      />

      {errorMessage ? (
        <Text style={{ color: theme.colors.danger, textAlign: "center" }}>{errorMessage}</Text>
      ) : null}
      {isVerifying ? (
        <Text style={{ color: theme.colors.textMuted, textAlign: "center" }}>Verificando…</Text>
      ) : null}

      <AuthButton label="Sair e entrar com senha" variant="ghost" onPress={() => void logout()} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 14, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
});
