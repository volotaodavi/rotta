import { ApiProperty } from "@nestjs/swagger";

/**
 * Prévia pública da transportadora pelo `codigoInterno` (pedido do
 * usuário: "vai aparecer a transportadora que ela está se
 * credenciando" — mesmo quando o celular informado não bate com nenhum
 * pré-cadastro pendente). Separado de `StudentPreRegistrationLookupResponseDto`
 * de propósito: aquele só existe quando HÁ pré-cadastro; este existe
 * sempre que o código é válido, pra área pública de convite conseguir
 * mostrar "você está entrando na transportadora X" mesmo em cadastro do
 * zero.
 */
export class CompanyPreviewResponseDto {
  @ApiProperty() companyId!: string;
  @ApiProperty() companyName!: string;
}
