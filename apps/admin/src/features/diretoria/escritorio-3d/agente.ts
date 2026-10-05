import * as THREE from "three";

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

  atualizar(delta: number): void {
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
}
