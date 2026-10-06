import { AuditLogService } from "../audit-log.service";

import type { AuditLogRepository } from "../repositories/audit-log.repository";

function buildRepository(): jest.Mocked<AuditLogRepository> {
  return {
    record: jest.fn().mockResolvedValue({ id: "log-1" }),
    list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    listByEntity: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  };
}

describe("AuditLogService", () => {
  it("repassa o registro ao repositório sem alterar nada: a trilha é a prova do que aconteceu", async () => {
    const repository = buildRepository();
    const service = new AuditLogService(repository);
    const input = {
      companyId: "company-1",
      entidadeTipo: "Vehicle",
      entidadeId: "vehicle-1",
      acao: "UPDATE",
      dadosAntes: { placa: "AAA0A00" },
      dadosDepois: { placa: "BBB1B11" },
    };

    await service.record(input);

    expect(repository.record).toHaveBeenCalledWith(input);
  });

  it("deixa a falha de gravação subir, para o serviço chamador não seguir como se a ação estivesse auditada", async () => {
    const repository = buildRepository();
    repository.record.mockRejectedValue(new Error("db fora"));
    const service = new AuditLogService(repository);

    await expect(
      service.record({ entidadeTipo: "School", entidadeId: "s-1", acao: "UPDATE" }),
    ).rejects.toThrow("db fora");
  });

  it("lista por empresa na página 1 com 20 itens quando o chamador não diz nada", async () => {
    const repository = buildRepository();
    const service = new AuditLogService(repository);

    await service.listByCompany("company-1", {});

    expect(repository.list).toHaveBeenCalledWith({
      companyId: "company-1",
      entidadeTipo: undefined,
      entidadeId: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it("lista a trilha de uma entidade de catálogo compartilhado com os mesmos padrões de página", async () => {
    const repository = buildRepository();
    const service = new AuditLogService(repository);

    await service.listByEntity("School", "school-1");

    expect(repository.listByEntity).toHaveBeenCalledWith({
      entidadeTipo: "School",
      entidadeId: "school-1",
      page: 1,
      pageSize: 20,
    });
  });
});
