import { useAuth } from "@rotta/auth/native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { isBiometricLockEnabled, setBiometricLockEnabled } from "../biometric-lock-store";
import { useBiometricAuth } from "../hooks/use-biometric-auth";
import { disablePinLock, isPinLockEnabled, setPinLock } from "../pin-lock-store";

import { PinCodeInput } from "./pin-code-input";

import { VehicleButton } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Step = "off" | "choose" | "confirm" | "on";

/**
 * Toggle de biometria do "Acesso rápido" (pedido do usuário 05/09/2026:
 * "pode colocar digital?") — só aparece quando o aparelho tem sensor E
 * já tem alguma biometria cadastrada (`useBiometricAuth().isAvailable`);
 * sem isso, oferecer o toggle levaria a um erro sem saída na hora de
 * usar. Ativar exige confirmar com a própria biometria uma vez (mesmo
 * princípio de "não salva no primeiro toque" do PIN acima) — evita
 * ativar sem querer e travar a pessoa fora depois.
 */
function BiometricToggle({ userId }: { userId: string }): JSX.Element | null {
  const { theme } = useTheme();
  const { isAvailable, label, authenticate } = useBiometricAuth();
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    void isBiometricLockEnabled(userId).then(setEnabled);
  }, [userId]);

  if (!isAvailable) {
    return null;
  }

  async function handleAtivar(): Promise<void> {
    setError(null);
    setIsBusy(true);
    const confirmado = await authenticate();
    setIsBusy(false);
    if (!confirmado) {
      setError(`Não foi possível confirmar com ${label}. Tente de novo.`);
      return;
    }
    await setBiometricLockEnabled(userId, true);
    setEnabled(true);
  }

  async function handleDesativar(): Promise<void> {
    await setBiometricLockEnabled(userId, false);
    setEnabled(false);
  }

  return (
    <View style={[styles.subCard, { borderColor: theme.colors.border }]}>
      <Text style={[styles.subTitle, { color: theme.colors.text }]}>Entrar com {label}</Text>
      <Text style={{ color: theme.colors.textMuted }}>
        Desbloqueie o app com {label} em vez do PIN ou da senha.
      </Text>
      {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
      <VehicleButton
        label={enabled ? `Desativar ${label}` : `Ativar ${label}`}
        variant="secondary"
        isLoading={isBusy}
        onPress={() => void (enabled ? handleDesativar() : handleAtivar())}
      />
    </View>
  );
}

/**
 * "Acesso rápido" no Perfil (Dossiê 42 + pedido do usuário 05/09/2026:
 * "facilitar a vida de todos, para não passar por constrangimento ou
 * esquecimento") — PIN de 4 dígitos e/ou Face ID/Touch ID/digital, os
 * dois 100% opcionais e 100% locais ao aparelho: nunca substituem a
 * sessão real (`@rotta/auth`), só decidem se a UI de uma sessão que já
 * existe fica visível ou escondida atrás de `PinLockScreen`. Fluxo de
 * dois passos pro PIN (escolher → confirmar) — nunca salva no primeiro
 * toque, para não travar a pessoa fora por erro de digitação.
 */
export function PinSetupCard(): JSX.Element | null {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("off");
  const [firstPin, setFirstPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [shakeSignal, setShakeSignal] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    void isPinLockEnabled(user.id).then((enabled) => setStep(enabled ? "on" : "off"));
  }, [user]);

  if (!user) {
    return null;
  }
  // Capturado como primitivo (fora do objeto `user`) para o TypeScript
  // manter a narrowing de "não nulo" dentro das funções aninhadas abaixo
  // — closures não herdam a checagem `if (!user)` feita no corpo do
  // componente.
  const userId = user.id;

  function resetToOff(): void {
    setStep("off");
    setFirstPin("");
    setCurrentPin("");
    setErrorMessage(null);
  }

  function handleChooseComplete(pin: string): void {
    setFirstPin(pin);
    setCurrentPin("");
    setStep("confirm");
  }

  async function handleConfirmComplete(pin: string): Promise<void> {
    if (pin !== firstPin) {
      setErrorMessage("Os PINs não são iguais. Tente de novo.");
      setShakeSignal((value) => value + 1);
      setCurrentPin("");
      setFirstPin("");
      setStep("choose");
      return;
    }
    await setPinLock(userId, pin);
    setStep("on");
    setCurrentPin("");
    setFirstPin("");
    setErrorMessage(null);
  }

  async function handleDisable(): Promise<void> {
    await disablePinLock(userId);
    resetToOff();
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: theme.spacing[4],
          gap: theme.spacing[3],
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.text }]}>Acesso rápido</Text>
      <Text style={{ color: theme.colors.textMuted }}>
        Desbloqueie o app com um PIN de 4 dígitos em vez de digitar a senha inteira de novo. Sua
        sessão continua a mesma, é só uma forma mais rápida de reabrir.
      </Text>

      {step === "on" ? (
        <VehicleButton
          label="Desativar PIN"
          variant="secondary"
          onPress={() => void handleDisable()}
        />
      ) : step === "off" ? (
        <VehicleButton label="Ativar PIN de acesso rápido" onPress={() => setStep("choose")} />
      ) : (
        <View style={[styles.setup, { gap: theme.spacing[3] }]}>
          <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
            {step === "choose" ? "Escolha um PIN de 4 dígitos" : "Confirme o PIN"}
          </Text>
          <PinCodeInput
            value={currentPin}
            onChangeValue={setCurrentPin}
            shakeSignal={shakeSignal}
            onComplete={(pin) =>
              step === "choose" ? handleChooseComplete(pin) : void handleConfirmComplete(pin)
            }
          />
          {errorMessage ? <Text style={{ color: theme.colors.danger }}>{errorMessage}</Text> : null}
          <VehicleButton label="Cancelar" variant="ghost" onPress={resetToOff} />
        </View>
      )}

      <BiometricToggle userId={userId} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  setup: { alignItems: "center" },
  subCard: { borderTopWidth: 1, gap: 8, paddingTop: 12 },
  subTitle: { fontSize: 14, fontWeight: "700" },
  title: { fontSize: 16, fontWeight: "700" },
});
