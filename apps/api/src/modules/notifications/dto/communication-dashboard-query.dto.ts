import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional } from "class-validator";

/** Filtro de período do dashboard de comunicação — sem `desde`, agrega todo o histórico da empresa. */
export class CommunicationDashboardQueryDto {
  @ApiPropertyOptional({
    description: "ISO 8601 — agrega apenas notificações criadas a partir desta data",
  })
  @IsOptional()
  @IsDateString()
  desde?: string;
}
