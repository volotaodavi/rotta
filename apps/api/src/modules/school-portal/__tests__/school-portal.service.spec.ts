import { BadRequestException, ForbiddenException } from "@nestjs/common";

import { SchoolPortalService } from "../school-portal.service";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { UsersService } from "@/modules/users/users.service";

import { Role } from "@/shared/enums";

/**
 * Portal da Escola (22/09/2026).
 *
 * O grosso destes testes é sobre ISOLAMENTO, e não sobre formatação de
 * resposta, porque é ali que mora o risco real: este é o único módulo
 * da Rotta que lê com `withBypass`, ou seja, com a RLS do Postgres
 * desligada. Se o filtro por `escolaId` falhar, uma escola enxerga as
 * crianças de outra — e não existe erro pior neste produto.
 */

const escolaId = "escola-1";

const actorEscola: AuthenticatedUser = {
  sub: "user-1",
  tenantId: null,
  role: Role.ESCOLA,
  vinculoId: "user-1",
  escolaId,
};

function criarServico() {
  const findMany = jest.fn().mockResolvedValue([]);
  const withBypass = jest.fn((operacao: unknown) => operacao);
  const prisma = {
    withBypass,
    student: { findMany },
    school: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: escolaId, nomeOficial: "EMEF Teste", nomeFantasia: null }),
    },
    user: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
  } as unknown as PrismaService;

  const usersService = {
    assertNoDuplicateIdentity: jest.fn().mockResolvedValue(undefined),
    createUserWithPassword: jest.fn().mockResolvedValue({ id: "novo-1" }),
    definirPapelNaEscola: jest.fn().mockResolvedValue({
      id: "novo-1",
      nome: "Ana Coordenadora",
      email: "ana@emef.com",
      telefone: "21999990000",
      escolaPapel: "COORDENADOR",
      status: "ATIVO",
      escolaId,
      createdAt: new Date("2026-09-22T12:00:00Z"),
    }),
    definirStatusDeConta: jest.fn(),
  } as unknown as UsersService;

  return {
    service: new SchoolPortalService(prisma, usersService),
    findMany,
    withBypass,
    prisma,
    usersService,
  };
}

