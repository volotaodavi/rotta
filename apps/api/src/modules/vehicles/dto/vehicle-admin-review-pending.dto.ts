import { ApiProperty } from "@nestjs/swagger";
import { VehicleAdminReviewStatus } from "@prisma/client";

/**
 * `GET /vehicles/pendencias-revisao-admin` (Responsável) — um item por
 * veículo com uma decisão do Admin Rotta ainda não reconhecida
 * (`VehicleAdminReviewAcknowledgement`). Nunca inclui aprovação SEM
 * observação (nada para "Li e concordo" nesse caso — ver
 * `VehiclesService.listPendingAdminReviewAcknowledgements`).
 */
export class VehicleAdminReviewPendingDto {
  @ApiProperty() vehicleId!: string;
  @ApiProperty() placa!: string;
  @ApiProperty({ enum: VehicleAdminReviewStatus }) status!: VehicleAdminReviewStatus;
  @ApiProperty() observacao!: string | null;
  @ApiProperty() decisaoEm!: Date;
}
