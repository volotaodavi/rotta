import { buildQueryString } from "../query.util";

import type { CompanyType } from "./companies";
import type { SchoolShift } from "./schools";
import type { CreateStudentInput } from "./students";
import type { VehicleCategory, VehicleType } from "./vehicles";
import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Marketplace (briefing "Marketplace") —
 * espelham `apps/api/src/modules/marketplace`: busca de transportadores
 * (com selo Verificado), solicitação de transporte, geração/assinatura
 * de contrato e avaliações pós-transporte. Um único arquivo (nunca
 * vários), mesma decisão do backend — todos operam sobre o mesmo trio
 * `TransportRequest`/`Contract`/`Rating`. `CompanyType`/`VehicleType`/
 * `SchoolShift` são reaproveitados de `endpoints/companies.ts`/
 * `vehicles.ts`/`schools.ts` (nunca redeclarados aqui), já que são o
 * mesmo enum do Prisma em todos os módulos.
 */

export type TransportRequestStatus = "RECEBIDA" | "EM_ANALISE" | "APROVADA" | "RECUSADA";
export type ContractStatus = "AGUARDANDO_ASSINATURA" | "ATIVO" | "ENCERRADO";
export type RatingTargetType = "MOTORISTA" | "EMPRESA" | "MONITOR" | "VEICULO";

// --- Busca de transportadores ---------------------------------------------

export interface SearchTransportersParams {
  latitude: number;
  longitude: number;
  raioKm?: number;
  mensalidadeMaxCentavos?: number;
  escolaId?: string;
  tipoVeiculo?: VehicleType;
  /** Modalidade da frota (Dossiê 45 — CATEGORIA B ≠ TRANSPORTE ESCOLAR): só retorna transportadoras com pelo menos 1 veículo ativo nessa categoria. */
  categoriaVeiculo?: VehicleCategory;
  tipoEmpresa?: CompanyType;
  avaliacaoMin?: number;
  apenasVerificados?: boolean;
  sortBy?: "distancia" | "avaliacao" | "mensalidade";
  page?: number;
  pageSize?: number;
}

export interface TransporterCard {
  id: string;
  nomeFantasia: string;
  logoUrl: string | null;
  tipo: CompanyType;
  verificado: boolean;
  distanciaKm: number;
  avaliacaoMedia: number | null;
  totalAvaliacoes: number;
  veiculosAtivos: number;
  tiposVeiculo: VehicleType[];
  /** Modalidades da frota ativa (Dossiê 45 — CATEGORIA B ≠ TRANSPORTE ESCOLAR): "ESCOLAR" só aparece quando a empresa tem pelo menos 1 veículo ativo declarado nessa categoria — nunca inferido da categoria da CNH de um motorista. Isso é uma declaração da empresa, não uma verificação — ver `escolarVerificado`. */
  categoriasVeiculo: VehicleCategory[];
  /** Dossiê 45, achado C1: true só quando pelo menos 1 veículo ESCOLAR tem motorista vinculado com elegibilidade completa verificada (CNH D/E + EAR + curso + antecedentes) — nunca apenas a categoria declarada em `categoriasVeiculo`. */
  escolarVerificado: boolean;
  alunosTransportados: number;
  mensalidadeAPartirDeCentavos: number | null;
}

