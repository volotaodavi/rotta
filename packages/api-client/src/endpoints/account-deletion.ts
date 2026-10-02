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

/** O que a conta é na plataforma — o vínculo sozinho não diz. */
export type TipoDeConta =
  "transportadora" | "transportador" | "responsavel" | "escola" | "indefinido";

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
  tipo: TipoDeConta;
  /** O que falta nesta conta, em frases prontas. Vazio = nada falta. */
  pendencias: string[];
}

/** Recortes da lista, cada um um "o que falta" diferente. */
export type RecorteDeContas =
  | "com-pendencia"
  | "sem-transportadora"
  | "responsavel-sem-aluno"
  | "identidade-pendente"
  | "desativadas";

export interface ListarContasParams {
  q?: string;
  recorte?: RecorteDeContas;
  limit?: number;
}

/**
 * Um pré-cadastro que nunca virou conta: quem pagou (ou só começou) o
 * checkout público e nunca completou o cadastro. Não existe `User` nem
 * `Company`, então não aparecia em nenhuma outra tela do painel.
 */
export interface PreCadastroDaBusca {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpfCnpj: string | null;
  status: string;
  planCode: string;
  valorCentavos: number;
  provider: string;
  pagoEm: string | null;
  expiraEm: string;
  reembolsadoEm: string | null;
  criadoEm: string;
  pendencias: string[];
  /** `false` quando há pagamento confirmado: aí é registro fiscal. */
  podeExcluir: boolean;
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

    listarPreCadastros: async (
      params: { q?: string; limit?: number } = {},
    ): Promise<{ items: PreCadastroDaBusca[]; total: number }> =>
      (
        await apiClient.request<ApiEnvelope<{ items: PreCadastroDaBusca[]; total: number }>>(
          `/account-deletion/pre-cadastros${buildQueryString(params)}`,
        )
      ).data,

    excluirPreCadastro: async (id: string): Promise<{ id: string; nome: string }> =>
      (
        await apiClient.request<ApiEnvelope<{ id: string; nome: string }>>(
          `/account-deletion/pre-cadastros/${id}`,
          { method: "DELETE" },
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
