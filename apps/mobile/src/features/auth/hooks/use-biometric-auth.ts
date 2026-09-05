import * as LocalAuthentication from "expo-local-authentication";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * Ponte com o "Face ID/Touch ID/digital" do aparelho (pedido do usuário
 * 05/09/2026: "pode colocar digital? Já que o primeiro lançamento está
 * sendo feito para Android, ou tem que fazer tudo de uma vez?") — API
 * única (`expo-local-authentication`) que já cobre os dois lados: no
 * Android detecta digital/rosto cadastrados no aparelho, no iOS detecta
 * Face ID/Touch ID, sem nenhum código a mais quando o app for pro iOS
 * depois. Nunca lê/guarda nenhum dado biométrico — só pergunta ao
 * sistema operacional "essa pessoa é quem o aparelho reconhece?" e
 * recebe sim/não.
 */
export function useBiometricAuth(): {
  /** Aparelho tem sensor E já tem alguma biometria cadastrada — sem os dois, a opção nem aparece na tela. */
  isAvailable: boolean;
  /** "Face ID" (iOS com reconhecimento facial), "Touch ID" (iOS com digital) ou "digital" (Android — nome genérico, cobre digital/rosto do Android). */
  label: string;
  authenticate: () => Promise<boolean>;
} {
  const [isAvailable, setIsAvailable] = useState(false);
  const [label, setLabel] = useState("biometria");

  useEffect(() => {
    let cancelled = false;
    async function checkAvailability(): Promise<void> {
      const [hasHardware, isEnrolled, types] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);
      if (cancelled) return;
      setIsAvailable(hasHardware && isEnrolled);
      const temFacial = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      setLabel(Platform.OS === "ios" ? (temFacial ? "Face ID" : "Touch ID") : "digital");
    }
    void checkAvailability();
    return () => {
      cancelled = true;
    };
  }, []);

  async function authenticate(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirme para entrar na Rotta",
      cancelLabel: "Cancelar",
      // Nunca cai pro PIN/senha do APARELHO como alternativa por baixo
      // do pano — se a biometria falhar/for cancelada, a pessoa volta
      // pro fluxo normal desta tela (PIN da Rotta ou "entrar com
      // senha"), nunca destrava com o desbloqueio do aparelho em si.
      disableDeviceFallback: true,
    });
    return result.success;
  }

  return { isAvailable, label, authenticate };
}
