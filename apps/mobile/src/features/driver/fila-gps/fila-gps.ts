import * as FileSystem from "expo-file-system";

import {
  agruparPorViagem,
  descartarPrimeirasLinhas,
  manterUltimas,
  parsear,
  serializar,
} from "./fila-gps.util";

import type { PosicaoEnfileirada } from "./fila-gps.util";

import { tripsApi } from "@/lib/api-client";

/**
 * `GPS-04`/`GPS-05` — fila offline de posições de GPS.
 *
 * A inversão que isto representa cabe numa linha: antes era "envia, e se
 * falhar perdeu"; agora é "enfileira sempre, e um drenador esvazia".
 *
 * Usa `expo-file-system`, que o app JÁ tinha, em vez de `expo-sqlite`.
 * SQLite seria mais elegante para uma fila, mas é módulo NATIVO novo:
 * traria risco de build para resolver um problema que um arquivo
 * append-only resolve bem nesta escala (no máximo alguns milhares de
 * linhas). Trocar risco de build por elegância, num app que acabou de
 * sair de uma indisponibilidade, seria mau negócio.
 */

const ARQUIVO_DA_FILA = `${FileSystem.documentDirectory}rotta-fila-gps.jsonl`;

/**
 * Teto de posições guardadas.
 *
 * A 4 posições/minuto, 5.000 linhas são mais de 20 horas de viagem
 * acumulada — muito além de qualquer ausência de sinal plausível. Existe
 * para que um aparelho com defeito não encha o armazenamento do
 * motorista, não como limite operacional.
 */
export const MAXIMO_DE_POSICOES = 5_000;

/** Quantas posições cada requisição de drenagem leva. */
export const TAMANHO_DO_LOTE = 200;

async function lerArquivo(): Promise<string> {
  try {
    const info = await FileSystem.getInfoAsync(ARQUIVO_DA_FILA);
    if (!info.exists) {
      return "";
    }
    return await FileSystem.readAsStringAsync(ARQUIVO_DA_FILA);
  } catch {
    // Arquivo ilegível (corrompido, permissão) nunca pode derrubar a
    // task de GPS — tratar como fila vazia degrada para o comportamento
    // antigo, que é ruim mas não quebra nada.
    return "";
  }
}

async function escreverArquivo(conteudo: string): Promise<void> {
  await FileSystem.writeAsStringAsync(ARQUIVO_DA_FILA, conteudo);
}

/**
 * Guarda uma posição para envio posterior. Nunca lança: a captura de GPS
 * não pode falhar por causa da fila.
 */
export async function enfileirar(posicao: PosicaoEnfileirada): Promise<void> {
  try {
    const conteudo = await lerArquivo();
    const novo = conteudo + serializar(posicao);
    await escreverArquivo(manterUltimas(novo, MAXIMO_DE_POSICOES));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[fila-gps] Não consegui enfileirar a posição.", error);
  }
}

export interface ResultadoDaDrenagem {
  enviadas: number;
  restantes: number;
}

/**
 * Tenta enviar o que está na fila.
 *
 * Só apaga o que o servidor CONFIRMOU ter recebido. Se a rede cair no
 * meio, as posições continuam na fila para a próxima tentativa — que é
 * o ponto inteiro de existir uma fila.
 *
 * A reescrita do arquivo relê o conteúdo e descarta só o PREFIXO
 * enviado, nunca reescreve com uma sobra calculada antes do envio: a
 * task de segundo plano pode ter enfileirado posições novas durante a
 * requisição, e elas estão no fim do arquivo.
 */
export async function drenar(): Promise<ResultadoDaDrenagem> {
  const conteudo = await lerArquivo();
  const posicoes = parsear(conteudo);

  if (posicoes.length === 0) {
    return { enviadas: 0, restantes: 0 };
  }

  const lote = posicoes.slice(0, TAMANHO_DO_LOTE);
  const grupos = agruparPorViagem(lote);

  let enviadas = 0;
  for (const [tripId, doGrupo] of grupos) {
    try {
      await tripsApi.ingestPositionsBatch(
        tripId,
        doGrupo.map(({ tripId: _ignorado, ...posicao }) => posicao),
      );
      enviadas += doGrupo.length;
    } catch {
      // Sem rede, ou viagem já encerrada no servidor. Para a drenagem
      // aqui: insistir nos próximos grupos com a rede fora só gastaria
      // bateria. A próxima chamada tenta de novo.
      break;
    }
  }

  if (enviadas > 0) {
    const atual = await lerArquivo();
    await escreverArquivo(descartarPrimeirasLinhas(atual, enviadas));
  }

  return { enviadas, restantes: Math.max(0, posicoes.length - enviadas) };
}

/** Só para diagnóstico e testes. */
export async function tamanhoDaFila(): Promise<number> {
  return parsear(await lerArquivo()).length;
}
