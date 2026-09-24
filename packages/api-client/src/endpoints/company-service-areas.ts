import type { ApiClient } from "../http";
import type { SchoolAdministrativeDependency } from "./schools";

/**
 * Área de atuação da transportadora e credenciamento por município
 * (fluxo de transporte público) — espelha
 * `apps/api/src/modules/company-service-areas`.
 */

export interface CompanyServiceArea {
  id: string;
  companyId: string;
  /** Município da área. `null` quando a área é de uma escola específica. */
  cidade: string | null;
  estado: string | null;
  schoolId: string | null;
  /** Nome da escola, quando a área é de uma escola — a tela mostra o nome, não o UUID. */
  schoolNome: string | null;
  /** Vazio = todas as redes daquele município. */
  dependencias: SchoolAdministrativeDependency[];
  createdAt: string;
}

export interface CreateCompanyServiceAreaInput {
  cidade?: string;
  estado?: string;
  schoolId?: string;
  dependencias?: SchoolAdministrativeDependency[];
}

export interface CredenciarMunicipioInput {
  cidade: string;
  estado: string;
  dependencias?: SchoolAdministrativeDependency[];
}

/**
 * Os três números existem para conferência: se o município tem 62
 * escolas na planilha e `encontradas` disser 58, faltou algo na
 * importação — melhor descobrir agora do que quando uma criança não
 * aparecer em nenhuma rota.
 */
export interface CredenciamentoDeMunicipio {
  encontradas: number;
  credenciadas: number;
  jaCredenciadas: number;
  areaDeAtuacaoRegistrada: boolean;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createCompanyServiceAreasEndpoints(apiClient: ApiClient) {
  return {
    listar: async (companyId: string): Promise<CompanyServiceArea[]> =>
      (
        await apiClient.request<ApiEnvelope<CompanyServiceArea[]>>(
          `/companies/${companyId}/service-areas`,
        )
      ).data,

    criar: async (
      companyId: string,
      input: CreateCompanyServiceAreaInput,
    ): Promise<CompanyServiceArea> =>
      (
        await apiClient.request<ApiEnvelope<CompanyServiceArea>>(
          `/companies/${companyId}/service-areas`,
          { method: "POST", body: input },
        )
      ).data,

    remover: async (companyId: string, areaId: string): Promise<void> => {
      await apiClient.request(`/companies/${companyId}/service-areas/${areaId}`, {
        method: "DELETE",
      });
    },

    /**
     * Credencia a transportadora em TODAS as escolas do município e
     * registra a área de atuação na mesma operação. Reexecutar é
     * seguro: o que já estava vinculado não duplica.
     */
    credenciarMunicipio: async (
      companyId: string,
      input: CredenciarMunicipioInput,
    ): Promise<CredenciamentoDeMunicipio> =>
      (
        await apiClient.request<ApiEnvelope<CredenciamentoDeMunicipio>>(
          `/companies/${companyId}/service-areas/municipio`,
          { method: "POST", body: input },
        )
      ).data,
  };
}

export type CompanyServiceAreasEndpoints = ReturnType<typeof createCompanyServiceAreasEndpoints>;
