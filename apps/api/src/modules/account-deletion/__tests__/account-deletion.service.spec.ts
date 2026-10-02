import { BadRequestException, ConflictException } from "@nestjs/common";

import {
  AccountDeletionService,
  levantarPendenciasDaConta,
  levantarPendenciasDoPreCadastro,
} from "../account-deletion.service";

import type { PrismaService } from "@/infra/database/prisma.service";
import type { AuditLogService } from "@/modules/audit/audit-log.service";

const ADMIN_ID = "00000000-0000-0000-0000-0000000000ad";
const USER_ID = "11111111-1111-1111-1111-111111111111";
const COMPANY_ID = "22222222-2222-2222-2222-222222222222";

/**
 * Tabelas que o serviço consulta/apaga. Tudo zerado e vazio por padrão:
 * cada teste liga só a linha que está exercitando, então um teste nunca
 * passa por causa de dado que outro deixou.
 */
function criarTx() {
  const semLinhas = () => ({
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    delete: jest.fn().mockResolvedValue({}),
  });

  return {
    trip: semLinhas(),
    routeAssignment: semLinhas(),
    vehicleChecklist: semLinhas(),
    vehicleDocument: semLinhas(),
    vehicleMaintenance: semLinhas(),
    vehicleOccurrence: semLinhas(),
    tripStudentEvent: semLinhas(),
    contract: semLinhas(),
    invite: semLinhas(),
    companyJoinPreRegistration: semLinhas(),
    studentPreRegistration: semLinhas(),
    schoolCompanyLink: semLinhas(),
    announcement: semLinhas(),
    planNotice: semLinhas(),
    legalDocumentVersion: semLinhas(),
    withdrawalRequest: semLinhas(),
    conversationMessage: semLinhas(),
    studentAddressOverride: semLinhas(),
    studentAddressOverrideRecurrence: semLinhas(),
    studentDailyAbsence: semLinhas(),
    supportMessage: semLinhas(),
    supportTicket: semLinhas(),
    student: semLinhas(),
    transportRequest: semLinhas(),
    rating: semLinhas(),
    membership: semLinhas(),
    companyJoinRequest: semLinhas(),
    driverDocument: semLinhas(),
    notification: semLinhas(),
    vehicle: semLinhas(),
    route: semLinhas(),
    auditLog: semLinhas(),
    wallet: semLinhas(),
    walletTransaction: semLinhas(),
    user: semLinhas(),
    company: semLinhas(),
  };
}

type Tx = ReturnType<typeof criarTx>;

