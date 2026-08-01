import { OmitType, PartialType } from "@nestjs/swagger";

import { CreateCompanyDto } from "./create-company.dto";

/**
 * Edição de Empresa (Dossiê 16, `EMP-02`) — `cpfCnpj`/`tipo` são
 * imutáveis após o cadastro (trocar o documento fiscal ou a forma
 * societária não é "editar", é uma operação administrativa distinta,
 * fora de escopo) e `administrador`/`planCode` têm fluxos próprios
 * (convite de novo administrador fica para o módulo Auth; troca de
 * plano é `PATCH /companies/:id/plan`).
 */
export class UpdateCompanyDto extends PartialType(
  OmitType(CreateCompanyDto, ["cpfCnpj", "tipo", "administrador", "planCode"] as const),
) {}
