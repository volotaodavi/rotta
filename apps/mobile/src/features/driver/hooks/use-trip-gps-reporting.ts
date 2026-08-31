import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";

import { BACKGROUND_TRIP_LOCATION_TASK, setActiveTripId } from "./background-trip-location-task";

import { tripsApi } from "@/lib/api-client";

export type GpsReportingStatus =
  | "idle"
  | "aguardando-consentimento"
  | "requesting"
  | "reporting"
  | "reporting-foreground-only"
  | "denied"
  | "error";

/**
 * Envio de posição do Motorista durante a viagem (Prompt Mestre da
 * Rotta, Seção 8 — "quando o motorista iniciar uma viagem... o GPS
 * atualiza sua posição"; "nunca deixar o GPS ativo desnecessariamente").
 * Só inicia o rastreamento enquanto `tripId` não é `null` — a tela
 * chamadora passa `null` sempre que a viagem não está `EM_ANDAMENTO`
 * (pausada, ainda não iniciada, finalizada), então o rastreamento para
 * automaticamente nesses casos, nunca ficando ligado à toa.
 *
 * Item 4 do pedido do usuário: "GPS continuar rodando de verdade em
 * segundo plano" — tenta sempre `startLocationUpdatesAsync`
 * (`expo-location` + `expo-task-manager`, ver `background-trip-location-task.ts`),
 * que o SO mantém entregando posições mesmo com o app minimizado/
 * bloqueado (Android: serviço em primeiro plano com notificação
 * persistente, já configurado em `app.config.ts`; iOS: "Always"). Só
 * cai pro antigo `watchPositionAsync` (foreground-only, mesmo
 * comportamento de antes) quando a permissão "Always"/background é
 * negada — nunca deixa de reportar posição nenhuma, só perde a
 * cobertura em segundo plano nesse caso específico.
 *
 * Divulgação proeminente da localização em segundo plano (Google Play
 * — "Prominent Disclosure & Consent Requirements", exigida sempre que
 * o app pede `ACCESS_BACKGROUND_LOCATION`): antes de disparar o diálogo
 * nativo do sistema pela primeira vez, o status vira
 * `"aguardando-consentimento"` — a TELA precisa mostrar sua própria
 * explicação (fora deste hook, que não sabe renderizar nada) e só
 * chamar `confirmarDivulgacao()` depois que a pessoa concordar
 * explicitamente. Já concedida antes (viagens seguintes) → pula direto
 * pro rastreamento, sem repetir a tela.
 */
export function useTripGpsReporting(tripId: string | null): {
  status: GpsReportingStatus;
  /** Chamado pela tela depois que a pessoa confirma a divulgação — só então o diálogo nativo de permissão é disparado. */
  confirmarDivulgacao: () => void;
} {
  const [status, setStatus] = useState<GpsReportingStatus>("idle");
  const foregroundSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const backgroundStartedByThisRef = useRef(false);
  const consentimentoDadoRef = useRef(false);
  const [consentimentoVersao, setConsentimentoVersao] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function stopEverything(): Promise<void> {
      setActiveTripId(null);
      if (backgroundStartedByThisRef.current) {
        backgroundStartedByThisRef.current = false;
        const started = await Location.hasStartedLocationUpdatesAsync(
          BACKGROUND_TRIP_LOCATION_TASK,
        ).catch(() => false);
        if (started) {
          await Location.stopLocationUpdatesAsync(BACKGROUND_TRIP_LOCATION_TASK).catch(() => {
            // Já pode ter sido parado pelo SO (app encerrado) — sem efeito colateral aqui.
          });
        }
      }
      foregroundSubscriptionRef.current?.remove();
      foregroundSubscriptionRef.current = null;
    }

    async function startForegroundOnlyFallback(): Promise<void> {
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 15_000, distanceInterval: 25 },
        (position) => {
          void tripsApi
            .ingestPosition(tripId as string, {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              precisaoMetros: position.coords.accuracy ?? undefined,
              velocidadeKmh:
                position.coords.speed !== null
                  ? Math.max(position.coords.speed * 3.6, 0)
                  : undefined,
              capturadaEm: new Date(position.timestamp).toISOString(),
            })
            .catch(() => {
              // Falha isolada de rede/servidor não derruba o acompanhamento —
              // a próxima posição do watch tenta de novo naturalmente.
            });
        },
      );
      if (cancelled) {
        subscription.remove();
        return;
      }
      foregroundSubscriptionRef.current = subscription;
      setStatus("reporting-foreground-only");
    }

    async function startTracking(): Promise<void> {
      setStatus("requesting");
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (foregroundStatus !== "granted") {
        setStatus("denied");
        return;
      }

      setActiveTripId(tripId);

      // Divulgação proeminente (ver comentário do arquivo) — só pula
      // direto se a permissão "Always"/background JÁ estiver concedida
      // (viagem anterior) ou se a pessoa já confirmou a divulgação
      // nesta mesma sessão de rastreamento (`confirmarDivulgacao`
      // rearma o efeito via `consentimentoVersao`).
      const backgroundJaConcedida =
        (await Location.getBackgroundPermissionsAsync().catch(() => null))?.status === "granted";
      if (!backgroundJaConcedida && !consentimentoDadoRef.current) {
        setStatus("aguardando-consentimento");
        return;
      }

      // "Always"/background — sem ela, o SO suspende qualquer rastreamento
      // assim que o app sai de primeiro plano; com ela, o serviço nativo
      // continua entregando posições pra `BACKGROUND_TRIP_LOCATION_TASK`
      // mesmo minimizado. Negada (comum em versões mais antigas de
      // Android/iOS ou escolha explícita do usuário) → cai pro fallback
      // foreground-only, nunca trava a tela nem deixa de reportar nada.
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (cancelled) return;
      if (backgroundStatus !== "granted") {
        await startForegroundOnlyFallback();
        return;
      }

      const jaIniciado = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_TRIP_LOCATION_TASK,
      ).catch(() => false);
      if (!jaIniciado) {
        await Location.startLocationUpdatesAsync(BACKGROUND_TRIP_LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15_000,
          distanceInterval: 25,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: "Rotta — viagem em andamento",
            notificationBody: "Compartilhando sua localização com as famílias em tempo real.",
          },
        });
      }
      if (cancelled) {
        setActiveTripId(null);
        await Location.stopLocationUpdatesAsync(BACKGROUND_TRIP_LOCATION_TASK).catch(() => {});
        return;
      }
      backgroundStartedByThisRef.current = true;
      setStatus("reporting");
    }

    if (tripId) {
      void startTracking().catch(() => setStatus("error"));
    } else {
      setStatus("idle");
      consentimentoDadoRef.current = false;
      void stopEverything();
    }

    return () => {
      cancelled = true;
      void stopEverything();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `consentimentoVersao` só existe pra rearmar este efeito depois de `confirmarDivulgacao()`, nunca lido diretamente aqui dentro.
  }, [tripId, consentimentoVersao]);

  function confirmarDivulgacao(): void {
    consentimentoDadoRef.current = true;
    setConsentimentoVersao((atual) => atual + 1);
  }

  return { status, confirmarDivulgacao };
}
