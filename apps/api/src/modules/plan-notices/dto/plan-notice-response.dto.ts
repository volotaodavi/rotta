import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PlanNoticeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() titulo!: string;
  @ApiProperty() corpo!: string;
  @ApiPropertyOptional() companyId?: string | null;
  @ApiPropertyOptional() companyNomeFantasia?: string | null;
  @ApiProperty() ativo!: boolean;
  @ApiProperty() criadoPorNome!: string;
  @ApiProperty() createdAt!: Date;
}

export class ListPlanNoticesResponseDto {
  @ApiProperty({ type: [PlanNoticeResponseDto] }) items!: PlanNoticeResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
