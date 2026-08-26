"use client";

import { Clock, MapPin, Search } from "@rotta/icons";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/web";
import { Badge, Card, Spinner, Typography } from "@rotta/ui/web";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useGpsMapNationwide } from "@/features/gps/hooks/use-gps";
import { useNextStopTracedRoute } from "@/features/gps/hooks/use-next-stop-traced-route";
import { searchMonitoringCandidates } from "@/features/gps/monitoring-search.util";
import { tripsApi } from "@/lib/api-client";

/**
 * Central de Monitoramento (pedido do usuário: "poderá ter uma central
 * de monitoramento na central do admin, para monitorar cada
 * transporte... clicando no campo de pesquisa onde poderemos pesquisar
 * a transportadora e localidade... aparecendo sugestões e nomes
 * idênticos/parecidos/exatos, onde o admin vai clicar e aparecerá o
 * mapa e a localização do transportador em tempo real"). Diferente do
 * "Mapa Nacional de Veículos" (`/veiculos/mapa`, todos os transportes
 * ao mesmo tempo no mesmo mapa) — aqui o admin busca UM transporte
 * específico e monitora só ele, em um mapa dedicado.
 *
 * Reaproveita `useGpsMapNationwide` (mesmo hook do Mapa Nacional,
 * `refetchInterval` de 3s) — a busca é só um filtro/reordenação
 * client-side (`searchMonitoringCandidates`) sobre a mesma lista já
 * buscada, nunca uma chamada nova à API. Isso também é o que garante
 * o "tempo real": o marcador selecionado continua atualizando a cada
 * poll, exatamente como os outros mapas de GPS do produto.
 */
