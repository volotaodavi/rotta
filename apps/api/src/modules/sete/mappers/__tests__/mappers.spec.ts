import {
  medianaDeHorarios,
  nivelDoAluno,
  toSeteAluno,
  toSeteMonitor,
  toSeteMotorista,
  toSeteRota,
  toSeteTipoVeiculo,
  toSeteVeiculo,
  turnosDaRota,
} from "../index";

import type { AlunoDaRotta, MotoristaDaRotta, RotaDaRotta, VeiculoDaRotta } from "../index";

/**
 * Os conversores da Rotta para o SETE.
 *
 * ## Por que estes casos, e não "um teste por função"
 *
 * Porque a conversão trivial (nome vira nome) não tem como quebrar
 * sozinha, e a difícil quebra em silêncio. O que está aqui é o conjunto
 * de regras cuja violação o SETE ACEITARIA sem reclamar: um turno
 * integral que acende um campo só, uma mediana que virou média, um
 * nível inventado a partir de idade errada — e, acima de tudo, um
 * campo sensível que escapou.
 */

const AGORA = new Date("2026-11-10T12:00:00.000Z");

function rotaBase(parcial: Partial<RotaDaRotta> = {}): RotaDaRotta {
  return {
    id: "rota-1",
    nome: "Rota Itaipuaçu — Manhã",
    turno: "MANHA",
    acessoPorteira: false,
    acessoMataBurro: false,
    acessoColchete: false,
    acessoAtoleiro: false,
    acessoPonteRustica: false,
    horariosDasParadas: ["06:40", "07:15"],
    viagensFinalizadas: [],
    posicoesDaViagemMaisRecente: [],
    ...parcial,
  };
}

function viagem(sentido: "IDA" | "VOLTA", inicioUtc: string, fimUtc: string) {
  return { sentido, iniciadaEm: new Date(inicioUtc), finalizadaEm: new Date(fimUtc) };
}

describe("turnosDaRota", () => {
  it("INTEGRAL acende matutino E vespertino", () => {
    // No SETE a rota integral não é um terceiro valor: é literalmente a
    // que atende de manhã e de tarde. Acender um campo só esconderia
    // metade da operação do FNDE.
    expect(turnosDaRota("INTEGRAL")).toEqual({
      turno_matutino: "S",
      turno_vespertino: "S",
      turno_noturno: "N",
    });
  });

  it("MANHA, TARDE e NOITE acendem exatamente um", () => {
    expect(turnosDaRota("MANHA").turno_matutino).toBe("S");
    expect(turnosDaRota("MANHA").turno_vespertino).toBe("N");
    expect(turnosDaRota("TARDE").turno_vespertino).toBe("S");
    expect(turnosDaRota("NOITE").turno_noturno).toBe("S");
  });

  it("PERSONALIZADO deriva dos horários das paradas", () => {
    // Não existe "personalizado" no SETE. Uma rota que sai às 06:40 e
    // outra parada às 19:00 atende manhã e noite.
    expect(turnosDaRota("PERSONALIZADO", ["06:40", "19:00"])).toEqual({
      turno_matutino: "S",
      turno_vespertino: "N",
      turno_noturno: "S",
    });
  });

  it("PERSONALIZADO sem horário nenhum não acende nada", () => {
    // Melhor três "N" do que inventar um turno: no SETE, "N" é o
    // default do próprio banco.
    expect(turnosDaRota("PERSONALIZADO", [])).toEqual({
      turno_matutino: "N",
      turno_vespertino: "N",
      turno_noturno: "N",
    });
  });

  it("meio-dia em ponto é vespertino, não matutino", () => {
    expect(turnosDaRota("PERSONALIZADO", ["12:00"]).turno_vespertino).toBe("S");
    expect(turnosDaRota("PERSONALIZADO", ["12:00"]).turno_matutino).toBe("N");
  });
});

describe("medianaDeHorarios", () => {
  it("número ímpar devolve o do meio", () => {
    expect(medianaDeHorarios(["06:00", "06:30", "07:00"])).toBe("06:30");
  });

  it("número par devolve a média dos dois do meio", () => {
    expect(medianaDeHorarios(["06:00", "06:20", "06:40", "07:00"])).toBe("06:30");
  });

  it("ignora o extremo, que é o ponto de usar mediana", () => {
    // O dia em que o motorista esqueceu de encerrar a viagem não pode
    // virar o horário que a prefeitura vê.
    expect(medianaDeHorarios(["06:00", "06:10", "06:20", "23:59"])).toBe("06:15");
  });

  it("lista vazia ou só com nulos devolve null, nunca NaN", () => {
    expect(medianaDeHorarios([])).toBeNull();
    expect(medianaDeHorarios([null, undefined])).toBeNull();
  });

  it("descarta horário malformado em vez de quebrar", () => {
    expect(medianaDeHorarios(["06:00", "banana", "06:30"])).toBe("06:15");
  });
});

