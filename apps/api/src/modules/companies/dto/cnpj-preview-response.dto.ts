import { ApiProperty } from "@nestjs/swagger";

/**
 * Prévia da consulta de CNPJ na Receita Federal — usada só pelo
 * frontend pra mostrar/travar os campos ANTES de enviar o cadastro
 * (`GET /companies/cnpj/:cnpj`, público). A confirmação que realmente
 * vale (a que decide o que vai pro banco) é sempre a que
 * `CompaniesService.create` faz de novo, no servidor — esta prévia
 * nunca é usada como fonte de verdade do cadastro em si.
 */
export class CnpjPreviewResponseDto {
  @ApiProperty() cnpj!: string;
  @ApiProperty() razaoSocial!: string;
  @ApiProperty() nomeFantasiaSugerido!: string;
  @ApiProperty() situacaoCadastral!: string;
  @ApiProperty() ativa!: boolean;
  @ApiProperty() cep!: string;
  @ApiProperty() endereco!: string;
  @ApiProperty() numero!: string;
  @ApiProperty({ required: false, nullable: true }) complemento!: string | null;
  @ApiProperty() bairro!: string;
  @ApiProperty() cidade!: string;
  @ApiProperty() estado!: string;
}
