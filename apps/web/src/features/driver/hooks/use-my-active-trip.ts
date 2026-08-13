"use client";

import { useMinhasRotas } from "./use-driver-routes";
import { useTodayTrip } from "./use-driver-trip";

export interface MyActiveTrip {
  routeId: string;
  routeNome: string;
  status: "EM_ANDAMENTO" | "PAUSADA";
}

/**
 * "Estou no meio de uma viagem agora?" — Frente G, "inove": alimenta o
 * banner "Em viagem" do `(dashboard)/layout.tsx`, pra um autônomo/MEI
 * que navegou pra "Visão completa" (Empresa, Financeiro...) no meio de
 * uma corrida não perder de vista que ela continua rolando.
 *
 * Só verifica a PRIMEIRA rota do usuário — simplificação deliberada:
 * autônomo/MEI (público deste hook, ver `useAppMode`) normalmente
 * dirige uma rota só, quase nunca várias ao mesmo tempo. Quem tem mais
 * de uma rota ainda vê o status certo dela em "Minha Rota"; só o
 * banner de atalho é que fica restrito à primeira.
 *
 * `enabled` propaga pros dois hooks internos — zero custo de rede pra
 * quem não é elegível ao alternador (a esmagadora maioria dos
 * usuários), mesmo padrão de `enabled: Boolean(routeId)` já usado em
 * todo o resto deste arquivo.
 */
export function useMyActiveTrip(enabled: boolean): MyActiveTrip | null {
  const { data: rotasResult } = useMinhasRotas(enabled);
  const primeiraRota = rotasResult?.items[0];
  const routeId = enabled ? primeiraRota?.id : undefined;

  const { data: trip } = useTodayTrip(routeId);

  if (!trip || !primeiraRota) return null;
  if (trip.status !== "EM_ANDAMENTO" && trip.status !== "PAUSADA") return null;

  return { routeId: primeiraRota.id, routeNome: primeiraRota.nome, status: trip.status };
}
