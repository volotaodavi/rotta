"use client";

import { RottaMap, type RottaMapMarker } from "@rotta/maps/web";
import { Typography } from "@rotta/ui/web";
import { useEffect, useMemo, useRef, useState } from "react";

import { DEMO_ROUTE, lerp } from "./demo-route-data";

const SEGMENT_MS = 3600;
/** Minutos "restantes" exibidos no cartão flutuante — só decorativo, decresce por trecho (nunca calculado de verdade aqui; a versão real é `TripsService.recalcularProximasEtas`, tarefa #99). */
const MINUTOS_POR_TRECHO = [8, 5, 2];

/**
 * Miniatura animada do localizador para a HERO da Landing Page — mapa +
 * um único cartão flutuante de status, dados de exemplo (`demo-route-
 * data.ts`, nunca chama o backend). Único mapa da Landing Page: havia
 * uma segunda demonstração (`RouteDemoSection`, com linha do tempo
 * completa) logo abaixo da hero, mostrando o mesmo trajeto — removida
 * por duplicar o mapa na mesma página. Substitui o antigo painel
 * decorativo (SVG estático) por um mapa de verdade em movimento —
 * mesmo padrão da hero da Uber (mapa real + cartão de status ao vivo).
 */
export function HeroMapDemo(): JSX.Element {
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const phaseStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    function tick(now: number): void {
      if (phaseStartRef.current === null) phaseStartRef.current = now;
      const elapsed = now - phaseStartRef.current;
      const p = Math.min(elapsed / SEGMENT_MS, 1);
      setProgress(p);

      if (p >= 1) {
        phaseStartRef.current = now;
        setSegmentIndex((prev) => (prev + 1) % (DEMO_ROUTE.length - 1));
        setProgress(0);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const de = DEMO_ROUTE[segmentIndex]!;
  const para = DEMO_ROUTE[segmentIndex + 1]!;
  const veiculoPos = {
    latitude: lerp(de.latitude, para.latitude, progress),
    longitude: lerp(de.longitude, para.longitude, progress),
  };

  const markers = useMemo<RottaMapMarker[]>(
    () => [
      ...DEMO_ROUTE.map((stop) => ({
        id: stop.id,
        titulo: stop.nome,
        latitude: stop.latitude,
        longitude: stop.longitude,
      })),
      { id: "veiculo-hero", titulo: "Van — exemplo", ...veiculoPos, emMovimento: true },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `veiculoPos` muda todo frame de propósito (é a posição animada).
    [veiculoPos.latitude, veiculoPos.longitude],
  );

  const routeLine = useMemo(
    () => DEMO_ROUTE.map((stop) => ({ latitude: stop.latitude, longitude: stop.longitude })),
    [],
  );

  const minutosRestantes = Math.max(
    1,
    Math.round(
      lerp(MINUTOS_POR_TRECHO[segmentIndex]!, MINUTOS_POR_TRECHO[segmentIndex]! - 2, progress),
    ),
  );

  return (
    <div className="relative aspect-square w-full max-w-md">
      <div className="absolute -inset-6 rounded-[40px] bg-primary/10 blur-2xl" aria-hidden="true" />
      <div className="relative aspect-square w-full overflow-hidden rounded-[32px] border border-border shadow-xl">
        <RottaMap markers={markers} route={routeLine} initialZoom={13.5} />
      </div>
      <div className="absolute -bottom-6 -left-4 right-8 rotate-[-2deg] rounded-2xl border border-border bg-card p-4 shadow-2xl sm:right-10">
        <Typography variant="caption" color="muted">
          A caminho de {para.nome.split(" — ")[0]}
        </Typography>
        <Typography variant="subtitle" className="mt-1">
          Chegada em {minutosRestantes} min
        </Typography>
      </div>
    </div>
  );
}
