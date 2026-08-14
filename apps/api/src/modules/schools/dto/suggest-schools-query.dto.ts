import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

/**
 * Autocomplete de escola do Responsável (pedido do usuário: "mesmo
 * escrevendo errado... vai dar uma sugestão de escola baseada no nome e
 * localização") — DIFERENTE de `ListSchoolsQueryDto`: aqui a busca é
 * tolerante a erro de digitação (`SchoolsService.sugerirEscolas`) e
 * `latitude`/`longitude` (opcionais, aproximados ou exatos — o
 * Responsável pode mandar a localização do próprio navegador) reordenam
 * as sugestões por proximidade, nunca filtram (uma escola longe mas com
 * nome muito parecido ainda aparece).
 */
export class SuggestSchoolsQueryDto {
  @ApiPropertyOptional({
    description: "Nome da escola buscado pelo Responsável, mesmo com erro de digitação",
  })
  @IsString()
  @MinLength(2)
  q!: string;

  @ApiPropertyOptional({
    description: "Latitude aproximada do embarque/localização do Responsável",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({
    description: "Longitude aproximada do embarque/localização do Responsável",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ default: 6, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit: number = 6;
}
