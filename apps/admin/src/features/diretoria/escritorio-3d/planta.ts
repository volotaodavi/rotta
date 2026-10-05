/**
 * A planta do escritório da diretoria.
 *
 * Fica em arquivo próprio, separado da cena, porque é a única parte que
 * alguém vai querer mexer depois: mudar uma sala de lugar, adicionar um
 * cargo, alargar o corredor. A cena lê isto e constrói; ninguém precisa
 * entender Three.js para mover uma parede.
 *
 * Eixos: `x` cresce para a direita, `z` cresce para baixo (o chão é o
 * plano XZ, `y` é a altura). Tudo em metros, para as proporções ficarem
 * humanas sem ninguém ter que pensar.
 *
 * ## O desenho do andar
 *
 * Um corredor só, no meio, com os gabinetes de cima e as salas comuns
 * embaixo. Uma via única não é preguiça: é o que faz TODO deslocamento
 * ser visível. Se houvesse atalho entre salas vizinhas, metade do
 * movimento aconteceria fora do campo de visão e a tela perderia a
 * única coisa que o fundador pediu, que é ver as pessoas indo.
 */

export type Cargo = "CEO" | "CTO" | "CMO" | "CFO";

export interface Sala {
  id: string;
  nome: string;
  /** Quem trabalha ali. Salas comuns não têm dono. */
  dono?: Cargo;
  /** Canto superior esquerdo. */
  x: number;
  z: number;
  largura: number;
  profundidade: number;
  /** Cor do piso, para cada setor ter identidade sem precisar de placa. */
  cor: number;
  /** Onde fica a porta, na parede que dá para o corredor. */
  porta: { x: number; z: number };
  /** Onde a pessoa para quando está nesta sala. */
  parada: { x: number; z: number };
  tipo: "gabinete" | "reuniao" | "cafe" | "banheiro" | "agentes" | "temporarios";
}

/** O corredor é a única via: todo caminho passa por ele, como num escritório de verdade. */
export const CORREDOR_Z = 10.5;
export const CORREDOR_LARGURA = 3.4;

const GABINETE = { z: 1, profundidade: 8 };
const SALA_DE_BAIXO = { z: 14, profundidade: 8 };

export const SALAS: Sala[] = [
  {
    id: "ceo",
    nome: "CEO",
    dono: "CEO",
    x: 1,
    ...GABINETE,
    largura: 7.5,
    cor: 0x1e3a8a,
    porta: { x: 4.75, z: 9 },
    parada: { x: 4.75, z: 5.2 },
    tipo: "gabinete",
  },
  {
    id: "cto",
    nome: "CTO",
    dono: "CTO",
    x: 9.5,
    ...GABINETE,
    largura: 7.5,
    cor: 0x166534,
    porta: { x: 13.25, z: 9 },
    parada: { x: 13.25, z: 5.2 },
    tipo: "gabinete",
  },
  {
    id: "cmo",
    nome: "CMO",
    dono: "CMO",
    x: 18,
    ...GABINETE,
    largura: 7.5,
    cor: 0x9a3412,
    porta: { x: 21.75, z: 9 },
    parada: { x: 21.75, z: 5.2 },
    tipo: "gabinete",
  },
  {
    id: "cfo",
    nome: "CFO",
    dono: "CFO",
    x: 26.5,
    ...GABINETE,
    largura: 7.5,
    cor: 0x854d0e,
    porta: { x: 30.25, z: 9 },
    parada: { x: 30.25, z: 5.2 },
    tipo: "gabinete",
  },

  {
    id: "agentes",
    nome: "Agentes da plataforma",
    x: 1,
    ...SALA_DE_BAIXO,
    largura: 13,
    cor: 0x0f766e,
    porta: { x: 7.5, z: 14 },
    parada: { x: 7.5, z: 18.6 },
    tipo: "agentes",
  },
  {
    id: "temporarios",
    nome: "Temporários",
    x: 15,
    ...SALA_DE_BAIXO,
    largura: 6.5,
    cor: 0x3730a3,
    porta: { x: 18.25, z: 14 },
    parada: { x: 18.25, z: 18 },
    tipo: "temporarios",
  },
  {
    id: "reuniao",
    nome: "Sala de reunião",
    x: 22.5,
    ...SALA_DE_BAIXO,
    largura: 7.5,
    cor: 0x475569,
    porta: { x: 26.25, z: 14 },
    parada: { x: 26.25, z: 18 },
    tipo: "reuniao",
  },
  {
    id: "cafe",
    nome: "Cafezinho",
    x: 31,
    ...SALA_DE_BAIXO,
    largura: 5,
    cor: 0x7c2d12,
    porta: { x: 33.5, z: 14 },
    parada: { x: 33.5, z: 17.5 },
    tipo: "cafe",
  },
  {
    id: "banheiro",
    nome: "Banheiro",
    x: 36.5,
    ...SALA_DE_BAIXO,
    largura: 3,
    cor: 0x0e7490,
    porta: { x: 38, z: 14 },
    parada: { x: 38, z: 17.5 },
    tipo: "banheiro",
  },
];

