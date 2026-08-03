import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";

/** `POST /schools/import` (multipart) — briefing "IMPORTAÇÃO" (CSV/Excel/JSON reais; a "API Oficial" do INEP/MEC é tratada à parte pelo Education Sync Agent, `InepSyncService` em `@/modules/geo/agents/inep-sync.service.ts`, disparado por `POST /geo/inep-sync`). */
export class ImportSchoolsDto {
  @ApiProperty({ enum: ["csv", "excel", "json"] })
  @IsIn(["csv", "excel", "json"])
  format!: "csv" | "excel" | "json";
}
