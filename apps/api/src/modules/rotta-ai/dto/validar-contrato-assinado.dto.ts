import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

/**
 * Validação pós-assinatura do contrato (briefing "Marketplace" §"ROTTA
 * AI" — "Rotta AI valida o contrato assinado e ativa automaticamente o
 * transporte"). Só o identificador do contrato: a validação em si
 * (análise das duas assinaturas/documento final) seria resolvida, numa
 * integração real, a partir do próprio `Contract` já persistido.
 */
export class ValidarContratoAssinadoDto {
  @ApiProperty()
  @IsUUID()
  contractId!: string;
}
