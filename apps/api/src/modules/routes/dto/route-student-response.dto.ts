import { ApiProperty } from "@nestjs/swagger";

/** Forma de resposta pública de `RouteStudent`. */
export class RouteStudentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() routeId!: string;
  @ApiProperty() contractId!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() paradaEmbarqueId!: string;
  @ApiProperty() paradaDesembarqueId!: string;
  @ApiProperty() ativo!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
