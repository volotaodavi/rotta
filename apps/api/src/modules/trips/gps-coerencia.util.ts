/**
 * `GPS-06` — detecção de salto geograficamente incoerente.
 *
 * A especificação (`docs/18`, e o comentário do próprio campo
 * `TripPosition.simuladoSuspeito` no `schema.prisma`) diz: "salto
 * geograficamente incoerente com o histórico recente — sinalizado,
 * NUNCA descartado. Gera alerta ao Gestor, não bloqueia a viagem."
 *
 * Auditoria de 18/09/2026 encontrou a regra implementada ao contrário:
 * `trips.service.ts` fazia `simuladoSuspeito: dto.simuladoSuspeito`, ou
 * seja, o servidor PERGUNTAVA AO CLIENTE se o GPS do próprio cliente era
 * suspeito. Um aplicativo com localização falsificada simplesmente nunca
 * marcaria a flag — a proteção era decorativa.
 *
 * Aqui a decisão passa a ser do servidor, que é quem tem o histórico.
 */

/** Uma posição já conhecida da viagem, o bastante para comparar. */
export interface PontoDeTrajeto {
  latitude: number;
  longitude: number;
  capturadaEm: Date;
}

/**
 * Teto de velocidade implícita aceita entre duas leituras consecutivas.
 *
 * 150 km/h é generoso de propósito: transporte escolar não passa disso
 * nem em rodovia, mas GPS urbano erra dezenas de metros entre leituras, e
 * um teto apertado transformaria imprecisão comum em alarme falso. O
 * objetivo é pegar o salto absurdo — a leitura que pula um bairro em
 * quinze segundos —, não medir excesso de velocidade (isso é outra
 * regra, com outro nome).
 */
export const VELOCIDADE_IMPLAUSIVEL_KMH = 150;

/**
 * Intervalo mínimo entre leituras para que a comparação valha.
 *
 * Abaixo disso o denominador fica tão pequeno que qualquer imprecisão de
 * metros vira centenas de km/h. Duas leituras no mesmo segundo não
 * provam nada sobre deslocamento.
 */
export const INTERVALO_MINIMO_MS = 2_000;

const RAIO_DA_TERRA_KM = 6371;

const emRadianos = (graus: number): number => (graus * Math.PI) / 180;

/** Distância em km entre dois pontos (Haversine). */
export function distanciaKm(a: PontoDeTrajeto, b: PontoDeTrajeto): number {
  const dLat = emRadianos(b.latitude - a.latitude);
  const dLon = emRadianos(b.longitude - a.longitude);
  const lat1 = emRadianos(a.latitude);
  const lat2 = emRadianos(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * RAIO_DA_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * `true` quando a leitura nova é incoerente com a anterior.
 *
 * Sem posição anterior devolve `false`: a primeira leitura de uma viagem
 * não tem com o que ser incoerente, e marcar toda largada como suspeita
 * treinaria o Gestor a ignorar o alerta — que é o pior desfecho possível
 * para um sinal de segurança.
 *
 * Leitura com `capturadaEm` anterior à última conhecida também devolve
 * `false`: é o caso normal da fila offline sendo drenada fora de ordem
 * (`GPS-04`), não fraude.
 */
export function saltoIncoerente(anterior: PontoDeTrajeto | null, nova: PontoDeTrajeto): boolean {
  if (!anterior) {
    return false;
  }

  const intervaloMs = nova.capturadaEm.getTime() - anterior.capturadaEm.getTime();
  if (intervaloMs < INTERVALO_MINIMO_MS) {
    return false;
  }

  const horas = intervaloMs / 3_600_000;
  const velocidadeKmh = distanciaKm(anterior, nova) / horas;

  return velocidadeKmh > VELOCIDADE_IMPLAUSIVEL_KMH;
}
