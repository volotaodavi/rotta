/**
 * Contratos da exportação para o SETE (FNDE).
 *
 * Especificação: `docs/52-integracao-sete.md`.
 *
 * ## Por que aqui, e por que sem Zod
 *
 * Aqui porque a API produz e o painel consome: o dia em que um campo
 * mudar, as duas builds quebram no mesmo Pull Request.
 *
 * Sem Zod, ao contrário do resto do pacote, porque estes são contratos
 * de **saída**. Zod existe para validar o que entra de fora; validar em
 * runtime o que a própria API acabou de montar custa CPU e não responde
 * pergunta nenhuma. Os parâmetros de ENTRADA do endpoint continuam com
 * `class-validator`, como todo o resto de `apps/api`.
 *
 * ## Os números não são mágicos: são do SETE
 *
 * Todo código abaixo foi extraído de
 * `module/Application/src/Entity/Enum/*.php` do repositório público do
 * SETE (MIT, último commit em 01/03/2023), lido em 10/11/2026. Nenhum
 * foi inventado. Onde o SETE não define, o campo fica vazio e vira
 * pendência — nunca um palpite.
 */

/** `Db\Enum\Sexo`. */
export const SETE_SEXO = {
  MASCULINO: 1,
  FEMININO: 2,
  NAO_INFORMADO: 3,
} as const;
export type SeteSexo = (typeof SETE_SEXO)[keyof typeof SETE_SEXO];

/**
 * `Db\Enum\CorRaca`.
 *
 * A Rotta **só** usa `NAO_INFORMADA`. Cor/raça é dado sensível (LGPD,
 * art. 11) de criança (art. 14), e a Rotta não o coleta nem o
 * repassa. O valor existe aqui porque o `/importacao` do SETE recusa o
 * campo ausente ou vazio: mandar `0` é declarar que não há dado, que é
 * diferente de tratar o dado. Ver RN-SETE-04.
 */
export const SETE_COR_RACA = {
  NAO_INFORMADA: 0,
  AMARELO: 1,
  BRANCO: 2,
  INDIGENA: 3,
  PARDO: 4,
  PRETO: 5,
} as const;

/** `Db\Enum\Turno`. */
export const SETE_TURNO = {
  MATUTINO: 1,
  VESPERTINO: 2,
  INTEGRAL: 3,
  NOTURNO: 4,
} as const;
export type SeteTurno = (typeof SETE_TURNO)[keyof typeof SETE_TURNO];

/** `Db\Enum\NivelAluno`. */
export const SETE_NIVEL = {
  INFANTIL: 1,
  FUNDAMENTAL: 2,
  MEDIO: 3,
  SUPERIOR: 4,
  OUTRO: 5,
} as const;
export type SeteNivel = (typeof SETE_NIVEL)[keyof typeof SETE_NIVEL];

/** `Db\Enum\MecTpLocalizacao`. */
export const SETE_LOCALIZACAO = {
  URBANA: 1,
  RURAL: 2,
} as const;
export type SeteLocalizacao = (typeof SETE_LOCALIZACAO)[keyof typeof SETE_LOCALIZACAO];

/** `Db\Enum\TipoVeiculo`. */
export const SETE_TIPO_VEICULO = {
  ONIBUS: 1,
  MICRO_ONIBUS: 2,
  VAN: 3,
  KOMBI: 4,
  CAMINHAO: 5,
  CAMINHONETE: 6,
  MOTOCICLETA: 7,
  ANIMAL_DE_TRACAO: 8,
  LANCHA_VOADEIRA: 9,
  BARCO_DE_MADEIRA: 10,
  BARCO_DE_ALUMINIO: 11,
  CANOA_MOTORIZADA: 12,
  CANOA_A_REMO: 13,
  BICICLETA: 14,
} as const;
export type SeteTipoVeiculo = (typeof SETE_TIPO_VEICULO)[keyof typeof SETE_TIPO_VEICULO];

/** `Db\Enum\ModoVeiculo`. */
export const SETE_MODO_VEICULO = {
  RODOVIARIO: 0,
  AQUAVIARIO: 1,
} as const;

/** `Db\Enum\Origem`. */
export const SETE_ORIGEM_VEICULO = {
  PROPRIO: 1,
  TERCEIRIZADO: 2,
} as const;

/** `Db\Enum\Rota\Tipo`. */
export const SETE_TIPO_ROTA = {
  RODOVIARIA: 1,
  AQUAVIARIO: 2,
  MISTA: 3,
} as const;

/**
 * Os booleanos do SETE são `char(1)`, não booleanos: `'S'` ou `'N'`,
 * com default `'N'` no banco dele. Vale para as condições de acesso, os
 * turnos, as categorias de CNH e a manutenção do veículo.
 */
export type SeteSimNao = "S" | "N";

/**
 * O `shape` de uma rota.
 *
 * É um GeoJSON `FeatureCollection` → `Feature` → `LineString`, **mas as
 * coordenadas não estão em graus**: são metros de EPSG:3857 (Web
 * Mercator). Conferido nas amostras reais do dump do SETE. Isso
 * contraria a RFC 7946, e assumir graus desenharia a rota no oceano.
 * Ver RN-SETE-05.
 */
export interface SeteShape {
  type: "FeatureCollection";
  features: [
    {
      type: "Feature";
      properties: Record<string, never>;
      geometry: { type: "LineString"; coordinates: [number, number][] };
    },
  ];
}

