import { Alert } from "react-native";

import { pendenciasDeEncerramento, textoDoAviso } from "./pendencias-de-encerramento";

import type { AlunoDaViagem } from "./pendencias-de-encerramento";
import type { TripStudentEvent } from "@rotta/api-client";

/**
 * `EMB-01` — o gesto de encerrar, com a verificação do checklist no
 * meio do caminho. Ver `pendencias-de-encerramento.ts` para o porquê
 * de avisar em vez de bloquear.
 */
export function confirmarEncerramento({
  alunos,
  eventos,
  onEncerrar,
}: {
  alunos: AlunoDaViagem[];
  eventos: TripStudentEvent[];
  onEncerrar: () => void;
}): void {
  const aviso = textoDoAviso(pendenciasDeEncerramento(alunos, eventos));

  if (!aviso) {
    onEncerrar();
    return;
  }

  Alert.alert("Faltam registros nesta viagem", aviso, [
    // "Revisar" primeiro e sem `destructive`: a saída que o aviso quer
    // que a pessoa tome é voltar e completar o checklist.
    { text: "Revisar alunos", style: "cancel" },
    { text: "Encerrar mesmo assim", style: "destructive", onPress: onEncerrar },
  ]);
}
