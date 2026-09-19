import { useAuth } from "@rotta/auth/native";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { Alert } from "react-native";

import { getActiveTripId } from "./background-trip-location-task";

import type { Trip } from "@rotta/api-client";

/**
 * `RN-AUTH-05` — sair da conta com viagem em andamento precisa de
 * confirmação.
 *
 * Achado da auditoria de 18/09/2026: "Sair" encerrava a sessão
 * imediatamente, em qualquer situação. Um toque errado no meio de uma
 * rota derrubava o rastreamento de GPS de um veículo com crianças
 * dentro, e nem o motorista nem as famílias ficavam sabendo — do lado
 * do responsável, o ponto no mapa simplesmente parava de se mexer.
 *
 * Avisa e confirma, NÃO bloqueia. Um motorista pode ter um motivo
 * legítimo para trocar de conta no meio do dia (aparelho emprestado,
 * escala trocada na hora), e um app que se recusa a sair vira um app
 * que a pessoa desinstala.
 */

/** Status de viagem em que o veículo está efetivamente em operação. */
const STATUS_EM_OPERACAO: Trip["status"][] = ["EM_ANDAMENTO", "PAUSADA"];

function emOperacao(dado: unknown): boolean {
  if (typeof dado !== "object" || dado === null) {
    return false;
  }
  const status = (dado as { status?: unknown }).status;
  return typeof status === "string" && STATUS_EM_OPERACAO.includes(status as Trip["status"]);
}

/**
 * Duas fontes, porque nenhuma sozinha cobre todos os casos:
 *
 *  - `getActiveTripId()` é o rastreamento de GPS realmente ligado, mas
 *    fica `null` se a pessoa negou a permissão de localização;
 *  - o cache do React Query tem a viagem de hoje, mas só se a tela da
 *    rota chegou a ser aberta nesta sessão.
 *
 * Qualquer uma das duas dizendo "tem viagem" já basta para perguntar.
 * Perguntar à toa custa um toque; deixar passar custa o rastreamento de
 * uma viagem inteira.
 */
function useHaViagemEmAndamento(): () => boolean {
  const queryClient = useQueryClient();

  return useCallback(() => {
    if (getActiveTripId()) {
      return true;
    }

    // A chave `["driver", "routes", ...]` também guarda listas de rotas,
    // não só viagens — daí a checagem de forma em vez de um cast.
    return queryClient
      .getQueriesData({ queryKey: ["driver", "routes"] })
      .some(([, dado]) => emOperacao(dado));
  }, [queryClient]);
}

/**
 * Devolve o que o botão "Sair" deve chamar: sai direto quando não há
 * viagem, pergunta antes quando há.
 */
export function useSairDaConta(): () => void {
  const { logout } = useAuth();
  const haViagemEmAndamento = useHaViagemEmAndamento();

  return useCallback(() => {
    if (!haViagemEmAndamento()) {
      void logout();
      return;
    }

    Alert.alert(
      "Você tem uma viagem em andamento",
      "Sair agora interrompe o envio da sua localização, e as famílias deixam de acompanhar o veículo em tempo real. A viagem NÃO é finalizada — ela continua aberta até alguém encerrar.",
      [
        { text: "Continuar na viagem", style: "cancel" },
        { text: "Sair mesmo assim", style: "destructive", onPress: () => void logout() },
      ],
    );
  }, [haViagemEmAndamento, logout]);
}
