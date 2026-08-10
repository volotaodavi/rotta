import type { Company, CompanyType, Plan, Rating, Vehicle, VehicleDocument } from "@prisma/client";

export type CompanyWithPlan = Company & { plan: Plan };

/**
 * Filtros de negócio aplicáveis diretamente na query (`companies`/
 * `vehicles`/`school_company_links`). Distância (`raioKm`) e nota mínima
 * (`avaliacaoMin`) NÃO entram aqui — dependem de valores só conhecidos
 * depois de carregar o candidato (coordenadas, média das `Rating`s) e
 * são aplicados por `MarketplaceService`.
 */
export interface SearchTransportersFilter {
  escolaId?: string;
  tipoVeiculo?: Vehicle["tipo"];
  tipoEmpresa?: CompanyType;
}

/**
 * Um candidato "cru" — Empresa ativa com coordenadas conhecidas, mais
 * tudo que `MarketplaceService` precisa para computar distância,
 * selo Verificado e os números do cartão (briefing "TRANSPORTADORES"),
 * sem repetir uma query por empresa (N+1).
 */
export interface TransporterCandidate {
  company: CompanyWithPlan;
  veiculosAtivos: (Vehicle & { documentos: VehicleDocument[] })[];
  alunosTransportadosIds: string[];
  ratings: Pick<Rating, "nota">[];
  mensalidadesAtivasCentavos: number[];
}

/**
 * Leitura pública/cross-tenant do Marketplace (briefing "Marketplace"
 * §"BUSCA"/"TRANSPORTADORES") — `companies`/`vehicles`/`vehicle_documents`/
 * `contracts`/`ratings` TÊM RLS por `companyId`; todo método aqui usa
 * bypass deliberado (mesmo padrão documentado em
 * `SchoolCompanyLinkRepository.findActiveForSchool`), pois "encontrar
 * transportadores próximos" é por natureza uma consulta cross-tenant que
 * nenhuma Empresa/Responsável isolado poderia fazer sozinho. Nunca expõe
 * nada além do que o cartão/detalhe público precisa — sem
 * `cpfCnpj`/dados internos de outra empresa vazando por aqui.
 */
export interface PublicSchoolLink {
  id: string;
  nomeOficial: string;
}

export interface PublicTeamMember {
  nome: string;
  /** Valor de `Role` (Dossie 8, Secao 2) — sempre "motorista" ou "monitor" aqui. */
  papel: string;
}

export interface TransporterRepository {
  /** Todas as Empresas `ATIVO`/`deletedAt: null` com coordenadas, já filtradas pelos critérios não-geográficos. */
  searchCandidates(filter: SearchTransportersFilter): Promise<TransporterCandidate[]>;
  findCandidateById(companyId: string): Promise<TransporterCandidate | null>;
  listRecentRatingsForCompany(
    companyId: string,
    limit: number,
  ): Promise<(Rating & { responsavel: { nome: string } })[]>;
  /** Escolas com vínculo ativo (`desvinculadoEm: null`) — perfil público do transportador (briefing "PERFIL DA EMPRESA" §"Escolas atendidas"). */
  listActiveSchoolsForCompany(companyId: string, limit: number): Promise<PublicSchoolLink[]>;
  /**
   * Motoristas/monitores com `Membership` `ATIVO` — só nome e papel,
   * nunca CPF/telefone/e-mail (mesmo cuidado de nunca vazar dado
   * pessoal além do que o cartão/perfil público precisa, documentado na
   * nota da interface acima).
   */
  listPublicTeamForCompany(companyId: string): Promise<PublicTeamMember[]>;
  /**
   * Média de horas entre `TransportRequest.createdAt` e `updatedAt`
   * para solicitações já decididas (`APROVADA`/`RECUSADA`) — `null` se
   * a empresa ainda não decidiu nenhuma solicitação.
   */
  computeAverageResponseHours(companyId: string): Promise<number | null>;
}
