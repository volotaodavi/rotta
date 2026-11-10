import type {
  AlunoDaRotta,
  MotoristaDaRotta,
  PessoaDaRotta,
  RotaDaRotta,
  VeiculoDaRotta,
} from "../mappers";

/**
 * A leitura que a exportação do SETE precisa.
 *
 * ## Por que um método só, e não seis
 *
 * Porque o pacote do SETE é uma fotografia COERENTE de um instante: a
 * rota, a van que estava nela, o motorista escalado e os alunos
 * vinculados precisam vir da mesma leitura. Seis chamadas separadas
 * deixariam a porta aberta para a rota citar uma van que o gestor
 * acabou de remover no meio da exportação, e o SETE recusaria o pacote
 * inteiro por uma ligação órfã.
 *
 * ## O `companyId` não é opcional, e não é sugestão
 *
 * Toda consulta da implementação filtra por ele. É a diferença entre
 * uma exportação e um vazamento: o pacote carrega nome, endereço e
 * telefone de criança (LGPD arts. 11 e 14), e uma empresa nunca pode
 * ver o de outra. Ver RN-SETE-01.
 */
export interface DadosDaExportacao {
  rotas: RotaDaRotta[];
  veiculos: VeiculoDaRotta[];
  motoristas: MotoristaDaRotta[];
  monitores: PessoaDaRotta[];
  alunos: AlunoDaRotta[];
  /** Ligações por chave de negócio, nunca por id interno do SETE. */
  ligacoes: {
    rotaPossuiVeiculo: { rota: string; placa: string }[];
    rotaDirigidaPorMotorista: { rota: string; cpf: string }[];
    rotaAtendidaPorMonitor: { rota: string; cpf: string }[];
    rotaPassaPorEscola: { rota: string; codigoInep: string }[];
    rotaAtendeAluno: { rota: string; aluno: string }[];
  };
  /** Escolas de rota ativa que não têm INEP — vira pendência. */
  escolasSemInep: { id: string; nome: string }[];
}

export interface SeteRepository {
  carregarDadosDaExportacao(companyId: string): Promise<DadosDaExportacao>;
  /** Cidade e estado da área de atuação, para sugerir o código IBGE. */
  municipioDeAtuacao(companyId: string): Promise<{ cidade: string; estado: string } | null>;
}