export interface SeteRota {
  /** Chave da Rotta, para o pacote poder ser conferido. Não vai ao SETE. */
  referenciaRotta: string;
  nome: string;
  tipo: (typeof SETE_TIPO_ROTA)[keyof typeof SETE_TIPO_ROTA];
  turno_matutino: SeteSimNao;
  turno_vespertino: SeteSimNao;
  turno_noturno: SeteSimNao;
  /** `HH:MM`, ou `null` quando não houve viagem nem horário previsto. */
  hora_ida_inicio: string | null;
  hora_ida_termino: string | null;
  hora_volta_inicio: string | null;
  hora_volta_termino: string | null;
  /** Quilometragem da rota, com uma casa. String porque o SETE é `varchar`. */
  km: string | null;
  /** Duração em minutos, como texto — o SETE guarda `text`. */
  tempo: string | null;
  da_porteira: SeteSimNao;
  da_mataburro: SeteSimNao;
  da_colchete: SeteSimNao;
  da_atoleiro: SeteSimNao;
  da_ponterustica: SeteSimNao;
  shape: SeteShape | null;
}

export interface SeteVeiculo {
  referenciaRotta: string;
  placa: string;
  marca: string | null;
  modelo: string;
  ano: number | null;
  renavam: string | null;
  capacidade: number;
  /**
   * `null` quando o tipo da Rotta nao existe no SETE.
   *
   * O SETE nao tem "automovel", "sedan" nem "SUV": a lista dele vai de
   * onibus a canoa a remo, pensada para transporte escolar rural. Um
   * veiculo desses na frota vira pendencia em vez de virar VAN por
   * aproximacao -- a capacidade declarada ao FNDE mudaria.
   */
  tipo: SeteTipoVeiculo | null;
  modo: (typeof SETE_MODO_VEICULO)[keyof typeof SETE_MODO_VEICULO];
  /** `null` enquanto ninguém informou: vira pendência, nunca um default. */
  origem: (typeof SETE_ORIGEM_VEICULO)[keyof typeof SETE_ORIGEM_VEICULO] | null;
  km_atual: number;
  manutencao: SeteSimNao;
}

export interface SeteMotorista {
  /** O CPF é a chave do motorista no SETE. */
  cpf: string;
  nome: string;
  telefone: string | null;
  cnh: string | null;
  /** `AAAA-MM-DD`. */
  data_validade_cnh: string | null;
  tem_cnh_a: SeteSimNao;
  tem_cnh_b: SeteSimNao;
  tem_cnh_c: SeteSimNao;
  tem_cnh_d: SeteSimNao;
  tem_cnh_e: SeteSimNao;
  /** Só diz SE existe antecedente criminal anexado. O arquivo nunca sai. */
  ant_criminais: SeteSimNao;
  turno_manha: SeteSimNao;
  turno_tarde: SeteSimNao;
  turno_noite: SeteSimNao;
  /**
   * Vazios por decisão de 10/11/2026 (RN-SETE-13): coletá-los seria dado
   * pessoal novo e exigiria nova versão da Política de Privacidade.
   */
  data_nascimento: null;
  sexo: null;
}

export interface SeteMonitor {
  cpf: string;
  nome: string;
  telefone: string | null;
  turno_manha: SeteSimNao;
  turno_tarde: SeteSimNao;
  turno_noite: SeteSimNao;
  /** Mesma decisão de `SeteMotorista`. */
  data_nascimento: null;
}

export interface SeteAluno {
  referenciaRotta: string;
  nome: string;
  /** `AAAA-MM-DD`. */
  data_nascimento: string;
  sexo: SeteSexo;
  /**
   * SEMPRE `0` (não informada). Ver `SETE_COR_RACA` e RN-SETE-04: o
   * campo existe porque o `/importacao` do SETE o exige, e `0` é a
   * declaração de ausência que ele mesmo define.
   */
  cor: typeof SETE_COR_RACA.NAO_INFORMADA;
  turno: SeteTurno;
  nivel: SeteNivel | null;
  mec_tp_localizacao: SeteLocalizacao;
  loc_endereco: string | null;
  loc_cep: string | null;
  loc_latitude: string | null;
  loc_longitude: string | null;
  nome_responsavel: string | null;
  telefone_responsavel: string | null;
  /** Pendência conhecida: a Rotta não guarda o grau de parentesco. */
  grau_responsavel: null;
}

/** As ligações do SETE, todas por chave de negócio, nunca por id interno. */
export interface SeteLigacoes {
  rotaPossuiVeiculo: { rota: string; placa: string }[];
  rotaDirigidaPorMotorista: { rota: string; cpf: string }[];
  rotaAtendidaPorMonitor: { rota: string; cpf: string }[];
  rotaPassaPorEscola: { rota: string; codigoInep: string }[];
  rotaAtendeAluno: { rota: string; aluno: string }[];
}

export type SeteTipoPendencia =
  | "ESCOLA_SEM_INEP"
  | "ROTA_SEM_GPS"
  | "ROTA_SEM_HORARIO"
  | "MOTORISTA_SEM_CNH"
  | "MOTORISTA_CNH_VENCIDA"
  | "VEICULO_SEM_RENAVAM"
  | "VEICULO_SEM_ORIGEM"
  | "VEICULO_TIPO_SEM_EQUIVALENTE"
  | "ALUNO_SEM_COORDENADA"
  | "ALUNO_SEM_RESPONSAVEL";

export interface SetePendencia {
  tipo: SeteTipoPendencia;
  /** O que a pessoa lê. Nunca contém dado sensível. */
  descricao: string;
  /** Para onde a tela manda quem vai corrigir. */
  caminhoDeCorrecao: string;
}

export interface SetePacote {
  /** Código IBGE do município (7 dígitos). */
  codigoIbge: string;
  geradoEm: string;
  rotas: SeteRota[];
  veiculos: SeteVeiculo[];
  motoristas: SeteMotorista[];
  monitores: SeteMonitor[];
  alunos: SeteAluno[];
  ligacoes: SeteLigacoes;
  pendencias: SetePendencia[];
}
