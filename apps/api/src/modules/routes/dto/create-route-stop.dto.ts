import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from "class-validator";

/**
 * Parada de rota (ROT-07/embarque-desembarque) — `ordem` define a
 * sequência no trajeto. Duas formas de informar a localização (pedido do
 * usuário: "quando for criar uma rota, deverá ser mediante a escola que
 * foi importada, não deverá colocar o endereço de fato"):
 *  1. `schoolId` — parada NA escola, escolhida do catálogo já
 *     importado/geocodificado; `endereco`/`latitude`/`longitude` são
 *     preenchidos por `RoutesService` a partir da própria `School`,
 *     nunca digitados.
 *  2. `endereco`+`latitude`+`longitude` — parada em qualquer outro
 *     endereço (ex. residência de um aluno), continua existindo porque
 *     nem toda parada de uma rota escolar é na escola.
 * `RoutesService.addStop`/`updateStop` exigem UMA das duas formas.
 */
export class CreateRouteStopDto {
  @ApiProperty({ minimum: 0, description: "Posição da parada na sequência do trajeto (0-based)" })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordem!: number;

  @ApiProperty({
    required: false,
    description:
      "Escola do catálogo compartilhado — quando informado, endereco/latitude/longitude são preenchidos a partir dela (nunca digitados).",
  })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiProperty({ required: false, example: "Rua das Flores, 123 — Bela Vista" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  endereco?: string;

  @ApiProperty({ required: false, example: -23.561684 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiProperty({ required: false, example: -46.655981 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @ApiProperty({ example: "07:15", description: "Horário previsto no formato HH:mm" })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "horarioPrevisto deve estar no formato HH:mm" })
  horarioPrevisto!: string;
}