describe("isolamento — o que impede uma escola de ver a outra", () => {
  it("filtra SEMPRE pelo escolaId do token", async () => {
    const { service, findMany } = criarServico();

    await service.listarAlunosDoDia(actorEscola);

    const where = findMany.mock.calls[0][0].where;
    expect(where.schoolId).toBe(escolaId);
  });

  it("recusa quem não é escola, mesmo carregando escolaId no token", async () => {
    // Defesa em profundidade: papel e escopo têm de concordar. Um token
    // de outro papel com `escolaId` preenchido por engano não passa.
    const { service, findMany } = criarServico();
    const intruso = { ...actorEscola, role: Role.EMPRESA };

    await expect(service.listarAlunosDoDia(intruso)).rejects.toThrow(ForbiddenException);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("recusa conta de escola SEM escolaId — nunca cai em 'lista tudo'", async () => {
    // Este é o caso perigoso: sem o `throw`, um `where` com
    // `schoolId: undefined` viraria "todos os alunos do país", porque a
    // RLS está desligada neste módulo.
    const { service, findMany } = criarServico();
    const semEscola = { ...actorEscola, escolaId: undefined };

    await expect(service.listarAlunosDoDia(semEscola)).rejects.toThrow(ForbiddenException);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("nunca lê um escolaId vindo de fora do token", () => {
    // O método não aceita parâmetro de escola, e este teste existe para
    // que ninguém acrescente um depois sem perceber o que está fazendo.
    expect(SchoolPortalService.prototype.listarAlunosDoDia).toHaveLength(1);
  });

  it("só traz aluno não excluído", async () => {
    const { service, findMany } = criarServico();

    await service.listarAlunosDoDia(actorEscola);

    expect(findMany.mock.calls[0][0].where.deletedAt).toBeNull();
  });
});

describe("status do aluno no dia", () => {
  const comEventos = (eventos: unknown[]): SchoolPortalService => {
    const { service, findMany } = criarServico();
    findMany.mockResolvedValue([
      {
        id: "aluno-1",
        nome: "Ana",
        dataNascimento: new Date("2015-03-22T00:00:00Z"),
        turno: "MANHA",
        eventosViagem: eventos,
      },
    ]);
    return service;
  };

  const evento = (tipo: string, hora: string) => ({
    tipo,
    processadoEm: new Date(hora),
    trip: {
      id: "trip-1",
      status: "EM_ANDAMENTO",
      sentido: "IDA",
      route: { id: "rota-1", nome: "Rota Centro" },
      veiculo: { placa: "ABC1D23", modelo: "Sprinter" },
      company: { nomeFantasia: "Transportes Teste" },
    },
  });

  it("sem evento nenhum é AGUARDANDO — é quem a escola ainda precisa entregar", async () => {
    const service = comEventos([]);

    const [aluno] = await service.listarAlunosDoDia(actorEscola);

    expect(aluno!.status).toBe("AGUARDANDO");
    expect(aluno!.ocorridoEm).toBeNull();
    expect(aluno!.veiculoPlaca).toBeNull();
  });

  it("embarcou aparece como EMBARCADO, com a placa do ônibus", async () => {
    const service = comEventos([evento("EMBARCOU", "2026-09-22T10:00:00Z")]);

    const [aluno] = await service.listarAlunosDoDia(actorEscola);

    expect(aluno!.status).toBe("EMBARCADO");
    expect(aluno!.veiculoPlaca).toBe("ABC1D23");
    expect(aluno!.transportadoraNome).toBe("Transportes Teste");
  });

  it("DESEMBARCOU vence EMBARCOU", async () => {
    const service = comEventos([
      evento("EMBARCOU", "2026-09-22T10:00:00Z"),
      evento("DESEMBARCOU", "2026-09-22T10:40:00Z"),
    ]);

    const [aluno] = await service.listarAlunosDoDia(actorEscola);

    expect(aluno!.status).toBe("DESEMBARCOU");
  });

  it("AUSENTE encerra o assunto, mesmo com outro evento no dia", async () => {
    // Mesma precedência do app do motorista. Se divergir, escola e
    // motorista veem coisas diferentes sobre a mesma criança.
    const service = comEventos([
      evento("EMBARCOU", "2026-09-22T10:00:00Z"),
      evento("AUSENTE", "2026-09-22T07:00:00Z"),
    ]);

    const [aluno] = await service.listarAlunosDoDia(actorEscola);

    expect(aluno!.status).toBe("AUSENTE");
  });

  it("entrega a data de nascimento em AAAA-MM-DD, para separar homônimos", async () => {
    const service = comEventos([]);

    const [aluno] = await service.listarAlunosDoDia(actorEscola);

    expect(aluno!.dataNascimento).toBe("2015-03-22");
  });
});

/**
 * Criação de conta do portal (fluxo público, 22/09/2026).
 *
 * Estes testes guardam duas regras que, se cederem, dão a alguém a
 * lista de crianças de uma escola que não é a dele:
 * o diretor nunca ESCOLHE a escola, e o diretor nunca NOMEIA outro
 * diretor.
 */
describe("contas do portal — quem pode abrir a porta para quem", () => {
  const adminActor: AuthenticatedUser = {
    sub: "admin-1",
    tenantId: null,
    role: Role.ADMIN_ROTTA,
    vinculoId: "vinculo-admin",
  };

  const diretor: AuthenticatedUser = {
    ...actorEscola,
    escolaPapel: "DIRETOR",
  };

  const dadosBase = {
    nome: "Ana Coordenadora",
    email: "ANA@emef.com ",
    telefone: "(21) 99999-0000",
    senha: "SenhaForte123",
    papel: "COORDENADOR" as const,
  };

  it("Admin Rotta precisa dizer de qual escola é a conta", async () => {
    const { service, usersService } = criarServico();

    await expect(service.criarConta(dadosBase, adminActor)).rejects.toThrow(BadRequestException);
    expect(usersService.createUserWithPassword).not.toHaveBeenCalled();
  });

  it("Admin Rotta cria o diretor da escola que informou", async () => {
    const { service, usersService } = criarServico();

    await service.criarConta({ ...dadosBase, papel: "DIRETOR", escolaId }, adminActor);

    expect(usersService.createUserWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({ escolaId, email: "ana@emef.com", telefone: "21999990000" }),
    );
  });

  it("o diretor NUNCA escolhe a escola — o escolaId vem do token dele", async () => {
    const { service, usersService } = criarServico();

    await service.criarConta(dadosBase, diretor);

    expect(usersService.createUserWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({ escolaId }),
    );
  });

  it("o diretor não abre acesso na escola de outra pessoa", async () => {
    const { service, usersService } = criarServico();

    await expect(
      service.criarConta({ ...dadosBase, escolaId: "escola-de-outro" }, diretor),
    ).rejects.toThrow(ForbiddenException);
    expect(usersService.createUserWithPassword).not.toHaveBeenCalled();
  });

  it("o diretor não nomeia outro diretor — só o Admin da Rotta", async () => {
    // Senão o cargo que controla o acesso se autoconcederia, e a
    // distinção entre "quem o Admin nomeou" e "quem entrou depois"
    // deixaria de existir.
    const { service, usersService } = criarServico();

    await expect(service.criarConta({ ...dadosBase, papel: "DIRETOR" }, diretor)).rejects.toThrow(
      ForbiddenException,
    );
    expect(usersService.createUserWithPassword).not.toHaveBeenCalled();
  });

  it("coordenador e ajudante não abrem acesso para ninguém", async () => {
    const { service, usersService } = criarServico();
    const coordenador: AuthenticatedUser = { ...actorEscola, escolaPapel: "COORDENADOR" };

    await expect(service.criarConta(dadosBase, coordenador)).rejects.toThrow(ForbiddenException);
    expect(usersService.createUserWithPassword).not.toHaveBeenCalled();
  });

  it("conta de escola lista só as contas da própria escola", async () => {
    const { service, prisma } = criarServico();

    // Mesmo mandando outra escola na query, a do token é que vale.
    await service.listarContas(diretor, "escola-de-outro");

    const findMany = prisma.user.findMany as jest.Mock;
    expect(findMany.mock.calls[0][0].where.escolaId).toBe(escolaId);
  });
});
