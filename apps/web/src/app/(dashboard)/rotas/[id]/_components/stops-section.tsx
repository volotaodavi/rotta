"use client";

import { ApiError } from "@rotta/api-client";
import { Check, GraduationCap, MapPin, Trash2 } from "@rotta/icons";
import { Badge, Button, Card, FormField, Input, Spinner, Typography } from "@rotta/ui/web";
import { useState } from "react";

import { getStopDirection, STOP_DIRECTION_LABEL, type StopDirection } from "./stop-direction";

import type { GeocodeResult, RouteStop, RouteStudent, School } from "@rotta/api-client";

import { useAddRouteStop, useRemoveRouteStop } from "@/features/routes/hooks/use-routes";
import { useSuggestSchools } from "@/features/schools/hooks/use-schools";
import { useMyLocation } from "@/hooks/use-my-location";
import { geoApi } from "@/lib/api-client";



/** Cor do selo Ida/Volta — mesma paleta neutra usada nos demais `Badge` informativos desta tela (nunca semântica de sucesso/erro, é só rótulo). */
const STOP_DIRECTION_BADGE_VARIANT: Record<StopDirection, "neutral" | "info"> = {
  IDA: "info",
  VOLTA: "neutral",
  IDA_E_VOLTA: "info",
};

function formatarDistanciaKm(distanciaKm: number): string {
  return distanciaKm < 1 ? `${Math.round(distanciaKm * 1000)} m` : `${distanciaKm.toFixed(1)} km`;
}

/**
 * Duas formas de adicionar uma parada (mesmo princípio já aplicado em
 * `alunos/novo` — "quando for criar uma rota, deverá ser mediante a
 * escola que foi importada, não deverá colocar o endereço de fato") —
 * "Escola" é o modo padrão (busca tolerante a erro de digitação +
 * sugestão por proximidade, mesmo `useSuggestSchools` do cadastro de
 * aluno); "Outro endereço" continua disponível pra paradas que não são
 * numa escola (ex. a casa do aluno, um ponto de encontro do grupo).
 *
 * Parte 2 do assistente "Criar rota" (Frente 4 do plano aprovado).
 */
