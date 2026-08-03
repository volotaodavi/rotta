import * as Location from "expo-location";
import { useCallback, useState } from "react";

export type LocationStatus = "idle" | "requesting" | "granted" | "denied" | "error";

export interface Coords {
  latitude: number;
  longitude: number;
}

/**
 * Localização atual do Responsável (briefing "Marketplace" §"MAPA" —
 * "solicitar permissão de localização"). Diferente do "Mapa" de Escolas
 * (`features/schools/screens/mapa-screen.tsx`, um stub de lista porque
 * `packages/maps` está vazio): aqui não há mapa interativo nenhum sendo
 * substituído — apenas as COORDENADAS reais do dispositivo, via
 * `expo-location` (já instalado e configurado em `app.config.ts`),
 * usadas como parâmetro de busca (`GET /marketplace/transporters`).
 * Sem geocodificação de endereço digitado: nenhum provedor foi
 * contratado (`RottaAiService.analyzeSchoolAddress` é o mesmo stub
 * honesto já usado pelo módulo Escolas) — por isso o fallback manual
 * (`endereco-manual-screen.tsx`) só aceita coordenadas se o próprio
 * Responsável as souber, nunca finge geocodificar o endereço.
 */
export function useLocation() {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [coords, setCoords] = useState<Coords | null>(null);

  const requestLocation = useCallback(async () => {
    setStatus("requesting");
    try {
      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== "granted") {
        setStatus("denied");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setStatus("granted");
    } catch {
      setStatus("error");
    }
  }, []);

  const setManualCoords = useCallback((next: Coords) => {
    setCoords(next);
    setStatus("granted");
  }, []);

  return { status, coords, requestLocation, setManualCoords };
}
