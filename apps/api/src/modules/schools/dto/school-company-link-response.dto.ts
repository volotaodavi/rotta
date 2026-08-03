import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SchoolCompanyLinkResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() schoolId!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() vinculadoEm!: Date;
  @ApiPropertyOptional() desvinculadoEm?: Date | null;
  @ApiProperty() vinculadoPorId!: string;
  @ApiPropertyOptional() encerradoPorId?: string | null;
}

export class ListSchoolCompanyLinksResponseDto {
  @ApiProperty({ type: [SchoolCompanyLinkResponseDto] }) items!: SchoolCompanyLinkResponseDto[];
}
