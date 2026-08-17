import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { TripsService } from "@/modules/trips/trips.service";
import { Role } from "@/shared/enums";

/**
 * API REST do "localizador"/mapa (GPS-01/03/06) — só LEITURA agregada
 * sobre o que `TripsController` já escreve (posições, viagens). Nenhum
 * repositório próprio: delega inteiramente a `TripsService`, que já
 * concentra a lógica de mapa/localizador (`listActiveForMap`/
 * `findActiveTripForStudent`) e de trilha histórica
 * (`listPositions`, exposto aqui só por conveniência de nomenclatura).
 */
@ApiTags("gps")
@ApiBearerAuth()
@Controller("gps")
export class GpsController {
  constructor(private readonly tripsService: TripsService) {}

  /** Mapa operacional (Empresa/Gestor/Admin Rotta) — todos os veículos em viagem agora. */
  @Get("map")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  getMap(@CurrentUser() actor: AuthenticatedUser, @Query("companyId") companyId?: string) {
    return this.tripsService.listActiveForMap(actor, companyId);
  }

  /** Localizador do Responsável — posição atual do transporte do próprio filho, se houver viagem em curso. */
  @Get("students/:studentId")
  @Roles(Role.RESPONSAVEL, Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  getForStudent(
    @Param("studentId", ParseUUIDPipe) studentId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tripsService.findActiveTripForStudent(studentId, actor);
  }

  /** Trilha histórica de uma viagem específica (linha completa percorrida). */
  @Get("trips/:tripId/track")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR, Role.MOTORISTA, Role.MONITOR)
  getTrack(
    @Param("tripId", ParseUUIDPipe) tripId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.tripsService.listPositions(tripId, actor);
  }

  /**
   * Histórico de embarque/desembarque do próprio filho (modelo de
   * referência enviado pelo usuário — abas "Hoje"/"Semana"/"Mês" na
   * tela de acompanhamento do Responsável). `range` decide a janela
   * aqui no controller (nunca uma data arbitrária vinda do cliente);
   * "hoje" cobre desde a meia-noite local.
   */
  @Get("students/:studentId/events-history")
  @Roles(Role.RESPONSAVEL, Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  getStudentEventsHistory(
    @Param("studentId", ParseUUIDPipe) studentId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("range") range: "hoje" | "semana" | "mes" = "hoje",
  ) {
    const since = new Date();
    if (range === "semana") since.setDate(since.getDate() - 7);
    else if (range === "mes") since.setDate(since.getDate() - 30);
    else since.setHours(0, 0, 0, 0);

    return this.tripsService.listStudentEventsHistory(studentId, actor, since);
  }
}
