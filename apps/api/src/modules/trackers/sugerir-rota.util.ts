import type { SchoolShift } from "@prisma/client";

import { haversineDistanceKm } from "@/shared/utils/geo.util";

/**
 * Uma rota candidata, com o que basta para reconhecê-la pelo trajeto.
 *
 * Só geometria e horário: nada de aluno, contrato ou motorista. Quem
 * chama já filtrou as rotas da empresa, e esta função não consulta
 * banco nenhum de propósito, para poder ser testada com números na mão.
 */
export interface RotaCandidata {
  id: string;
  nome: string;
  turno: SchoolShift;
  /** As paradas, com coordenada. Rota sem parada não é candidata. */
  paradas: { latitude: number; longitude: number; horarioPrevisto: string }[];
}

export interface PosicaoObservada {
  latitude: number;
  longitude: number;
  /** Quando o ônibus esteve ali, no fuso da operação. */
  capturadaEm: Date;
}

export interface SugestaoDeRota {
  routeId: string;
  nome: string;
  /** 0 a 100. Acima de `CONFIANCA_PARA_SUGERIR` vale mostrar a alguém. */
  confianca: number;
  /** Em metros, da posição até a parada mais próxima desta rota. */
  distanciaMetros: number;
  /** Por que esta rota, em uma frase que cabe numa tela. */
  motivo: string;
}

/**
 * Raio em que uma posição conta como "nesta parada".
 *
 * 300 metros não é precisão de GPS, é largura de quarteirão: o ônibus
 * para na esquina, no outro lado da rua, ou no portão de trás da
 * escola, e nos três casos é a mesma parada. Apertar isso faria a
 * sugestão falhar justamente nos pontos movimentados, que são os que
 * mais identificam uma rota.
 */
const RAIO_DA_PARADA_METROS = 300;

/**
 * Até onde ainda vale olhar. Além disso o ônibus não está nessa rota,
 * está em outra ou indo para a garagem.
 */
const RAIO_MAXIMO_METROS = 3_000;

/**
 * Minutos de tolerância em volta do horário previsto da parada.
 *
 * A mesma rua pode ser percorrida pela rota da manhã e pela da tarde, e
 * nesse caso a geometria sozinha empata. O relógio desempata: 45
 * minutos cobrem atraso de trânsito real sem deixar a volta das 17h
 * parecer a ida das 6h30.
 */
const TOLERANCIA_DE_HORARIO_MINUTOS = 45;

/**
 * Abaixo disto a sugestão não é mostrada a ninguém.
 *
 * Sugerir a rota errada é pior do que não sugerir: o despachante
 * confirmaria no automático e a lista de alunos do ônibus ficaria
 * trocada. Na dúvida, calado.
 */
export const CONFIANCA_PARA_SUGERIR = 60;

/**
 * Qual rota este ônibus está fazendo, deduzida de onde ele está.
 *
 * ## O problema real que isto resolve
 *
 * No transporte escolar municipal o ônibus não tem rota fixa. O
 * despachante remaneja de manhã: o carro que era da linha do Ubatiba
 * vai para a do Silvado porque outro quebrou. Hoje, se ninguém abrir o
 * painel e registrar a escala, o ônibus liga a ignição e o sistema não
 * sabe o que ele está fazendo.
 *
 * A ideia natural é ler o letreiro. **Rastreador não lê letreiro**: não
 * existe sensor para isso, e o letreiro é posto à mão por quem dirige.
 *
 * Mas o letreiro é um palpite pior do que o trajeto, e é fácil ver por
 * quê: **o letreiro mente e o trajeto não**. O motorista esquece de
 * trocar o letreiro o tempo todo; ele não tem como esquecer de passar
 * pelas ruas por onde passou. Então a dedução sai de onde o ônibus
 * esteve, que é o dado que o rastreador manda de graça a cada minuto.
 *
 * ## Como pontua
 *
 * Cada posição observada vota na rota cuja parada está mais perto, e o
 * voto vale mais quando o relógio também bate com o horário previsto
 * daquela parada. A rota com mais votos ponderados ganha.
 *
 * ## O que isto NUNCA faz
 *
 * Decidir sozinho. A função devolve sugestão, e sugestão com nome,
 * distância e motivo, para uma pessoa confirmar. Trocar a rota de um
 * ônibus no automático trocaria a lista de crianças que deveriam estar
 * dentro dele, e isso não é decisão de heurística.
 */
