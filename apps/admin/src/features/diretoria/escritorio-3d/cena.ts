import * as THREE from "three";

import { AgenteDaPlataforma } from "./agente";
import { Boneco } from "./boneco";
import {
  AGENTES_DA_PLATAFORMA,
  COR_DO_CARGO,
  CORREDOR_LARGURA,
  CORREDOR_Z,
  LARGURA_DO_ANDAR,
  PROFUNDIDADE_DO_ANDAR,
  SALAS,
  type Cargo,
  type Sala,
} from "./planta";
import { ControleDeVagas } from "./vagas";

export interface EstadoDoAndar {
  /** Quem está em turno agora. Quem não está simplesmente não aparece. */
  emTurno: Cargo[];
  /**
   * Quem, dentre os que estão no andar, está DENTRO da janela de
   * trabalho agora. Em turno mas fora do horário quer dizer presente e
   * ocioso: fica parado, mexe no celular, pega um café.
   */
  produzindo?: Cargo[];
  /** 0 a 1, medido na plataforma. Governa o ritmo dos agentes de IA. */
  cargaDaPlataforma?: number;
}

export interface ResumoDeUmTrabalhador {
  cargo: Cargo;
  sala: string;
  atividade: string;
}

const TEXTO_DA_ATIVIDADE: Record<string, string> = {
  trabalhando: "trabalhando",
  parado: "parado, sem tarefa",
  "no-celular": "no celular",
  indo: "a caminho",
  "no-cafe": "no cafezinho",
  "no-banheiro": "no banheiro",
  "em-reuniao": "em reunião",
  conversando: "conversando",
};

/**
 * O escritório da diretoria em três dimensões.
 *
 * ## Por que isto existe
 *
 * Pedido do fundador, repetido três vezes entre 04 e 05/10/2026: ver os
 * diretores trabalhando, não um gráfico dizendo que trabalharam. A
 * tela de governança continua sendo a fonte dos fatos (PR aberto,
 * decisão registrada, próximo turno); esta cena é a leitura humana
 * desses fatos, e ela só mostra gente quando existe gente em turno.
 *
 * ## O que é verdade e o que é encenação
 *
 * **Verdade:** quem aparece. Um cargo só entra em cena se a escala de
 * hoje (`escala.ts`, que espelha `empresa/CALENDARIO.md` e os
 * agendamentos reais) disser que ele trabalha. Fim de semana e feriado
 * esvaziam o andar.
 *
 * **Encenação:** o caminho que cada um faz dentro do escritório. Um
 * agente não vai mesmo ao banheiro. O movimento existe para a tela ser
 * legível de relance, e em nenhum lugar ela afirma que aquele passo
 * específico aconteceu.
 *
 * Essa fronteira está escrita aqui porque é a única coisa que pode
 * apodrecer: no dia em que alguém usar esta cena para afirmar um fato
 * que ela não mede, o painel vira enfeite.
 *
 * ## Três.js sem dependência paga
 *
 * Biblioteca aberta, roda no navegador do admin, nenhum serviço
 * externo, nenhuma conta, nenhum custo. Foi a pergunta direta do
 * fundador e a resposta é esta.
 */
export class CenaDoEscritorio {
  private readonly cena = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly relogio = new THREE.Clock();
  private readonly bonecos: Boneco[] = [];
  private readonly agentes: AgenteDaPlataforma[] = [];
  private readonly vagas = new ControleDeVagas();
  private readonly luzesDeSala = new Map<string, THREE.PointLight>();
  private readonly container: HTMLElement;

  private quadro = 0;
  private anguloDaCamera = -0.55;
  private alturaDaCamera = 0.82;
  private distancia = 37;
  private vivo = true;
  private proximaReuniao = 55 + Math.random() * 70;
  private proximaVisita = 25 + Math.random() * 35;
  private proximoAviso = 18 + Math.random() * 25;
  private reduzirMovimento = false;

