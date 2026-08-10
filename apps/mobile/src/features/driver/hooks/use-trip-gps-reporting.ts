import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";

import { tripsApi } from "@/lib/api-client";

export type GpsReportingStatus = "idle" | "requesting" | "reporting" | "denied" | "error";

/**
 * Envio de posição do Motorista durante a viagem (Prompt Mestre da
 * Rotta, Seção 8 — "quando o motorista iniciar uma viagem... o GPS
 * atualiza sua posição"; "nunca deixar o GPS ativo desnecessariamente").
 * Só assina `watchPositionAsync` enquanto `tripId` não é `null` — a
 * tela chamadora passa `null` sempre que a viagem não está
 * `EM_ANDAMENTO` (pausada, ainda não iniciada, finalizada), então a
 * assinatura é removida automaticamente nesses casos, nunca ficando
 * ligada em segundo plano.
 *
 * Rastreamento em PRIMEIRO PLANO apenas (`requestForegroundPermissionsAsync`,
 * mesma API já usada por `marketplace/hooks/use-location.ts`) — GPS em
 * segundo plano exigiria `expo-task-manager` + permissão "Always" do
 * SO, um compromisso nativo maior (mesma categoria de decisão do
 * `BottomSheet` sem `react-native-gesture-handler`, Dossiê 37 §3.1);
 * registrado como próximo passo, não fingido aqui.
 */
export function useTripGpsReporting(tripId: string | null): { status: GpsReportingStatus } {
  const [status, setStatus] = useState<GpsReportingStatus>("idle");
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startWatching(): Promise<void> {
      setStatus("requesting");
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (permissionStatus !== "granted") {
        setStatus("denied");
        return;
      }

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
      subscriptionRef.current = subscription;
      setStatus("reporting");
    }

    if (tripId) {
      void startWatching().catch(() => setStatus("error"));
    } else {
      setStatus("idle");
    }

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [tripId]);

  return { status };
}
