import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CompanyJoinRequestsService } from "./company-join-requests.service";
import { CreateCompanyJoinRequestDto } from "./dto/create-company-join-request.dto";
import { RejectCompanyJoinRequestDto } from "./dto/reject-company-join-request.dto";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * `company-join-requests` (Frente N, briefing item 9) — API REST de
 * "informar código da transportadora e pedir vínculo". `me`/`create` são
 * do lado do Motorista/Monitor autônomo; o resto (listar/aprovar/
 * recusar) é do lado da Empresa/Gestor, em "Equipe".
 */
@ApiTags("company-join-requests")
@ApiBearerAuth()
@Controller("company-join-requests")
export class CompanyJoinRequestsController {
  constructor(private readonly service: CompanyJoinRequestsService) {}

  @Post()
  @Roles(Role.MOTORISTA, Role.MONITOR)
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateCompanyJoinRequestDto) {
    return this.service.create(actor, dto);
  }

  @Get("me")
  @Roles(Role.MOTORISTA, Role.MONITOR)
  findMine(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.findMine(actor);
  }

  @Get()
  @Roles(Role.EMPRESA, Role.GESTOR)
  findPending(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.findPendingForCompany(actor);
  }

  @Post(":id/approve")
  @Roles(Role.EMPRESA, Role.GESTOR)
  @HttpCode(HttpStatus.OK)
  approve(@CurrentUser() actor: AuthenticatedUser, @Param("id") id: string) {
    return this.service.approve(actor, id);
  }

  @Post(":id/reject")
  @Roles(Role.EMPRESA, Role.GESTOR)
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: RejectCompanyJoinRequestDto,
  ) {
    return this.service.reject(actor, id, dto);
  }
}
