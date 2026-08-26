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
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";

import { CreateStudentPreRegistrationDto } from "./dto/create-student-pre-registration.dto";
import { LookupStudentPreRegistrationQueryDto } from "./dto/lookup-student-pre-registration-query.dto";
import { StudentPreRegistrationsService } from "./student-pre-registrations.service";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Public } from "@/common/decorators/public.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * API REST de `student-pre-registrations` (pedido do usuário: "no
 * painel do admin deverá ter essa opção de cadastrar alunos por
 * transporte + responsável" + "o responsável ao entrar no app/web
 * deverá colocar o código único do transporte"). `create`/`list`/
 * `cancel` são exclusivos de Empresa/Gestor/Admin Rotta; `:id/claim`
 * (que grava `reclamadoPorId`) exige o Responsável autenticado.
 *
 * `lookup`/`company-preview` são `@Public()` (pedido do usuário, área
 * de convite: "o responsável recebe o código da transportadora... vai
 * digitar o código... vai aparecer a transportadora... caso já tenha
 * pré-cadastro, confirma... posteriormente a rota vai pedir pra formar
 * uma senha" — ou seja, a busca precisa acontecer ANTES de existir
 * qualquer conta). `lookup` nunca leu `actor` mesmo quando exigia
 * `Role.RESPONSAVEL` (só resolvia `codigoInterno` + celular por baixo),
 * então liberar não muda nenhum comportamento dela — só quem pode
 * chamar. Throttle dedicado (mesmo padrão de `AuthModule`) porque agora
 * é alcançável sem sessão: sem isso, seria possível tentar celulares em
 * sequência contra um `codigoInterno` conhecido pra descobrir nomes.
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

  @Get("company-preview")
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  previewCompany(@Query("codigoInterno") codigoInterno: string) {
    return this.service.previewCompanyByCodigo(codigoInterno ?? "");
  }

  @Get("lookup")
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
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
