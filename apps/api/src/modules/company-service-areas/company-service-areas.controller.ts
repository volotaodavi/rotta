import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CompanyServiceAreasService } from "./company-service-areas.service";
import { CreateCompanyServiceAreaDto } from "./dto/create-company-service-area.dto";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * Área de atuação da transportadora (fluxo público, 22/09/2026).
 *
 * Escrita: só Admin Rotta — a cerca não pode ser editada por quem ela
 * cerca. Leitura: Admin Rotta e a própria empresa, porque a
 * transportadora precisa enxergar a própria área para entender por que
 * um credenciamento foi recusado (o serviço recusa ler a de outra).
 */
@ApiTags("company-service-areas")
@ApiBearerAuth()
@Controller("companies/:companyId/service-areas")
export class CompanyServiceAreasController {
  constructor(private readonly service: CompanyServiceAreasService) {}

  @Post()
  @Roles(Role.ADMIN_ROTTA)
  criar(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @Body() dto: CreateCompanyServiceAreaDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.criar(companyId, dto, actor);
  }

  @Get()
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  listar(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.service.listar(companyId, actor);
  }

  @Delete(":areaId")
  @Roles(Role.ADMIN_ROTTA)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remover(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @Param("areaId", ParseUUIDPipe) areaId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    await this.service.remover(companyId, areaId, actor);
  }
}
