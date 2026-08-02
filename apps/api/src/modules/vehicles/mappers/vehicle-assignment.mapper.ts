import type { VehicleAssignmentResponseDto } from "../dto/vehicle-assignment-response.dto";
import type { VehicleAssignment } from "@prisma/client";

export function toVehicleAssignmentResponseDto(
  assignment: VehicleAssignment,
): VehicleAssignmentResponseDto {
  return {
    id: assignment.id,
    vehicleId: assignment.vehicleId,
    papel: assignment.papel,
    userId: assignment.userId,
    iniciadoEm: assignment.iniciadoEm,
    encerradoEm: assignment.encerradoEm,
    criadoPorId: assignment.criadoPorId,
  };
}
