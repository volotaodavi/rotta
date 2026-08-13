/**
 * Rótulo/cor de cada `TripStatus` — extraído de `minha-rota/page.tsx`
 * (Frente G) para ser reaproveitado por `atividades/page.tsx` (Frente
 * K): a mesma viagem que aparece em "Minha Rota" durante o dia precisa
 * ser reconhecível com o mesmo badge quando cai no histórico.
 */
export const TRIP_STATUS_BADGE: Record<
  string,
  { label: string; variant: "success" | "warning" | "neutral" }
> = {
  EM_ANDAMENTO: { label: "Em viagem", variant: "success" },
  PAUSADA: { label: "Pausada", variant: "warning" },
  FINALIZADA: { label: "Finalizada", variant: "neutral" },
  CANCELADA: { label: "Cancelada", variant: "neutral" },
};