describe("AccountDeletionService", () => {
  let service: AccountDeletionService;
  let prisma: jest.Mocked<PrismaService>;
  let auditLogService: jest.Mocked<Pick<AuditLogService, "record">>;
  let tx: Tx;
  /** Ordem real das chamadas de escrita, pra provar a ordem de dependência. */
  let ordem: string[];

  const contaComum = {
    id: USER_ID,
    nome: "Danilo Motorista",
    email: "danilo@example.com",
    isAdminRotta: false,
  };

  beforeEach(() => {
    tx = criarTx();
    ordem = [];

    for (const [tabela, metodos] of Object.entries(tx)) {
      for (const [metodo, fn] of Object.entries(metodos)) {
        if (metodo === "count" || metodo === "findMany") continue;
        fn.mockImplementation((args: unknown) => {
          ordem.push(`${tabela}.${metodo}`);
          return Promise.resolve(metodo === "deleteMany" ? { count: 1 } : (args ?? {}));
        });
      }
    }

    prisma = {
      withBypass: jest.fn((operacao: unknown) => Promise.resolve(operacao)),
      runInTenantTransaction: jest.fn((fn: (client: unknown) => unknown) => fn(tx)),
      user: { findUnique: jest.fn().mockResolvedValue(contaComum) },
      company: {
        findUnique: jest.fn().mockResolvedValue({
          id: COMPANY_ID,
          nomeFantasia: "Van do Danilo",
          cpfCnpj: "12345678901",
        }),
      },
      membership: { findMany: jest.fn().mockResolvedValue([]) },
      pendingSubscription: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    } as unknown as jest.Mocked<PrismaService>;

    auditLogService = { record: jest.fn().mockResolvedValue({}) };

    service = new AccountDeletionService(
      prisma,
      auditLogService as unknown as jest.Mocked<AuditLogService>,
    );
  });

  describe("excluirConta", () => {
    it("nunca deixa o admin excluir a própria conta", async () => {
      await expect(service.excluirConta(ADMIN_ID, ADMIN_ID, {})).rejects.toThrow(
        BadRequestException,
      );
      expect(tx.user.delete).not.toHaveBeenCalled();
    });

    it("recusa conta de Admin Rotta, mesmo sem nenhum histórico", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...contaComum,
        isAdminRotta: true,
      });

      await expect(service.excluirConta(USER_ID, ADMIN_ID, {})).rejects.toThrow(ConflictException);
      expect(tx.user.delete).not.toHaveBeenCalled();
    });

    it("recusa e DIZ o que impede quando a conta tem histórico de outra empresa", async () => {
      tx.trip.count.mockResolvedValue(12);

      await expect(service.excluirConta(USER_ID, ADMIN_ID, {})).rejects.toThrow(
        /12 viagens dirigidas/,
      );
      expect(tx.user.delete).not.toHaveBeenCalled();
    });

    it("apaga o que é da própria conta na ordem que o banco aceita", async () => {
      tx.student.findMany.mockResolvedValue([{ id: "aluno-1" }]);
      tx.wallet.findMany.mockResolvedValue([{ id: "carteira-1" }]);

      await service.excluirConta(USER_ID, ADMIN_ID, {});

      // O extrato antes da carteira, e o aluno só depois do que aponta
      // para ele: invertido, o Postgres recusa por FK `Restrict`.
      expect(ordem.indexOf("walletTransaction.deleteMany")).toBeLessThan(
        ordem.indexOf("wallet.deleteMany"),
      );
      expect(ordem.indexOf("withdrawalRequest.deleteMany")).toBeLessThan(
        ordem.indexOf("wallet.deleteMany"),
      );
      expect(ordem.indexOf("transportRequest.deleteMany")).toBeLessThan(
        ordem.indexOf("student.deleteMany"),
      );
      // A conta é sempre a última linha a cair.
      expect(ordem[ordem.length - 1]).toBe("user.delete");
    });

    it("grava a auditoria FORA do tenant, senão a prova cairia junto", async () => {
      await service.excluirConta(USER_ID, ADMIN_ID, { ip: "1.2.3.4" });

      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          entidadeTipo: "User",
          entidadeId: USER_ID,
          acao: "DELETED",
          atorUserId: ADMIN_ID,
          ip: "1.2.3.4",
        }),
      );
      const [[entrada]] = auditLogService.record.mock.calls;
      expect(entrada).not.toHaveProperty("companyId");
    });

    it("não desfaz a exclusão quando só a auditoria falha", async () => {
      auditLogService.record.mockRejectedValue(new Error("banco de auditoria fora"));

      await expect(service.excluirConta(USER_ID, ADMIN_ID, {})).resolves.toEqual({
        userId: USER_ID,
        email: contaComum.email,
      });
      expect(tx.user.delete).toHaveBeenCalled();
    });
  });

  describe("excluirEmpresa", () => {
    it("anonimiza os pagamentos em vez de apagá-los, mantendo valor e datas", async () => {
      (prisma.pendingSubscription.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const resultado = await service.excluirEmpresa(COMPANY_ID, ADMIN_ID, {});

      expect(resultado.pagamentosAnonimizados).toBe(2);
      const [[chamada]] = (prisma.pendingSubscription.updateMany as jest.Mock).mock.calls;
      expect(chamada.data).toEqual({
        nome: "Conta excluída",
        email: null,
        telefone: null,
        cpfCnpj: null,
      });
      // Nada de valor/pagamento é tocado: é o registro fiscal.
      expect(Object.keys(chamada.data)).not.toContain("valorCentavos");
      expect(Object.keys(chamada.data)).not.toContain("paidAt");
    });

    it("apaga o extrato da carteira antes da empresa", async () => {
      tx.wallet.findMany.mockResolvedValue([{ id: "carteira-empresa" }]);

      await service.excluirEmpresa(COMPANY_ID, ADMIN_ID, {});

      expect(ordem.indexOf("walletTransaction.deleteMany")).toBeLessThan(
        ordem.indexOf("company.delete"),
      );
    });

    it("apaga só as contas que existiam exclusivamente nesta empresa", async () => {
      (prisma.membership.findMany as jest.Mock)
        // Vínculos desta empresa.
        .mockResolvedValueOnce([
          { userId: "so-aqui", user: { nome: "Só Aqui", email: "so@aqui.com" } },
          { userId: "tem-outra", user: { nome: "Tem Outra", email: "tem@outra.com" } },
        ])
        // Vínculos dessas contas em OUTRAS empresas.
        .mockResolvedValueOnce([{ userId: "tem-outra" }]);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "so-aqui",
        nome: "Só Aqui",
        email: "so@aqui.com",
        isAdminRotta: false,
      });

      const resultado = await service.excluirEmpresa(COMPANY_ID, ADMIN_ID, {});

      expect(resultado.contasApagadas).toEqual(["so@aqui.com"]);
      expect(resultado.contasMantidas).toEqual([]);
    });

    it("uma conta que ainda tem rastro em outro lugar não derruba a exclusão da empresa", async () => {
      (prisma.membership.findMany as jest.Mock)
        .mockResolvedValueOnce([
          { userId: "travado", user: { nome: "Travado", email: "travado@example.com" } },
        ])
        .mockResolvedValueOnce([]);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "travado",
        nome: "Travado",
        email: "travado@example.com",
        isAdminRotta: false,
      });
      // Rastro que sobrou em OUTRO tenant, depois desta empresa já ter ido.
      tx.announcement.count.mockResolvedValue(3);

      const resultado = await service.excluirEmpresa(COMPANY_ID, ADMIN_ID, {});

      expect(tx.company.delete).toHaveBeenCalledWith({ where: { id: COMPANY_ID } });
      expect(resultado.contasApagadas).toEqual([]);
      expect(resultado.contasMantidas).toEqual([
        expect.objectContaining({
          email: "travado@example.com",
          motivo: expect.stringContaining("3 avisos publicados"),
        }),
      ]);
    });
  });

  describe("excluirPreCadastro", () => {
    const preCadastro = {
      id: "pre-1",
      nome: "Danilo",
      email: "danilo@example.com",
      cpfCnpj: "12345678901",
      telefone: "21999999999",
      status: "PENDENTE",
      valorCentavos: 4990,
      paidAt: null,
      refundedAt: null,
      linkedCompanyId: null,
    };

    beforeEach(() => {
      (prisma.pendingSubscription as unknown as { findUnique: jest.Mock }).findUnique = jest
        .fn()
        .mockResolvedValue(preCadastro);
      (prisma.pendingSubscription as unknown as { delete: jest.Mock }).delete = jest
        .fn()
        .mockResolvedValue(preCadastro);
    });

    it("apaga o checkout abandonado que nunca foi pago", async () => {
      await expect(service.excluirPreCadastro("pre-1", ADMIN_ID, {})).resolves.toEqual({
        id: "pre-1",
        nome: "Danilo",
      });
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ entidadeTipo: "PendingSubscription", acao: "DELETED" }),
      );
    });

    it("RECUSA apagar quando houve pagamento, porque aí é registro fiscal", async () => {
      (prisma.pendingSubscription as unknown as { findUnique: jest.Mock }).findUnique = jest
        .fn()
        .mockResolvedValue({ ...preCadastro, status: "PAGO", paidAt: new Date() });

      await expect(service.excluirPreCadastro("pre-1", ADMIN_ID, {})).rejects.toThrow(
        /registro fiscal/,
      );
      expect(
        (prisma.pendingSubscription as unknown as { delete: jest.Mock }).delete,
      ).not.toHaveBeenCalled();
    });

    it("manda excluir a transportadora quando o pré-cadastro já virou uma", async () => {
      (prisma.pendingSubscription as unknown as { findUnique: jest.Mock }).findUnique = jest
        .fn()
        .mockResolvedValue({ ...preCadastro, linkedCompanyId: COMPANY_ID });

      await expect(service.excluirPreCadastro("pre-1", ADMIN_ID, {})).rejects.toThrow(
        /exclua a transportadora/,
      );
    });
  });

  describe("previewEmpresa", () => {
    it("lista o que será apagado para o admin ver ANTES de confirmar", async () => {
      tx.vehicle.count.mockResolvedValue(4);
      tx.trip.count.mockResolvedValue(120);

      const preview = await service.previewEmpresa(COMPANY_ID);

      expect(preview.nomeFantasia).toBe("Van do Danilo");
      expect(preview.seraApagado).toEqual(
        expect.arrayContaining([
          { o_que: "veículos", quantos: 4 },
          { o_que: "viagens", quantos: 120 },
        ]),
      );
      expect(tx.company.delete).not.toHaveBeenCalled();
    });
  });
});

