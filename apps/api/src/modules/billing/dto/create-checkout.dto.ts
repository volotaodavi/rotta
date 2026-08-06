import { ApiProperty } from "@nestjs/swagger";
import { IsUrl } from "class-validator";

export class CreateCheckoutDto {
  @ApiProperty({
    example: "https://app.rotta.com.br/empresa",
    description:
      "URL da própria Rotta para onde a AbacatePay redireciona ao concluir/cancelar o checkout — nunca um domínio de terceiro.",
  })
  @IsUrl({ require_tld: false })
  returnUrl!: string;
}
