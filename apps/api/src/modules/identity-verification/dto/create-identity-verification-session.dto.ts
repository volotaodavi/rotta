import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUrl } from "class-validator";

/** Corpo de `POST /identity-verification/me/sessions` — mesmo padrão de `CreateCheckoutDto.returnUrl` (Rotta Pay/Billing): quem chama decide pra onde a Didit redireciona de volta ao terminar. */
export class CreateIdentityVerificationSessionDto {
  @ApiPropertyOptional({
    example: "https://app.rotta.com.br/verificacao-identidade",
    description: "URL de retorno após o usuário concluir o fluxo hospedado da Didit. Opcional.",
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  callbackUrl?: string;
}
