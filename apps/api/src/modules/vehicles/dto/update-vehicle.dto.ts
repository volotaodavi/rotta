import { PartialType, OmitType } from "@nestjs/swagger";

import { CreateVehicleDto } from "./create-vehicle.dto";

/**
 * Edição de Veículo — `placa` nunca é editável por este endpoint (a
 * placa identifica o veículo físico; trocá-la é, na prática, cadastrar
 * outro veículo). Mesma convenção de `UpdateCompanyDto` omitindo campos
 * imutáveis do `CreateCompanyDto`.
 */
export class UpdateVehicleDto extends PartialType(OmitType(CreateVehicleDto, ["placa"] as const)) {}