export interface ListTransportersResult {
  items: TransporterCard[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TransporterRecentRating {
  nota: number;
  comentario: string | null;
  responsavelNome: string;
  createdAt: string;
}

export interface TransporterPublicSchoolLink {
  id: string;
  nomeOficial: string;
}

export interface TransporterPublicTeamMember {
  nome: string;
  /** Valor de `Role` (Dossie 8, Secao 2) — sempre "motorista" ou "monitor" aqui. */
  papel: string;
}

export interface TransporterDetail extends TransporterCard {
  razaoSocial: string;
  cidade: string;
  estado: string;
  telefone: string | null;
  whatsapp: string | null;
  fotoUrl: string | null;
  avaliacoesRecentes: TransporterRecentRating[];
  /** Data de cadastro da empresa na Rotta — base de "atuando há X anos". */
  atuandoDesde: string;
  /** Escolas com vínculo ativo — perfil público (briefing "PERFIL DA EMPRESA"). */
  escolasAtendidas: TransporterPublicSchoolLink[];
  /** Motoristas/monitores ativos — só nome e papel, nunca dado pessoal sensível. */
  equipe: TransporterPublicTeamMember[];
  /** Média de horas entre envio e decisão de solicitações — null se a empresa ainda não decidiu nenhuma. */
  tempoMedioRespostaHoras: number | null;
}

// --- Solicitação de transporte ----------------------------------------------

export interface CreateTransportRequestInput {
  companyId: string;
  studentId?: string;
  novoAluno?: CreateStudentInput;
}

export interface TransportRequest {
  id: string;
  studentId: string;
  responsavelId: string;
  companyId: string;
  schoolId: string;
  turno: SchoolShift;
  status: TransportRequestStatus;
  motivoRecusa: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListTransportRequestsParams {
  status?: TransportRequestStatus;
  page?: number;
  pageSize?: number;
}

export interface ListTransportRequestsResult {
  items: TransportRequest[];
  total: number;
  page: number;
  pageSize: number;
}

// --- Contrato ---------------------------------------------------------------

export interface CreateContractInput {
  valorMensalidadeCentavos: number;
  planoDescricao: string;
  regras: string;
  vigenciaInicio: string;
  vigenciaFim?: string;
  vehicleId?: string;
  motoristaId?: string;
  monitorId?: string;
}

export interface Contract {
  id: string;
  transportRequestId: string;
  studentId: string;
  responsavelId: string;
  companyId: string;
  schoolId: string;
  vehicleId: string | null;
  motoristaId: string | null;
  monitorId: string | null;
  valorMensalidadeCentavos: number;
  planoDescricao: string;
  regras: string;
  vigenciaInicio: string;
  vigenciaFim: string | null;
  status: ContractStatus;
  authentiqueDocumentId: string | null;
  assinadoResponsavelEm: string | null;
  assinadoEmpresaEm: string | null;
  ativadoEm: string | null;
  encerradoEm: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListContractsParams {
  page?: number;
  pageSize?: number;
}

export interface ListContractsResult {
  items: Contract[];
  total: number;
  page: number;
  pageSize: number;
}

// --- Avaliações ---------------------------------------------------------------

export interface CreateRatingInput {
  alvoTipo: RatingTargetType;
  nota: number;
  comentario?: string;
}

export interface Rating {
  id: string;
  contractId: string;
  responsavelId: string;
  companyId: string;
  alvoTipo: RatingTargetType;
  alvoId: string;
  nota: number;
  comentario: string | null;
  createdAt: string;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createMarketplaceEndpoints(apiClient: ApiClient) {
  return {
    searchTransporters: async (params: SearchTransportersParams): Promise<ListTransportersResult> =>
      (
        await apiClient.request<ApiEnvelope<ListTransportersResult>>(
          `/marketplace/transporters${buildQueryString(params)}`,
        )
      ).data,

    getTransporterById: async (
      id: string,
      coords?: { latitude: number; longitude: number },
    ): Promise<TransporterDetail> =>
      (
        await apiClient.request<ApiEnvelope<TransporterDetail>>(
          `/marketplace/transporters/${id}${buildQueryString(coords ?? {})}`,
        )
      ).data,

    createTransportRequest: async (input: CreateTransportRequestInput): Promise<TransportRequest> =>
      (
        await apiClient.request<ApiEnvelope<TransportRequest>>("/marketplace/transport-requests", {
          method: "POST",
          body: input,
        })
      ).data,

    listTransportRequests: async (
      params: ListTransportRequestsParams = {},
    ): Promise<ListTransportRequestsResult> =>
      (
        await apiClient.request<ApiEnvelope<ListTransportRequestsResult>>(
          `/marketplace/transport-requests${buildQueryString(params)}`,
        )
      ).data,

    getTransportRequestById: async (id: string): Promise<TransportRequest> =>
      (
        await apiClient.request<ApiEnvelope<TransportRequest>>(
          `/marketplace/transport-requests/${id}`,
        )
      ).data,

    marcarTransportRequestEmAnalise: async (id: string): Promise<TransportRequest> =>
      (
        await apiClient.request<ApiEnvelope<TransportRequest>>(
          `/marketplace/transport-requests/${id}/em-analise`,
          { method: "PATCH" },
        )
      ).data,

    aprovarTransportRequest: async (id: string): Promise<TransportRequest> =>
      (
        await apiClient.request<ApiEnvelope<TransportRequest>>(
          `/marketplace/transport-requests/${id}/aprovar`,
          { method: "PATCH" },
        )
      ).data,

    recusarTransportRequest: async (id: string, motivoRecusa: string): Promise<TransportRequest> =>
      (
        await apiClient.request<ApiEnvelope<TransportRequest>>(
          `/marketplace/transport-requests/${id}/recusar`,
          { method: "PATCH", body: { motivoRecusa } },
        )
      ).data,

    gerarContrato: async (
      transportRequestId: string,
      input: CreateContractInput,
    ): Promise<Contract> =>
      (
        await apiClient.request<ApiEnvelope<Contract>>(
          `/marketplace/transport-requests/${transportRequestId}/contract`,
          { method: "POST", body: input },
        )
      ).data,

    listContracts: async (params: ListContractsParams = {}): Promise<ListContractsResult> =>
      (
        await apiClient.request<ApiEnvelope<ListContractsResult>>(
          `/marketplace/contracts${buildQueryString(params)}`,
        )
      ).data,

    getContractById: async (id: string): Promise<Contract> =>
      (await apiClient.request<ApiEnvelope<Contract>>(`/marketplace/contracts/${id}`)).data,

    assinarContratoComoResponsavel: async (id: string): Promise<Contract> =>
      (
        await apiClient.request<ApiEnvelope<Contract>>(
          `/marketplace/contracts/${id}/assinar-responsavel`,
          { method: "PATCH" },
        )
      ).data,

    assinarContratoComoEmpresa: async (id: string): Promise<Contract> =>
      (
        await apiClient.request<ApiEnvelope<Contract>>(
          `/marketplace/contracts/${id}/assinar-empresa`,
          { method: "PATCH" },
        )
      ).data,

    createRating: async (contractId: string, input: CreateRatingInput): Promise<Rating> =>
      (
        await apiClient.request<ApiEnvelope<Rating>>(
          `/marketplace/contracts/${contractId}/ratings`,
          { method: "POST", body: input },
        )
      ).data,

    listRatings: async (contractId: string): Promise<Rating[]> =>
      (
        await apiClient.request<ApiEnvelope<Rating[]>>(
          `/marketplace/contracts/${contractId}/ratings`,
        )
      ).data,
  };
}

export type MarketplaceEndpoints = ReturnType<typeof createMarketplaceEndpoints>;
