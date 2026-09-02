import { ApiPropertyOptional } from "@nestjs/swagger";
import { SupportTicketCategoria, SupportTicketStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

/** Listagem de chamados — `companyId` só é lido para `Role.ADMIN_ROTTA` (Empresa/Gestor sempre veem só o próprio tenant, ver `SupportService`). */
export class ListSupportTicketsQueryDto {
  @ApiPropertyOptional({ enum: SupportTicketStatus })
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @ApiPropertyOptional({ enum: SupportTicketCategoria })
  @IsOptional()
  @IsEnum(SupportTicketCategoria)
  categoria?: SupportTicketCategoria;

  @ApiPropertyOptional({
    description: "Só Admin Rotta: filtra por uma empresa específica (omitido = todas)",
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      "false (padrão) esconde arquivados; true mostra só os arquivados (pedido do usuário 02/09/2026).",
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  arquivado?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
