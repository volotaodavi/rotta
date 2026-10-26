import {
  CONFIANCA_PARA_SUGERIR,
  sugerirRotaPeloTrajeto,
  type PosicaoObservada,
  type RotaCandidata,
} from "../sugerir-rota.util";

/*
  Coordenadas reais de Maricá para o teste parecer com o problema: o
  centro de Ubatiba e o de Silvado ficam a quilômetros um do outro, que
  é a distância que separa duas linhas de verdade na mesma frota.
*/
const UBATIBA = { lat: -22.9389, lon: -42.8647 };
const SILVADO = { lat: -22.8536, lon: -42.7742 };

function perto(base: { lat: number; lon: number }, metros: number) {
  /* 1 grau de latitude vale perto de 111 km em qualquer lugar. */
  return { latitude: base.lat + metros / 111_000, longitude: base.lon };
}

function hoje(hora: number, minuto: number): Date {
  const d = new Date();
  d.setHours(hora, minuto, 0, 0);
  return d;
}

function rota(
  id: string,
  nome: string,
  base: { lat: number; lon: number },
  horario: string,
): RotaCandidata {
  return {
    id,
    nome,
    turno: "MANHA",
    paradas: [
      { latitude: base.lat, longitude: base.lon, horarioPrevisto: horario },
      {
        ...perto(base, 600),
        horarioPrevisto: horario,
      },
    ],
  };
}

const ubatiba = rota("rota-ubatiba", "Linha do Ubatiba", UBATIBA, "06:30");
const silvado = rota("rota-silvado", "Linha do Silvado", SILVADO, "06:30");

