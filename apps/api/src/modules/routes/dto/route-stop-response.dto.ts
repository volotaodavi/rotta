import { ApiProperty } from "@nestjs/swagger";

/** Forma de resposta pública de `RouteStop`. */
export class RouteStopResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() routeId!: string;
  @ApiProperty() ordem!: number;
  @ApiProperty() endereco!: string;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
  @ApiProperty() horarioPrevisto!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
