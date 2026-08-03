import type {
  SchoolCoordinate,
  SchoolCoordinateSource,
  SchoolCoordinateStatus,
} from "@prisma/client";

export interface CreateSchoolCoordinateData {
  schoolId: string;
  latitude: number;
  longitude: number;
  precisao: string;
  fonte: SchoolCoordinateSource;
  tentativa: number;
}

export interface SchoolCoordinateRepository {
  create(data: CreateSchoolCoordinateData): Promise<SchoolCoordinate>;
  findById(id: string): Promise<SchoolCoordinate | null>;
  updateStatus(
    id: string,
    status: SchoolCoordinateStatus,
    input: { validadoPorIa: boolean; motivoRevisao?: string },
  ): Promise<SchoolCoordinate>;
  findLatestBySchoolId(schoolId: string): Promise<SchoolCoordinate | null>;
  listBySchoolId(schoolId: string): Promise<SchoolCoordinate[]>;
  listByStatus(status: SchoolCoordinateStatus): Promise<SchoolCoordinate[]>;
}
