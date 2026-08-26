"use client";

import { useState } from "react";

import { env } from "@/config/env";
import { notificationsApi } from "@/lib/api-client";

/**
 * Converte a chave pública VAPID (base64url) pro formato `Uint8Array`
 * que `PushManager.subscribe` exige em `applicationServerKey` — não há
 * API nativa pra isso, é a conversão padrão usada em qualquer
 * integração de Web Push (RFC 8291).
 */
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(base64);
  const bytes = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i += 1) {
    bytes[i] = bruto.charCodeAt(i);
  }
  return bytes;
}

type StatusAtivacao = "ocioso" | "ativando" | "ativado" | "negado" | "erro";

/**
 * Push real (Frente 0) — Web Push padrão (RFC 8030) com VAPID, servido
 * pelo `WebPushService` do backend. Só oferece a opção quando o
 * navegador suporta Service Worker + Push API e a chave pública VAPID
 * está configurada (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`) — "stub honesto",
 * mesma disciplina do resto da Frente 0.
 *
 * Nunca dispara sozinho: só ativa numa ação explícita da pessoa
 * (mesma disciplina de `notifyRouteStarted`) — quem chama isto é um
 * botão em `/notificacoes/preferencias`, nunca um efeito automático.
 */
export function usePushRegistration(): {
  disponivel: boolean;
  status: StatusAtivacao;
  ativarPushNoNavegador: () => Promise<void>;
} {
  const [status, setStatus] = useState<StatusAtivacao>("ocioso");

  const disponivel =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    Boolean(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);

  async function ativarPushNoNavegador(): Promise<void> {
    if (!disponivel || !env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      return;
    }
    setStatus("ativando");
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setStatus("negado");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
        }));

      await notificationsApi.registerDeviceToken(JSON.stringify(subscription), "WEB");
      setStatus("ativado");
    } catch (erro) {
      console.warn("[usePushRegistration] falha ao ativar push no navegador:", erro);
      setStatus("erro");
    }
  }

  return { disponivel, status, ativarPushNoNavegador };
}
