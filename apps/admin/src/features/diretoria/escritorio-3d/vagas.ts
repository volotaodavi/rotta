import { SALAS } from "./planta";

export interface Vaga {
  salaId: string;
  indice: number;
  x: number;
  z: number;
}

/**
 * Quem está ocupando qual lugar em qual sala.
 *
 * ## Os dois defeitos que isto conserta
 *
 * O fundador viu os dois em 05/10/2026: "eles estão bugando no
 * cafezinho, estão entrando um dentro do outro" e "banheiro só entra um
 * por vez, nada de entrar junto".
 *
 * Eram o mesmo defeito com duas caras. Cada sala tinha UM ponto de
 * parada, então dois bonecos mandados para a mesma sala paravam na
 * mesma coordenada e se atravessavam. E nada no código dizia quantas
 * pessoas cabem num lugar, então o banheiro aceitava quatro.
 *
 * A correção é a mesma que um escritório de verdade usa: lugares
 * contados. O banheiro tem uma vaga, o cafezinho tem quatro separadas,
 * a sala de reunião tem seis. Quem chega e não encontra vaga **não
 * entra**: desiste e vai fazer outra coisa. Não existe fila na porta,
 * de propósito, porque uma fila de bonecos parados no corredor seria
 * mais estranha que o problema original.
 */
export class ControleDeVagas {
  private readonly ocupadas = new Map<string, Set<number>>();

  constructor() {
    for (const sala of SALAS) this.ocupadas.set(sala.id, new Set());
  }

  /** Pega um lugar livre nesta sala, ou `null` quando está cheia. */
  reservar(salaId: string): Vaga | null {
    const sala = SALAS.find((s) => s.id === salaId);
    const tomadas = this.ocupadas.get(salaId);
    if (!sala || !tomadas) return null;

    for (let indice = 0; indice < sala.vagas.length; indice += 1) {
      if (tomadas.has(indice)) continue;
      tomadas.add(indice);
      const ponto = sala.vagas[indice];
      if (!ponto) continue;
      return { salaId, indice, x: ponto.x, z: ponto.z };
    }
    return null;
  }

  liberar(vaga: Vaga | null): void {
    if (!vaga) return;
    this.ocupadas.get(vaga.salaId)?.delete(vaga.indice);
  }

  temVagaLivre(salaId: string): boolean {
    const sala = SALAS.find((s) => s.id === salaId);
    const tomadas = this.ocupadas.get(salaId);
    if (!sala || !tomadas) return false;
    return tomadas.size < sala.vagas.length;
  }
}
