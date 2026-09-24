import type { ApiClient } from "../http";

/**
 * Contas do Portal da Escola — criadas direto, sem convite (fluxo
 * público). Espelha as rotas `school-portal/contas` da API.
 *
 * Duas portas para o mesmo endpoint:
 *  - **Admin Rotta** cria o DIRETOR de qualquer escola, informando
 *    `escolaId`.
 *  - **Diretor** cria coordenador e ajudante da PRÓPRIA escola, e o
 *    `escolaId` vem do token dele — nunca do corpo.
 */

export type SchoolStaffRole = "DIRETOR" | "COORDENADOR" | "AJUDANTE";
export type ContaStatus = "ATIVO" | "INATIVO" | "PENDENTE" | "BLOQUEADO";

export interface ContaDaEscola {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  papel: SchoolStaffRole | null;
  status: ContaStatus;
  escolaId: string;
  escolaNome: string | null;
  createdAt: string;
}

export interface CriarContaDaEscolaInput {
  nome: string;
  email: string;
  /** Vira identificador de login e canal de recuperação — `User.telefone` é único no banco. */
  telefone: string;
  senha: string;
  papel: SchoolStaffRole;
  /** Obrigatório para o Admin; proibido para o diretor (vem do token dele). */
  escolaId?: string;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createSchoolPortalContasEndpoints(apiClient: ApiClient) {
  return {
    listar: async (escolaId?: string): Promise<ContaDaEscola[]> =>
      (
        await apiClient.request<ApiEnvelope<ContaDaEscola[]>>(
          `/school-portal/contas${escolaId ? `?escolaId=${encodeURIComponent(escolaId)}` : ""}`,
        )
      ).data,

    criar: async (input: CriarContaDaEscolaInput): Promise<ContaDaEscola> =>
      (
        await apiClient.request<ApiEnvelope<ContaDaEscola>>("/school-portal/contas", {
          method: "POST",
          body: input,
        })
      ).data,

    /** Nunca apaga: quem conferiu a saída de ontem precisa continuar no histórico. */
    definirStatus: async (contaId: string, ativo: boolean): Promise<ContaDaEscola> =>
      (
        await apiClient.request<ApiEnvelope<ContaDaEscola>>(
          `/school-portal/contas/${contaId}/status`,
          { method: "PATCH", body: { ativo } },
        )
      ).data,
  };
}

export type SchoolPortalContasEndpoints = ReturnType<typeof createSchoolPortalContasEndpoints>;
