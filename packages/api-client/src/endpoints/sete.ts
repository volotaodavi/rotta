import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";
import type { SetePendencia } from "@rotta/shared-contracts";

/**
 * Integração com o SETE (FNDE) — espelha `apps/api/src/modules/sete`.
 *
 * ## Os tipos vêm de `@rotta/shared-contracts`, não daqui
 *
 * O resto deste pacote declara as suas próprias interfaces, porque cada
 * endpoint é uma forma só da API da Rotta. O SETE é diferente: a mesma
 * forma é lida pela tela E escrita no `.zip` que vai para a prefeitura.
 * Declará-la duas vezes é garantir que um dia as duas discordem.
 *
 * ## `companyId` só serve ao Admin Rotta
 *
 * Para Empresa e Gestor o backend IGNORA o parâmetro e usa o tenant do
 * token (RN-SETE-02). A tela do painel nunca o manda; ele existe aqui
 * porque o mesmo cliente serve `apps/admin`.
 */

export interface MunicipioSugerido {
  cidade: string | null;
  estado: string | null;
  /** `null` quando a Rotta não conhece o código IBGE do município — a pessoa digita. */
  codigoIbge: string | null;
}

export interface ExportarSeteParams {
  /** Sete dígitos. O SETE casa o município por este número. */
  codigoIbge: string;
  formato?: "json" | "csv";
  companyId?: string;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createSeteEndpoints(apiClient: ApiClient) {
  return {
    /** O que falta para o pacote ficar completo. Nunca traz dado sensível. */
    listarPendencias: async (companyId?: string): Promise<SetePendencia[]> =>
      (
        await apiClient.request<ApiEnvelope<SetePendencia[]>>(
          `/sete/pendencias${buildQueryString({ companyId })}`,
        )
      ).data,

    /** Município da área de atuação, para a tela sugerir o código IBGE. */
    sugerirMunicipio: async (companyId?: string): Promise<MunicipioSugerido> =>
      (
        await apiClient.request<ApiEnvelope<MunicipioSugerido>>(
          `/sete/municipio${buildQueryString({ companyId })}`,
        )
      ).data,

    /**
     * O pacote em `.zip`.
     *
     * `responseType: "blob"` como `vehiclesApi.exportList`: o binário não
     * passa pelo envelope `{ data }`.
     */
    exportar: async (params: ExportarSeteParams): Promise<Blob> =>
      apiClient.request<Blob>(`/sete/exportacao${buildQueryString(params)}`, {
        responseType: "blob",
      }),
  };
}

export type SeteEndpoints = ReturnType<typeof createSeteEndpoints>;
