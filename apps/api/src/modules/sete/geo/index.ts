import type { SeteShape } from "@rotta/shared-contracts";

/**
 * A geometria da exportação para o SETE.
 *
 * Lógica pura: entram números, saem números. Sem banco, sem rede, sem
 * Nest — é o que torna cada regra difícil daqui testável em
 * milissegundos, e é por isso que ela mora separada do serviço.
 *
 * Ver `docs/52-integracao-sete.md`, RN-SETE-05 e RN-SETE-08.
 */

/** Raio médio da Terra, em metros (WGS84). */
const RAIO_DA_TERRA_M = 6_378_137;

/**
 * Pior precisão que ainda entra na conta de quilometragem e no desenho.
 *
 * Cem metros é mais ou menos a largura de um quarteirão: acima disso o
 * ponto não diz por qual rua a van passou, e somá-lo infla a
 * quilometragem que a prefeitura usa para pagar.
 */
const PRECISAO_MAXIMA_M = 100;

export interface PontoGeografico {
  latitude: number;
  longitude: number;
}

export interface PosicaoParaShape extends PontoGeografico {
  capturadaEm: Date;
  simuladoSuspeito: boolean;
  precisaoMetros: number | null;
}

const emRadianos = (graus: number): number => (graus * Math.PI) / 180;

/**
 * Distância em linha reta entre dois pontos, em quilômetros.
 *
 * Haversine, e não a distância euclidiana das coordenadas: a diferença
 * entre graus de longitude vira quilômetros diferentes conforme a
 * latitude, e no Brasil isso já erra o suficiente para a quilometragem
 * de uma rota não bater com o odômetro.
 */
export function haversineKm(a: PontoGeografico, b: PontoGeografico): number {
  const deltaLat = emRadianos(b.latitude - a.latitude);
  const deltaLon = emRadianos(b.longitude - a.longitude);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(emRadianos(a.latitude)) *
      Math.cos(emRadianos(b.latitude)) *
      Math.sin(deltaLon / 2) ** 2;

  return (2 * RAIO_DA_TERRA_M * Math.asin(Math.min(1, Math.sqrt(h)))) / 1000;
}

/**
 * Soma dos trechos de um caminho, em quilômetros.
 *
 * É a quilometragem RODADA, não a distância até o destino. A diferença
 * entre as duas é o que a prefeitura paga.
 */
export function comprimentoEmKm(caminho: PontoGeografico[]): number {
  let total = 0;
  for (let i = 1; i < caminho.length; i += 1) {
    total += haversineKm(caminho[i - 1]!, caminho[i]!);
  }
  return total;
}

/**
 * WGS84 (graus) → EPSG:3857 (metros), que é o que o `shape` do SETE
 * guarda.
 *
 * Isto contraria a RFC 7946, que define GeoJSON em graus — mas as
 * amostras reais do banco do SETE estão em metros de Web Mercator, e é
 * com o SETE que a Rotta precisa falar. Ver RN-SETE-05.
 */
export function paraWebMercator(ponto: PontoGeografico): [number, number] {
  const x = emRadianos(ponto.longitude) * RAIO_DA_TERRA_M;
  const y = RAIO_DA_TERRA_M * Math.log(Math.tan(Math.PI / 4 + emRadianos(ponto.latitude) / 2));
  return [x, y];
}

/**
 * As posições que podem entrar na conta, em ordem de captura.
 *
 * Descarta a posição marcada como simulada e a de precisão pior que
 * 100 m. Precisão AUSENTE passa: ela não diz que o ponto é ruim, diz
 * que o aparelho não informou — e descartá-la apagaria a rota inteira
 * de um rastreador que não manda esse campo.
 */
export function posicoesConfiaveis(posicoes: PosicaoParaShape[]): PosicaoParaShape[] {
  return posicoes
    .filter(
      (posicao) =>
        !posicao.simuladoSuspeito &&
        (posicao.precisaoMetros === null || posicao.precisaoMetros <= PRECISAO_MAXIMA_M),
    )
    .slice()
    .sort((a, b) => a.capturadaEm.getTime() - b.capturadaEm.getTime());
}

