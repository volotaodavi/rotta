import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, Length, Matches } from "class-validator";

/**
 * O que FALTA para um Motorista/Monitor autônomo virar a própria
 * transportadora.
 *
 * Nome, e-mail, telefone e CPF não entram aqui de propósito: a conta já
 * tem os quatro, e pedir de novo seria recadastro disfarçado. O que o
 * `registerAutonomo` nunca coletou foi o endereço, e `Company` exige os
 * seis campos abaixo como obrigatórios. Essa é a única razão desta tela
 * existir em vez de a conversão acontecer sozinha.
 */
export class ConverterEmTransportadoraDto {
  @ApiProperty({ example: "24900000" })
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: "CEP deve ter 8 dígitos." })
  cep!: string;

  @ApiProperty({ example: "Rua das Flores" })
  @IsString()
  @Length(3, 180)
  endereco!: string;

  @ApiProperty({ example: "123" })
  @IsString()
  @Length(1, 20)
  numero!: string;

  @ApiProperty({ example: "Apto 101", required: false })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  complemento?: string;

  @ApiProperty({ example: "Centro" })
  @IsString()
  @Length(2, 120)
  bairro!: string;

  @ApiProperty({ example: "Maricá" })
  @IsString()
  @Length(2, 120)
  cidade!: string;

  @ApiProperty({ example: "RJ" })
  @IsString()
  @Length(2, 2, { message: "Estado deve ser a sigla de 2 letras (ex.: RJ)." })
  estado!: string;

  /** Como a transportadora aparece para as famílias. Vazio = o próprio nome da pessoa. */
  @ApiProperty({ example: "Van do Danilo", required: false })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  nomeFantasia?: string;
}
