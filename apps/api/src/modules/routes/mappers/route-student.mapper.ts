import type { RouteStudentResponseDto } from "../dto/route-student-response.dto";
import type { RouteStudent } from "@prisma/client";

export function toRouteStudentResponseDto(routeStudent: RouteStudent): RouteStudentResponseDto {
  return {
    id: routeStudent.id,
    routeId: routeStudent.routeId,
    contractId: routeStudent.contractId,
    studentId: routeStudent.studentId,
    paradaEmbarqueId: routeStudent.paradaEmbarqueId,
    paradaDesembarqueId: routeStudent.paradaDesembarqueId,
    ativo: routeStudent.ativo,
    createdAt: routeStudent.createdAt,
    updatedAt: routeStudent.updatedAt,
  };
}
