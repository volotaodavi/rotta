import type { CompanyStatus } from "@prisma/client";

/**
 * Leitura agregada cross-tenant para a "tela inicial" do Admin Rotta
 * (Dossiê 11 §6.1 / `ADM-06`) — nenhuma tabela própria, só contagens
 * sobre entidades de outros módulos (mesmo espírito dos módulos
 * `Dashboard`/`Analytics`, ainda vazios). Toda query aqui é
 * inerentemente cross-tenant (Admin Rotta), então a implementação
 * Prisma usa `withBypass` diretamente, nunca `withTenant`.
 */
export interface DashboardSummaryData {
  empresasPorStatus: Record<CompanyStatus, number>;
  empresasTotal: number;
  motoristasAtivos: number;
  monitoresAtivos: number;
  veiculosTotal: number;
  alunosTotal: number;
  viagensHoje: number;
  chamadosAbertos: number;
  documentosMotoristaPendentes: number;
  documentosVeiculoPendentes: number;
  contratosAguardandoAssinatura: number;
}

export interface PendingDriverDocumentItem {
  id: string;
  companyId: string;
  companyNome: string;
  userId: string;
  userNome: string;
  tipo: string;
  rottaAiStatus: string;
  createdAt: Date;
}

export interface PendingVehicleDocumentItem {
  id: string;
  companyId: string;
  companyNome: string;
  vehicleId: string;
  vehiclePlaca: string;
  tipo: string;
  rottaAiStatus: string;
  createdAt: Date;
}

export interface PendingContractItem {
  id: string;
  companyId: string;
  companyNome: string;
  studentNome: string;
  status: string;
  createdAt: Date;
}

export interface ApprovalQueueData {
  documentosMotorista: PendingDriverDocumentItem[];
  documentosVeiculo: PendingVehicleDocumentItem[];
  contratos: PendingContractItem[];
}

export interface BackofficeRepository {
  getDashboardSummary(): Promise<DashboardSummaryData>;
  listPendingApprovals(limitPerCategoria: number): Promise<ApprovalQueueData>;
}