export const LARGURA_DO_ANDAR = 40.5;
export const PROFUNDIDADE_DO_ANDAR = 23;

/**
 * Os agentes de IA que já existem no produto e são subordinados do CTO.
 *
 * Eles não têm escala, e isso não é detalhe: enquanto a diretoria tem
 * turno e folga, estes rodam toda vez que alguém usa a Rotta, de
 * madrugada e no feriado. Por isso a sala deles é a única que nunca
 * esvazia, e por isso eles ficam no andar mesmo quando o resto está de
 * folga.
 */
export const AGENTES_DA_PLATAFORMA = [
  { id: "geocoding", nome: "Geocoding", cor: 0x22d3ee },
  { id: "validation", nome: "Validation", cor: 0xa3e635 },
  { id: "map", nome: "Map Intelligence", cor: 0xf472b6 },
  { id: "education", nome: "Education Sync", cor: 0xfbbf24 },
  { id: "rotta-ai", nome: "Rotta AI", cor: 0x818cf8 },
  { id: "comunicacao", nome: "Communication", cor: 0x2dd4bf },
  { id: "auditoria", nome: "Audit Engine", cor: 0xfb7185 },
] as const;

export function salaPorId(id: string): Sala {
  const achada = SALAS.find((sala) => sala.id === id);
  if (!achada) throw new Error(`Sala desconhecida: ${id}`);
  return achada;
}

export function gabineteDe(cargo: Cargo): Sala {
  const achada = SALAS.find((sala) => sala.dono === cargo);
  if (!achada) throw new Error(`Nenhum gabinete para ${cargo}`);
  return achada;
}

/** Cor da camisa de cada cargo, parente da cor do piso do gabinete dele. */
export const COR_DO_CARGO: Record<Cargo, number> = {
  CEO: 0x3b82f6,
  CTO: 0x22c55e,
  CMO: 0xf97316,
  CFO: 0xeab308,
};

/**
 * O caminho entre dois pontos, sempre passando pelo corredor.
 *
 * Não é busca de caminho de verdade e nem precisa ser: a planta tem uma
 * via só. Sair da sala pela porta, andar pelo corredor até a porta de
 * destino, entrar. É exatamente o que uma pessoa faz, e qualquer coisa
 * mais esperta aqui seria complexidade sem ninguém ver diferença.
 *
 * Cada ponto do retorno é um trecho ANDADO, nunca um salto: a cena
 * interpola entre eles quadro a quadro, e é isso que garante que
 * ninguém apareça do outro lado do andar sem ter atravessado o
 * corredor.
 */
export function caminho(de: Sala, para: Sala): { x: number; z: number }[] {
  if (de.id === para.id) return [para.parada];

  return [
    de.porta,
    { x: de.porta.x, z: CORREDOR_Z },
    { x: para.porta.x, z: CORREDOR_Z },
    para.porta,
    para.parada,
  ];
}
