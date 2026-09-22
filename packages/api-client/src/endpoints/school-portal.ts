import type { ApiClient } from "../http";

/**
 * Portal da Escola (pedido do usuário 22/09/2026: "criar a categoria de
 * escolas, que aí vão poder ver quais alunos irão nos ônibus e se eles
 * já foram, para maior controle") — espelha
 * `apps/api/src/modules/school-portal`.
 *
 * Nenhuma função daqui recebe um `schoolId`, e isso é de propósito: a
 * escola vem do TOKEN, no servidor. Se viesse do cliente, trocar um
 * UUID na URL entregaria a lista de crianças de qualquer escola do
 * país.
 */

/** Onde a criança está no fluxo de hoje, do ponto de vista da escola. */
export type StatusDoAlunoNoDia = "AGUARDANDO" | "EMBARCADO" | "DESEMBARCOU" | "AUSENTE";

export interface AlunoDoDia {
  studentId: string;
  nome: string;
  /** `AAAA-MM-DD` — ajuda a distinguir homônimos, comum em escola grande. */
  dataNascimento: string;
  turno: string;
  status: StatusDoAlunoNoDia;
  /** `null` enquanto o aluno está AGUARDANDO. */
  ocorridoEm: string | null;
  tripId: string | null;
  rotaNome: string | null;
  sentido: string | null;
  /** A placa que a escola confere no portão. */
  veiculoPlaca: string | null;
  veiculoModelo: string | null;
  /** A mesma escola costuma ser atendida por várias — sem isto, não dá para saber a quem cobrar. */
  transportadoraNome: string | null;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createSchoolPortalEndpoints(apiClient: ApiClient) {
  return {
    listarAlunosDoDia: async (): Promise<AlunoDoDia[]> =>
      (await apiClient.request<ApiEnvelope<AlunoDoDia[]>>("/school-portal/alunos-hoje")).data,
  };
}

export type SchoolPortalEndpoints = ReturnType<typeof createSchoolPortalEndpoints>;
