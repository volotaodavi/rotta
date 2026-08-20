"use client";

import { ApiError } from "@rotta/api-client";
import { Route as RouteIcon } from "@rotta/icons";
import { Button, Card, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { RouteOptimizationResult, RouteStop } from "@rotta/api-client";

import { useSuggestRouteOptimization } from "@/features/routes/hooks/use-routes";

function formatarDuracao(segundos: number): string {
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas}h` : `${horas}h${resto}min`;
}

/**
 * "Rotta Route AI" — pedido do usuário: "as IAs de localização irão
 * traçar as rotas (por ordem de proximidade) no OPENSTREET, principalmente
 * na OPENSTREET do responsável". Motor real (OSRM via Rotta Geo Engine,
 * Frente D) já existia desde antes desta tela — só faltava um botão. Só
 * mostra a comparação lado a lado; quem decide se aplica a nova ordem é o
 * Gestor (ROT-08: "a sugestão nunca altera a rota automaticamente") — hoje
 * a aplicação em si ainda não está exposta, então o resultado é só
 * informativo.
 */
export function RouteOptimizationSection({
  routeId,
  stops,
}: {
  routeId: string;
  stops: RouteStop[];
}): JSX.Element | null {
  const suggestOptimization = useSuggestRouteOptimization(routeId);
  const [resultado, setResultado] = useState<RouteOptimizationResult | null>(null);

  if (stops.length < 3) return null;

  const enderecoPorId = new Map(stops.map((stop) => [stop.id, stop.endereco]));

  async function handleOtimizar(): Promise<void> {
    setResultado(null);
    try {
      const result = await suggestOptimization.mutateAsync();
      setResultado(result);
    } catch {
      // erro já refletido em suggestOptimization.isError / .error abaixo
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
            <Typography variant="caption" color="muted">
              Esta sugestão não altera a rota sozinha: se quiser aplicá-la, reordene as paradas
              acima manualmente.
            </Typography>
          </div>
        ) : null}
      </Card.Body>
    </Card>
  );
}
