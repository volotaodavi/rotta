import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";

import { DASHBOARD_REPOSITORY } from "./dashboard.constants";

import type { DashboardResponseDto } from "./dto/dashboard-response.dto";
import type {
  CompanyDashboardData,
  DashboardRepository,
} from "./repositories/dashboard.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

import { Role } from "@/shared/enums";

/**
 * Núcleo de negócio do Dashboard (`DASH-01` a `DASH-07`, Dossiê 19;
 * Prompt 22/Dossiê 30) — "está tudo funcionando hoje?" por perfil.
 * Nenhuma entidade própria: só agrega leitura de outros módulos via
 * `DashboardRepository` (mesmo espírito de `BackofficeService`,
 * Dossiê 29).
 *
 * `getForActor`/`GET /dashboard/me` cobre Motorista/Monitor/Responsável
 * — os três papéis que NÃO tinham nenhum dashboard próprio antes desta
 * fase. Empresa/Gestor JÁ tinham `GET /companies/:id/dashboard`
 * (`CompaniesService.getDashboard`, Dossiê 16), que ficou com
 * `alunos`/`rotas`/`viagens`/`documentosVencendo`/`alertas` hardcoded em
 * `0` só porque os módulos que alimentariam esses números (Routes,
 * Trips, Marketplace/Contract, Documents) ainda não existiam — agora
 * existem, então `getCompanyDashboardById` completa aquele endpoint já
 * existente em vez de criar um segundo endpoint concorrente (ver Dossiê
 * 30 §3.1).
 */
@Injectable()
export class DashboardService {
  constructor(
    @Inject(DASHBOARD_REPOSITORY) private readonly dashboardRepository: DashboardRepository,
  ) {}

  async getForActor(actor: AuthenticatedUser): Promise<DashboardResponseDto> {
    switch (actor.role) {
      case Role.MOTORISTA:
      case Role.MONITOR: {
        const motorista = await this.dashboardRepository.getDriverDashboard(actor.sub);
        return { perfil: "motorista", motorista };
      }
      case Role.RESPONSAVEL: {
        const responsavel = await this.dashboardRepository.getResponsavelDashboard(actor.sub);
        return { perfil: "responsavel", responsavel };
      }
      default:
        // Nunca alcançado em produção — `DashboardController` restringe
        // `@Roles(...)` exatamente aos 3 papéis acima (Empresa/Gestor
        // usam `GET /companies/:id/dashboard`; Admin Rotta usa
        // `GET /backoffice/dashboard` + `GET /analytics/national/kpis`,
        // Dossiê 30 §3). Guarda de exaustividade só para segurança em
        // profundidade caso o RBAC do controller mude no futuro.
        throw new InternalServerErrorException(
          `Papel "${actor.role}" não tem um dashboard definido em GET /dashboard/me.`,
        );
    }
  }

  /** Reusado por `CompaniesService.getDashboard(id, actor)` — nunca exposto como `/dashboard/me` (ver nota acima). */
  getCompanyDashboardById(companyId: string): Promise<CompanyDashboardData> {
    return this.dashboardRepository.getCompanyDashboard(companyId);
  }
}
