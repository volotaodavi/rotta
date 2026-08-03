import type {
  ListSchoolCompanyLinksResponseDto,
  SchoolCompanyLinkResponseDto,
} from "../dto/school-company-link-response.dto";
import type { SchoolCompanyLink } from "@prisma/client";

export function toSchoolCompanyLinkResponseDto(
  link: SchoolCompanyLink,
): SchoolCompanyLinkResponseDto {
  return {
    id: link.id,
    schoolId: link.schoolId,
    companyId: link.companyId,
    vinculadoEm: link.vinculadoEm,
    desvinculadoEm: link.desvinculadoEm,
    vinculadoPorId: link.vinculadoPorId,
    encerradoPorId: link.encerradoPorId,
  };
}

export function toListSchoolCompanyLinksResponseDto(
  links: SchoolCompanyLink[],
): ListSchoolCompanyLinksResponseDto {
  return { items: links.map(toSchoolCompanyLinkResponseDto) };
}
