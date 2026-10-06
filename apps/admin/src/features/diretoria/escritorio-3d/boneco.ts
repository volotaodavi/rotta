import * as THREE from "three";

import { caminho, gabineteDe, salaPorId, type Cargo, type Sala } from "./planta";

import type { ControleDeVagas, Vaga } from "./vagas";

/** O que a pessoa está fazendo agora. É isto que a tela precisa dizer em palavras. */
export type Atividade =
  | "trabalhando"
  | "parado"
  | "no-celular"
  | "indo"
  | "no-cafe"
  | "no-banheiro"
  | "em-reuniao"
  | "conversando";

interface Destino {
  sala: Sala;
  atividade: Atividade;
  /** Quanto tempo fica lá, em segundos. */
  permanencia: number;
  /** O lugar reservado nessa sala. Ninguém entra sem ter um. */
  vaga: Vaga;
}

/**
 * Um funcionário: o corpo que aparece na cena e a rotina que o move.
 *
 * ## A regra que o fundador deu, e que manda em tudo aqui
 *
 * 05/10/2026: "deve mostrar eles trabalhando, olhando o computador,
 * mexendo. Isso só vale se eles estiverem realmente trabalhando. Se
 * estiverem fazendo nada eles ficam parados olhando e depois vão fazer
 * suas coisas, mexer no celular, pegar um café".
 *
 * Então `trabalhando` e `parado` são estados DIFERENTES e visíveis de
 * longe: quem trabalha está curvado sobre a mesa com as mãos digitando;
 * quem não tem o que fazer está de pé, olhando em volta, e daqui a
 * pouco pega o celular ou vai ao café. A cena recebe de fora
 * (`definirTrabalhando`) quem está de fato produzindo, e esse sinal vem
 * de fato real, nunca de sorteio.
 *
 * ## Nada de teletransporte
 *
 * Todo deslocamento é interpolado quadro a quadro ao longo do caminho
 * que `planta.ts` devolve, e esse caminho sempre passa pelo corredor.
 * Ninguém muda de sala sem atravessar a distância.
 */
export class Boneco {
  readonly grupo = new THREE.Group();
  readonly cargo: Cargo;

  private readonly gabinete: Sala;
  private readonly tronco: THREE.Mesh;
  private readonly cabeca: THREE.Mesh;
  private readonly pernaEsquerda: THREE.Mesh;
  private readonly pernaDireita: THREE.Mesh;
  private readonly bracoEsquerdo: THREE.Mesh;
  private readonly bracoDireito: THREE.Mesh;
  private readonly celular: THREE.Mesh;
  private readonly caneca: THREE.Mesh;

  private rota: { x: number; z: number }[] = [];
  private destino: Destino | null = null;
  private esperando = 0;
  private salaAtual: Sala;
  private atividade: Atividade = "parado";
  private fase = 0;
  private produzindo = false;
  private vagaAtual: Vaga | null = null;