export default function MonitoramentoPage(): JSX.Element {
  const router = useRouter();
  const { data, isLoading } = useGpsMapNationwide();
  const [query, setQuery] = useState("");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const suggestions = useMemo(
    () => (selectedTripId ? [] : searchMonitoringCandidates(query, data ?? [])),
    [query, data, selectedTripId],
  );

  const selected = selectedTripId
    ? (data ?? []).find((v) => v.tripId === selectedTripId)
    : undefined;
  // A viagem monitorada pode encerrar a qualquer momento (poll seguinte
  // já não a lista mais) — distingue "nunca achado" (não deveria
  // acontecer, veio de um clique na própria lista) de "encerrou agora".
  const monitoringEnded = Boolean(selectedTripId) && !isLoading && !selected;

  const markers: RottaMapMarker[] =
    selected?.latitude != null && selected.longitude != null
      ? [
          {
            id: selected.tripId,
            titulo: `${selected.placa} — ${selected.routeNome}`,
            latitude: selected.latitude,
            longitude: selected.longitude,
            emMovimento: true,
          },
        ]
      : [];

  // "Vez do aluno" + linha azul traçada (pedido do usuário: "essa
  // questão também no painel do admin, já que poderemos monitorar") —
  // mesmo dado que já alimenta o cartão de ETA do Motorista/Responsável
  // (`GET /trips/:id/proximas-etas`, primeira entrada = quem é a vez
  // agora), só que aqui o Admin Rotta enxerga de qualquer transportadora
  // que esteja monitorando, não só a própria.
  const { data: proximasEtas } = useQuery({
    queryKey: ["trips", selected?.tripId, "proximas-etas"],
    queryFn: () => tripsApi.getProximasEtas(selected!.tripId),
    enabled: Boolean(selected?.tripId),
    refetchInterval: 30_000,
  });
  const proximaEta = proximasEtas?.[0];
  const origemVeiculo =
    selected?.latitude != null && selected.longitude != null
      ? { latitude: selected.latitude, longitude: selected.longitude }
      : null;
  const destinoAlvo = proximaEta
    ? { latitude: proximaEta.latitude, longitude: proximaEta.longitude }
    : null;
  const tracedRoute = useNextStopTracedRoute(origemVeiculo, destinoAlvo);

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Central de monitoramento</Typography>
      <Typography variant="bodySmall" color="muted">
        Pesquise por transportadora, cidade/bairro, motorista, placa ou CNPJ pra acompanhar um
        transporte em tempo real.
      </Typography>

      <Card>
        <Card.Body className="flex flex-col gap-3">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedTripId(null);
              }}
              placeholder="Nome da transportadora, cidade, motorista, placa ou CNPJ"
              className="h-11 w-full rounded-md border border-border bg-surface pl-10 pr-4 text-sm text-text outline-none transition-colors duration-150 placeholder:text-placeholder focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            {suggestions.length > 0 ? (
              <div className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
                {suggestions.map((vehicle) => {
                  const localidade = [vehicle.companyBairro, vehicle.companyCidade]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <button
                      key={vehicle.tripId}
                      type="button"
                      onClick={() => {
                        setSelectedTripId(vehicle.tripId);
                        setQuery("");
                      }}
                      className="flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-muted"
                    >
                      <span className="text-sm font-semibold text-text">
                        {vehicle.companyNome ?? "Transportadora"}
                      </span>
                      <span className="text-xs text-text-muted">
                        {[localidade, vehicle.placa, vehicle.motoristaNome]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          {query.trim().length >= 2 && suggestions.length === 0 && !isLoading ? (
            <Typography variant="bodySmall" color="muted">
              Nenhum transporte em viagem agora corresponde a essa busca.
            </Typography>
          ) : null}

          {!selectedTripId && !query ? (
            <Typography variant="bodySmall" color="muted">
              {data?.length ?? 0} transporte(s) em viagem agora, no total.
            </Typography>
          ) : null}
        </Card.Body>
      </Card>

      {isLoading && selectedTripId ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : null}

      {selected ? (
        <Card>
          <Card.Body className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Typography variant="bodySmall" color="muted">
                  Monitorando agora
                </Typography>
                <Typography variant="title">{selected.companyNome ?? "Transportadora"}</Typography>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTripId(null)}
                className="shrink-0 text-sm text-primary hover:underline"
              >
                Trocar transporte
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="info">{selected.placa}</Badge>
              <Badge variant="neutral">{selected.motoristaNome}</Badge>
              {selected.companyCidade ? (
                <Badge variant="neutral">
                  {[selected.companyBairro, selected.companyCidade].filter(Boolean).join(" · ")}
                </Badge>
              ) : null}
              <Typography variant="bodySmall" color="muted">
                {selected.routeNome} ({selected.turno})
              </Typography>
              {selected.companyId ? (
                <button
                  type="button"
                  className="ml-auto text-sm text-primary hover:underline"
                  onClick={() => router.push(`/empresas/${selected.companyId}`)}
                >
                  Ver empresa
                </button>
              ) : null}
            </div>

            {proximaEta ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted px-4 py-3">
                <MapPin size={16} className="shrink-0 text-primary" />
                <div className="flex-1">
                  <Typography variant="caption" color="muted">
                    Vez do aluno agora · próxima parada
                  </Typography>
                  <Typography variant="bodySmall" className="font-semibold leading-tight">
                    {proximaEta.endereco}
                  </Typography>
                </div>
                <div className="flex items-center gap-1 text-text-muted">
                  <Clock size={14} />
                  <Typography variant="bodySmall" color="muted">
                    {new Date(proximaEta.etaPrevista).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Typography>
                </div>
              </div>
            ) : null}

            {markers.length > 0 ? (
              <div className="relative" style={{ height: 560 }}>
                <RottaMap
                  markers={markers}
                  route={tracedRoute.route ?? undefined}
                  initialZoom={14}
                />
              </div>
            ) : (
              <Typography variant="bodySmall" color="muted">
                Esse transporte ainda não reportou uma posição de GPS.
              </Typography>
            )}
          </Card.Body>
        </Card>
      ) : null}

      {monitoringEnded ? (
        <Card>
          <Card.Body className="flex flex-col items-start gap-3">
            <Typography variant="bodySmall" color="muted">
              Essa viagem foi encerrada (ou pausada) durante o monitoramento.
            </Typography>
            <button
              type="button"
              onClick={() => setSelectedTripId(null)}
              className="text-sm text-primary hover:underline"
            >
              Voltar pra busca
            </button>
          </Card.Body>
        </Card>
      ) : null}
    </div>
  );
}
