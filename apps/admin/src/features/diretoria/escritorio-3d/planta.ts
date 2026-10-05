/**
 * A planta do escritório da diretoria.
 *
 * Fica em arquivo próprio, separado da cena, porque é a única parte que
 * alguém vai querer mexer depois: mudar uma sala de lugar, adicionar um
 * cargo, alargar o corredor. A cena lê isto e constrói; ninguém precisa
 * entender Three.js para mover uma parede.
 *
 * Eixos: `x` cresce para a direita, `z` cresce para baixo (o chão é o
 * plano XZ, `y` é a altura). Tudo em metros, para as proporções
 * ficarem humanas sem ninguém ter que pensar: uma sala de 6x5 é uma
 * sala de verdade, e um boneco de 1,7 cabe nela.
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
  tipo: "gabinete" | "reuniao" | "cafe" | "banheiro";
}

/** O corredor é a única via: todo caminho passa por ele, como num escritório de verdade. */
export const CORREDOR_Z = 9.5;
export const CORREDOR_LARGURA = 3;

export const SALAS: Sala[] = [
  {
    id: "ceo",
    nome: "CEO",
    dono: "CEO",
    x: 1,
    z: 1,
    largura: 7,
    profundidade: 7,
    cor: 0x1e3a8a,
    porta: { x: 4.5, z: 8 },
    parada: { x: 4.5, z: 4 },
    tipo: "gabinete",
  },
  {
    id: "cto",
    nome: "CTO",
    dono: "CTO",
    x: 9,
    z: 1,
    largura: 7,
    profundidade: 7,
    cor: 0x166534,
    porta: { x: 12.5, z: 8 },
    parada: { x: 12.5, z: 4 },
    tipo: "gabinete",
  },
  {
    id: "reuniao",
    nome: "Sala de reunião",
    x: 17,
    z: 1,
    largura: 8,
    profundidade: 7,
    cor: 0x475569,
    porta: { x: 21, z: 8 },
    parada: { x: 21, z: 4 },
    tipo: "reuniao",
  },
  {
    id: "cmo",
    nome: "CMO",
    dono: "CMO",
    x: 1,
    z: 13,
    largura: 7,
    profundidade: 7,
    cor: 0x9a3412,
    porta: { x: 4.5, z: 13 },
    parada: { x: 4.5, z: 16.5 },
    tipo: "gabinete",
  },
  {
    id: "cfo",
    nome: "CFO",
    dono: "CFO",
    x: 9,
    z: 13,
    largura: 7,
    profundidade: 7,
    cor: 0x854d0e,
    porta: { x: 12.5, z: 13 },
    parada: { x: 12.5, z: 16.5 },
    tipo: "gabinete",
  },
  {
    id: "cafe",
    nome: "Cafezinho",
    x: 17,
    z: 13,
    largura: 4.5,
    profundidade: 7,
    cor: 0x7c2d12,
    porta: { x: 19.25, z: 13 },
    parada: { x: 19.25, z: 16 },
    tipo: "cafe",
  },
  {
    id: "banheiro",
    nome: "Banheiro",
    x: 22.5,
    z: 13,
    largura: 2.5,
    profundidade: 7,
    cor: 0x0e7490,
    porta: { x: 23.75, z: 13 },
    parada: { x: 23.75, z: 16 },
    tipo: "banheiro",
  },
];

export const LARGURA_DO_ANDAR = 26;
export const PROFUNDIDADE_DO_ANDAR = 21;

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

/** Cor da camisa de cada cargo, a mesma do piso do gabinete dele. */
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
