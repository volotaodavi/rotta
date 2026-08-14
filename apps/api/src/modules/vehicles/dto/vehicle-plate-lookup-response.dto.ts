import { ApiPropertyOptional } from "@nestjs/swagger";

export class VehiclePlateLookupResponseDto {
  @ApiPropertyOptional() marca!: string | null;
  @ApiPropertyOptional() modelo!: string | null;
  @ApiPropertyOptional() ano!: number | null;
  @ApiPropertyOptional() cor!: string | null;
}
