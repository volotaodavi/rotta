import { Injectable } from "@nestjs/common";

import {
  CLIENT_ERROR_REPORT_INCLUDE,
  type ClientErrorReportRepository,
  type ClientErrorReportWithIncludes,
  type CreateClientErrorReportData,
  type ListClientErrorReportsFilter,
  type ListClientErrorReportsResult,
} from "./client-error-report.repository";

import { PrismaService } from "@/infra/database/prisma.service";

@Injectable()
export class PrismaClientErrorReportRepository implements ClientErrorReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateClientErrorReportData): Promise<ClientErrorReportWithIncludes> {
    return this.prisma.clientErrorReport.create({
      data,
      include: CLIENT_ERROR_REPORT_INCLUDE,
    });
  }

  async list(filter: ListClientErrorReportsFilter): Promise<ListClientErrorReportsResult> {
    const where = {
      app: filter.app,
      digest: filter.digest,
      buildId: filter.buildId,
    };

    const [items, total] = await Promise.all([
      this.prisma.clientErrorReport.findMany({
        where,
        include: CLIENT_ERROR_REPORT_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.clientErrorReport.count({ where }),
    ]);

    return { items, total };
  }
}
