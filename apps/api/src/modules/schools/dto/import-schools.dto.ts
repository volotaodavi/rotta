import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

/** `POST /schools/import` (multipart) — briefing "IMPORTAÇÃO" (CSV/Excel/JSON reais; "API Oficial" é tratada por `InepSyncService`, um estágio à parte). */
export class ImportSchoolsDto {
  @ApiProperty({ enum: ["csv", "excel", "json"] })
  @IsIn(["csv", "excel", "json"])
  format!: "csv" | "excel" | "json";
}
