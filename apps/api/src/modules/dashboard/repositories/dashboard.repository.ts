/**
 * Leitura agregada para a tela inicial de cada perfil operacional
 * (`DASH-01` a `DASH-07`, Dossiê 19; Prompt 22/Dossiê 30) — mesmo
 * espírito de `BackofficeRepository` (Dossiê 29): nenhuma tabela
 * própria, só contagens sobre entidades de outros módulos. A diferença
 * é o escopo: `BackofficeRepository` é sempre cross-tenant (Admin
 * Rotta, `withBypass`); este repositório é sempre escopado a UM ator —
 * tenant (Motorista/Monitor, via `withTenant`/RLS, mais o próprio
 * `userId`) ou pessoa (Responsável, via `withBypass` + filtro explícito
 * por `responsavelId`, mesmo padrão de `PrismaContractRepository.list`).
 *
 * `getCompanyDashboard` é a exceção: recebe `companyId` explícito (nunca
 * implícito via `AsyncLocalStorage`) porque é reusado por
 * `CompaniesService.getDashboard(id, actor)` (Dossiê 16), onde `id` pode
 * ser QUALQUER empresa (Admin Rotta visualizando um tenant que não é o
 * seu) — mesmo padrão de `VehiclesService.countActive(companyId)`
 * (`withTenant` respeita o bypass do ator atual; o filtro explícito por
 * `companyId` é a correção que garante o escopo certo em ambos os
 * casos). Este módulo NUNCA expõe esse dashboard como `/dashboard/me`
 * para Empresa/Gestor — ver `DashboardController`.
 */

export interface TripCounters {
  total: number;
  emAndamento: number;
  concluidas: number;
  canceladas: number;
}

export interface CompanyDashboardData {
  rotasAtivas: number;
  rotasTotal: number;
  viagensHoje: TripCounters;
  motoristasAtivos: number;
  monitoresAtivos: number;
  veiculosTotal: number;
  /** Alunos com ao menos um `Contract` ATIVO com esta empresa (`DASH-07`) — `Student` não tem `companyId` próprio (Dossiê 28 §6.1). */
  alunosAtivos: number;
  chamadosAbertos: number;
  /** `DASH-05`/`DASH-06`: documentos de motorista/veículo vencendo nos próximos 7 dias. */
  documentosVencendoEm7Dias: { motorista: number; veiculo: number };
  /**
   * `DASH-03`, receita estimada — soma real de `Contract.valorMensalidadeCentavos`
   * de contratos `ATIVO`. Diferente do texto original de `DASH-03` (que
   * descreve `Student.valor_mensalidade` opcional, com aviso de "alunos
   * sem valor"), no schema atual o campo é `Contract.valorMensalidadeCentavos`
   * — obrigatório na criação do contrato — então todo contrato ATIVO
   * sempre tem valor; o caso alternativo de "aluno sem valor cadastrado"
   * não se aplica a este schema (ver Dossiê 30).
   */
  receitaEstimadaCentavos: number;
  contratosAtivos: number;
}

export interface DriverDashboardData {
  viagensHoje: TripCounters;
  documentosPendentesAnaliseIa: number;
  documentosVencendoEm30Dias: number;
}

export interface ResponsavelDashboardData {
  filhosTotal: number;
  contratosAtivos: number;
  contratosTotal: number;
}

export interface DashboardRepository {
  /** Escopo: `companyId` explícito (ver nota acima) — reusado por `CompaniesService.getDashboard`. */
  getCompanyDashboard(companyId: string): Promise<CompanyDashboardData>;
  /** Escopo: tenant do ator (`withTenant`) + identidade (`userId`) — Motorista/Monitor. */
  getDriverDashboard(userId: string): Promise<DriverDashboardData>;
  /** Escopo: pessoa (`withBypass` + `responsavelId` explícito) — Responsável, sem tenant (Dossiê 8 §2). */
  getResponsavelDashboard(responsavelId: string): Promise<ResponsavelDashboardData>;
}
