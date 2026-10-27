"use client";

import { Spinner, Typography } from "@rotta/ui/web";

import { RottaMapLazy as RottaMap } from "@/components/rotta-map-lazy";
import { type MyLocation, type MyLocationStatus } from "@/hooks/use-my-location";

/**
 * Mapa "onde eu estou" — respaldo baseado só na posição do telefone
 * (`useMyLocation`), usado sempre que não há paradas de rota pra
 * mostrar em vez disso. Nunca esconde a tela por trás de um estado de
 * carregamento indefinido: pedir/negar permissão e "sem suporte" têm
 * cada um sua própria mensagem, nunca um mapa em branco silencioso.
 */
export function MeuMapa({
  location,
  status,
  fill = false,
  mapKey = 0,
}: {
  location: MyLocation | null;
  status: MyLocationStatus;
  /** `true` dentro do cartão de mapa — sem cantos arredondados/altura fixa próprios, ocupa 100% do pai (que já define a altura). */
  fill?: boolean;
  /** Troca pra remontar o mapa (Frente Q — botão "centralizar no meu GPS", `RottaMap` só lê `initialCenter` na montagem). */
  mapKey?: number;
}): JSX.Element {
  if (!location) {
    return (
      <div
        className={
          fill
            ? "flex h-full flex-col items-center justify-center gap-2 bg-card p-4 text-center"
            : "flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card p-4 text-center"
        }
      >
        {status === "requesting" || status === "idle" ? (
          <>
            <Spinner size="md" />
            <Typography variant="caption" color="muted">
              Buscando sua localização…
            </Typography>
          </>
        ) : status === "denied" ? (
          <Typography variant="caption" color="muted" className="max-w-xs">
            Localização negada pelo navegador. Permita o acesso (ícone de cadeado na barra de
            endereço) para ver o mapa.
          </Typography>
        ) : (
          <Typography variant="caption" color="muted">
            Mapa indisponível neste navegador.
          </Typography>
        )}
      </div>
    );
  }

  return (
    <div
      style={fill ? undefined : { height: 280 }}
      className={fill ? "h-full w-full" : "overflow-hidden rounded-lg"}
    >
      <RottaMap
        key={mapKey}
        markers={[
          {
            id: "minha-localizacao",
            titulo: "Você está aqui",
            latitude: location.latitude,
            longitude: location.longitude,
            // Mesmo ícone de veículo do mapa em operação (auditoria
            // 27/08/2026) — este mapa também é visto por
            // motorista/monitor/autônomo/MEI, nunca por Responsável, então
            // "Você está aqui" É o veículo, não um pino genérico.
            emMovimento: true,
          },
        ]}
        initialCenter={location}
        initialZoom={14}
      />
    </div>
  );
}
