import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RatingTargetType } from "@prisma/client";

export class RatingResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() contractId!: string;
  @ApiProperty() responsavelId!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty({ enum: RatingTargetType }) alvoTipo!: RatingTargetType;
  @ApiProperty() alvoId!: string;
  @ApiProperty() nota!: number;
  @ApiPropertyOptional() comentario?: string | null;
  @ApiProperty() createdAt!: Date;
}
