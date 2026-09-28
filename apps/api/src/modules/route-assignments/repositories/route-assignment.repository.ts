/**
 * A escala já com rota, veículo e pessoas carregadas — é sempre assim
 * que ela é lida, então não existe variante "crua" no contrato.
 */
export interface EscalaCompleta {
  id: string;
  data: Date;
  routeId: string;
  veiculoId: string;
  motoristaId: string;
  monitorId: string | null;
  observacao: string | null;
  route: { nome: string; turno: string };
  veiculo: { numeroFrota: string | null; placa: string };
  motorista: { nome: string };
  monitor: { nome: string } | null;
}

export interface DefinirEscalaData {
  companyId: string;
  routeId: string;
  /** Já truncada para meia-noite UTC — ver `RouteAssignmentsService.diaSemHora`. */
  data: Date;
  veiculoId: string;
  motoristaId: string;
  monitorId: string | null;
  observacao: string | null;
  criadoPorId: string;
}

/**
 * `route_assignments` tem RLS por `companyId` — toda operação passa por
 * `PrismaService.withTenant(...)`.
 */
export interface RouteAssignmentRepository {
  /**
   * `upsert` por `[routeId, data]`, e isso é o desenho, não um atalho:
   * designar de novo a mesma rota no mesmo dia é EDITAR, que é
   * exatamente o que o despachante faz quando o motorista falta às 5h
   * da manhã. Criar uma segunda escala deixaria duas intenções
   * conflitantes para o mesmo dia, e o rastreador teria de adivinhar
   * qual vale.
   */
  definir(data: DefinirEscalaData): Promise<EscalaCompleta>;
  /** A grade do dia, ordenada pelo nome da rota. */
  listByData(data: Date): Promise<EscalaCompleta[]>;
  /**
   * As escalas de UMA pessoa num intervalo — como motorista OU como
   * monitor. Ninguém vê a escala dos colegas por este caminho.
   */
  listDaPessoaNoPeriodo(userId: string, de: Date, ate: Date): Promise<EscalaCompleta[]>;
  /**
   * `deleteMany` com o `companyId` junto do id: uma escala de outra
   * empresa simplesmente não apaga nada, em vez de apagar a errada.
   */
  deleteByIdAndCompany(id: string, companyId: string): Promise<void>;
  /**
   * As escalas de HOJE de um ônibus, em ordem de criação — o que o
   * rastreador consulta quando a ignição liga.
   *
   * Bypass de RLS, ao contrário de todo o resto desta interface: quem
   * chama é um APARELHO, sem ator e sem tenant (o tenant só é
   * descoberto depois de achar o ônibus pelo IMEI). O `companyId`
   * explícito no `where` — tirado do próprio ônibus — é o que mantém o
   * bypass restrito. Mesmo caso já documentado no login, que resolve
   * `Membership` antes de haver tenant.
   *
   * Já vem filtrada por rota viável (`ATIVA`, não excluída): uma escala
   * apontando para rota arquivada não deve abrir viagem nenhuma, e
   * essa é uma condição da consulta, não uma regra de negócio.
   */
  listDoDiaPorVeiculo(companyId: string, veiculoId: string, dia: Date): Promise<EscalaDoDia[]>;
}

/** O mínimo para o rastreador decidir qual viagem abrir. */
export interface EscalaDoDia {
  routeId: string;
  motoristaId: string;
  monitorId: string | null;
}
