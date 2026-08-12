import { ApiProperty } from "@nestjs/swagger";

/**
 * Resposta de `validarContratoAssinado` — verificação HEURÍSTICA de
 * anomalia sobre os dois eventos de assinatura já registrados no audit
 * trail (`AuditLog`, `ip`/`userAgent`/`createdAt`), nunca uma checagem
 * certificada de assinatura eletrônica (isso exigiria contratar um
 * provedor como a Authentique — `AuthentiqueService` continua stub
 * honesto). `anomaliasDetectadas` vazio significa "nada suspeito nos
 * sinais disponíveis", não "contrato garantidamente legítimo".
 */
export class ContractSignatureValidationResponseDto {
  @ApiProperty()
  contractId!: string;

  @ApiProperty({ type: [String] })
  anomaliasDetectadas!: string[];

  @ApiProperty({
    description:
      "Sempre false — esta é uma checagem heurística sobre metadados de assinatura (IP, tempo decorrido), não uma verificação certificada de assinatura eletrônica.",
  })
  analiseCompleta!: boolean;
}
