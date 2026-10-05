import * as THREE from "three";

import { caminho, gabineteDe, salaPorId, type Cargo, type Sala } from "./planta";

/** O que a pessoa está fazendo agora. É isto que a tela precisa dizer em palavras. */
export type Atividade =
  "na-mesa" | "indo" | "no-cafe" | "no-banheiro" | "em-reuniao" | "conversando";

interface Destino {
  sala: Sala;
  atividade: Atividade;
  /** Quanto tempo fica lá, em segundos. */
  permanencia: number;
}

/**
 * Um funcionário: o corpo que aparece na cena e a rotina que o move.
 *
 * ## Por que ele anda em vez de ficar parado
 *
 * O fundador pediu para ver os diretores trabalhando, e "trabalhando"
 * para uma pessoa olhando a tela não é um boneco sentado: é alguém que
 * levanta, vai ao cafezinho, passa na sala do colega para resolver uma
 * coisa, volta. A rotina abaixo é simples de propósito, mas as escolhas
 * dela não são aleatórias no sentido ruim: a mesa domina (é onde o
 * trabalho acontece), as idas rápidas são curtas e a sala de reunião só
 * recebe quem foi chamado por outro.
 *
 * ## O que ele NUNCA faz
 *
 * Aparecer quando o cargo está de folga. Um escritório cheio num dia em
 * que ninguém trabalha seria uma tela bonita mentindo, e o painel
 * inteiro existe para dizer a verdade sobre o que a diretoria está
 * fazendo.
 */
export class Boneco {
  readonly grupo = new THREE.Group();
  readonly cargo: Cargo;

  private readonly gabinete: Sala;
  private readonly pernaEsquerda: THREE.Mesh;
  private readonly pernaDireita: THREE.Mesh;
  private readonly bracoEsquerdo: THREE.Mesh;
  private readonly bracoDireito: THREE.Mesh;

  private rota: { x: number; z: number }[] = [];
  private esperando = 0;
  private salaAtual: Sala;
  private atividade: Atividade = "na-mesa";
  private faseDoPasso = 0;