export function sugerirRotaPeloTrajeto(
  posicoes: PosicaoObservada[],
  candidatas: RotaCandidata[],
): SugestaoDeRota | null {
  if (posicoes.length === 0 || candidatas.length === 0) return null;

  const placar = candidatas
    .map((rota) => pontuar(posicoes, rota))
    .filter((p): p is Pontuacao => p !== null)
    .sort((a, b) => b.pontos - a.pontos);

  const primeira = placar[0];
  if (!primeira) return null;

  /*
    A confiança não é só o quanto a melhor rota pontuou: é o quanto ela
    se destacou da segunda. Duas rotas que compartilham a avenida
    principal pontuam quase igual, e nesse caso a resposta honesta é
    "não sei", não "é a primeira por um ponto".
  */
  const segunda = placar[1];
  const margem = segunda ? (primeira.pontos - segunda.pontos) / primeira.pontos : 1;
  const confianca = Math.round(Math.min(1, primeira.aderencia) * Math.min(1, margem + 0.4) * 100);

  return {
    routeId: primeira.rota.id,
    nome: primeira.rota.nome,
    confianca,
    distanciaMetros: Math.round(primeira.menorDistanciaMetros),
    motivo: motivoDe(primeira, segunda, confianca),
  };
}

interface Pontuacao {
  rota: RotaCandidata;
  pontos: number;
  /** Fração das posições que caíram perto de alguma parada desta rota. */
  aderencia: number;
  menorDistanciaMetros: number;
  comHorarioBatendo: number;
}

function pontuar(posicoes: PosicaoObservada[], rota: RotaCandidata): Pontuacao | null {
  if (rota.paradas.length === 0) return null;

  let pontos = 0;
  let dentroDoRaio = 0;
  let comHorarioBatendo = 0;
  let menorDistanciaMetros = Number.POSITIVE_INFINITY;

  for (const posicao of posicoes) {
    let melhorDaPosicao = Number.POSITIVE_INFINITY;
    let horarioDaMelhor: string | null = null;

    for (const parada of rota.paradas) {
      const metros =
        haversineDistanceKm(
          posicao.latitude,
          posicao.longitude,
          parada.latitude,
          parada.longitude,
        ) * 1000;

      if (metros < melhorDaPosicao) {
        melhorDaPosicao = metros;
        horarioDaMelhor = parada.horarioPrevisto;
      }
    }

    if (melhorDaPosicao < menorDistanciaMetros) menorDistanciaMetros = melhorDaPosicao;
    if (melhorDaPosicao > RAIO_MAXIMO_METROS) continue;

    /* Peso que cai com a distância: colado na parada vale 1, no limite
       do raio vale perto de 0. Degrau seco faria 299 metros valer tudo
       e 301 valer nada, que é arbitrário na largura de uma rua. */
    const peso =
      melhorDaPosicao <= RAIO_DA_PARADA_METROS
        ? 1
        : Math.max(0, 1 - (melhorDaPosicao - RAIO_DA_PARADA_METROS) / RAIO_MAXIMO_METROS);

    if (melhorDaPosicao <= RAIO_DA_PARADA_METROS) dentroDoRaio += 1;

    const bateOHorario = horarioDaMelhor
      ? dentroDaJanela(posicao.capturadaEm, horarioDaMelhor)
      : false;
    if (bateOHorario) comHorarioBatendo += 1;

    /* O relógio dobra o voto, não cria voto: uma posição longe de tudo
       continua valendo pouco mesmo no horário certo. */
    pontos += peso * (bateOHorario ? 2 : 1);
  }

  if (pontos === 0) return null;

  return {
    rota,
    pontos,
    aderencia: dentroDoRaio / posicoes.length,
    menorDistanciaMetros,
    comHorarioBatendo,
  };
}

/** O horário previsto da parada é "HH:mm", e se repete todo dia operado. */
function dentroDaJanela(capturadaEm: Date, horarioPrevisto: string): boolean {
  const [hora, minuto] = horarioPrevisto.split(":").map(Number);
  if (hora === undefined || minuto === undefined || Number.isNaN(hora) || Number.isNaN(minuto)) {
    return false;
  }

  const minutosDaPosicao = capturadaEm.getHours() * 60 + capturadaEm.getMinutes();
  const minutosDaParada = hora * 60 + minuto;

  /* A diferença circular: 23h50 e 00h10 distam 20 minutos, não 1420. A
     rota noturna existe no enum `SchoolShift`, então a virada do dia
     não é hipótese. */
  const bruta = Math.abs(minutosDaPosicao - minutosDaParada);
  const diferenca = Math.min(bruta, 24 * 60 - bruta);

  return diferenca <= TOLERANCIA_DE_HORARIO_MINUTOS;
}

function motivoDe(primeira: Pontuacao, segunda: Pontuacao | undefined, confianca: number): string {
  const metros = Math.round(primeira.menorDistanciaMetros);

  if (confianca < CONFIANCA_PARA_SUGERIR && segunda) {
    return `Trajeto parecido com "${primeira.rota.nome}" e "${segunda.rota.nome}": não dá para distinguir as duas pelo caminho percorrido.`;
  }

  const horario =
    primeira.comHorarioBatendo > 0
      ? ` e ${primeira.comHorarioBatendo} ${primeira.comHorarioBatendo === 1 ? "posição bate" : "posições batem"} com o horário previsto`
      : "";

  return `O ônibus passou a ${metros} m de uma parada desta rota${horario}.`;
}
