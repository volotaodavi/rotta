import * as THREE from "three";

import { CORREDOR_Z, gabineteDe, salaPorId, type Cargo } from "./planta";

/**
 * Um agente de IA do produto, na sala dos agentes.
 *
 * ## Por que ele é diferente dos diretores
 *
 * Porque a vida dele é diferente, e o fundador apontou isso em
 * 05/10/2026: "os agentes trabalham sem escala, você sabe disso né".
 * Está certo. Geocoding, Validation, Map Intelligence, Education Sync,
 * Rotta AI, Communication e Audit Engine não têm turno, não têm folga e
 * não vão ao banheiro: eles rodam toda vez que alguém usa a Rotta, de
 * madrugada e no feriado.
 *
 * Então eles ficam na estação, sempre presentes, e o que muda neles é a
 * INTENSIDADE: quando a plataforma está sendo usada, trabalham rápido,
 * com a tela piscando; quando não há movimento, ficam em espera, com o
 * monitor em descanso. A forma também é outra, mais de máquina que de
 * gente, porque confundir os dois na tela seria mentir sobre o que cada
 * um é.
 *
 * ## O que a animação afirma
 *
 * Só uma coisa: que houve atividade na plataforma na janela recente. O
 * número vem de fora (`definirCarga`), medido na API. Qual agente
 * especificamente rodou, a cena NÃO sabe e não finge saber: todos
 * aceleram juntos, porque o sinal é do conjunto.
 */
export class AgenteDaPlataforma {
  readonly grupo = new THREE.Group();
  readonly nome: string;

  private readonly corpo: THREE.Mesh;
  private readonly cabeca: THREE.Mesh;
  private readonly bracoEsquerdo: THREE.Mesh;
  private readonly bracoDireito: THREE.Mesh;
  private readonly monitor: THREE.Mesh;
  private readonly materialDoMonitor: THREE.MeshStandardMaterial;

  private fase = Math.random() * 10;
  private readonly estacao: THREE.Vector3;
  private rota: { x: number; z: number }[] = [];
  private voltando = false;
  private conversando = 0;
  /** 0 = plataforma parada, 1 = movimento intenso. */
  private carga = 0;

