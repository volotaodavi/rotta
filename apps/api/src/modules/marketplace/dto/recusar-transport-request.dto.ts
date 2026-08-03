import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

/** Recusa da solicitação (briefing "SOLICITAÇÃO" — status `RECUSADA`) — motivo sempre obrigatório, exibido ao Responsável. */
export class RecusarTransportRequestDto {
  @ApiProperty({ example: "Já atingimos a capacidade máxima de alunos para este turno." })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  motivoRecusa!: string;
}
