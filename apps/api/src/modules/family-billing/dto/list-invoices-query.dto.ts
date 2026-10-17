import { ApiPropertyOptional } from "@nestjs/swagger";
import { ContractInvoiceStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

import { IsDiaDoCalendario } from "@/common/validators/is-dia-do-calendario.decorator";

export class ListInvoicesQueryDto {
  @ApiPropertyOptional({ enum: ContractInvoiceStatus })
  @IsOptional()
  @IsEnum(ContractInvoiceStatus)
  status?: ContractInvoiceStatus;

  /**
   * Qualquer dia do mês de competência — o serviço normaliza para o
   * primeiro dia. `IsDiaDoCalendario` recusa ISO completo e data
   * impossível (31/02), o mesmo validador dos outros campos de dia.
   */
  @ApiPropertyOptional({ example: "2026-04-01" })
  @IsOptional()
  @IsDiaDoCalendario()
  competencia?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
