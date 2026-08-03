import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

import { ListSchoolsQueryDto } from "./list-schools-query.dto";

/** `GET /schools/export` — mesmos filtros da listagem + formato (briefing "EXPORTAÇÃO"). */
export class ExportSchoolsQueryDto extends ListSchoolsQueryDto {
  @ApiProperty({ enum: ["csv", "excel", "pdf"] })
  @IsIn(["csv", "excel", "pdf"])
  format!: "csv" | "excel" | "pdf";
}
