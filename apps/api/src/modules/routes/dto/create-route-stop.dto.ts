import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsLatitude, IsLongitude, IsString, Matches, MaxLength, Min } from "class-validator";

/** Parada de rota (ROT-07/embarque-desembarque) — `ordem` define a sequência no trajeto. */
export class CreateRouteStopDto {
  @ApiProperty({ minimum: 0, description: "Posição da parada na sequência do trajeto (0-based)" })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordem!: number;

  @ApiProperty({ example: "Rua das Flores, 123 — Bela Vista" })
  @IsString()
  @MaxLength(200)
  endereco!: string;

  @ApiProperty({ example: -23.561684 })
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -46.655981 })
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @ApiProperty({ example: "07:15", description: "Horário previsto no formato HH:mm" })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "horarioPrevisto deve estar no formato HH:mm" })
  horarioPrevisto!: string;
}