/** Distância perpendicular de `ponto` à reta `inicio`–`fim`, em metros. */
function distanciaPerpendicularM(
  ponto: PontoGeografico,
  inicio: PontoGeografico,
  fim: PontoGeografico,
): number {
  const [px, py] = paraWebMercator(ponto);
  const [ax, ay] = paraWebMercator(inicio);
  const [bx, by] = paraWebMercator(fim);

  const dx = bx - ax;
  const dy = by - ay;
  const comprimentoAoQuadrado = dx * dx + dy * dy;

  // Reta degenerada (início e fim no mesmo lugar): a "perpendicular" é
  // a distância até o ponto.
  if (comprimentoAoQuadrado === 0) return Math.hypot(px - ax, py - ay);

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / comprimentoAoQuadrado));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * Simplificação de Douglas-Peucker.
 *
 * Um trajeto de uma hora rende umas 240 posições, e uma frota de
 * setenta rotas não cabe num campo JSON desse jeito. O algoritmo joga
 * fora o ponto que não muda a FORMA da linha, e nunca mexe nas pontas.
 *
 * ## A tolerância é em metros reais, não em metros de Mercator
 *
 * O Web Mercator estica a escala por `1/cos(latitude)`: no Rio, 15
 * metros de verdade são quase 16,3 de Mercator. Sem corrigir, a mesma
 * tolerância simplificaria mais perto do Equador e menos no sul do
 * país — a rota do Acre sairia mais grosseira que a do Paraná, sem
 * ninguém ter pedido.
 */
export function douglasPeucker<T extends PontoGeografico>(caminho: T[], toleranciaM: number): T[] {
  if (caminho.length <= 2) return caminho;

  const latitudeMedia = caminho.reduce((soma, p) => soma + p.latitude, 0) / caminho.length;
  const toleranciaEmMercator = toleranciaM / Math.max(Math.cos(emRadianos(latitudeMedia)), 1e-6);

  const simplificar = (pontos: T[]): T[] => {
    if (pontos.length <= 2) return pontos;

    const primeiro = pontos[0]!;
    const ultimo = pontos[pontos.length - 1]!;

    let indiceMaisLonge = 0;
    let maiorDistancia = 0;
    for (let i = 1; i < pontos.length - 1; i += 1) {
      const distancia = distanciaPerpendicularM(pontos[i]!, primeiro, ultimo);
      if (distancia > maiorDistancia) {
        maiorDistancia = distancia;
        indiceMaisLonge = i;
      }
    }

    if (maiorDistancia <= toleranciaEmMercator) return [primeiro, ultimo];

    const esquerda = simplificar(pontos.slice(0, indiceMaisLonge + 1));
    const direita = simplificar(pontos.slice(indiceMaisLonge));
    return [...esquerda.slice(0, -1), ...direita];
  };

  return simplificar(caminho);
}

/** Tolerância da simplificação do shape, em metros reais. */
export const TOLERANCIA_DO_SHAPE_M = 15;

/**
 * O `shape` da rota, no formato do SETE.
 *
 * Devolve `null` com menos de dois pontos confiáveis: uma linha com um
 * ponto só não é uma linha, e mandá-la faria o SETE aceitar e desenhar
 * nada — pior que a ausência, porque esconde a pendência.
 */
export function montarShape(posicoes: PosicaoParaShape[]): SeteShape | null {
  const confiaveis = posicoesConfiaveis(posicoes);
  if (confiaveis.length < 2) return null;

  const simplificadas = douglasPeucker(confiaveis, TOLERANCIA_DO_SHAPE_M);

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: simplificadas.map((posicao) => paraWebMercator(posicao)),
        },
      },
    ],
  };
}
