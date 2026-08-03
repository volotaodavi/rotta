import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsUUID, ValidateNested } from "class-validator";

import { CreateStudentDto } from "@/modules/students/dto/create-student.dto";

/**
 * Solicitar transporte (briefing "Marketplace" §"SOLICITAR TRANSPORTE").
 * Exatamente UM dos dois deve vir preenchido — nunca os dois, nunca
 * nenhum (validado em `TransportRequestsService.create`, já que uma
 * regra XOR entre dois objetos não se expressa bem em decorators do
 * `class-validator`): `studentId` para um aluno já cadastrado, ou
 * `novoAluno` para o fluxo de "cadastro inline" descrito no briefing —
 * neste caso o aluno é criado por `StudentsService.create` (mesmas
 * regras/auditoria do cadastro avulso) antes da solicitação.
 */
export class CreateTransportRequestDto {
  @ApiPropertyOptional({ description: "Empresa/transportador de quem se está solicitando" })
  @IsUUID()
  companyId!: string;

  @ApiPropertyOptional({ description: "Aluno já cadastrado pelo Responsável" })
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({
    description: "Cadastro inline de um novo aluno, na própria solicitação",
    type: CreateStudentDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateStudentDto)
  novoAluno?: CreateStudentDto;
}
