/** Até aqui a posição é "agora" para quem olha o mapa. */
const AO_VIVO_MS = 60_000;

/** Daqui em diante o GPS parou: a posição é o último lugar conhecido, não onde o veículo está. */
const PARADO_MS = 5 * 60_000;

export type FrescorDaPosicao = "ao-vivo" | "atrasada" | "parada" | "sem-posicao";

export interface LeituraDaPosicao {
  frescor: FrescorDaPosicao;
  /** Quantos segundos desde a última posição; `null` quando não há posição nenhuma. */
  idadeEmSegundos: number | null;
  /** O que a pessoa lê na tela, pronto. */
  rotulo: string;
}

/**
 * Há quanto tempo a posição do veículo foi capturada, e o que dizer
 * sobre isso.
 *
 * ## Por que isto existe
 *
 * Porque a tela de acompanhamento do Responsável desenhava o veículo
 * no mapa sem nunca dizer QUANDO aquela posição foi registrada, e o
 * dado já vinha da API (`ultimaPosicaoEm`).
 *
 * O celular do motorista perde sinal, entra em economia de bateria ou
 * tem o app encerrado pelo sistema. O GPS para de chegar. A API segue
 * devolvendo a última posição conhecida, a tela segue atualizando de
 * três em três segundos, e a mãe vê a van paradinha numa esquina e
 * conclui que a van está parada naquela esquina. Ela não está: ninguém
 * sabe onde ela está.
 *
 * Mostrar posição velha como se fosse ao vivo é dado fabricado, que é
 * exatamente o que o sistema de design do app proíbe em qualquer
 * contador ou gráfico. No mapa que uma família abre para saber onde
 * está a criança, é a pior versão disso.
 *
 * Os limites são de leitura, não de engenharia: até um minuto é o
 * intervalo normal entre duas posições com tudo funcionando (o app
 * reporta a cada poucos segundos, mas rede engasga); passados cinco
 * minutos sem nada, o GPS não está só atrasado, parou.
 */
export function lerPosicao(
  ultimaPosicaoEm: string | Date | null | undefined,
  agora: Date = new Date(),
): LeituraDaPosicao {
  if (!ultimaPosicaoEm) {
    return { frescor: "sem-posicao", idadeEmSegundos: null, rotulo: "Sem posição ainda" };
  }

  const capturadaEm = new Date(ultimaPosicaoEm);
  if (Number.isNaN(capturadaEm.getTime())) {
    return { frescor: "sem-posicao", idadeEmSegundos: null, rotulo: "Sem posição ainda" };
  }

  /* Relógio do celular adiantado em relação ao servidor daria idade
     negativa, e "há -2 minutos" é pior que não dizer nada. */
  const idadeMs = Math.max(0, agora.getTime() - capturadaEm.getTime());
  const idadeEmSegundos = Math.round(idadeMs / 1000);

  if (idadeMs < AO_VIVO_MS) {
    return { frescor: "ao-vivo", idadeEmSegundos, rotulo: "Ao vivo, agora" };
  }

  const minutos = Math.floor(idadeMs / 60_000);
  if (idadeMs < PARADO_MS) {
    return {
      frescor: "atrasada",
      idadeEmSegundos,
      rotulo: `Última posição há ${minutos} min`,
    };
  }

  return {
    frescor: "parada",
    idadeEmSegundos,
    rotulo:
      minutos < 60
        ? `Sem sinal há ${minutos} min: esta é a última posição conhecida`
        : "Sem sinal há mais de 1 hora: esta é a última posição conhecida",
  };
}
