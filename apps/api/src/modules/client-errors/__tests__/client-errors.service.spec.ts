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
  buildId: null,
  serviceWorkerActive: null,
  source: null,
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
        buildId: undefined,
        page: 1,
        pageSize: 20,
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});

/**
 * O plantão que a diretoria de agentes lê (autorizado pelo fundador em
 * 05/10/2026). Dois comportamentos importam: agrupar o mesmo defeito, e
 * não deixar vazar quem é a pessoa que esbarrou nele.
 */
describe("ClientErrorsService.plantao", () => {
  const agora = new Date();
  const umaHoraAtras = new Date(agora.getTime() - 60 * 60 * 1000);
  const umaSemanaAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);

  function erro(overrides: Partial<typeof REPORT>) {
    return { ...REPORT, ...overrides };
  }

  it("agrupa o mesmo defeito e conta quantas pessoas bateram nele", async () => {
    const repository = buildRepository();
    repository.list.mockResolvedValue({
      items: [
        erro({ id: "1", message: "Boom", path: "/rotas/novo", createdAt: agora }),
        erro({ id: "2", message: "Boom", path: "/rotas/123", createdAt: umaHoraAtras }),
        erro({ id: "3", message: "Outro", path: "/alunos", createdAt: agora }),
      ],
      total: 3,
    });
    const service = new ClientErrorsService(repository, buildJwtService() as never, {
      get: jest.fn(),
    });

    const resultado = await service.plantao();

    expect(resultado.gruposDeErro).toBe(2);
    const boom = resultado.items.find((item) => item.mensagem === "Boom");
    expect(boom?.quantas).toBe(2);
    expect(boom?.telas).toEqual(expect.arrayContaining(["/rotas/novo", "/rotas/123"]));
  });

  it("ignora o que está fora da janela pedida", async () => {
    const repository = buildRepository();
    repository.list.mockResolvedValue({
      items: [erro({ id: "1", message: "Velho", createdAt: umaSemanaAtras })],
      total: 1,
    });
    const service = new ClientErrorsService(repository, buildJwtService() as never, {
      get: jest.fn(),
    });

    await expect(service.plantao(24)).resolves.toEqual(
      expect.objectContaining({ gruposDeErro: 0, items: [] }),
    );
  });

  it("nunca devolve quem é a pessoa que esbarrou no erro", async () => {
    const repository = buildRepository();
    repository.list.mockResolvedValue({
      items: [
        erro({
          id: "1",
          message: "Boom",
          createdAt: agora,
          userId: "user-123",
          companyId: "company-456",
        }),
      ],
      total: 1,
    });
    const service = new ClientErrorsService(repository, buildJwtService() as never, {
      get: jest.fn(),
    });

    const texto = JSON.stringify(await service.plantao());

    expect(texto).not.toContain("user-123");
    expect(texto).not.toContain("company-456");
  });
});