export function StopsSection({
  routeId,
  stops,
  routeStudents,
  isLoading,
}: {
  routeId: string;
  stops: RouteStop[] | undefined;
  /** Pedido do usuário: "paradas IDA e paradas volta" — selo por parada, derivado (ver `getStopDirection`). `undefined` enquanto ainda carrega: sem selo nenhum, nunca um "Ida"/"Volta" adivinhado. */
  routeStudents: RouteStudent[] | undefined;
  isLoading: boolean;
}): JSX.Element {
  const addStop = useAddRouteStop(routeId);
  const removeStop = useRemoveRouteStop(routeId);
  const [modo, setModo] = useState<"escola" | "endereco">("escola");
  const [horario, setHorario] = useState("07:00");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [schoolSearch, setSchoolSearch] = useState("");
  const minhaLocalizacao = useMyLocation(schoolSearch.trim().length >= 2);
  const { data: schoolResults } = useSuggestSchools({
    q: schoolSearch,
    latitude: minhaLocalizacao.location?.latitude,
    longitude: minhaLocalizacao.location?.longitude,
  });

  const [endereco, setEndereco] = useState("");
  const [geocoded, setGeocoded] = useState<GeocodeResult | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  async function handleBuscarEndereco(): Promise<void> {
    setGeocoded(null);
    setErrorMessage(null);
    if (!endereco.trim()) return;
    setIsGeocoding(true);
    try {
      const result = await geoApi.geocodeAddress(endereco);
      setGeocoded(result);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Não foi possível localizar este endereço agora. Tente ser mais específico.",
      );
    } finally {
      setIsGeocoding(false);
    }
  }

  async function handleAdicionarEscola(school: School): Promise<void> {
    setErrorMessage(null);
    try {
      await addStop.mutateAsync({
        ordem: stops?.length ?? 0,
        schoolId: school.id,
        horarioPrevisto: horario,
      });
      setSchoolSearch("");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Não foi possível adicionar a parada agora.",
      );
    }
  }

  async function handleAdicionarEndereco(): Promise<void> {
    if (!geocoded) return;
    setErrorMessage(null);
    try {
      await addStop.mutateAsync({
        ordem: stops?.length ?? 0,
        endereco: geocoded.enderecoFormatado,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        horarioPrevisto: horario,
      });
      setEndereco("");
      setGeocoded(null);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Não foi possível adicionar a parada agora.",
      );
    }
  }

  return (
    <Card>
      <Card.Header title="Paradas" />
      <Card.Body className="flex flex-col gap-4">
        {isLoading ? (
          <Spinner size="sm" />
        ) : !stops || stops.length === 0 ? (
          <Typography variant="bodySmall" color="muted">
            Nenhuma parada ainda: adicione ao menos uma antes de vincular alunos.
          </Typography>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {stops.map((stop) => {
              const direction = getStopDirection(stop, routeStudents);
              return (
                <div key={stop.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="flex items-center gap-2">
                    {stop.schoolId ? (
                      <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <Typography variant="bodySmall">{stop.endereco}</Typography>
                        {direction ? (
                          <Badge variant={STOP_DIRECTION_BADGE_VARIANT[direction]}>
                            {STOP_DIRECTION_LABEL[direction]}
                          </Badge>
                        ) : null}
                      </div>
                      <Typography variant="caption" color="muted">
                        {stop.horarioPrevisto}
                      </Typography>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<Trash2 className="h-4 w-4" />}
                    isLoading={removeStop.isPending && removeStop.variables === stop.id}
                    onClick={() => removeStop.mutate(stop.id)}
                  >
                    Remover
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-border p-3">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={modo === "escola" ? "secondary" : "ghost"}
              onClick={() => setModo("escola")}
            >
              Escola
            </Button>
            <Button
              type="button"
              size="sm"
              variant={modo === "endereco" ? "secondary" : "ghost"}
              onClick={() => setModo("endereco")}
            >
              Outro endereço
            </Button>
          </div>

          {modo === "escola" ? (
            <FormField
              label="Escola"
              helperText="Busca pelo nome, no catálogo já importado: a Rotta Geo AI já sabe a localização."
            >
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Nome da escola"
                  value={schoolSearch}
                  onChange={(event) => setSchoolSearch(event.target.value)}
                />
                {schoolSearch && schoolResults && schoolResults.items.length > 0 && (
                  <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-1">
                    {schoolResults.items.map((school) => (
                      <button
                        key={school.id}
                        type="button"
                        className="group flex items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-surface"
                        onClick={() => void handleAdicionarEscola(school)}
                      >
                        <span>
                          {school.nomeOficial}, {school.cidade}/{school.estado}
                          {school.distanciaKm !== null && school.distanciaKm !== undefined && (
                            <span className="text-text-muted">
                              {" "}
                              · {formatarDistanciaKm(school.distanciaKm)}
                            </span>
                          )}
                        </span>
                        <Check className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                )}
                {schoolSearch &&
                schoolSearch.trim().length >= 2 &&
                schoolResults &&
                schoolResults.items.length === 0 ? (
                  <Typography variant="caption" color="muted">
                    Nenhuma escola encontrada com esse nome no catálogo ainda.
                  </Typography>
                ) : null}
              </div>
            </FormField>
          ) : (
            <FormField
              label="Endereço da parada"
              helperText="A Rotta Geo AI localiza a latitude/longitude sozinha, nunca digitada manualmente."
            >
              <Input
                placeholder="ex: Rua das Flores, 123, Bela Vista, São Paulo, SP"
                value={endereco}
                onChange={(event) => {
                  setEndereco(event.target.value);
                  setGeocoded(null);
                }}
                onBlur={() => void handleBuscarEndereco()}
              />
            </FormField>
          )}

          {modo === "endereco" && isGeocoding ? (
            <div className="flex items-center gap-2 text-text-muted">
              <Spinner size="sm" />
              <Typography variant="caption">Localizando endereço...</Typography>
            </div>
          ) : modo === "endereco" && geocoded ? (
            <div className="flex items-center gap-2 text-success">
              <Check className="h-4 w-4" />
              <Typography variant="caption">{geocoded.enderecoFormatado}</Typography>
            </div>
          ) : null}

          <FormField label="Horário previsto">
            <Input
              type="time"
              value={horario}
              onChange={(event) => setHorario(event.target.value)}
            />
          </FormField>
          {errorMessage ? (
            <Typography variant="caption" color="danger">
              {errorMessage}
            </Typography>
          ) : null}
          {modo === "endereco" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={!geocoded}
              isLoading={addStop.isPending}
              onClick={() => void handleAdicionarEndereco()}
            >
              Adicionar parada
            </Button>
          ) : null}
        </div>
      </Card.Body>
    </Card>
  );
}
