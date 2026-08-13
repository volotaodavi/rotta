"use client";

import { useEffect, useState } from "react";

export interface MyLocation {
  latitude: number;
  longitude: number;
}

export type MyLocationStatus = "idle" | "requesting" | "available" | "denied" | "error";

/**
 * Posição atual do próprio telefone — puramente pra ORIENTAÇÃO visual
 * no mapa (nunca enviada ao servidor; isso é `useTripGpsReporting`,
 * hook separado, só ligado com viagem `EM_ANDAMENTO`). Existe porque
 * "Minha Rota" deve mostrar um mapa mesmo sem nenhuma rota atribuída
 * ainda, ou antes das paradas carregarem — pedido do usuário em
 * produção: "deve aparecer mesmo sem estar em uma rota, baseada na
 * localização do próprio telefone, pelo menos para visualização",
 * válido pra autônomo, MEI, motorista e monitor (todos passam por esta
 * mesma página, Frente G/H).
 *
 * `enableHighAccuracy: false` — de propósito, diferente do GPS de
 * viagem: aqui é só "onde eu estou, mais ou menos", não rastreamento
 * preciso pros responsáveis. `watchPosition` (não uma leitura única)
 * pra o mapa acompanhar se a pessoa se mover antes de iniciar a
 * viagem, sem exigir recarregar a página.
 */
export function useMyLocation(enabled: boolean): {
  location: MyLocation | null;
  status: MyLocationStatus;
} {
  const [location, setLocation] = useState<MyLocation | null>(null);
  const [status, setStatus] = useState<MyLocationStatus>("idle");

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      return;
    }

    setStatus("requesting");

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setStatus("available");
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 20_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return { location, status };
}
