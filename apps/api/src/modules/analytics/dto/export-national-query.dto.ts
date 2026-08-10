import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";

import { NationalKpisQueryDto } from "./national-kpis-query.dto";

/** Mesmo período de `NationalKpisQueryDto` + o formato de exportação (briefing "Relatórios exportáveis PDF/Excel/CSV"). */
export class ExportNationalQueryDto extends NationalKpisQueryDto {
  @ApiPropertyOptional({ enum: ["csv", "excel", "pdf"], default: "csv" })
  @IsOptional()
  @IsIn(["csv", "excel", "pdf"])
  format: "csv" | "excel" | "pdf" = "csv";
}
