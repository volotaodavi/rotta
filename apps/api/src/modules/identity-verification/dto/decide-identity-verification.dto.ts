import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

/** Só os dois status que o Admin Rotta decide manualmente — "Resubmitted" (pedir reenvio) não tem tela própria ainda, fica de fora até existir demanda real. Ambos são subconjunto válido de `DiditManualStatus` (`didit.service.ts`), aceito diretamente por `DiditService.updateSessionStatus`. */
const DECIDABLE_STATUSES = ["Approved", "Declined"] as const;
type DecidableStatus = (typeof DECIDABLE_STATUSES)[number];

/** Corpo de `POST /identity-verification/admin/:userId/decision` — decisão manual do Admin Rotta sobre uma sessão Didit, sem precisar abrir o Business Console dela. */
export class DecideIdentityVerificationDto {
  @ApiProperty({ enum: DECIDABLE_STATUSES })
  @IsIn(DECIDABLE_STATUSES)
  newStatus!: DecidableStatus;

  @ApiPropertyOptional({
    description:
      'Motivo mostrado diretamente ao usuário reprovado — obrigatório quando newStatus é "Declined".',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