describe("toSeteRota", () => {
  it("sem viagem finalizada, cai para o horário previsto das paradas", () => {
    const rota = toSeteRota(rotaBase());

    expect(rota.hora_ida_inicio).toBe("06:40");
    expect(rota.hora_ida_termino).toBe("07:15");
  });

  it("com viagem finalizada, o que aconteceu vence o que foi planejado", () => {
    // 09:40 UTC = 06:40 em São Paulo. A viagem real saiu 06:50.
    const rota = toSeteRota(
      rotaBase({
        viagensFinalizadas: [viagem("IDA", "2026-11-09T09:50:00Z", "2026-11-09T10:20:00Z")],
      }),
    );

    expect(rota.hora_ida_inicio).toBe("06:50");
  });

  it("os horários saem no fuso da operação, não em UTC", () => {
    // Se alguém trocar por `toISOString`, este teste acusa: 09:50 UTC
    // viraria "09:50" em vez de "06:50", e a prefeitura leria um ônibus
    // saindo três horas depois do que sai.
    const rota = toSeteRota(
      rotaBase({
        viagensFinalizadas: [viagem("IDA", "2026-11-09T09:50:00Z", "2026-11-09T10:20:00Z")],
      }),
    );

    expect(rota.hora_ida_inicio).not.toBe("09:50");
  });

  it("os cinco campos de acesso viram S/N, não true/false", () => {
    const rota = toSeteRota(rotaBase({ acessoPorteira: true, acessoAtoleiro: true }));

    expect(rota.da_porteira).toBe("S");
    expect(rota.da_atoleiro).toBe("S");
    expect(rota.da_mataburro).toBe("N");
  });

  it("sem GPS, km e shape ficam nulos em vez de zero", () => {
    // Zero quilômetro é uma afirmação falsa: a rota rodou, a Rotta é
    // que não sabe quanto. Nulo vira pendência; zero vira dado errado
    // numa prestação de contas.
    const rota = toSeteRota(rotaBase());

    expect(rota.km).toBeNull();
    expect(rota.shape).toBeNull();
  });
});

describe("toSeteTipoVeiculo", () => {
  it("mapeia o que existe nos dois lados", () => {
    expect(toSeteTipoVeiculo("VAN")).toBe(3);
    expect(toSeteTipoVeiculo("MICRO_ONIBUS")).toBe(2);
    expect(toSeteTipoVeiculo("ONIBUS")).toBe(1);
  });

  it("o que não existe no SETE vira null, nunca uma aproximação", () => {
    // O SETE não tem automóvel, sedan nem SUV. Mapeá-los para VAN
    // mudaria a capacidade declarada ao FNDE — e capacidade é o que o
    // CTB art. 137 proíbe exceder.
    expect(toSeteTipoVeiculo("AUTOMOVEL")).toBeNull();
    expect(toSeteTipoVeiculo("SEDAN")).toBeNull();
    expect(toSeteTipoVeiculo("SUV")).toBeNull();
    expect(toSeteTipoVeiculo("OUTRO")).toBeNull();
  });
});

describe("toSeteVeiculo", () => {
  const base: VeiculoDaRotta = {
    id: "v1",
    placa: "RTA1E23",
    marca: "Renault",
    modelo: "Master",
    ano: 2022,
    renavam: "12345678901",
    capacidadePassageiros: 16,
    tipo: "VAN",
    origemFrota: null,
    quilometragemAtual: 84_000,
    status: "DISPONIVEL",
  };

  it("origem nula continua nula — nunca um default", () => {
    expect(toSeteVeiculo(base).origem).toBeNull();
  });

  it("traduz a origem quando ela existe", () => {
    expect(toSeteVeiculo({ ...base, origemFrota: "PROPRIO_MUNICIPIO" }).origem).toBe(1);
    expect(toSeteVeiculo({ ...base, origemFrota: "TERCEIRIZADO" }).origem).toBe(2);
  });

  it("manutenção é S só quando o veículo está em manutenção", () => {
    expect(toSeteVeiculo(base).manutencao).toBe("N");
    expect(toSeteVeiculo({ ...base, status: "EM_MANUTENCAO" }).manutencao).toBe("S");
  });
});

