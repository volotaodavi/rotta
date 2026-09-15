"use client";

import { ArrowLeftRight, Home, School } from "@rotta/icons";
import { Typography } from "@rotta/ui/web";

import type { TripSentido } from "@rotta/api-client";

export const TRIP_SENTIDO_LABEL: Record<TripSentido, string> = {
  IDA: "Ida",
  VOLTA: "Volta",
};

/** Para onde o veículo está indo, em uma linha — o que a "placa" quer dizer na prática. */
export const TRIP_SENTIDO_DESCRICAO: Record<TripSentido, string> = {
  IDA: "Casa → escola",
  VOLTA: "Escola → casa",
};

/**
 * Alternador de sentido no formato pedido pelo usuário (15/09/2026):
 * "igual placa de ônibus mesmo: (Sentido) Ida 🔄 Volta". Mirror exato
 * de `apps/mobile/src/features/routes/components/sentido-switch.tsx` —
 * mesmos rótulos, mesma descrição, mesma seta que inverte.
 *
 * O sentido é da VIAGEM, nunca da rota (ver `enum TripSentido` no
 * `schema.prisma`): a mesma rota roda nos dois sentidos no mesmo dia,
 * com um único vínculo aluno↔parada.
 */
export function SentidoSwitch({
  value,
  onChange,
  disabled,
}: {
  value: TripSentido;
  onChange: (sentido: TripSentido) => void;
  disabled?: boolean;
}): JSX.Element {
  function renderLado(sentido: TripSentido, Icone: typeof Home): JSX.Element {
    const ativo = value === sentido;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={ativo}
        aria-label={`${TRIP_SENTIDO_LABEL[sentido]} — ${TRIP_SENTIDO_DESCRICAO[sentido]}`}
        disabled={disabled}
        onClick={() => onChange(sentido)}
        className={`flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-2 text-sm font-bold transition-colors disabled:opacity-60 ${
          ativo
            ? "border-primary bg-primary text-background"
            : "border-border bg-surface text-muted-foreground hover:border-borderStrong"
        }`}
      >
        <Icone className="h-4 w-4" />
        {TRIP_SENTIDO_LABEL[sentido]}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Typography variant="caption" color="muted" className="uppercase">
        Sentido
      </Typography>
      <div className="flex items-center gap-2" role="radiogroup">
        {renderLado("IDA", School)}
        {/* A seta também alterna — é o gesto natural depois de ler a placa. */}
        <button
          type="button"
          aria-label="Inverter o sentido"
          disabled={disabled}
          onClick={() => onChange(value === "IDA" ? "VOLTA" : "IDA")}
          className="p-1 text-primary disabled:opacity-60"
        >
          <ArrowLeftRight className="h-[18px] w-[18px]" />
        </button>
        {renderLado("VOLTA", Home)}
      </div>
      <Typography variant="caption" color="muted">
        {TRIP_SENTIDO_DESCRICAO[value]}
      </Typography>
    </div>
  );
}
