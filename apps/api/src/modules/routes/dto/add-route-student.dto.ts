import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

/**
 * Vínculo de aluno a uma rota (ROT-07/EMB-01) — feito a partir de um
 * `Contract` ATIVO (nunca diretamente de `studentId`), já que é o
 * contrato quem sabe a que empresa/veículo/motorista este transporte
 * pertence (ver nota do model `RouteStudent` no schema).
 */
export class AddRouteStudentDto {
  @ApiProperty({ description: "Contrato ATIVO do aluno com esta empresa" })
  @IsUUID()
  contractId!: string;

  @ApiProperty({ description: "Parada onde este aluno embarca" })
  @IsUUID()
  paradaEmbarqueId!: string;

  @ApiProperty({ description: "Parada onde este aluno desembarca" })
  @IsUUID()
  paradaDesembarqueId!: string;
}
