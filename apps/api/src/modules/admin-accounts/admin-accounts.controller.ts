import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AdminAccountsService } from "./admin-accounts.service";
import { CreateAdminAccountDto } from "./dto/create-admin-account.dto";
import { UpdateAdminAccountDto } from "./dto/update-admin-account.dto";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";


/**
 * "Contas Admin" (pedido do usuário 03/09/2026) — GERAL-only: nenhuma
 * rota aqui leva `@AdminAreas`, então `AdminAreaGuard` recusa qualquer
 * sub-papel restrito (SUPORTE/FINANCEIRO) por padrão — só GERAL cria/
 * gerencia outras contas Admin.
 */
@ApiTags("admin-accounts")
@ApiBearerAuth()
@Controller("admin-accounts")
@Roles(Role.ADMIN_ROTTA)
export class AdminAccountsController {
  constructor(private readonly adminAccountsService: AdminAccountsService) {}

  @Get()
  list() {
    return this.adminAccountsService.list();
  }

  @Post()
  create(@Body() dto: CreateAdminAccountDto) {
    return this.adminAccountsService.create(dto);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAdminAccountDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.adminAccountsService.update(id, dto, actor);
  }
}