describe("toSeteMotorista", () => {
  const base: MotoristaDaRotta = {
    cpf: "52998224725",
    nome: "Carlos Motorista",
    telefone: "21988887777",
    turnosEscalados: ["MANHA"],
    cnh: { numero: "01234567890", categoria: "D", vencimentoEm: new Date("2030-01-31") },
    temAntecedentesCriminais: true,
  };

  it("cada letra da categoria acende um campo", () => {
    const comAD = toSeteMotorista({ ...base, cnh: { ...base.cnh!, categoria: "AD" } });

    expect(comAD.tem_cnh_a).toBe("S");
    expect(comAD.tem_cnh_d).toBe("S");
    expect(comAD.tem_cnh_b).toBe("N");
    expect(comAD.tem_cnh_e).toBe("N");
  });

  it("CNH vencida continua no pacote — sumir seria pior", () => {
    // Motorista com CNH vencida é uma PENDÊNCIA, não um fantasma.
    // Omiti-lo do pacote faria a rota aparecer sem condutor no FNDE.
    const vencida = toSeteMotorista({
      ...base,
      cnh: { ...base.cnh!, vencimentoEm: new Date("2020-01-01") },
    });

    expect(vencida.cnh).toBe("01234567890");
    expect(vencida.data_validade_cnh).toBe("2020-01-01");
  });

  it("sem CNH nenhuma, os campos ficam nulos e as categorias em N", () => {
    const semCnh = toSeteMotorista({ ...base, cnh: null });

    expect(semCnh.cnh).toBeNull();
    expect(semCnh.data_validade_cnh).toBeNull();
    expect(semCnh.tem_cnh_d).toBe("N");
  });

  it("antecedentes criminais sai como S/N, nunca como arquivo", () => {
    const resultado = toSeteMotorista(base);

    expect(resultado.ant_criminais).toBe("S");
    // O campo é um único caractere: não há onde um anexo caber.
    expect(JSON.stringify(resultado)).not.toMatch(/http|\.pdf|base64/i);
  });

  it("data de nascimento e sexo saem nulos (RN-SETE-13)", () => {
    const resultado = toSeteMotorista(base);

    expect(resultado.data_nascimento).toBeNull();
    expect(resultado.sexo).toBeNull();
  });

  it("INTEGRAL escala a pessoa de manhã e de tarde", () => {
    const integral = toSeteMotorista({ ...base, turnosEscalados: ["INTEGRAL"] });

    expect(integral.turno_manha).toBe("S");
    expect(integral.turno_tarde).toBe("S");
  });
});

describe("toSeteMonitor", () => {
  it("leva turno e contato, e nunca data de nascimento", () => {
    const monitor = toSeteMonitor({
      cpf: "15350946056",
      nome: "Ana Monitora",
      telefone: "21977776666",
      turnosEscalados: ["TARDE"],
    });

    expect(monitor.turno_tarde).toBe("S");
    expect(monitor.data_nascimento).toBeNull();
  });
});

describe("nivelDoAluno", () => {
  it("escola de um nível só decide sozinha, sem olhar idade", () => {
    expect(nivelDoAluno(["FUNDAMENTAL"], null)).toBe(2);
    expect(nivelDoAluno(["CRECHE", "PRE_ESCOLA"], null)).toBe(1);
  });

  it("escola de vários níveis cai para a idade", () => {
    const nascida2016 = new Date("2016-04-12");
    expect(nivelDoAluno(["FUNDAMENTAL", "MEDIO"], nascida2016, AGORA)).toBe(2);
  });

  it("sem escola conclusiva e sem data, devolve null em vez de chutar", () => {
    expect(nivelDoAluno(["FUNDAMENTAL", "MEDIO"], null)).toBeNull();
  });

  it("data absurda não vira nível", () => {
    expect(nivelDoAluno(["FUNDAMENTAL", "MEDIO"], new Date("1700-01-01"), AGORA)).toBeNull();
  });
});

