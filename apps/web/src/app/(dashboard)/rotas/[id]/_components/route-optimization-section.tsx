"use client";

import { ApiError } from "@rotta/api-client";
import { Route as RouteIcon } from "@rotta/icons";
import { Button, Card, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { RouteOptimizationResult, RouteStop } from "@rotta/api-client";

import {
  useReorderRouteStops,
  useSuggestRouteOptimization,
} from "@/features/routes/hooks/use-routes";

function formatarDuracao(segundos: number): string {
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${resto}min`;
}

/**
 * "Rotta Route AI" (Frente A do pedido "otimize a Rotta Route AI") —
 * motor real já existia desde a Frente D (OSRM via Rotta Geo Engine),
 * mas nenhuma tela chamava — esta seção tinha sido apagada na
 * reconstrução do fluxo de Rotas e volta agora, com uma diferença
 * importante em relação à versão anterior: a versão antiga admitia no
 * próprio texto que "esta sugestão não altera a rota sozinha... reordene
 * as paradas manualmente" — mas nenhuma UI de reordenar manual existia.
 * Agora "Aplicar esta ordem" chama `useReorderRouteStops` de verdade
 * (`PATCH /routes/:id/stops/reorder`, Frente A1) — a rota só muda com
 * este clique explícito e separado (ROT-08: "a sugestão nunca altera a
 * rota automaticamente" — continua verdade até este clique).
 */
export function RouteOptimizationSection({
  routeId,
  stops,
}: {
  routeId: string;
  stops: RouteStop[];
}): JSX.Element | null {
  const suggestOptimization = useSuggestRouteOptimization(routeId);
  const reorderStops = useReorderRouteStops(routeId);
  const [resultado, setResultado] = useState<RouteOptimizationResult | null>(null);
  const [aplicada, setAplicada] = useState(false);

  if (stops.length < 3) return null;

  const enderecoPorId = new Map(stops.map((stop) => [stop.id, stop.endereco]));

  async function handleOtimizar(): Promise<void> {
    setResultado(null);
    setAplicada(false);
    try {
      const result = await suggestOptimization.mutateAsync();
      setResultado(result);
    } catch {
      // erro já refletido em suggestOptimization.isError / .error abaixo
    }
  }

  async function handleAplicar(): Promise<void> {
    if (!resultado) return;
    try {
      await reorderStops.mutateAsync(resultado.ordemSugeridaIds);
      setAplicada(true);
    } catch {
      // erro já refletido em reorderStops.isError / .error abaixo
    }
  }

  return (
    <Card>
      <Card.Header title="Rotta Route AI" />
      <Card.Body className="flex flex-col gap-4">
        <Typography variant="bodySmall" color="muted">
          Sugestão de ordem por proximidade, calculada via OpenStreetMap.
        </Typography>
        <Button
          type="button"
          variant="secondary"
          iconLeft={<RouteIcon className="h-4 w-4" />}
          isLoading={suggestOptimization.isPending}
          onClick={() => void handleOtimizar()}
        >
          Otimizar rota
        </Button>

        {suggestOptimization.isError ? (
          <Typography variant="bodySmall" color="danger">
            {suggestOptimization.error instanceof ApiError
              ? suggestOptimization.error.message
              : "Não foi possível calcular a otimização agora. Tente novamente em instantes."}
          </Typography>
        ) : null}

        {resultado && resultado.jaOtimizada ? (
          <Typography variant="bodySmall" color="success">
            Esta rota já está na ordem mais eficiente encontrada.
          </Typography>
        ) : resultado ? (
          <div className="flex flex-col gap-3">
            <Typography variant="bodySmall">
              Economia estimada de{" "}
              <span className="font-semibold text-success">
                {formatarDuracao(resultado.economiaSegundos)}
              </span>{" "}
              seguindo a ordem sugerida ({formatarDuracao(resultado.duracaoAtualSegundos)} →{" "}
              {formatarDuracao(resultado.duracaoSugeridaSegundos)}).
            </Typography>
            <div className="flex flex-col gap-1 rounded-xl border border-border p-3">
              <Typography variant="caption" color="muted" className="font-semibold">
                Ordem sugerida
              </Typography>
              {resultado.ordemSugeridaIds.map((stopId, index) => (
                <Typography key={stopId} variant="bodySmall">
                  {index + 1}. {enderecoPorId.get(stopId) ?? "Parada"}
                </Typography>
              ))}
            </div>

            {aplicada ? (
              <Typography variant="bodySmall" color="success">
                Ordem aplicada — as paradas acima já refletem a nova sequência.
              </Typography>
            ) : (
              <>
                <Button
                  type="button"
                  variant="primary"
                  isLoading={reorderStops.isPending}
                  onClick={() => void handleAplicar()}
                >
                  Aplicar esta ordem
                </Button>
                {reorderStops.isError ? (
                  <Typography variant="bodySmall" color="danger">
                    {reorderStops.error instanceof ApiError
                      ? reorderStops.error.message
                      : "Não foi possível aplicar a nova ordem agora. Tente novamente."}
                  </Typography>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}
