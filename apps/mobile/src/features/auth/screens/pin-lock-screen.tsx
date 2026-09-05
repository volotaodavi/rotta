import { useAuth } from "@rotta/auth/native";
import { Fingerprint } from "@rotta/icons/native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { isBiometricLockEnabled } from "../biometric-lock-store";
import { AuthButton, AuthScreen } from "../components";
import { PinCodeInput } from "../components/pin-code-input";
import { useBiometricAuth } from "../hooks/use-biometric-auth";
import { maskEmail } from "../mask-email";
import { isPinLockEnabled, verifyPinLock } from "../pin-lock-store";

import { useTheme } from "@/providers/theme-provider";

/** Iniciais do nome pro avatar (mesmo padrão de `ParentPerfilScreen`/`DriverPerfilScreen` — nunca uma imagem inventada). */
function iniciais(nome: string | undefined): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

/**
 * "Acesso rápido" (pedido do usuário 05/09/2026, com referência visual
 * do próprio app da Asaas: cartão com nome/e-mail mascarado + botão
 * "Entrar" azul + atalho de biometria) — aparece no lugar do navigator
 * do papel ativo (`RootNavigator`) enquanto `usePinLock` reporta
 * `isLocked`. Nunca chama o backend: tanto o PIN (`verifyPinLock`)
 * quanto a biometria (`useBiometricAuth`) são checagens 100% locais — a
 * sessão real nunca é reautenticada aqui, só fica escondida atrás desta
 * tela. "Entrar com senha" existe como saída de emergência (PIN
 * esquecido ou biometria indisponível) — volta para o login normal.
 *
 * Três estados possíveis, conforme o que a pessoa ativou no Perfil
 * (`PinSetupCard`): só PIN, só biometria (tenta sozinha assim que a
 * tela abre), ou os dois juntos (PIN como entrada principal, biometria
 * como atalho abaixo — mesmo layout da referência).
 */
export function PinLockScreen({ onUnlock }: { onUnlock: () => void }): JSX.Element {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const {
    isAvailable: biometriaDisponivelNoAparelho,
    label: biometriaLabel,
    authenticate,
  } = useBiometricAuth();

  const [pin, setPin] = useState("");
  const [shakeSignal, setShakeSignal] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pinAtivo, setPinAtivo] = useState<boolean | null>(null);
  const [biometriaAtiva, setBiometriaAtiva] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void Promise.all([isPinLockEnabled(user.id), isBiometricLockEnabled(user.id)]).then(
      ([pinEnabled, biometricEnabled]) => {
        if (cancelled) return;
        setPinAtivo(pinEnabled);
        setBiometriaAtiva(biometricEnabled && biometriaDisponivelNoAparelho);
      },
    );
    return () => {
      cancelled = true;
    };
    // `biometriaDisponivelNoAparelho` só estabiliza depois do 1º render
    // (checagem assíncrona de hardware) — refazer esta leitura quando
    // ela muda é intencional, não um efeito solto.
  }, [user, biometriaDisponivelNoAparelho]);

  async function handleBiometricAttempt(): Promise<void> {
    setErrorMessage(null);
    const ok = await authenticate();
    if (ok) {
      onUnlock();
    }
  }

  // Só biometria ativa (sem PIN) — tenta sozinha assim que a tela abre,
  // pra pessoa nem precisar tocar em nada na maioria das vezes.
  useEffect(() => {
    if (pinAtivo === false && biometriaAtiva) {
      void handleBiometricAttempt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinAtivo, biometriaAtiva]);

  async function handlePinComplete(candidate: string): Promise<void> {
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
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primaryMuted }]}>
          <Text style={[styles.avatarLabel, { color: theme.colors.primary }]}>
            {iniciais(user?.nome)}
          </Text>
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Olá, {user?.nome.split(" ")[0]}
        </Text>
        {user?.email ? (
          <Text style={{ color: theme.colors.textMuted }}>{maskEmail(user.email)}</Text>
        ) : null}
      </View>

      {pinAtivo ? (
        <>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted, textAlign: "center" }]}>
            Digite seu PIN para continuar
          </Text>
          <PinCodeInput
            value={pin}
            onChangeValue={setPin}
            shakeSignal={shakeSignal}
            onComplete={(candidate) => void handlePinComplete(candidate)}
          />
          {errorMessage ? (
            <Text style={{ color: theme.colors.danger, textAlign: "center" }}>{errorMessage}</Text>
          ) : null}
          {isVerifying ? (
            <Text style={{ color: theme.colors.textMuted, textAlign: "center" }}>Verificando…</Text>
          ) : null}

          {biometriaAtiva ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleBiometricAttempt()}
              style={styles.biometriaLink}
            >
              <Fingerprint size={18} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>
                Entrar com {biometriaLabel}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : biometriaAtiva ? (
        <>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted, textAlign: "center" }]}>
            Toque para entrar com {biometriaLabel}
          </Text>
          {errorMessage ? (
            <Text style={{ color: theme.colors.danger, textAlign: "center" }}>{errorMessage}</Text>
          ) : null}
          <AuthButton
            label={`Entrar com ${biometriaLabel}`}
            onPress={() => void handleBiometricAttempt()}
          />
        </>
      ) : null}

      <AuthButton label="Sair e entrar com senha" variant="ghost" onPress={() => void logout()} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  avatarLabel: { fontSize: 22, fontWeight: "700" },
  biometriaLink: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "center" },
  card: { alignItems: "center", gap: 6, marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "700" },
});
