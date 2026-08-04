import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

/** Corpo comum de `PATCH /notifications/:id/favorita` e `.../arquivada` — sempre o valor explícito, nunca um "toggle" implícito. */
export class SetNotificationFlagDto {
  @ApiProperty()
  @IsBoolean()
  valor!: boolean;
}
