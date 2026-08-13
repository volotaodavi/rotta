import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

/**
 * Endereço em texto livre → coordenada (Nominatim `/search`, via
 * `GeoEngineService.geocode`). Usado pelo cadastro de Aluno pra
 * geocodificar o endereço de embarque digitado no formulário (pedido do
 * usuário em produção: pino + rota traçada até a escola, "Use a medida
 * do OPENSTREET nesse quesito") — o Nominatim continua só sendo chamado
 * pelo backend, nunca direto do navegador.
 */
export class GeocodeAddressDto {
  @ApiProperty({ example: "Rua Augusta, 1000, Consolação, São Paulo, SP" })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(300)
  endereco!: string;
}
