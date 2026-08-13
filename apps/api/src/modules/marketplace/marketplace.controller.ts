import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { SearchTransportersQueryDto } from "./dto/search-transporters-query.dto";
import { MarketplaceService } from "./marketplace.service";

import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * API pública de descoberta do Marketplace (briefing "Marketplace"
 * §"BUSCA"/"TRANSPORTADORES"/"DETALHES"). Leitura apenas — a ação de
 * contratar vive em outro módulo (`TransportRequest`/`Contract`, ainda
 * por vir). `Role.RESPONSAVEL` é quem busca de verdade;
 * `Role.ADMIN_ROTTA` também pode consultar (moderação/suporte), nunca
 * Empresa/Gestor (eles não "buscam a si mesmos" no marketplace).
 */
@ApiTags("marketplace")
@ApiBearerAuth()
@Controller("marketplace/transporters")
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get()
  @Roles(Role.RESPONSAVEL, Role.ADMIN_ROTTA)
  search(@Query() query: SearchTransportersQueryDto) {
    return this.marketplaceService.search(query);
  }

  @Get(":id")
  @Roles(Role.RESPONSAVEL, Role.ADMIN_ROTTA)
  findById(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("latitude") latitude?: string,
    @Query("longitude") longitude?: string,
  ) {
    return this.marketplaceService.findByIdOrThrow(
      id,
      latitude !== undefined ? Number(latitude) : undefined,
      longitude !== undefined ? Number(longitude) : undefined,
    );
  }

  /**
   * Frente M — segunda porta de entrada pro mesmo perfil público de
   * `findById`, resolvendo `Company.codigoInterno` (`TRN-000001`) em
   * vez de UUID. `by-code/:codigo` tem dois segmentos de path
   * (`:id` acima só casa com um), então nunca colide com a rota de
   * cima independente da ordem de declaração.
   */
  @Get("by-code/:codigo")
  @Roles(Role.RESPONSAVEL, Role.ADMIN_ROTTA)
  findByCode(@Param("codigo") codigo: string) {
    return this.marketplaceService.findByCodeOrThrow(codigo);
  }
}