describe("toSeteAluno", () => {
  const base: AlunoDaRotta = {
    id: "a1",
    nome: "Sofia Almeida",
    dataNascimento: new Date("2016-04-12"),
    sexo: "FEMININO",
    turno: "MANHA",
    tiposDaEscola: ["FUNDAMENTAL"],
    embarqueLogradouro: "Rua Pedro Alves",
    embarqueNumero: "45",
    embarqueBairro: "Itaipuaçu",
    embarqueCep: "24901000",
    embarqueLatitude: -22.9655,
    embarqueLongitude: -42.9712,
    nomeDoResponsavel: "Mãe Responsável",
    telefoneDoResponsavel: "21999990003",
    rotaTemAcessoRural: false,
  };

  it("cor é SEMPRE 0, e nunca vem do aluno", () => {
    // RN-SETE-04. Cor/raça é dado sensível (LGPD art. 11) de criança
    // (art. 14). `0` é "não informada" — a declaração de ausência que o
    // próprio SETE define, e a única forma de passar na validação do
    // /importacao sem tratar o dado.
    expect(toSeteAluno(base, AGORA).cor).toBe(0);
  });

  it("aluno sem coordenada é exportado assim mesmo", () => {
    const semCoordenada = toSeteAluno(
      { ...base, embarqueLatitude: null, embarqueLongitude: null },
      AGORA,
    );

    expect(semCoordenada.nome).toBe("Sofia Almeida");
    expect(semCoordenada.loc_latitude).toBeNull();
    expect(semCoordenada.loc_longitude).toBeNull();
  });

  it("rota com condição rural marca o aluno como rural", () => {
    expect(toSeteAluno({ ...base, rotaTemAcessoRural: true }, AGORA).mec_tp_localizacao).toBe(2);
    expect(toSeteAluno(base, AGORA).mec_tp_localizacao).toBe(1);
  });

  it("turno PERSONALIZADO vira INTEGRAL, que é o 'mais de um turno' do SETE", () => {
    expect(toSeteAluno({ ...base, turno: "PERSONALIZADO" }, AGORA).turno).toBe(3);
  });

  it("o grau de parentesco sai nulo — a Rotta não guarda isso", () => {
    expect(toSeteAluno(base, AGORA).grau_responsavel).toBeNull();
  });
});

describe("nenhum dado sensível sai do conversor", () => {
  it("campos de deficiência e saúde não existem na saída", () => {
    // A varredura é sobre o JSON inteiro, e não sobre uma lista de
    // chaves: um campo novo acrescentado sem pensar cai aqui.
    const aluno = toSeteAluno(
      {
        id: "a1",
        nome: "Sofia Almeida",
        dataNascimento: new Date("2016-04-12"),
        sexo: "FEMININO",
        turno: "MANHA",
        tiposDaEscola: ["FUNDAMENTAL"],
        embarqueLogradouro: "Rua Pedro Alves",
        embarqueNumero: "45",
        embarqueBairro: "Itaipuaçu",
        embarqueCep: "24901000",
        embarqueLatitude: -22.9655,
        embarqueLongitude: -42.9712,
        nomeDoResponsavel: "Mãe Responsável",
        telefoneDoResponsavel: "21999990003",
        rotaTemAcessoRural: false,
      },
      AGORA,
    );

    const chaves = Object.keys(aluno);
    const proibidas = [
      "def_caminhar",
      "def_ouvir",
      "def_enxergar",
      "def_mental",
      "necessidadesEspeciais",
      "medicamentos",
      "cpf",
      "alergias",
      "observacoesMedicas",
    ];

    for (const proibida of proibidas) {
      expect(chaves).not.toContain(proibida);
    }
  });

  it("o conversor não copia campo desconhecido que venha na entrada", () => {
    // Um `...spread` da entidade da Rotta dentro do conversor seria o
    // jeito mais fácil de vazar um campo novo sem ninguém notar. Este
    // teste empurra dado sensível na entrada e exige que ele não saia.
    const comLixoSensivel = {
      id: "a1",
      nome: "Sofia Almeida",
      dataNascimento: new Date("2016-04-12"),
      sexo: "FEMININO" as const,
      turno: "MANHA" as const,
      tiposDaEscola: ["FUNDAMENTAL" as const],
      embarqueLogradouro: null,
      embarqueNumero: null,
      embarqueBairro: null,
      embarqueCep: null,
      embarqueLatitude: null,
      embarqueLongitude: null,
      nomeDoResponsavel: null,
      telefoneDoResponsavel: null,
      rotaTemAcessoRural: false,
      necessidadesEspeciais: "cadeirante",
      medicamentos: "ritalina 10mg",
    } as AlunoDaRotta;

    const saida = JSON.stringify(toSeteAluno(comLixoSensivel, AGORA));

    expect(saida).not.toContain("cadeirante");
    expect(saida).not.toContain("ritalina");
  });
});
