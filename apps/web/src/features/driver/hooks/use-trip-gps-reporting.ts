"use client";

import { useEffect, useRef, useState } from "react";

import { tripsApi } from "@/lib/api-client";

export type GpsReportingStatus = "idle" | "requesting" | "reporting" | "denied" | "error";

/**
 * Envio de posição do Motorista durante a viagem, versão Painel Web
 * (Frente G, "Modo Ação") — mesma responsabilidade de
 * `apps/mobile/src/features/driver/hooks/use-trip-gps-reporting.ts`,
 * trocando `expo-location` pela Geolocation API nativa do navegador
 * (`navigator.geolocation.watchPosition`). Só assina enquanto `tripId`
 * não é `null` — a tela chamadora passa `null` sempre que a viagem não
 * está `EM_ANDAMENTO`, então o GPS nunca fica ligado desnecessariamente.
 *
 * Rastreamento em PRIMEIRO PLANO apenas — a aba precisa estar aberta;
 * não há equivalente de rastreamento em segundo plano no navegador (uma
 * limitação real da plataforma, não deste código). Para segundo plano
 * de verdade, o app mobile (`expo-location`) é o caminho.
 */
export function useTripGpsReporting(tripId: string | null): { status: GpsReportingStatus } {
  const [status, setStatus] = useState<GpsReportingStatus>("idle");
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!tripId) {
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
        setStatus("reporting");
        void tripsApi
          .ingestPosition(tripId, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            precisaoMetros: position.coords.accuracy ?? undefined,
            velocidadeKmh:
              position.coords.speed !== null ? Math.max(position.coords.speed * 3.6, 0) : undefined,
            capturadaEm: new Date(position.timestamp).toISOString(),
          })
          .catch(() => {
            // Falha isolada de rede/servidor não derruba o acompanhamento —
            // a próxima posição do watch tenta de novo naturalmente.
          });
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [tripId]);

  return { status };
}
