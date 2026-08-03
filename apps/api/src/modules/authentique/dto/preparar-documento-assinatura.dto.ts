import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

/**
 * Preparação do documento de contrato para assinatura eletrônica
 * (briefing "CONTRATO" — "Preparar integração para assinatura digital
 * via Authentique"). Só o identificador do contrato: os signatários
 * (Responsável/Empresa) e o próprio conteúdo do documento seriam
 * resolvidos, na integração real, a partir do `Contract` já persistido
 * — nenhum dado adicional trafega por aqui hoje.
 */
export class PrepararDocumentoAssinaturaDto {
  @ApiProperty()
  @IsUUID()
  contractId!: string;
}
