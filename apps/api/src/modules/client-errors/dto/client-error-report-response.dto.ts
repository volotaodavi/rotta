import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ClientApp, type ClientErrorReport } from "@prisma/client";

export class ClientErrorReportResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ClientApp }) app!: ClientApp;
  @ApiProperty() message!: string;
  @ApiPropertyOptional() digest!: string | null;
  @ApiPropertyOptional() stack!: string | null;
  @ApiProperty() path!: string;
  @ApiPropertyOptional() userAgent!: string | null;
  @ApiPropertyOptional() buildId!: string | null;
  @ApiPropertyOptional() serviceWorkerActive!: boolean | null;
  @ApiPropertyOptional() source!: string | null;
  @ApiPropertyOptional() userId!: string | null;
  @ApiPropertyOptional() userNome!: string | null;
  @ApiPropertyOptional() companyId!: string | null;
  @ApiPropertyOptional() companyNome!: string | null;
  @ApiProperty() createdAt!: Date;
}

export class ListClientErrorReportsResponseDto {
  @ApiProperty({ type: [ClientErrorReportResponseDto] }) items!: ClientErrorReportResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export type ClientErrorReportWithRelations = ClientErrorReport & {
  user?: { nome: string } | null;
  company?: { nomeFantasia: string } | null;
};

export function toClientErrorReportResponseDto(
  report: ClientErrorReportWithRelations,
): ClientErrorReportResponseDto {
  return {
    id: report.id,
    app: report.app,
    message: report.message,
    digest: report.digest,
    stack: report.stack,
    path: report.path,
    userAgent: report.userAgent,
    buildId: report.buildId,
    serviceWorkerActive: report.serviceWorkerActive,
    source: report.source,
    userId: report.userId,
    userNome: report.user?.nome ?? null,
    companyId: report.companyId,
    companyNome: report.company?.nomeFantasia ?? null,
    createdAt: report.createdAt,
  };
}
