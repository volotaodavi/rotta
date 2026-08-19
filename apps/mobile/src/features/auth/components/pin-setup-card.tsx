import { useAuth } from "@rotta/auth/native";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { disablePinLock, isPinLockEnabled, setPinLock } from "../pin-lock-store";

import { PinCodeInput } from "./pin-code-input";

import { VehicleButton } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Step = "off" | "choose" | "confirm" | "on";

/**
 * Ativação do PIN de acesso rápido, no Perfil do Motorista (Dossiê 42) —
 * opt-in explícito ("caso os motoristas queiram"). Fluxo de dois passos
 * (escolher → confirmar) igual a qualquer criação de PIN/senha — nunca
 * salva no primeiro toque, para não travar a pessoa fora por erro de
 * digitação.
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
      <Text style={[styles.title, { color: theme.colors.text }]}>PIN de acesso rápido</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  setup: { alignItems: "center" },
  title: { fontSize: 16, fontWeight: "700" },
});
