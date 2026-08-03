import type { SchoolAccessPoint, SchoolAccessPointType } from "@prisma/client";

export interface CreateSchoolAccessPointData {
  schoolId: string;
  tipo: SchoolAccessPointType;
  nome: string;
  descricao?: string;
  latitude: number;
  longitude: number;
  observacoes?: string;
}

export type UpdateSchoolAccessPointData = Partial<Omit<CreateSchoolAccessPointData, "schoolId">>;

/** `school_access_points` também sem RLS — ver nota em `School`/`SchoolAccessPoint` no schema. */
export interface SchoolAccessPointRepository {
  create(data: CreateSchoolAccessPointData): Promise<SchoolAccessPoint>;
  findById(id: string): Promise<SchoolAccessPoint | null>;
  update(id: string, data: UpdateSchoolAccessPointData): Promise<SchoolAccessPoint>;
  delete(id: string): Promise<void>;
  listBySchool(schoolId: string): Promise<SchoolAccessPoint[]>;
}
