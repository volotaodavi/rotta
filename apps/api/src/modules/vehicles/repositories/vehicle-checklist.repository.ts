import type { Trip, User, VehicleChecklist } from "@prisma/client";

export interface CreateVehicleChecklistData {
  vehicleId: string;
  companyId: string;
  preenchidoPorId: string;
  /**
   * Nunca vem do cliente. É `Vehicle.viagemAtualId` no instante da
   * criação (`VehiclesService.createChecklist`) — ou `null`, quando o
   * checklist é feito na garagem, antes de girar a chave, e nesse caso
   * `adotarPreViagem` liga as duas pontas quando a viagem começa.
   */
  tripId?: string | null;
  pneusOk: boolean;
  lucesOk: boolean;
  combustivelOk: boolean;
  limpezaOk: boolean;
  equipamentosObrigatoriosOk: boolean;
  observacoes?: string;
}

export interface ListVehicleChecklistsFilter {
  vehicleId: string;
  page: number;
  pageSize: number;
}

/**
 * O checklist com o contexto que torna a leitura honesta: de que viagem
 * ele é e quem preencheu. Sem isso o responsável veria cinco checklists
 * iguais sem saber a qual dia/turno cada um pertence.
 */
export type ViagemDoChecklist = Pick<
  Trip,
  "id" | "codigo" | "data" | "sentido" | "status" | "iniciadaEm" | "finalizadaEm"
>;

export type VehicleChecklistComContexto = VehicleChecklist & {
  trip: ViagemDoChecklist | null;
  preenchidoPor: Pick<User, "id" | "nome">;
};

export interface ListVehicleChecklistsResult {
  items: VehicleChecklistComContexto[];
  total: number;
}

/** `vehicle_checklists` tem RLS por `companyId` — append-only, ver nota em `vehicle.repository.ts`. */
export interface VehicleChecklistRepository {
  /** Devolve já com contexto, para a resposta da gravação ser igual à da leitura. */
  create(data: CreateVehicleChecklistData): Promise<VehicleChecklistComContexto>;
  list(filter: ListVehicleChecklistsFilter): Promise<ListVehicleChecklistsResult>;
  /** O checklist mais recente desta viagem — o "checklist atual" enquanto ela está em andamento. */
  findUltimoDaViagem(tripId: string): Promise<VehicleChecklistComContexto | null>;
  /**
   * O checklist pré-viagem que ainda não pertence a viagem nenhuma,
   * feito no máximo `desde` atrás. A janela existe porque um checklist
   * de três semanas atrás, sem viagem, não é "o checklist de agora" —
   * é histórico.
   */
  findUltimoPreViagem(vehicleId: string, desde: Date): Promise<VehicleChecklistComContexto | null>;
  /**
   * O checklist da última viagem deste veículo que não é a de agora —
   * o "informativo da viagem anterior" que o usuário pediu.
   */
  findUltimoDeViagemAnterior(
    vehicleId: string,
    exceto: string | null,
  ): Promise<VehicleChecklistComContexto | null>;
  /**
   * Liga à viagem que acabou de começar os checklists pré-viagem deste
   * veículo feitos dentro da janela. É o que faz a folha preenchida na
   * garagem ser a folha daquela viagem. Devolve quantos adotou.
   */
  adotarPreViagem(vehicleId: string, tripId: string, desde: Date): Promise<number>;
  /**
   * O checklist mais recente de qualquer viagem destas rotas.
   *
   * Cruza tenants de propósito, mesma justificativa de
   * `TripStudentEventRepository.listByStudentAcrossTenants`: quem
   * chama é o Responsável, pelo caminho que começa no próprio filho
   * (`StudentsService.findByIdOrThrow`), e o aluno não fica preso a uma
   * única transportadora ao longo do tempo. A lista de rotas é o que
   * mantém o bypass restrito — ela vem das matrículas ativas daquele
   * aluno, nunca do cliente.
   */
  findUltimoPorRotasAcrossTenants(routeIds: string[]): Promise<VehicleChecklistComContexto | null>;
}