/**
 * As regras de "o que falta" (pedido de 02/10/2026: "mostre os
 * cadastros não contemplados também, pq aí vou saber quais são as
 * questões faltantes"). São funções puras justamente para poderem ser
 * verificadas uma por uma: o que o admin lê na lista é isto.
 */
describe("levantarPendenciasDaConta", () => {
  const base = {
    status: "ATIVO" as const,
    verificacaoIdentidade: "APROVADA",
    temEmpresa: true,
    quantosAlunos: 1,
    ultimoPedidoDeVinculo: null,
  };

  it("não inventa pendência numa conta completa", () => {
    expect(levantarPendenciasDaConta({ ...base, tipo: "transportadora" })).toEqual([]);
  });

  it("nunca cobra identidade de Responsável nem de Escola", () => {
    const semIdentidade = { ...base, verificacaoIdentidade: "NAO_INICIADA", temEmpresa: false };

    expect(levantarPendenciasDaConta({ ...semIdentidade, tipo: "responsavel" })).toEqual([]);
    expect(levantarPendenciasDaConta({ ...semIdentidade, tipo: "escola" })).toEqual([]);
    expect(levantarPendenciasDaConta({ ...semIdentidade, tipo: "transportador" })).toEqual([
      "nunca começou a verificação de identidade",
      "sem transportadora: não informou código nem criou a própria",
    ]);
  });

  it("diz o nome da transportadora que está travando o vínculo", () => {
    expect(
      levantarPendenciasDaConta({
        ...base,
        tipo: "transportador",
        temEmpresa: false,
        ultimoPedidoDeVinculo: { status: "PENDENTE", nomeFantasia: "Van do Zé" },
      }),
    ).toEqual(["esperando Van do Zé aprovar o vínculo"]);

    expect(
      levantarPendenciasDaConta({
        ...base,
        tipo: "transportador",
        temEmpresa: false,
        ultimoPedidoDeVinculo: { status: "RECUSADO", nomeFantasia: "Van do Zé" },
      }),
    ).toEqual(["Van do Zé recusou o vínculo"]);
  });

  it("aponta a família que criou conta e nunca cadastrou aluno", () => {
    expect(
      levantarPendenciasDaConta({
        ...base,
        tipo: "responsavel",
        temEmpresa: false,
        quantosAlunos: 0,
      }),
    ).toEqual(["nenhum aluno cadastrado"]);
  });

  it("marca a conta que não virou nada na plataforma", () => {
    expect(levantarPendenciasDaConta({ ...base, tipo: "indefinido", temEmpresa: false })).toContain(
      "cadastro não finalizado: a conta não virou nada na plataforma",
    );
  });
});

describe("levantarPendenciasDoPreCadastro", () => {
  const base = {
    status: "PENDENTE",
    paidAt: null,
    expiresAt: new Date(Date.now() + 3_600_000),
    refundedAt: null,
    email: "danilo@example.com",
    cpfCnpj: null,
    telefone: null,
  };

  it("separa quem pagou e sumiu de quem só abandonou o checkout", () => {
    expect(levantarPendenciasDoPreCadastro({ ...base, paidAt: new Date() })).toEqual([
      "pagou e nunca completou o cadastro",
    ]);
    expect(
      levantarPendenciasDoPreCadastro({ ...base, expiresAt: new Date(Date.now() - 1) }),
    ).toEqual(["checkout abandonado e expirado: nunca foi pago"]);
    expect(levantarPendenciasDoPreCadastro(base)).toEqual([
      "checkout criado, aguardando o pagamento",
    ]);
  });

  it("avisa quando não há nem como ligar o pagamento a uma conta", () => {
    expect(
      levantarPendenciasDoPreCadastro({ ...base, email: null, cpfCnpj: null, telefone: null }),
    ).toContain("sem e-mail, CPF/CNPJ ou telefone: não há como ligar a uma conta");
  });
});