  constructor(container: HTMLElement, estado: EstadoDoAndar) {
    this.container = container;
    this.reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.cursor = "grab";
    this.renderer.domElement.setAttribute("role", "img");
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Planta do escritório da diretoria, em três dimensões, com um boneco para cada cargo em turno.",
    );

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);
    this.montarAndar();
    this.montarLetreiro();
    this.montarLuzes();
    this.montarBonecos(estado);
    this.redimensionar();
    this.ligarArrastar();

    window.addEventListener("resize", this.redimensionar);
    document.addEventListener("visibilitychange", this.aoTrocarVisibilidade);
    this.animar();
  }

  /** Quem está trabalhando agora e onde, para a legenda em texto ao lado. */
  resumo(): ResumoDeUmTrabalhador[] {
    return this.bonecos.map((boneco) => ({
      cargo: boneco.cargo,
      sala: boneco.salaAtualNome(),
      atividade: TEXTO_DA_ATIVIDADE[boneco.atividadeAtual()] ?? boneco.atividadeAtual(),
    }));
  }

  /** O estado dos agentes da plataforma, que não têm escala. */
  resumoDosAgentes(): { nome: string; estado: string }[] {
    return this.agentes.map((agente) => ({ nome: agente.nome, estado: agente.estado() }));
  }

  /**
   * Atualiza o ritmo dos agentes sem reconstruir a cena. Chamado a cada
   * leitura nova do pulso da plataforma.
   */
  definirCargaDaPlataforma(carga: number): void {
    for (const agente of this.agentes) agente.definirCarga(carga);
  }

  destruir(): void {
    this.vivo = false;
    cancelAnimationFrame(this.quadro);
    window.removeEventListener("resize", this.redimensionar);
    document.removeEventListener("visibilitychange", this.aoTrocarVisibilidade);
    this.cena.traverse((no) => {
      if (no instanceof THREE.Mesh) {
        no.geometry.dispose();
        const material = no.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private montarAndar(): void {
    const piso = new THREE.Mesh(
      new THREE.BoxGeometry(LARGURA_DO_ANDAR, 0.2, PROFUNDIDADE_DO_ANDAR),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.95 }),
    );
    piso.position.set(LARGURA_DO_ANDAR / 2, -0.1, PROFUNDIDADE_DO_ANDAR / 2);
    piso.receiveShadow = true;
    this.cena.add(piso);

    const corredor = new THREE.Mesh(
      new THREE.BoxGeometry(LARGURA_DO_ANDAR - 2, 0.04, CORREDOR_LARGURA),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.75 }),
    );
    corredor.position.set(LARGURA_DO_ANDAR / 2, 0.02, CORREDOR_Z);
    corredor.receiveShadow = true;
    this.cena.add(corredor);

    for (const sala of SALAS) this.montarSala(sala);
  }

  private montarSala(sala: Sala): void {
    const centroX = sala.x + sala.largura / 2;
    const centroZ = sala.z + sala.profundidade / 2;

    const chao = new THREE.Mesh(
      new THREE.BoxGeometry(sala.largura, 0.06, sala.profundidade),
      new THREE.MeshStandardMaterial({ color: sala.cor, roughness: 0.9, metalness: 0.05 }),
    );
    chao.position.set(centroX, 0.03, centroZ);
    chao.receiveShadow = true;
    this.cena.add(chao);

    /*
      Paredes baixas, de 1,1 m. Altura real de parede esconderia o
      interior das salas na vista de cima, e o ponto da tela é
      justamente ver o que acontece dentro delas.
    */
    const ALTURA = 1.35;
    const material = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.85,
      transparent: true,
      opacity: 0.55,
    });

    const paredes: [number, number, number, number][] = [
      [centroX, sala.z, sala.largura, 0.12],
      [centroX, sala.z + sala.profundidade, sala.largura, 0.12],
      [sala.x, centroZ, 0.12, sala.profundidade],
      [sala.x + sala.largura, centroZ, 0.12, sala.profundidade],
    ];

    for (const [px, pz, largura, profundidade] of paredes) {
      const parede = new THREE.Mesh(new THREE.BoxGeometry(largura, ALTURA, profundidade), material);
      parede.position.set(px, ALTURA / 2, pz);
      parede.castShadow = true;
      this.cena.add(parede);
    }

    const luz = new THREE.PointLight(0xfff4e0, 0, 9, 2);
    luz.position.set(centroX, 2.6, centroZ);
    this.luzesDeSala.set(sala.id, luz);
    this.cena.add(luz);

    this.montarMobilia(sala, centroX, centroZ);
  }

  private montarMobilia(sala: Sala, centroX: number, centroZ: number): void {
    const madeira = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const metal = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.4,
      metalness: 0.6,
    });
    const tela = new THREE.MeshStandardMaterial({
      color: 0x0b1220,
      emissive: 0x2563eb,
      emissiveIntensity: 1.1,
      roughness: 0.25,
    });
    const preto = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });
    const estofado = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.95 });

    const por = (malha: THREE.Mesh, x: number, y: number, z: number): void => {
      malha.position.set(x, y, z);
      malha.castShadow = true;
      this.cena.add(malha);
    };

    if (sala.tipo === "gabinete") {
      /*
        Uma estação de trabalho de verdade: tampo com pés, monitor com
        pé e moldura, teclado e mouse. Na primeira versão era uma caixa
        e um retângulo azul, e o fundador apontou: "computador
        realista". Cada peça aqui existe porque uma mesa sem ela parece
        maquete.
      */
      const tampo = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.15), madeira);
      por(tampo, centroX, 0.74, centroZ - 1.15);
      for (const lado of [-1, 1]) {
        const pe = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.72, 1), metal);
        por(pe, centroX + lado * 1.1, 0.36, centroZ - 1.15);
      }

      const peDoMonitor = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.09, 0.26, 10), metal);
      por(peDoMonitor, centroX, 0.9, centroZ - 1.45);
      const moldura = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.62, 0.05), preto);
      por(moldura, centroX, 1.35, centroZ - 1.46);
      const painelDoMonitor = new THREE.Mesh(new THREE.PlaneGeometry(0.93, 0.53), tela);
      painelDoMonitor.position.set(centroX, 1.35, centroZ - 1.43);
      this.cena.add(painelDoMonitor);

      const teclado = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.03, 0.24), preto);
      por(teclado, centroX, 0.8, centroZ - 0.98);
      const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), preto);
      por(mouse, centroX + 0.52, 0.8, centroZ - 0.98);

      // Cadeira com encosto, não um cilindro.
      const assento = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.09, 0.5), estofado);
      por(assento, centroX, 0.48, centroZ - 0.35);
      const encosto = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.6, 0.08), estofado);
      encosto.rotation.x = -0.12;
      por(encosto, centroX, 0.8, centroZ - 0.1);
      const colunaDaCadeira = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), metal);
      por(colunaDaCadeira, centroX, 0.24, centroZ - 0.35);
      const baseDaCadeira = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12), preto);
      por(baseDaCadeira, centroX, 0.05, centroZ - 0.35);

      const vasoPlanta = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.17, 0.3, 10),
        new THREE.MeshStandardMaterial({ color: 0x7f5539, roughness: 0.9 }),
      );
      por(vasoPlanta, sala.x + 0.9, 0.15, sala.z + sala.profundidade - 0.9);
      const folhagem = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.95 }),
      );
      por(folhagem, sala.x + 0.9, 0.62, sala.z + sala.profundidade - 0.9);
      return;
    }

    if (sala.tipo === "reuniao") {
      const mesa = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.12, 24), madeira);
      por(mesa, centroX, 0.75, centroZ);
      for (let i = 0; i < 6; i += 1) {
        const angulo = (i / 6) * Math.PI * 2;
        const cadeira = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.45, 10), metal);
        por(cadeira, centroX + Math.cos(angulo) * 2.3, 0.22, centroZ + Math.sin(angulo) * 2.3);
      }
      return;
    }

    if (sala.tipo === "cafe") {
      const bancada = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.8), madeira);
      por(bancada, centroX, 0.9, sala.z + 0.9);
      const maquina = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.45), metal);
      por(maquina, centroX - 0.9, 1.3, sala.z + 0.9);
      const mesinha = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 16), madeira);
      por(mesinha, centroX, 0.72, centroZ + 1.6);
      return;
    }

    if (sala.tipo === "agentes") {
      // As estações vêm com cada agente (ver `agente.ts`). Aqui só o
      // painel de parede, que dá a cara de sala de operação.
      const painel = new THREE.Mesh(
        new THREE.BoxGeometry(sala.largura - 2, 1.2, 0.1),
        new THREE.MeshStandardMaterial({
          color: 0x082f49,
          emissive: 0x0369a1,
          emissiveIntensity: 0.5,
        }),
      );
      por(painel, centroX, 1.7, sala.z + 0.2);
      return;
    }

    if (sala.tipo === "temporarios") {
      /*
        Mesas vazias de propósito. Os diretores podem criar funcionário
        para uma frente específica, e enquanto não criarem, a sala fica
        assim: pronta e sem ninguém. Uma sala cheia de gente que não
        existe seria a pior mentira possível nesta tela.
      */
      for (let i = 0; i < 3; i += 1) {
        const mesa = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.09, 0.8), madeira);
        por(mesa, centroX, 0.72, sala.z + 2 + i * 2.1);
      }
      return;
    }

    const vaso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.55, 14),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 }),
    );
    por(vaso, centroX, 0.28, sala.z + 1.2);
    const pia = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.5), metal);
    por(pia, centroX, 0.9, sala.z + sala.profundidade - 1);
  }

  /**
   * O letreiro da Rotta na parede do fundo, virado para quem olha.
   *
   * Pedido do fundador: "coloque a logo da Rotta na parede, como se
   * fosse um orgulho da empresa". Fica alto e aceso, acima da sala de
   * reunião, que é a parte do andar que mais aparece de qualquer
   * ângulo. Azul `#3B6EF6`, o mesmo primário do tema do produto, para
   * a cena não inventar uma segunda identidade visual.
   */
  private montarLetreiro(): void {
    const tela = document.createElement("canvas");
    tela.width = 1024;
    tela.height = 256;
    const pincel = tela.getContext("2d");
    if (pincel) {
      pincel.clearRect(0, 0, 1024, 256);
      pincel.font = "bold 170px 'Trebuchet MS', system-ui, sans-serif";
      pincel.textAlign = "center";
      pincel.textBaseline = "middle";
      pincel.fillStyle = "#3B6EF6";
      pincel.fillText("Rotta", 512, 120);
      pincel.font = "500 44px system-ui, sans-serif";
      pincel.fillStyle = "#94a3b8";
      pincel.letterSpacing = "10px";
      pincel.fillText("TRANSPORTE ESCOLAR", 512, 210);
    }

    const textura = new THREE.CanvasTexture(tela);
    const placa = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 2.25),
      new THREE.MeshStandardMaterial({
        map: textura,
        transparent: true,
        emissive: 0x3b6ef6,
        emissiveMap: textura,
        emissiveIntensity: 0.85,
      }),
    );
    /*
      Parede do fundo, em z pequeno, e sem rotação: o `PlaneGeometry`
      nasce de frente para +z, que é o lado de onde a câmera olha.

      Duas tentativas erradas antes desta, as duas pegas olhando a
      captura e não relendo o código: primeiro um giro de 180 graus
      deixou o letreiro virado para fora do prédio; depois, posto na
      parede de z grande, ele ficou ENTRE a câmera e as salas, flutuando
      por cima delas.
    */
    placa.position.set(LARGURA_DO_ANDAR / 2, 3.4, 0.2);
    this.cena.add(placa);

    const foco = new THREE.PointLight(0x3b6ef6, 18, 16, 2);
    foco.position.set(LARGURA_DO_ANDAR / 2, 3.1, 1.6);
    this.cena.add(foco);
  }

  private montarLuzes(): void {
    this.cena.add(new THREE.HemisphereLight(0xbfdbfe, 0x0b1220, 1.3));
    /*
      Luz de preenchimento vinda do lado oposto ao sol. Sem ela, o lado
      escuro de cada boneco somia no piso escuro e a cena virava um
      conjunto de salas vazias com vultos dentro.
    */
    const preenchimento = new THREE.DirectionalLight(0xc7d2fe, 0.6);
    preenchimento.position.set(-12, 14, -8);
    this.cena.add(preenchimento);
    const sol = new THREE.DirectionalLight(0xffffff, 1.9);
    sol.position.set(18, 26, 6);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    sol.shadow.camera.left = -22;
    sol.shadow.camera.right = 22;
    sol.shadow.camera.top = 22;
    sol.shadow.camera.bottom = -22;
    this.cena.add(sol);
  }

  private montarBonecos(estado: EstadoDoAndar): void {
    for (const [id, luz] of this.luzesDeSala) {
      const sala = SALAS.find((s) => s.id === id);
      const comum = sala?.dono === undefined;
      const aceso = comum ? estado.emTurno.length > 0 : estado.emTurno.includes(sala!.dono!);
      luz.intensity = aceso ? 22 : 0;
    }

    const produzindo = new Set(estado.produzindo ?? estado.emTurno);
    for (const cargo of estado.emTurno) {
      const boneco = new Boneco(cargo, COR_DO_CARGO[cargo], this.vagas);
      boneco.definirTrabalhando(produzindo.has(cargo));
      this.bonecos.push(boneco);
      this.cena.add(boneco.grupo);
    }

    this.montarAgentes(estado.cargaDaPlataforma ?? 0);
  }

  /**
   * Os sete agentes do produto, em fileira na sala deles.
   *
   * Sempre presentes, inclusive em feriado e fim de semana, porque é
   * assim que eles são: rodam quando alguém usa a Rotta, não quando o
   * relógio permite. A luz da sala deles também nunca apaga.
   */
  private montarAgentes(carga: number): void {
    const sala = SALAS.find((s) => s.id === "agentes");
    if (!sala) return;

    const porFileira = 4;
    const espacoX = 3;
    const espacoZ = 3.4;

    AGENTES_DA_PLATAFORMA.forEach((definicao, indice) => {
      const coluna = indice % porFileira;
      const fileira = Math.floor(indice / porFileira);
      const x = sala.x + 2 + coluna * espacoX;
      const z = sala.z + 2.4 + fileira * espacoZ;
      const agente = new AgenteDaPlataforma(definicao.nome, definicao.cor, x, z);
      agente.definirCarga(carga);
      this.agentes.push(agente);
      this.cena.add(agente.grupo);
    });

    const luz = this.luzesDeSala.get("agentes");
    if (luz) luz.intensity = 26;
  }

  private readonly redimensionar = (): void => {
    const largura = this.container.clientWidth || 800;
    const altura = this.container.clientHeight || 460;
    this.renderer.setSize(largura, altura, false);
    this.camera.aspect = largura / altura;
    this.camera.updateProjectionMatrix();
    this.posicionarCamera();
  };

  private posicionarCamera(): void {
    const alvo = new THREE.Vector3(LARGURA_DO_ANDAR / 2, 0, PROFUNDIDADE_DO_ANDAR / 2);
    this.camera.position.set(
      alvo.x + Math.sin(this.anguloDaCamera) * this.distancia,
      this.distancia * this.alturaDaCamera,
      alvo.z + Math.cos(this.anguloDaCamera) * this.distancia,
    );
    this.camera.lookAt(alvo);
  }

  /** Arrastar gira, roda aproxima. Sem biblioteca de controle: são vinte linhas. */
  private ligarArrastar(): void {
    const tela = this.renderer.domElement;
    let arrastando = false;
    let ultimoX = 0;
    let ultimoY = 0;

    tela.addEventListener("pointerdown", (evento) => {
      arrastando = true;
      ultimoX = evento.clientX;
      ultimoY = evento.clientY;
      tela.setPointerCapture(evento.pointerId);
      tela.style.cursor = "grabbing";
    });
    tela.addEventListener("pointerup", (evento) => {
      arrastando = false;
      tela.releasePointerCapture(evento.pointerId);
      tela.style.cursor = "grab";
    });
    tela.addEventListener("pointermove", (evento) => {
      if (!arrastando) return;
      this.anguloDaCamera -= (evento.clientX - ultimoX) * 0.006;
      this.alturaDaCamera = Math.min(
        1.4,
        Math.max(0.35, this.alturaDaCamera + (evento.clientY - ultimoY) * 0.004),
      );
      ultimoX = evento.clientX;
      ultimoY = evento.clientY;
      this.posicionarCamera();
    });
    tela.addEventListener(
      "wheel",
      (evento) => {
        evento.preventDefault();
        this.distancia = Math.min(55, Math.max(14, this.distancia + evento.deltaY * 0.02));
        this.posicionarCamera();
      },
      { passive: false },
    );
  }

  /** Aba escondida não desenha. Um escritório animado num segundo plano é só bateria queimando. */
  private readonly aoTrocarVisibilidade = (): void => {
    if (document.hidden) {
      cancelAnimationFrame(this.quadro);
    } else if (this.vivo) {
      this.relogio.getDelta();
      this.animar();
    }
  };

  private readonly animar = (): void => {
    if (!this.vivo) return;
    this.quadro = requestAnimationFrame(this.animar);

    const delta = Math.min(this.relogio.getDelta(), 0.1);
    if (!this.reduzirMovimento) {
      for (const boneco of this.bonecos) boneco.atualizar(delta);
      for (const agente of this.agentes) agente.atualizar(delta);
      this.separarCorpos();
      this.talvezChamarReuniao(delta);
      this.talvezVisitarOutraSala(delta);
      this.talvezAgenteAvisarDiretor(delta);
    }
    this.renderer.render(this.cena, this.camera);
  };

  /**
   * De vez em quando dois cargos se encontram na sala de reunião. Não é
   * enfeite: na Rotta existe assunto cruzado de verdade, e o fundador
   * pediu para ver isso acontecendo.
   */
  /**
   * De vez em quando alguém atravessa o corredor para falar com outro
   * cargo na sala dele. É o "ir até outra sala para falar do assunto
   * adjacente e voltar" que o fundador pediu, e na Rotta esse assunto
   * existe de verdade: o CFO fecha o número que o CMO usa para
   * dimensionar verba.
   */
  private talvezVisitarOutraSala(delta: number): void {
    if (this.bonecos.length < 2) return;
    this.proximaVisita -= delta;
    if (this.proximaVisita > 0) return;

    this.proximaVisita = 35 + Math.random() * 50;
    const embaralhados = [...this.bonecos].sort(() => Math.random() - 0.5);
    const visitante = embaralhados[0];
    const anfitriao = embaralhados[1];
    if (visitante && anfitriao) visitante.visitar(anfitriao.cargo);
  }

  /**
   * Ninguém ocupa o mesmo espaço que outro.
   *
   * As vagas por sala resolveram quem está parado e as duas mãos do
   * corredor resolveram quem está passando, mas medindo ao longo de dois
   * minutos ainda sobrava um roçar na porta, onde as duas faixas se
   * encontram. Esta passada é a rede final: se dois corpos chegam a
   * menos que a soma dos raios, cada um é empurrado metade da diferença
   * para o lado oposto.
   *
   * É deliberadamente simples, sem massa nem velocidade: o objetivo não
   * é simular física, é garantir que duas pessoas nunca ocupem o mesmo
   * ponto, que foi o defeito que o fundador viu.
   */
  private separarCorpos(): void {
    const corpos = [...this.bonecos.map((b) => b.grupo), ...this.agentes.map((a) => a.grupo)];
    const RAIO = 0.34;

    for (let i = 0; i < corpos.length; i += 1) {
      for (let j = i + 1; j < corpos.length; j += 1) {
        const a = corpos[i];
        const b = corpos[j];
        if (!a || !b) continue;

        const dx = b.position.x - a.position.x;
        const dz = b.position.z - a.position.z;
        const distancia = Math.hypot(dx, dz);
        const minimo = RAIO * 2;
        if (distancia >= minimo || distancia === 0) continue;

        const empurrao = (minimo - distancia) / 2;
        const nx = dx / distancia;
        const nz = dz / distancia;
        a.position.x -= nx * empurrao;
        a.position.z -= nz * empurrao;
        b.position.x += nx * empurrao;
        b.position.z += nz * empurrao;
      }
    }
  }

  /**
   * Um agente da plataforma sobe até o gabinete de um diretor para
   * avisar de alguma coisa, e volta.
   *
   * Pedido do fundador em 05/10/2026: "agente de validação vai até o
   * CEO dizer que validou mais um usuário e assim vai. Isso vale para
   * qualquer um". É o que torna o andar híbrido em vez de dois mundos
   * separados dividindo o mesmo piso.
   *
   * Só acontece quando há carga: um agente sem nada processando não tem
   * o que avisar, e um recado inventado seria exatamente o tipo de
   * encenação que esta cena evita.
   */
  private talvezAgenteAvisarDiretor(delta: number): void {
    if (this.agentes.length === 0 || this.bonecos.length === 0) return;

    this.proximoAviso -= delta;
    if (this.proximoAviso > 0) return;
    this.proximoAviso = 22 + Math.random() * 30;

    const agente = this.agentes[Math.floor(Math.random() * this.agentes.length)];
    const diretor = this.bonecos[Math.floor(Math.random() * this.bonecos.length)];
    if (!agente || !diretor || agente.estado() !== "processando") return;

    agente.avisar(diretor.cargo);
  }

  private talvezChamarReuniao(delta: number): void {
    if (this.bonecos.length < 2) return;
    this.proximaReuniao -= delta;
    if (this.proximaReuniao > 0) return;

    this.proximaReuniao = 70 + Math.random() * 90;
    const embaralhados = [...this.bonecos].sort(() => Math.random() - 0.5);
    embaralhados[0]?.chamarParaReuniao();
    embaralhados[1]?.chamarParaReuniao();
  }
}
