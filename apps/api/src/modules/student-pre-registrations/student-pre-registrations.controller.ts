import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CreateStudentPreRegistrationDto } from "./dto/create-student-pre-registration.dto";
import { LookupStudentPreRegistrationQueryDto } from "./dto/lookup-student-pre-registration-query.dto";
import { StudentPreRegistrationsService } from "./student-pre-registrations.service";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * API REST de `student-pre-registrations` (pedido do usuário: "no
 * painel do admin deverá ter essa opção de cadastrar alunos por
 * transporte + responsável" + "o responsável ao entrar no app/web
 * deverá colocar o código único do transporte"). `create`/`list`/
 * `cancel` são exclusivos de Empresa/Gestor/Admin Rotta; `lookup`/
 * `:id/claim` são exclusivos do Responsável.
 */
@ApiTags("student-pre-registrations")
@ApiBearerAuth()
@Controller("student-pre-registrations")
export class StudentPreRegistrationsController {
  constructor(private readonly service: StudentPreRegistrationsService) {}

  @Post()
  @Roles(Role.EMPRESA, Role.GESTOR, Role.ADMIN_ROTTA)
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateStudentPreRegistrationDto) {
    return this.service.create(actor, dto);
  }

  @Get()
  @Roles(Role.EMPRESA, Role.GESTOR, Role.ADMIN_ROTTA)
  list(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.listByCompany(actor);
  }

  @Delete(":id")
  @Roles(Role.EMPRESA, Role.GESTOR, Role.ADMIN_ROTTA)
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() actor: AuthenticatedUser, @Param("id") id: string) {
    return this.service.cancel(actor, id);
  }

  @Get("lookup")
  @Roles(Role.RESPONSAVEL)
  lookup(@Query() query: LookupStudentPreRegistrationQueryDto) {
    return this.service.lookup(query);
  }

  @Post(":id/claim")
  @Roles(Role.RESPONSAVEL)
  @HttpCode(HttpStatus.OK)
  claim(@CurrentUser() actor: AuthenticatedUser, @Param("id") id: string) {
    return this.service.claim(actor, id);
  }
}
