import { PartialType } from "@nestjs/swagger";

import { CreateSchoolDto } from "./create-school.dto";

/** Edição de Escola — todo campo de `CreateSchoolDto` é editável (diferente de Veículo, aqui não há um "identificador físico imutável" análogo à placa). */
export class UpdateSchoolDto extends PartialType(CreateSchoolDto) {}
