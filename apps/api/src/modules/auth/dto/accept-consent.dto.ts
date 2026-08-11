import { ApiProperty } from "@nestjs/swagger";
import { ConsentType } from "@prisma/client";
import { ArrayMinSize, ArrayUnique, IsArray, IsEnum } from "class-validator";

/** Reaceite de Termos/Privacidade (Dossiê 45 FRENTE 5) — `POST /auth/me/consent`, chamado pelo cliente quando `MeResponseDto.pendingConsents` vem não-vazio. */
export class AcceptConsentDto {
  @ApiProperty({
    enum: ConsentType,
    isArray: true,
    example: ["TERMOS_DE_USO", "POLITICA_PRIVACIDADE"],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(ConsentType, { each: true })
  tipos!: ConsentType[];
}
