import { PartialType } from "@nestjs/swagger";

import { CreateSchoolAccessPointDto } from "./create-school-access-point.dto";

export class UpdateSchoolAccessPointDto extends PartialType(CreateSchoolAccessPointDto) {}
