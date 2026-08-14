"use client";

import { useEffect, useState } from "react";

export interface MyLocation {
  latitude: number;
  longitude: number;
}

export type MyLocationStatus = "idle" | "requesting" | "available" | "denied" | "error";

/**
 * Posição atual do próprio telefone/navegador — puramente pra
 * ORIENTAÇÃO visual (nunca enviada ao servidor; isso é
 * `useTripGpsReporting`, hook separado, só ligado com viagem
 * `EM_ANDAMENTO`). Compartilhado entre duas frentes (por isso mora em
 * `@/hooks`, não em `features/driver`, onde nasceu):
 *
 *  - "Minha Rota" (motorista/monitor/autônomo/MEI) — mostra um mapa
 *    mesmo sem nenhuma rota atribuída ainda, ou antes das paradas
 *    carregarem (Frente G/H, pedido do usuário em produção: "deve
 *    aparecer mesmo sem estar em uma rota, baseada na localização do
 *    próprio telefone").
 *  - Cadastro de aluno (`alunos/novo/page.tsx`, Frente U) — sinal de
 *    "localização aproximada do transporte" pra ordenar as sugestões de
 *    escola por proximidade (pedido do usuário: "podendo ser aproximada
 *    ou exata, deixa o agente de IA fazer esse trabalho").
 *
 * `enableHighAccuracy: false` de propósito nos dois casos — nunca
 * rastreamento preciso, só "onde eu estou, mais ou menos".
 * `watchPosition` (não uma leitura única) pra acompanhar se a pessoa se
 * mover, sem exigir recarregar a página.
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
