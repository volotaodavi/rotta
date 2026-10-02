import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";

/** Mesmo envelope `{ data }` de todas as respostas da API (ver `http.ts`). */
interface ApiEnvelope<T> {
  data: T;
}

/** Um item contado, já rotulado pelo backend em português de tela. */
export interface ItemDeExclusao {
  o_que: string;
  quantos: number;
}

/** Uma conta como a tela de exclusão a lista. */
export interface ContaDaBusca {
  userId: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string | null;
  status: string;
  criadaEm: string;
  verificacaoIdentidade: string;
  vinculos: Array<{ role: string; companyId: string; nomeFantasia: string }>;
}

export interface ListarContasParams {
  q?: string;
  /** `true` = só quem ainda não tem empresa (cadastro não finalizado). */
  semEmpresa?: boolean;
  status?: string;
  limit?: number;
}

export interface PreviewDeExclusaoDeConta {
  userId: string;
  nome: string;
  email: string;
  /** `false` quando há histórico de terceiros preso na conta (ver `impedimentos`). */
  podeExcluir: boolean;
  impedimentos: ItemDeExclusao[];
  seraApagado: ItemDeExclusao[];
}

export interface ContaResumida {
  userId: string;
  nome: string;
  email: string;
}

export interface PreviewDeExclusaoDeEmpresa {
  companyId: string;
  nomeFantasia: string;
  cpfCnpj: string;
  seraApagado: ItemDeExclusao[];
  contasQueSeraoApagadas: ContaResumida[];
  contasQueSobrevivem: ContaResumida[];
}

export interface ResultadoDaExclusaoDeEmpresa {
  companyId: string;
  nomeFantasia: string;
  contasApagadas: string[];
  contasMantidas: Array<{ userId: string; email: string; motivo: string }>;
  pagamentosAnonimizados: number;
}

/**
 * Exclusão DEFINITIVA de conta/transportadora (Admin Rotta).
 *
 * Diferente de suspender: a linha sai do banco, liberando e-mail,
 * telefone, CPF e CNPJ (todos `@unique`) para um novo cadastro. É
 * irreversível, então toda tela chama o `preview` correspondente antes
 * de habilitar o botão.
 */
export function createAccountDeletionEndpoints(apiClient: ApiClient) {
  return {
    listarContas: async (
      params: ListarContasParams = {},
    ): Promise<{ items: ContaDaBusca[]; total: number }> =>
      (
        await apiClient.request<ApiEnvelope<{ items: ContaDaBusca[]; total: number }>>(
          `/account-deletion/users${buildQueryString(params)}`,
        )
      ).data,

    previewConta: async (userId: string): Promise<PreviewDeExclusaoDeConta> =>
      (
        await apiClient.request<ApiEnvelope<PreviewDeExclusaoDeConta>>(
          `/account-deletion/users/${userId}/preview`,
        )
      ).data,

    excluirConta: async (userId: string): Promise<{ userId: string; email: string }> =>
      (
        await apiClient.request<ApiEnvelope<{ userId: string; email: string }>>(
          `/account-deletion/users/${userId}`,
          { method: "DELETE" },
        )
      ).data,

    previewEmpresa: async (companyId: string): Promise<PreviewDeExclusaoDeEmpresa> =>
      (
        await apiClient.request<ApiEnvelope<PreviewDeExclusaoDeEmpresa>>(
          `/account-deletion/companies/${companyId}/preview`,
        )
      ).data,

    excluirEmpresa: async (companyId: string): Promise<ResultadoDaExclusaoDeEmpresa> =>
      (
        await apiClient.request<ApiEnvelope<ResultadoDaExclusaoDeEmpresa>>(
          `/account-deletion/companies/${companyId}`,
          { method: "DELETE" },
        )
      ).data,
  };
}

export type AccountDeletionEndpoints = ReturnType<typeof createAccountDeletionEndpoints>;