  constructor(nome: string, cor: number, x: number, z: number) {
    this.nome = nome;

    const casco = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.35, metalness: 0.5 });
    const escuro = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

    this.corpo = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.26), casco);
    this.corpo.position.y = 0.72;

    this.cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.24), casco);
    this.cabeca.position.y = 1.07;

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.08, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: cor, emissiveIntensity: 1.4 }),
    );
    visor.position.set(0, 1.07, 0.13);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.5, 12), escuro);
    base.position.y = 0.25;

    const braco = new THREE.CapsuleGeometry(0.05, 0.22, 4, 8);
    this.bracoEsquerdo = new THREE.Mesh(braco, casco);
    this.bracoEsquerdo.position.set(-0.24, 0.8, 0.1);
    this.bracoDireito = new THREE.Mesh(braco, casco);
    this.bracoDireito.position.set(0.24, 0.8, 0.1);

    const mesa = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.08, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 }),
    );
    mesa.position.set(0, 0.68, 0.62);

    this.materialDoMonitor = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: cor,
      emissiveIntensity: 0.5,
    });
    this.monitor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.04), this.materialDoMonitor);
    this.monitor.position.set(0, 0.96, 0.85);
    this.monitor.rotation.x = -0.12;

    for (const parte of [
      base,
      this.corpo,
      this.cabeca,
      visor,
      this.bracoEsquerdo,
      this.bracoDireito,
      mesa,
      this.monitor,
    ]) {
      parte.castShadow = true;
      this.grupo.add(parte);
    }

    this.grupo.add(this.fazerPlaca(nome));
    this.grupo.position.set(x, 0, z);
    this.grupo.scale.setScalar(1.25);
    this.estacao = new THREE.Vector3(x, 0, z);
  }

  private fazerPlaca(texto: string): THREE.Sprite {
    const tela = document.createElement("canvas");
    tela.width = 320;
    tela.height = 96;
    const pincel = tela.getContext("2d");
    if (pincel) {
      pincel.fillStyle = "rgba(15,23,42,0.82)";
      pincel.roundRect(4, 24, 312, 50, 12);
      pincel.fill();
      pincel.font = "bold 34px system-ui, sans-serif";
      pincel.fillStyle = "#e2e8f0";
      pincel.textAlign = "center";
      pincel.textBaseline = "middle";
      pincel.fillText(texto, 160, 50);
    }
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(tela), depthTest: false }),
    );
    sprite.scale.set(1.5, 0.45, 1);
    sprite.position.y = 1.55;
    sprite.renderOrder = 10;
    return sprite;
  }

  /** `0` plataforma parada, `1` movimento intenso. Vem medido da API. */
  definirCarga(carga: number): void {
    this.carga = Math.max(0, Math.min(1, carga));
  }

  estado(): string {
    return this.carga > 0.05 ? "processando" : "em espera";
  }

  /**
   * Sai da estação, atravessa o corredor até o gabinete do diretor,
   * fala, e volta.
   *
   * O percurso é o mesmo que uma pessoa faria: porta da sala dos
   * agentes, corredor, porta do gabinete. Nenhum salto, pelo mesmo
   * motivo dos diretores.
   */
  avisar(cargo: Cargo): void {
    if (this.rota.length > 0 || this.conversando > 0) return;

    const agentes = salaPorId("agentes");
    const destino = gabineteDe(cargo);
    // Mesma mão dupla dos diretores (ver `caminho` em `planta.ts`).
    const faixa = destino.porta.x >= agentes.porta.x ? CORREDOR_Z - 0.85 : CORREDOR_Z + 0.85;
    this.rota = [
      { x: this.estacao.x, z: agentes.porta.z },
      agentes.porta,
      { x: agentes.porta.x, z: faixa },
      { x: destino.porta.x, z: faixa },
      destino.porta,
      { x: destino.parada.x + 1.4, z: destino.parada.z + 0.7 },
    ];
    this.voltando = false;
  }

  /** `true` quando está fora da estação, para a legenda dizer a verdade. */
  emTransito(): boolean {
    return this.rota.length > 0 || this.conversando > 0;
  }

  atualizar(delta: number): void {
    if (this.rota.length > 0) {
      this.caminhar(delta);
      return;
    }
    if (this.conversando > 0) {
      this.conversando -= delta;
      // Gesticula enquanto fala.
      this.fase += delta * 3;
      this.bracoDireito.rotation.x = -0.5 + Math.sin(this.fase * 2.2) * 0.4;
      this.bracoEsquerdo.rotation.x = -0.25;
      if (this.conversando <= 0 && !this.voltando) {
        this.voltarParaEstacao();
      }
      return;
    }

    // Trabalhando rápido quando há uso, lento quando não há. Nunca
    // totalmente imóvel: estes nunca "saem", só ficam ociosos.
    const ritmo = 1.4 + this.carga * 12;
    this.fase += delta * ritmo;

    const bate = Math.sin(this.fase);
    this.bracoEsquerdo.rotation.x = -1.1 + bate * (0.12 + this.carga * 0.3);
    this.bracoDireito.rotation.x = -1.1 - bate * (0.12 + this.carga * 0.3);
    this.cabeca.rotation.x = 0.28 + Math.sin(this.fase * 0.4) * 0.05;
    this.corpo.position.y = 0.72 + Math.sin(this.fase * 0.5) * 0.008;

    // A tela acompanha: pisca forte sob carga, fica em descanso sem uso.
    this.materialDoMonitor.emissiveIntensity =
      0.25 + this.carga * (0.9 + Math.abs(Math.sin(this.fase * 1.7)) * 1.4);
  }

  private voltarParaEstacao(): void {
    const agentes = salaPorId("agentes");
    const atualX = this.grupo.position.x;
    const faixa = agentes.porta.x >= atualX ? CORREDOR_Z - 0.85 : CORREDOR_Z + 0.85;
    this.rota = [
      { x: atualX, z: faixa },
      { x: agentes.porta.x, z: faixa },
      agentes.porta,
      { x: this.estacao.x, z: this.estacao.z },
    ];
    this.voltando = true;
  }

  private caminhar(delta: number): void {
    const alvo = this.rota[0];
    if (!alvo) return;

    const dx = alvo.x - this.grupo.position.x;
    const dz = alvo.z - this.grupo.position.z;
    const distancia = Math.hypot(dx, dz);
    const passo = 2.6 * delta;

    if (distancia <= passo) {
      this.grupo.position.x = alvo.x;
      this.grupo.position.z = alvo.z;
      this.rota.shift();
      if (this.rota.length === 0 && !this.voltando) this.conversando = 7 + Math.random() * 5;
      return;
    }

    this.grupo.position.x += (dx / distancia) * passo;
    this.grupo.position.z += (dz / distancia) * passo;
    this.grupo.rotation.y = Math.atan2(dx, dz);

    // Rodando na base, não andando: é máquina, e a diferença tem que
    // aparecer mesmo de longe.
    this.fase += delta * 7;
    this.corpo.rotation.y = Math.sin(this.fase) * 0.12;
    this.bracoEsquerdo.rotation.x = -0.4;
    this.bracoDireito.rotation.x = -0.4;
    this.grupo.position.y = Math.abs(Math.sin(this.fase * 2)) * 0.03;
  }
}
