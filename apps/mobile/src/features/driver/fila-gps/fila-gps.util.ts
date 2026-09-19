import type { IngestPositionInput } from "@rotta/api-client";

/**
 * `GPS-04`/`GPS-05` — lógica pura da fila offline de posições.
 *
 * Separada da entrada/saída de propósito: o que decide o comportamento
 * da fila (o que entra, o que é descartado, o que é ilegível) é testável
 * sem sistema de arquivos, sem rede e sem simulador.
 *
 * Por que a fila existe (auditoria de 18/09/2026): o app enviava cada
 * posição uma vez e descartava a falha. Túnel, viaduto ou zona rural sem
 * sinal apagavam aquele trecho do histórico para sempre — e o histórico
 * é o que prova para a família onde o veículo esteve. O endpoint de
 * reenvio em lote (`ingestPositionsBatch`) já existia no servidor havia
 * meses, sem um único chamador.
 */

/** Uma posição esperando para ser enviada. */
export interface PosicaoEnfileirada extends IngestPositionInput {
  /** A qual viagem pertence — a fila pode conter mais de uma. */
  tripId: string;
}

/**
 * Formato de linha única (JSONL): cada posição é uma linha.
 *
 * Escolhido em vez de um array JSON porque enfileirar vira um APPEND —
 * não exige ler, parsear e reescrever o arquivo inteiro a cada 15
 * segundos. E porque um arquivo cortado ao meio (bateria acabou durante
 * a escrita) perde uma linha, não o arquivo todo.
 */
export function serializar(posicao: PosicaoEnfileirada): string {
  return `${JSON.stringify(posicao)}\n`;
}

/**
 * Lê as linhas, descartando as ilegíveis em silêncio.
 *
 * Descartar é deliberado: uma linha truncada por desligamento abrupto
 * não pode travar a fila inteira para sempre. Perder uma posição é
 * aceitável; ficar sem enviar nenhuma não é.
 */
export function parsear(conteudo: string): PosicaoEnfileirada[] {
  const posicoes: PosicaoEnfileirada[] = [];

  for (const linha of conteudo.split("\n")) {
    const texto = linha.trim();
    if (!texto) {
      continue;
    }
    try {
      const item = JSON.parse(texto) as PosicaoEnfileirada;
      if (ehPosicaoValida(item)) {
        posicoes.push(item);
      }
    } catch {
      // Linha ilegível — ver nota acima.
    }
  }

  return posicoes;
}

/**
 * Valida o mínimo para o envio fazer sentido. Uma posição sem `tripId`
 * ou sem coordenada não tem para onde ir, e mandá-la só geraria 400
 * repetido até a fila ser limpa.
 */
function ehPosicaoValida(item: unknown): item is PosicaoEnfileirada {
  if (typeof item !== "object" || item === null) {
    return false;
  }
  const p = item as Record<string, unknown>;
  return (
    typeof p.tripId === "string" &&
    p.tripId.length > 0 &&
    typeof p.latitude === "number" &&
    Number.isFinite(p.latitude) &&
    typeof p.longitude === "number" &&
    Number.isFinite(p.longitude) &&
    typeof p.capturadaEm === "string" &&
    p.capturadaEm.length > 0
  );
}

/**
 * Agrupa por viagem, preservando a ordem de captura dentro de cada uma.
 *
 * Necessário porque `ingestPositionsBatch` é por viagem, e a fila pode
 * ter acumulado posições de duas viagens (o motorista terminou uma rota
 * e começou outra ainda sem sinal).
 */
export function agruparPorViagem(
  posicoes: PosicaoEnfileirada[],
): Map<string, PosicaoEnfileirada[]> {
  const grupos = new Map<string, PosicaoEnfileirada[]>();

  for (const posicao of posicoes) {
    const atual = grupos.get(posicao.tripId);
    if (atual) {
      atual.push(posicao);
    } else {
      grupos.set(posicao.tripId, [posicao]);
    }
  }

  return grupos;
}

/**
 * Remove as `quantidade` primeiras linhas do conteúdo.
 *
 * Usado depois de um envio bem-sucedido. Trabalha sobre o conteúdo LIDO
 * DE NOVO, não sobre o que foi lido antes do envio: a task de segundo
 * plano pode ter enfileirado posições novas enquanto o envio acontecia,
 * e elas estão no FIM do arquivo. Descartar o prefixo preserva essas —
 * reescrever com uma sobra calculada antes do envio as perderia.
 */
export function descartarPrimeirasLinhas(conteudo: string, quantidade: number): string {
  if (quantidade <= 0) {
    return conteudo;
  }

  const linhas = conteudo.split("\n").filter((l) => l.trim() !== "");
  return linhas.length <= quantidade ? "" : `${linhas.slice(quantidade).join("\n")}\n`;
}

/**
 * Mantém só as `maximo` linhas mais recentes.
 *
 * Um aparelho dias sem sinal não pode encher o armazenamento do
 * motorista. Quando é preciso cortar, o que sai é o MAIS ANTIGO: numa
 * ausência longa, o trecho recente é o que ainda tem chance de importar
 * para alguém perguntando "onde o ônibus está agora".
 */
export function manterUltimas(conteudo: string, maximo: number): string {
  const linhas = conteudo.split("\n").filter((l) => l.trim() !== "");
  if (linhas.length <= maximo) {
    return linhas.length === 0 ? "" : `${linhas.join("\n")}\n`;
  }
  return `${linhas.slice(linhas.length - maximo).join("\n")}\n`;
}
