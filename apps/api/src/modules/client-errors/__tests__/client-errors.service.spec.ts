import { ClientErrorsService } from "../client-errors.service";

import type { ClientErrorReportRepository } from "../repositories/client-error-report.repository";

function buildRepository(): jest.Mocked<ClientErrorReportRepository> {
  return {
    create: jest.fn(),
    list: jest.fn(),
  };
}

function buildJwtService(overrides: { verify?: jest.Mock } = {}): { verify: jest.Mock } {
  return {
    verify: overrides.verify ?? jest.fn(),
  };
}

const REPORT = {
  id: "report-1",
  app: "WEB" as const,
  message: "An error occurred in the Server Components render...",
  digest: "abc123",
  stack: null,
  path: "/rotas/novo",
  userAgent: "Mozilla/5.0",
  userId: null,
  companyId: null,
  createdAt: new Date(),
  user: null,
  company: null,
};

describe("ClientErrorsService", () => {
  describe("create", () => {
    it("salva o relatório sem exigir Authorization — pedido real: um erro pode acontecer antes do login terminar", async () => {
      const repository = buildRepository();
      repository.create.mockResolvedValue(REPORT);
      const jwtService = buildJwtService();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service = new ClientErrorsService(repository, jwtService as any);

      const result = await service.create(
        {
          app: "WEB",
          message: REPORT.message,
          digest: "abc123",
          path: "/rotas/novo",
        },
        { authorizationHeader: undefined, userAgent: "Mozilla/5.0" },
      );

      expect(result.id).toBe("report-1");
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: undefined, userAgent: "Mozilla/5.0" }),
      );
      expect(jwtService.verify).not.toHaveBeenCalled();
    });

    it("resolve userId a partir de um Bearer token válido", async () => {
      const repository = buildRepository();
      repository.create.mockResolvedValue({ ...REPORT, userId: "user-1" });
      const verify = jest.fn().mockReturnValue({ sub: "user-1" });
      const jwtService = buildJwtService({ verify });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service = new ClientErrorsService(repository, jwtService as any);

      await service.create(
        { app: "WEB", message: REPORT.message, path: "/rotas/novo" },
        { authorizationHeader: "Bearer token-valido" },
      );

      expect(verify).toHaveBeenCalledWith("token-valido");
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
    });

    it("nunca lança quando o token é inválido/expirado — só reporta sem userId (best-effort)", async () => {
      const repository = buildRepository();
      repository.create.mockResolvedValue(REPORT);
      const verify = jest.fn().mockImplementation(() => {
        throw new Error("jwt expired");
      });
      const jwtService = buildJwtService({ verify });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service = new ClientErrorsService(repository, jwtService as any);

      await expect(
        service.create(
          { app: "WEB", message: REPORT.message, path: "/rotas/novo" },
          { authorizationHeader: "Bearer token-expirado" },
        ),
      ).resolves.toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: undefined }),
      );
    });
  });

  describe("list", () => {
    it("aplica paginação padrão (page 1, pageSize 20) quando a query não informa", async () => {
      const repository = buildRepository();
      repository.list.mockResolvedValue({ items: [REPORT], total: 1 });
      const jwtService = buildJwtService();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const service = new ClientErrorsService(repository, jwtService as any);

      const result = await service.list({});

      expect(repository.list).toHaveBeenCalledWith({
        app: undefined,
        digest: undefined,
        page: 1,
        pageSize: 20,
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
