import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { RouteStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

import { CreateRouteDto } from "./create-route.dto";

/** Edição de Rota (ROT-02) — todo campo é opcional; `status` só é editável aqui (nunca no create). */
export class UpdateRouteDto extends PartialType(CreateRouteDto) {
  @ApiPropertyOptional({ enum: RouteStatus })
  @IsOptional()
  @IsEnum(RouteStatus)
  status?: RouteStatus;
}
