import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CompanyJoinPreRegistrationsService } from "./company-join-pre-registrations.service";
import { CreateCompanyJoinPreRegistrationDto } from "./dto/create-company-join-pre-registration.dto";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";


/**
 * `company-join-pre-registrations` — API REST da tela "Convites"
 * (pedido do usuário 02/09/2026). Só a Empresa/Gestor acessa: o
 * candidato nunca vê/lista pré-cadastros diretamente, só sente o
 * efeito (vínculo automático) ao informar o código em
 * `POST /company-join-requests`.
 */
@ApiTags("company-join-pre-registrations")
@ApiBearerAuth()
@Controller("company-join-pre-registrations")
@Roles(Role.EMPRESA, Role.GESTOR)
export class CompanyJoinPreRegistrationsController {
  constructor(private readonly service: CompanyJoinPreRegistrationsService) {}

  @Post()
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateCompanyJoinPreRegistrationDto,
  ) {
    return this.service.create(actor, dto);
  }

  @Get()
  list(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.listByCompany(actor);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() actor: AuthenticatedUser, @Param("id") id: string) {
    return this.service.cancel(actor, id);
  }
}
