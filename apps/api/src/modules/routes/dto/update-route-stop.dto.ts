import { PartialType } from "@nestjs/swagger";

import { CreateRouteStopDto } from "./create-route-stop.dto";

/** Edição de parada — todo campo é opcional. */
export class UpdateRouteStopDto extends PartialType(CreateRouteStopDto) {}
