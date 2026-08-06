export interface DemoStop {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  tipo: "garagem" | "embarque" | "escola";
}

/**
 * Pontos de exemplo (Pinheiros, São Paulo — nenhuma relação com um
 * cliente real) formando um trajeto plausível: garagem → 2 embarques →
 * escola. Só ilustrativo (avisado na UI de quem usa isto); nunca chama
 * o backend. Usado por `HeroMapDemo` (único mapa animado da Landing
 * Page — a demonstração completa com linha do tempo/`RouteDemoSection`
 * foi removida por duplicar o mesmo mapa logo abaixo da hero).
 */
export const DEMO_ROUTE: DemoStop[] = [
  {
    id: "garagem",
    nome: "Saída — Garagem Rotta",
    latitude: -23.5629,
    longitude: -46.6979,
    tipo: "garagem",
  },
  {
    id: "aluno-1",
    nome: "João — Rua Girassol, 210",
    latitude: -23.5615,
    longitude: -46.69,
    tipo: "embarque",
  },
  {
    id: "aluno-2",
    nome: "Maria — Av. Rebouças, 1450",
    latitude: -23.5661,
    longitude: -46.6822,
    tipo: "embarque",
  },
  {
    id: "escola",
    nome: "Escola Girassol",
    latitude: -23.5601,
    longitude: -46.675,
    tipo: "escola",
  },
];

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
