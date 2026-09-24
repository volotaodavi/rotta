import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

/**
 * O dispositivo, como o Traccar o conhece. `uniqueId` é o IMEI — é o
 * que o rastreador manda no primeiro pacote e o que amarramos ao ônibus
 * em `Vehicle.rastreadorImei`.
 */
export class TraccarDeviceDto {
  @ApiProperty({ example: "863719060123456" })
  @IsString()
  uniqueId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

/**
 * Atributos variáveis que o Traccar extrai do protocolo do aparelho.
 *
 * `ignition` é o que interessa aqui, e vem tanto do Teltonika quanto do
 * GT06 — é o fio ACC, o que diz se a chave está virada. Vem `undefined`
 * em aparelho que não reporta ignição, e o serviço trata isso como "não
 * sei", nunca como "desligado".
 */
export class TraccarAttributesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ignition?: boolean;

  @ApiPropertyOptional({ description: "Bateria do aparelho, 0-100." })
  @IsOptional()
  @IsNumber()
  batteryLevel?: number;

  @ApiPropertyOptional({ description: "Aparelho em movimento, segundo o acelerômetro." })
  @IsOptional()
  @IsBoolean()
  motion?: boolean;
}

/**
 * Uma posição encaminhada pelo Traccar (`forward.type = json`).
 *
 * Os nomes dos campos são os do Traccar, em inglês, de propósito: este
 * DTO é um CONTRATO EXTERNO, não código nosso. Traduzir aqui esconderia
 * a origem e faria alguém, mais tarde, achar que pode renomear à
 * vontade — o Traccar é quem manda no formato.
 */
export class TraccarForwardDto {
  @ApiProperty({ type: TraccarDeviceDto })
  @IsObject()
  @ValidateNested()
  @Type(() => TraccarDeviceDto)
  device!: TraccarDeviceDto;

  @ApiProperty({ example: -22.9194 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: -42.8186 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiPropertyOptional({ description: "Velocidade em NÓS — o Traccar não converte." })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({
    description:
      "Instante do fix de GPS. Preferido sobre `serverTime`: é quando o ônibus ESTEVE ali, não quando o pacote chegou.",
  })
  @IsOptional()
  @IsString()
  fixTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serverTime?: string;

  @ApiPropertyOptional({
    description:
      "`false` quando o aparelho reporta sem fix válido de satélite. Posição inválida é descartada.",
  })
  @IsOptional()
  @IsBoolean()
  valid?: boolean;

  @ApiPropertyOptional({ type: TraccarAttributesDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TraccarAttributesDto)
  attributes?: TraccarAttributesDto;
}