  constructor(cargo: Cargo, cor: number) {
    this.cargo = cargo;
    this.gabinete = gabineteDe(cargo);
    this.salaAtual = this.gabinete;

    const pele = new THREE.MeshStandardMaterial({ color: 0xd8a07a, roughness: 0.8 });
    const camisa = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.7 });
    const calca = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });

    const tronco = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 4, 12), camisa);
    tronco.position.y = 1.02;
    tronco.castShadow = true;

    const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 16), pele);
    cabeca.position.y = 1.47;
    cabeca.castShadow = true;

    const cabelo = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x27201a, roughness: 0.9 }),
    );
    cabelo.position.y = 1.5;

    const geometriaDoMembro = new THREE.CapsuleGeometry(0.075, 0.34, 4, 8);
    this.pernaEsquerda = new THREE.Mesh(geometriaDoMembro, calca);
    this.pernaEsquerda.position.set(-0.11, 0.42, 0);
    this.pernaDireita = new THREE.Mesh(geometriaDoMembro, calca);
    this.pernaDireita.position.set(0.11, 0.42, 0);

    const geometriaDoBraco = new THREE.CapsuleGeometry(0.065, 0.3, 4, 8);
    this.bracoEsquerdo = new THREE.Mesh(geometriaDoBraco, camisa);
    this.bracoEsquerdo.position.set(-0.3, 1.05, 0);
    this.bracoDireito = new THREE.Mesh(geometriaDoBraco, camisa);
    this.bracoDireito.position.set(0.3, 1.05, 0);

    for (const parte of [
      tronco,
      cabeca,
      cabelo,
      this.pernaEsquerda,
      this.pernaDireita,
      this.bracoEsquerdo,
      this.bracoDireito,
    ]) {
      parte.castShadow = true;
      this.grupo.add(parte);
    }

    this.grupo.add(this.fazerPlaca(cargo));

    /*
      Escala 1,45. Um boneco em proporção humana real (1,70 m numa sala
      de 7 m) fica correto e ilegível: na primeira versão desta cena só
      se via um pontinho. A sala continua do tamanho de uma sala; quem
      cresceu foi a pessoa, porque é ela que o fundador pediu para ver.
    */
    this.grupo.scale.setScalar(1.45);
    this.grupo.position.set(this.gabinete.parada.x, 0, this.gabinete.parada.z);
    this.esperando = 4 + Math.random() * 10;
  }

  /**
   * A plaquinha com o cargo, flutuando acima da cabeça.
   *
   * Textura de canvas em vez de fonte 3D: não baixa arquivo de fonte,
   * não depende de rede e o texto sai nítido em qualquer zoom. `Sprite`
   * porque a placa tem que encarar a câmera mesmo quando a pessoa
   * estiver de costas.
   */
  private fazerPlaca(cargo: Cargo): THREE.Sprite {
    const tela = document.createElement("canvas");
    tela.width = 256;
    tela.height = 128;
    const pincel = tela.getContext("2d");
    if (pincel) {
      pincel.fillStyle = "rgba(15,23,42,0.85)";
      pincel.roundRect(8, 30, 240, 68, 16);
      pincel.fill();
      pincel.font = "bold 54px system-ui, sans-serif";
      pincel.fillStyle = "#f8fafc";
      pincel.textAlign = "center";
      pincel.textBaseline = "middle";
      pincel.fillText(cargo, 128, 66);
    }
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(tela), depthTest: false }),
    );
    sprite.scale.set(1.1, 0.55, 1);
    sprite.position.y = 2.05;
    sprite.renderOrder = 10;
    return sprite;
  }

  atividadeAtual(): Atividade {
    return this.atividade;
  }

  salaAtualNome(): string {
    return this.salaAtual.nome;
  }

  /** Mandado por outro boneco: largue o que está fazendo e vá à sala de reunião. */
  chamarParaReuniao(): void {
    if (this.atividade === "em-reuniao") return;
    this.irPara({ sala: salaPorId("reuniao"), atividade: "em-reuniao", permanencia: 14 });
  }

  private irPara(destino: Destino): void {
    this.rota = caminho(this.salaAtual, destino.sala);
    this.salaAtual = destino.sala;
    this.atividade = "indo";
    this.destino = destino;
  }

  private destino: Destino | null = null;

  private sortearDestino(): Destino {
    const sorte = Math.random();
    /*
      A mesa domina porque é onde o trabalho acontece. Os números
      refletem um expediente comum, não um parque de diversões: a maior
      parte do tempo sentado, uma ida ao café de vez em quando, banheiro
      raro, e conversa na sala de outro cargo quando há assunto cruzado
      (que na Rotta existe de verdade: o CFO fecha número que o CMO usa
      para dimensionar verba).
    */
    if (sorte < 0.5) {
      return { sala: this.gabinete, atividade: "na-mesa", permanencia: 18 + Math.random() * 25 };
    }
    if (sorte < 0.7) {
      return { sala: salaPorId("cafe"), atividade: "no-cafe", permanencia: 8 + Math.random() * 7 };
    }
    if (sorte < 0.8) {
      return {
        sala: salaPorId("banheiro"),
        atividade: "no-banheiro",
        permanencia: 5 + Math.random() * 4,
      };
    }
    return { sala: this.gabinete, atividade: "na-mesa", permanencia: 15 + Math.random() * 20 };
  }

  /** Visita o gabinete de outro cargo para tratar de assunto cruzado. */
  visitar(outro: Cargo): void {
    this.irPara({
      sala: gabineteDe(outro),
      atividade: "conversando",
      permanencia: 10 + Math.random() * 8,
    });
  }

  atualizar(delta: number): void {
    if (this.rota.length > 0) {
      this.andar(delta);
      return;
    }

    this.balancarParado(delta);
    this.esperando -= delta;
    if (this.esperando <= 0) {
      const destino = this.sortearDestino();
      if (destino.sala.id === this.salaAtual.id) {
        this.atividade = destino.atividade;
        this.esperando = destino.permanencia;
      } else {
        this.irPara(destino);
      }
    }
  }

  private andar(delta: number): void {
    const alvo = this.rota[0];
    if (!alvo) return;
    const dx = alvo.x - this.grupo.position.x;
    const dz = alvo.z - this.grupo.position.z;
    const distancia = Math.hypot(dx, dz);

    const VELOCIDADE = 2.1;
    const passo = VELOCIDADE * delta;

    if (distancia <= passo) {
      this.grupo.position.set(alvo.x, 0, alvo.z);
      this.rota.shift();
      if (this.rota.length === 0 && this.destino) {
        this.atividade = this.destino.atividade;
        this.esperando = this.destino.permanencia;
        this.destino = null;
      }
      return;
    }

    this.grupo.position.x += (dx / distancia) * passo;
    this.grupo.position.z += (dz / distancia) * passo;
    // Olhar para onde anda. `atan2(dx, dz)` porque o boneco nasce de
    // frente para +z.
    this.grupo.rotation.y = Math.atan2(dx, dz);

    this.faseDoPasso += delta * 9;
    const balanco = Math.sin(this.faseDoPasso);
    this.pernaEsquerda.rotation.x = balanco * 0.6;
    this.pernaDireita.rotation.x = -balanco * 0.6;
    this.bracoEsquerdo.rotation.x = -balanco * 0.45;
    this.bracoDireito.rotation.x = balanco * 0.45;
    this.grupo.position.y = Math.abs(Math.sin(this.faseDoPasso)) * 0.045;
  }

  /** Mesmo parado alguém respira. Sem isto a cena parece travada, não calma. */
  private balancarParado(delta: number): void {
    this.faseDoPasso += delta * 1.6;
    const respiro = Math.sin(this.faseDoPasso) * 0.03;
    this.grupo.position.y = Math.max(0, respiro * 0.5);
    this.pernaEsquerda.rotation.x *= 0.88;
    this.pernaDireita.rotation.x *= 0.88;
    this.bracoEsquerdo.rotation.x = respiro;
    this.bracoDireito.rotation.x = -respiro;
  }
}
