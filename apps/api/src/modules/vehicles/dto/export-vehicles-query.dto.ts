import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";

import { ListVehiclesQueryDto } from "./list-vehicles-query.dto";

/** Mesmos filtros de `ListVehiclesQueryDto` + o formato de exportação (briefing "EXPORTAÇÃO"). */
export class ExportVehiclesQueryDto extends ListVehiclesQueryDto {
  @ApiPropertyOptional({ enum: ["csv", "excel", "pdf"], default: "csv" })
  @IsOptional()
  @IsIn(["csv", "excel", "pdf"])
  format: "csv" | "excel" | "pdf" = "csv";
}