  constructor(
    cargo: Cargo,
    cor: number,
    private readonly vagas: ControleDeVagas,
  ) {
    this.cargo = cargo;
    this.gabinete = gabineteDe(cargo);
    this.salaAtual = this.gabinete;

    const pele = new THREE.MeshStandardMaterial({ color: 0xc98f67, roughness: 0.8 });
    const camisa = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.65 });
    const calca = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85 });

    this.tronco = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 4, 12), camisa);
    this.tronco.position.y = 1.02;

    this.cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 16), pele);
    this.cabeca.position.y = 1.47;

    const cabelo = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x27201a, roughness: 0.95 }),
    );
    cabelo.position.y = 1.5;

    const membro = new THREE.CapsuleGeometry(0.075, 0.34, 4, 8);
    this.pernaEsquerda = new THREE.Mesh(membro, calca);
    this.pernaEsquerda.position.set(-0.11, 0.42, 0);
    this.pernaDireita = new THREE.Mesh(membro, calca);
    this.pernaDireita.position.set(0.11, 0.42, 0);

    const braco = new THREE.CapsuleGeometry(0.065, 0.3, 4, 8);
    this.bracoEsquerdo = new THREE.Mesh(braco, camisa);
    this.bracoEsquerdo.position.set(-0.3, 1.05, 0);
    this.bracoDireito = new THREE.Mesh(braco, camisa);
    this.bracoDireito.position.set(0.3, 1.05, 0);

    this.celular = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.17, 0.02),
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x1d4ed8,
        emissiveIntensity: 0.9,
      }),
    );
    this.celular.visible = false;

    this.caneca = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.06, 0.13, 10),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
    );
    this.caneca.visible = false;

    for (const parte of [
      this.tronco,
      this.cabeca,
      cabelo,
      this.pernaEsquerda,
      this.pernaDireita,
      this.bracoEsquerdo,
      this.bracoDireito,
      this.celular,
      this.caneca,
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
    // Nasce já ocupando a própria mesa: o gabinete tem uma vaga só, e
    // ela é dele.
    this.vagaAtual = this.vagas.reservar(this.gabinete.id);
    const inicio = this.vagaAtual ?? this.gabinete.parada;
    this.grupo.position.set(inicio.x, 0, inicio.z);
    this.esperando = 2 + Math.random() * 8;
  }

  /**
   * A plaquinha com o cargo, flutuando acima da cabeça.
   *
   * Textura de canvas em vez de fonte 3D: não baixa arquivo de fonte,
   * não depende de rede e o texto sai nítido em qualquer zoom. `Sprite`
   * porque a placa tem que encarar a câmera mesmo quando a pessoa
   * estiver de costas.
   */
  private fazerPlaca(texto: string): THREE.Sprite {
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
      pincel.fillText(texto, 128, 66);
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

  /**
   * Diz se este cargo está produzindo de verdade AGORA.
   *
   * Vem de fora e vem de fato: turno em andamento dentro da janela de
   * trabalho. Quando é `false`, a pessoa continua no escritório mas
   * para de digitar: fica de pé, olha em volta, mexe no celular, vai ao
   * café. É exatamente a diferença que o fundador pediu, e ela só vale
   * alguma coisa porque o sinal não é inventado aqui dentro.
   */
  definirTrabalhando(produzindo: boolean): void {
    this.produzindo = produzindo;
  }

  /** Mandado por outro boneco: largue o que está fazendo e vá à sala de reunião. */
  chamarParaReuniao(): boolean {
    if (this.atividade === "em-reuniao") return false;
    return this.tentarIrPara(salaPorId("reuniao"), "em-reuniao", 16);
  }

  /** Visita o gabinete de outro cargo para tratar de assunto cruzado. */
  visitar(outro: Cargo): boolean {
    return this.tentarIrPara(gabineteDe(outro), "conversando", 11 + Math.random() * 8);
  }

  /** Volta para a própria mesa. Usado depois de uma conversa ou reunião. */
  voltarParaMesa(): void {
    this.tentarIrPara(this.gabinete, this.produzindo ? "trabalhando" : "parado", 16);
  }

  /**
   * Tenta ir para uma sala. Devolve `false` quando a sala está cheia, e
   * nesse caso o boneco NÃO sai do lugar: é assim que o banheiro aceita
   * um por vez e o cafezinho para de empilhar gente no mesmo ponto.
   */
  private tentarIrPara(sala: Sala, atividade: Atividade, permanencia: number): boolean {
    if (sala.id === this.salaAtual.id) {
      this.atividade = atividade;
      this.esperando = permanencia;
      return true;
    }

    const vaga = this.vagas.reservar(sala.id);
    if (!vaga) return false;

    // Só larga o lugar antigo depois de garantir o novo. Na ordem
    // inversa, dois bonecos trocando de sala ao mesmo tempo poderiam
    // ficar os dois sem lugar.
    this.vagas.liberar(this.vagaAtual);
    this.vagaAtual = vaga;

    this.rota = caminho(this.salaAtual, sala);
    // O último ponto da rota é a vaga reservada, não o centro da sala.
    this.rota[this.rota.length - 1] = { x: vaga.x, z: vaga.z };
    this.salaAtual = sala;
    this.atividade = "indo";
    this.destino = { sala, atividade, permanencia, vaga };
    this.celular.visible = false;
    this.caneca.visible = false;
    return true;
  }

  private sortearDestino(): { sala: Sala; atividade: Atividade; permanencia: number } {
    const sorte = Math.random();

    if (this.produzindo) {
      /*
        Quem está em turno passa a maior parte do tempo na mesa. As
        saídas existem para a cena respirar, mas são curtas e raras: um
        diretor que vive no cafezinho seria uma tela engraçada contando
        uma mentira.
      */
      if (sorte < 0.72) {
        return {
          sala: this.gabinete,
          atividade: "trabalhando",
          permanencia: 22 + Math.random() * 30,
        };
      }
      if (sorte < 0.88) {
        return {
          sala: salaPorId("cafe"),
          atividade: "no-cafe",
          permanencia: 9 + Math.random() * 6,
        };
      }
      return {
        sala: salaPorId("banheiro"),
        atividade: "no-banheiro",
        permanencia: 6 + Math.random() * 4,
      };
    }

    /*
      Fora de produção: a ordem do fundador é "ficam parados olhando e
      depois vão fazer suas coisas". Então o estado base é parado, e as
      coisas dele são celular, café e banheiro.
    */
    if (sorte < 0.34) {
      return { sala: this.gabinete, atividade: "parado", permanencia: 10 + Math.random() * 12 };
    }
    if (sorte < 0.6) {
      return { sala: this.gabinete, atividade: "no-celular", permanencia: 12 + Math.random() * 10 };
    }
    if (sorte < 0.85) {
      return {
        sala: salaPorId("cafe"),
        atividade: "no-cafe",
        permanencia: 12 + Math.random() * 10,
      };
    }
    return {
      sala: salaPorId("banheiro"),
      atividade: "no-banheiro",
      permanencia: 6 + Math.random() * 5,
    };
  }

  atualizar(delta: number): void {
    if (this.rota.length > 0) {
      this.andar(delta);
      return;
    }

    this.animarParado(delta);

    this.esperando -= delta;
    if (this.esperando > 0) return;

    const escolha = this.sortearDestino();
    if (!this.tentarIrPara(escolha.sala, escolha.atividade, escolha.permanencia)) {
      /*
        Sala cheia. Em vez de insistir ou de entrar por cima de alguém,
        fica onde está por um tempo e tenta outra coisa depois. É o que
        uma pessoa faz ao achar o banheiro ocupado.
      */
      this.atividade = this.produzindo ? "trabalhando" : "parado";
      this.esperando = 5 + Math.random() * 6;
    }
  }

  private andar(delta: number): void {
    const alvo = this.rota[0];
    if (!alvo) return;

    const dx = alvo.x - this.grupo.position.x;
    const dz = alvo.z - this.grupo.position.z;
    const distancia = Math.hypot(dx, dz);
    const passo = 2.3 * delta;

    if (distancia <= passo) {
      this.grupo.position.set(alvo.x, this.grupo.position.y, alvo.z);
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

    this.fase += delta * 9;
    const balanco = Math.sin(this.fase);
    this.pernaEsquerda.rotation.x = balanco * 0.62;
    this.pernaDireita.rotation.x = -balanco * 0.62;
    this.bracoEsquerdo.rotation.x = -balanco * 0.5;
    this.bracoDireito.rotation.x = balanco * 0.5;
    this.tronco.rotation.x = 0.06;
    this.grupo.position.y = Math.abs(Math.sin(this.fase)) * 0.05;
  }

  /** Cada atividade tem um corpo próprio. É daqui que sai "dá para ver o que ele está fazendo". */
  private animarParado(delta: number): void {
    this.fase += delta;
    this.celular.visible = false;
    this.caneca.visible = false;

    const suavizar = (atual: number, alvo: number, forca = 0.12): number =>
      atual + (alvo - atual) * forca;

    this.pernaEsquerda.rotation.x = suavizar(this.pernaEsquerda.rotation.x, 0);
    this.pernaDireita.rotation.x = suavizar(this.pernaDireita.rotation.x, 0);

    switch (this.atividade) {
      case "trabalhando": {
        // Curvado sobre a mesa, mãos à frente, dedos batendo.
        const digitando = Math.sin(this.fase * 11);
        this.tronco.rotation.x = suavizar(this.tronco.rotation.x, 0.34);
        this.cabeca.rotation.x = suavizar(this.cabeca.rotation.x, 0.36);
        this.bracoEsquerdo.rotation.x = suavizar(
          this.bracoEsquerdo.rotation.x,
          -1.25 + digitando * 0.1,
          0.3,
        );
        this.bracoDireito.rotation.x = suavizar(
          this.bracoDireito.rotation.x,
          -1.25 - digitando * 0.1,
          0.3,
        );
        this.grupo.position.y = 0;
        break;
      }
      case "no-celular": {
        this.celular.visible = true;
        this.celular.position.set(0.16, 1.22, 0.3);
        this.celular.rotation.set(-0.9, 0, 0);
        this.tronco.rotation.x = suavizar(this.tronco.rotation.x, 0.12);
        this.cabeca.rotation.x = suavizar(this.cabeca.rotation.x, 0.5);
        this.bracoDireito.rotation.x = suavizar(this.bracoDireito.rotation.x, -1.15);
        this.bracoEsquerdo.rotation.x = suavizar(this.bracoEsquerdo.rotation.x, -0.2);
        this.grupo.position.y = 0;
        break;
      }
      case "no-cafe": {
        this.caneca.visible = true;
        this.caneca.position.set(0.26, 1.2, 0.18);
        // Um gole de vez em quando, não um robô bebendo sem parar.
        const gole = Math.max(0, Math.sin(this.fase * 0.9));
        this.bracoDireito.rotation.x = suavizar(this.bracoDireito.rotation.x, -0.5 - gole * 0.75);
        this.cabeca.rotation.x = suavizar(this.cabeca.rotation.x, -gole * 0.25);
        this.tronco.rotation.x = suavizar(this.tronco.rotation.x, 0);
        this.caneca.position.y = 1.2 + gole * 0.22;
        this.grupo.position.y = Math.sin(this.fase * 1.4) * 0.012;
        break;
      }
      case "em-reuniao":
      case "conversando": {
        // Gesticula enquanto fala, e olha para o lado de vez em quando.
        const gesto = Math.sin(this.fase * 2.6);
        this.bracoDireito.rotation.x = suavizar(
          this.bracoDireito.rotation.x,
          -0.55 + gesto * 0.3,
          0.2,
        );
        this.bracoEsquerdo.rotation.x = suavizar(
          this.bracoEsquerdo.rotation.x,
          -0.2 - gesto * 0.2,
          0.2,
        );
        this.cabeca.rotation.y = Math.sin(this.fase * 0.8) * 0.4;
        this.tronco.rotation.x = suavizar(this.tronco.rotation.x, 0);
        this.grupo.position.y = Math.sin(this.fase * 1.5) * 0.015;
        break;
      }
      case "no-banheiro": {
        this.tronco.rotation.x = suavizar(this.tronco.rotation.x, 0);
        this.cabeca.rotation.x = suavizar(this.cabeca.rotation.x, 0);
        this.bracoEsquerdo.rotation.x = suavizar(this.bracoEsquerdo.rotation.x, 0);
        this.bracoDireito.rotation.x = suavizar(this.bracoDireito.rotation.x, 0);
        this.grupo.position.y = Math.sin(this.fase * 1.3) * 0.01;
        break;
      }
      default: {
        // Parado de verdade: respira, olha em volta, muda o peso de pé.
        this.tronco.rotation.x = suavizar(this.tronco.rotation.x, 0);
        this.cabeca.rotation.x = suavizar(this.cabeca.rotation.x, 0);
        this.cabeca.rotation.y = Math.sin(this.fase * 0.55) * 0.75;
        this.bracoEsquerdo.rotation.x = suavizar(
          this.bracoEsquerdo.rotation.x,
          Math.sin(this.fase) * 0.05,
        );
        this.bracoDireito.rotation.x = suavizar(
          this.bracoDireito.rotation.x,
          -Math.sin(this.fase) * 0.05,
        );
        this.grupo.position.y = Math.abs(Math.sin(this.fase * 1.2)) * 0.012;
        this.grupo.rotation.z = Math.sin(this.fase * 0.4) * 0.02;
      }
    }
  }
}
