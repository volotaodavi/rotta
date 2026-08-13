import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";

export interface MyLocation {
  latitude: number;
  longitude: number;
}

export type MyLocationStatus = "idle" | "requesting" | "available" | "denied" | "error";

/**
 * Posição atual do próprio telefone — puramente pra ORIENTAÇÃO visual
 * no mapa (nunca enviada ao servidor; isso é `useTripGpsReporting`,
 * hook separado, só ligado com viagem `EM_ANDAMENTO`). Porta exata de
 * `apps/web/src/features/driver/hooks/use-my-location.ts` (Frente I) —
 * faltava aqui porque a Frente I só tocou o Painel Web, mas o app
 * nativo É onde motorista/monitor/autônomo/MEI realmente usa "Início"
 * no dia a dia (Android/iPhone via Expo, mesmo código pros dois).
 * Mesmo pedido do usuário em produção: "deve aparecer mesmo sem estar
 * em uma rota, baseada na localização do próprio telefone... vale
 * tanto para autônomo, MEI, motorista e monitor".
 *
 * `Location.Accuracy.Low` (não `.Balanced`, usado por
 * `useTripGpsReporting`) — de propósito: aqui é só "onde eu estou, mais
 * ou menos", não rastreamento preciso pros responsáveis.
 */
export function useMyLocation(enabled: boolean): {
  location: MyLocation | null;
  status: MyLocationStatus;
} {
  const [location, setLocation] = useState<MyLocation | null>(null);
  const [status, setStatus] = useState<MyLocationStatus>("idle");
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
        { accuracy: Location.Accuracy.Low, timeInterval: 30_000, distanceInterval: 50 },
        (position) => {
          setStatus("available");
          setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        },
      );
      if (cancelled) {
        subscription.remove();
        return;
      }
      subscriptionRef.current = subscription;
    }

    if (enabled) {
      void startWatching().catch(() => setStatus("error"));
    } else {
      setStatus("idle");
    }

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [enabled]);

  return { location, status };
}
