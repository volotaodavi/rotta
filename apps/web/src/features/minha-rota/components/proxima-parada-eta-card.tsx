"use client";

import { Clock, Navigation } from "@rotta/icons";
import { buildNavigationUrl, detectNavigationApp } from "@rotta/maps/navigation";
import { Button, Card, Typography } from "@rotta/ui/web";

import type { RoleAccent } from "@/features/minha-rota/labels";
import type { NextEta, RouteStop } from "@rotta/api-client";

/**
 * Cartão "próxima parada" (Frente K) — mesma ideia do cartão de ETA da
 * imagem de referência ("Track Rider": rota + tempo estimado sempre à
 * vista durante o trajeto), só que aqui é o motorista/monitor vendo o
 * PRÓPRIO progresso, não um responsável acompanhando de fora. Dado real
 * (`NextEta`, tarefa #99) — nunca uma estimativa inventada no front.
 *
 * "Navegar" (Frente S2, pedido do usuário: "acha melhor integrar o
 * Google Maps para navegação e GPS, enquanto o openstreet fica para os
 * responsáveis") — abre o app de navegação NATIVO do aparelho
 * (Apple/Google Maps, `@rotta/maps/navigation`) com a coordenada real da
 * próxima parada (`parada`, a mesma que já alimenta o marcador no
 * `RottaMap` acima). Sem custo, sem chave de API: só um deep-link. Só
 * aparece quando `parada` existe (`RouteStop` com lat/lng carregado) —
 * sem coordenada, sem botão, nunca um link quebrado.
 */
export function ProximaParadaEtaCard({
  eta,
  parada,
  accent,
}: {
  eta: NextEta;
  parada?: RouteStop;
  accent: RoleAccent;
}): JSX.Element {
  const horarioPrevisto = new Date(eta.etaPrevista).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const distancia =
    eta.distanciaMetros >= 1000
      ? `${(eta.distanciaMetros / 1000).toFixed(1)} km`
      : `${Math.round(eta.distanciaMetros)} m`;

  function handleNavegar(): void {
    if (!parada) return;
    const app = detectNavigationApp(navigator.userAgent);
    const url = buildNavigationUrl({ latitude: parada.latitude, longitude: parada.longitude }, app);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Card>
      <Card.Body className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${accent.muted} ${accent.text}`}
        >
          <Navigation size={20} />
        </div>
        <div className="flex-1">
          <Typography variant="caption" color="muted">
            Próxima parada
          </Typography>
          <Typography variant="bodySmall" className="font-semibold">
            {eta.endereco}
          </Typography>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className={`flex items-center gap-1 ${accent.text}`}>
            <Clock size={14} />
            <Typography variant="bodySmall" className={`font-semibold ${accent.text}`}>
              {horarioPrevisto}
            </Typography>
          </div>
          <Typography variant="caption" color="muted">
            {distancia}
          </Typography>
        </div>
        {parada ? (
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Navigation size={16} />}
            onClick={handleNavegar}
          >
            Navegar
          </Button>
        ) : null}
      </Card.Body>
    </Card>
  );
}
