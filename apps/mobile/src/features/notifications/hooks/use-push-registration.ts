import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { notificationsApi } from "@/lib/api-client";

// Notificação em primeiro plano continua exibindo banner/som — sem isto,
// o app recebe o push mas não mostra nada enquanto está aberto. Registrado
// uma única vez, no carregamento do módulo (mesmo padrão do resto do app
// pra configuração global que não depende de nenhum estado de componente).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

/**
 * Push real (Frente 0) — registra o token do Expo Push Service assim que
 * a sessão fica autenticada. Serviço do próprio Expo (`getExpoPushTokenAsync`),
 * gratuito e sem nenhum console externo — a única dependência é o app ter
 * um `extra.eas.projectId` (`app.config.ts`), que só existe depois de rodar
 * `eas init` uma vez (grátis, sem cartão).
 *
 * "Stub honesto": sem `projectId` configurado, ou em emulador/simulador
 * (que não recebe push de verdade), a função não tenta nada — nunca lança,
 * nunca bloqueia a navegação. Mesma disciplina do `FcmService`/
 * `WebPushService` no backend.
 */
export function usePushRegistration(params: { status: AuthStatus }): void {
  const { status } = params;
  const jaRegistrouNestaSessao = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || jaRegistrouNestaSessao.current) {
      return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) {
      // Nenhuma credencial configurada — mesma decisão de "não fazer nada
      // silenciosamente quebrado" já usada nos outros provedores stub.
      return;
    }
    if (!Device.isDevice) {
      // Emuladores/simuladores não recebem push de verdade — tentar
      // registrar ali só geraria um token inútil.
      return;
    }

    let cancelado = false;

    void (async () => {
      try {
        const permissaoAtual = await Notifications.getPermissionsAsync();
        let status2 = permissaoAtual.status;
        if (status2 !== "granted") {
          const resultado = await Notifications.requestPermissionsAsync();
          status2 = resultado.status;
        }
        if (status2 !== "granted" || cancelado) {
          return;
        }

        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (cancelado) {
          return;
        }
        await notificationsApi.registerDeviceToken(
          token,
          Platform.OS === "ios" ? "IOS" : "ANDROID",
        );
        jaRegistrouNestaSessao.current = true;
      } catch (erro) {
        // Nunca deixa a UI saber — registrar push é um extra, nunca um
        // bloqueio de navegação (mesmo raciocínio do `usePinLock`).
        console.warn("[usePushRegistration] falha ao registrar push:", erro);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [status]);
}