describe("sugerirRotaPeloTrajeto", () => {
  /*
    O caso que motivou a função, com as palavras do fundador: o ônibus
    01.0326 era da linha do Ubatiba e o despachante pôs na do Silvado.
    Ninguém registrou a troca. O rastreador liga, manda posição, e o
    sistema precisa dizer sozinho onde esse carro está.

    Rastreador NÃO lê letreiro: não existe sensor para isso. Mas o
    letreiro mente (o motorista esquece de trocar) e o trajeto não.
  */
  it("reconhece a linha pelo lugar por onde o onibus passou", () => {
    const trajeto: PosicaoObservada[] = [
      { ...perto(SILVADO, 50), capturadaEm: hoje(6, 28) },
      { ...perto(SILVADO, 120), capturadaEm: hoje(6, 31) },
      { ...perto(SILVADO, 400), capturadaEm: hoje(6, 35) },
    ];

    const sugestao = sugerirRotaPeloTrajeto(trajeto, [ubatiba, silvado]);

    expect(sugestao?.routeId).toBe("rota-silvado");
    expect(sugestao?.nome).toBe("Linha do Silvado");
    expect(sugestao?.confianca).toBeGreaterThanOrEqual(CONFIANCA_PARA_SUGERIR);
  });

  it("a mesma frota no outro lado da cidade da a outra linha", () => {
    const trajeto: PosicaoObservada[] = [
      { ...perto(UBATIBA, 80), capturadaEm: hoje(6, 29) },
      { ...perto(UBATIBA, 200), capturadaEm: hoje(6, 33) },
    ];

    expect(sugerirRotaPeloTrajeto(trajeto, [ubatiba, silvado])?.routeId).toBe("rota-ubatiba");
  });

  /*
    O relógio existe para desempatar rota de ida e de volta que
    percorrem a MESMA rua. Sem ele, a geometria empata e a sugestão
    sairia no cara ou coroa.
  */
  it("duas rotas na mesma rua: quem decide e o horario", () => {
    const ida = rota("ida", "Ubatiba, ida", UBATIBA, "06:30");
    const volta = rota("volta", "Ubatiba, volta", UBATIBA, "17:30");

    const deManha: PosicaoObservada[] = [
      { ...perto(UBATIBA, 50), capturadaEm: hoje(6, 32) },
      { ...perto(UBATIBA, 90), capturadaEm: hoje(6, 36) },
    ];
    const deTarde: PosicaoObservada[] = [
      { ...perto(UBATIBA, 50), capturadaEm: hoje(17, 28) },
      { ...perto(UBATIBA, 90), capturadaEm: hoje(17, 34) },
    ];

    expect(sugerirRotaPeloTrajeto(deManha, [ida, volta])?.routeId).toBe("ida");
    expect(sugerirRotaPeloTrajeto(deTarde, [ida, volta])?.routeId).toBe("volta");
  });

  /*
    A regra que protege a criança: sugerir errado e pior do que nao
    sugerir, porque o despachante confirmaria no automatico e a lista de
    alunos do onibus ficaria trocada. Duas rotas que compartilham o
    mesmo trecho tem que sair com confianca baixa, nao com um vencedor
    por um ponto.
  */
  it("rotas que compartilham o trecho saem com confianca baixa", () => {
    const umaLinha = rota("a", "Linha A", UBATIBA, "06:30");
    const outraLinha = rota("b", "Linha B", UBATIBA, "06:30");

    const sugestao = sugerirRotaPeloTrajeto(
      [{ ...perto(UBATIBA, 60), capturadaEm: hoje(6, 30) }],
      [umaLinha, outraLinha],
    );

    expect(sugestao?.confianca).toBeLessThan(CONFIANCA_PARA_SUGERIR);
    expect(sugestao?.motivo).toMatch(/nao da para distinguir|não dá para distinguir/);
  });

  it("onibus longe de tudo nao gera sugestao nenhuma", () => {
    /* Saindo da garagem, a 40 km de qualquer parada. */
    const naGaragem: PosicaoObservada[] = [
      { latitude: -22.5, longitude: -43.2, capturadaEm: hoje(5, 40) },
    ];

    expect(sugerirRotaPeloTrajeto(naGaragem, [ubatiba, silvado])).toBeNull();
  });

  it("sem posicao ou sem rota candidata, nao inventa nada", () => {
    expect(sugerirRotaPeloTrajeto([], [ubatiba])).toBeNull();
    expect(
      sugerirRotaPeloTrajeto([{ ...perto(UBATIBA, 10), capturadaEm: hoje(6, 30) }], []),
    ).toBeNull();
  });

  it("rota sem parada cadastrada nao concorre", () => {
    const semParada: RotaCandidata = {
      id: "vazia",
      nome: "Rota sem parada",
      turno: "MANHA",
      paradas: [],
    };

    const sugestao = sugerirRotaPeloTrajeto(
      [{ ...perto(SILVADO, 40), capturadaEm: hoje(6, 30) }],
      [semParada, silvado],
    );

    expect(sugestao?.routeId).toBe("rota-silvado");
  });

  /* A diferenca de horario e circular: 23h50 e 00h10 distam 20 minutos,
     nao 1420. O turno NOITE existe no enum, entao a virada do dia nao e
     hipotese de laboratorio. */
  it("a janela de horario atravessa a meia-noite", () => {
    const noturna = rota("noturna", "Linha da noite", SILVADO, "23:50");

    const sugestao = sugerirRotaPeloTrajeto(
      [
        { ...perto(SILVADO, 40), capturadaEm: hoje(0, 10) },
        { ...perto(SILVADO, 80), capturadaEm: hoje(0, 15) },
      ],
      [noturna],
    );

    expect(sugestao?.motivo).toMatch(/batem com o horário previsto/);
  });

  it("o motivo diz a distancia, para a pessoa conferir em vez de confiar", () => {
    const sugestao = sugerirRotaPeloTrajeto(
      [{ ...perto(SILVADO, 150), capturadaEm: hoje(6, 30) }],
      [silvado],
    );

    expect(sugestao?.distanciaMetros).toBeGreaterThan(100);
    expect(sugestao?.distanciaMetros).toBeLessThan(220);
    expect(sugestao?.motivo).toMatch(/m de uma parada desta rota/);
  });
});
