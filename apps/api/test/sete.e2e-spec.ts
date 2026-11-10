import { randomUUID } from "node:crypto";

import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient, ServiceTag } from "@prisma/client";
import AdmZip from "adm-zip";
import request from "supertest";

import { signTestToken } from "./jwt-test.helper";

import { AppModule } from "@/app.module";
import { Role } from "@/shared/enums";

/**
 * E2E da exportação para o SETE (FNDE) — `docs/52-integracao-sete.md`.
 *
 * ## Por que este arquivo existe, tendo 87 testes de unidade no módulo
 *
 * Porque os três riscos desta entrega não vivem em nenhuma função
 * isolada:
 *
 * 1. **Vazamento entre empresas.** `aluno` e `escola` não têm
 *    `companyId` no schema — o recorte deles é a lista de ids derivada
 *    das rotas da empresa, e o RLS por cima. Nenhum teste de unidade
 *    prova isso: só um banco de verdade, com duas empresas, prova.
 *
 * 2. **O recorte por habilitação.** `LICITADA` é verificada no serviço,
 *    mas quem decide se a requisição chega lá é a cadeia de guards do
 *    Nest. Trocar a ordem de dois decorators passa o teste de unidade e
 *    abre a rota.
 *
 * 3. **O `.zip` sair vazio ou corrompido.** `@Res()` sem `passthrough`
 *    tira o binário do interceptor de resposta. Se alguém devolver o
 *    buffer pelo caminho normal, o cliente recebe JSON com um array de
 *    bytes — e descobre na prefeitura.
 *
 * Nenhuma chamada real ao SETE: o cliente `SeteApiClient` fica
 * desligado, e isso é regra, não conveniência (os endpoints públicos
 * são de 01/03/2023 e ainda precisam ser confirmados com o CECATE/UFG).
 */
describe("SETE (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let empresaLicitada: Empresa;
  let outraLicitada: Empresa;
  let empresaPrivada: Empresa;

  interface Empresa {
    companyId: string;
    token: string;
    userId: string;
    rotaId: string;
    alunoNome: string;
    placa: string;
  }

  const CODIGO_IBGE_MARICA = "3302700";

  async function criarEmpresa(sufixo: string, tags: ServiceTag[]): Promise<Empresa> {
    const plan = await prisma.plan.findFirst({ where: { code: "STARTER" } });
    if (!plan) throw new Error("Plano STARTER não encontrado — rode `pnpm prisma:seed`.");

    const company = await prisma.company.create({
      data: {
        codigoInterno: `EMP-SETE-${randomUUID().slice(0, 8)}`,
        razaoSocial: `Transportes ${sufixo} LTDA`,
        nomeFantasia: `Transportes ${sufixo}`,
        cpfCnpj: String(Math.floor(10_000_000_000_000 + Math.random() * 89_999_999_999_999)),
        tipo: "LTDA",
        email: `contato-${randomUUID().slice(0, 8)}@teste.com.br`,
        telefone: "2199999999",
        cep: "24900000",
        endereco: "Rua Teste",
        numero: "1",
        bairro: "Centro",
        cidade: "Maricá",
        estado: "RJ",
        planId: plan.id,
        tags,
      },
    });

    const userId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        nome: `Gestora ${sufixo}`,
        email: `gestora-${userId}@teste.com.br`,
        telefone: `21${Math.floor(900000000 + Math.random() * 99999999)}`,
        cpf: String(Math.floor(10000000000 + Math.random() * 89999999999)),
        passwordHash: "x",
      },
    });
    await prisma.membership.create({
      data: { userId, companyId: company.id, role: Role.EMPRESA },
    });

    // Área de atuação: é dela que sai a sugestão do código IBGE.
    await prisma.companyServiceArea.create({
      data: { companyId: company.id, cidade: "Maricá", estado: "RJ" },
    });

    const motoristaId = randomUUID();
    await prisma.user.create({
      data: {
        id: motoristaId,
        nome: `Motorista ${sufixo}`,
        email: `motorista-${motoristaId}@teste.com.br`,
        telefone: `21${Math.floor(900000000 + Math.random() * 99999999)}`,
        cpf: String(Math.floor(10000000000 + Math.random() * 89999999999)),
        passwordHash: "x",
      },
    });
    await prisma.membership.create({
      data: { userId: motoristaId, companyId: company.id, role: Role.MOTORISTA },
    });

    const placa = `SET${sufixo.slice(0, 1)}A${Math.floor(10 + Math.random() * 89)}`;
    const vehicle = await prisma.vehicle.create({
      data: {
        companyId: company.id,
        placa,
        modelo: "Sprinter 415",
        marca: "Mercedes-Benz",
        ano: 2022,
        renavam: String(Math.floor(10000000000 + Math.random() * 89999999999)),
        capacidadePassageiros: 16,
        tipo: "VAN",
        origemFrota: "TERCEIRIZADO",
      },
    });

    const school = await prisma.school.create({
      data: {
        codigoInterno: `ESC-SETE-${randomUUID().slice(0, 8)}`,
        nomeOficial: `E.M. ${sufixo}`,
        codigoInep: String(Math.floor(10000000 + Math.random() * 89999999)),
        cep: "24900000",
        logradouro: "Rua da Escola",
        numero: "10",
        bairro: "Centro",
        cidade: "Maricá",
        estado: "RJ",
        tipos: ["FUNDAMENTAL"],
        turnosAtendidos: ["MANHA"],
        dependenciaAdministrativa: "MUNICIPAL",
      },
    });

    const responsavelId = randomUUID();
    await prisma.user.create({
      data: {
        id: responsavelId,
        nome: `Responsável ${sufixo}`,
        email: `resp-${responsavelId}@teste.com.br`,
        telefone: `21${Math.floor(900000000 + Math.random() * 99999999)}`,
        cpf: String(Math.floor(10000000000 + Math.random() * 89999999999)),
        passwordHash: "x",
      },
    });

    const alunoNome = `Aluna ${sufixo} ${randomUUID().slice(0, 6)}`;
    const student = await prisma.student.create({
      data: {
        responsavelId,
        nome: alunoNome,
        dataNascimento: new Date("2015-04-10"),
        sexo: "FEMININO",
        schoolId: school.id,
        turno: "MANHA",
        embarqueCep: "24900000",
        embarqueLogradouro: "Rua do Embarque",
        embarqueNumero: "5",
        embarqueBairro: "Itaipuaçu",
        embarqueCidade: "Maricá",
        embarqueEstado: "RJ",
        embarqueLatitude: -22.9692,
        embarqueLongitude: -42.9686,
        desembarqueCep: "24900000",
        desembarqueLogradouro: "Rua da Escola",
        desembarqueNumero: "10",
        desembarqueBairro: "Centro",
        desembarqueCidade: "Maricá",
        desembarqueEstado: "RJ",
      },
    });

    const route = await prisma.route.create({
      data: {
        companyId: company.id,
        nome: `Rota ${sufixo}`,
        turno: "MANHA",
        diasSemana: ["SEGUNDA"],
        status: "ATIVA",
        veiculoPadraoId: vehicle.id,
        motoristaPadraoId: motoristaId,
        acessoPorteira: true,
      },
    });

    const paradaEmbarque = await prisma.routeStop.create({
      data: {
        routeId: route.id,
        companyId: company.id,
        ordem: 0,
        endereco: "Rua do Embarque, 5",
        latitude: -22.9692,
        longitude: -42.9686,
        horarioPrevisto: "06:40",
      },
    });
    const paradaEscola = await prisma.routeStop.create({
      data: {
        routeId: route.id,
        companyId: company.id,
        ordem: 1,
        endereco: "Rua da Escola, 10",
        latitude: -22.9192,
        longitude: -42.8186,
        horarioPrevisto: "07:10",
        schoolId: school.id,
      },
    });

    // `Contract.transportRequestId` é obrigatório e `@unique`: todo
    // contrato nasce de uma solicitação, inclusive um de teste. Forjar o
    // contrato sem ela deixaria o banco num estado que o próprio produto
    // não consegue produzir — e o teste passaria a provar outra coisa.
    const solicitacao = await prisma.transportRequest.create({
      data: {
        studentId: student.id,
        responsavelId,
        companyId: company.id,
        schoolId: school.id,
        turno: "MANHA",
        status: "APROVADA",
      },
      select: { id: true },
    });

    const contrato = await prisma.contract.create({
      data: {
        transportRequestId: solicitacao.id,
        studentId: student.id,
        responsavelId,
        companyId: company.id,
        schoolId: school.id,
        vehicleId: vehicle.id,
        motoristaId,
        valorMensalidadeCentavos: 32_000,
        planoDescricao: "Ida e volta",
        regras: "Embarque na porta.",
        vigenciaInicio: new Date("2026-02-01T00:00:00.000Z"),
        status: "ATIVO",
        ativadoEm: new Date(),
        assinadoResponsavelEm: new Date(),
        assinadoEmpresaEm: new Date(),
      },
      select: { id: true },
    });

    await prisma.routeStudent.create({
      data: {
        routeId: route.id,
        companyId: company.id,
        contractId: contrato.id,
        studentId: student.id,
        paradaEmbarqueId: paradaEmbarque.id,
        paradaDesembarqueId: paradaEscola.id,
        ativo: true,
      },
    });

    // Uma viagem FINALIZADA com posições de GPS: é dela que saem o
    // `shape` (RN-SETE-06) e a mediana de horário (RN-SETE-07). Sem ela
    // os dois campos saem nulos, e o teste do shape passaria vazio —
    // provando nada.
    const viagem = await prisma.trip.create({
      data: {
        companyId: company.id,
        routeId: route.id,
        data: new Date("2026-11-03T00:00:00.000Z"),
        status: "FINALIZADA",
        sentido: "IDA",
        codigo: `S${sufixo.slice(0, 1)}${Math.floor(1000 + Math.random() * 8999)}`,
        veiculoId: vehicle.id,
        motoristaId,
        iniciadaEm: new Date("2026-11-03T09:38:00.000Z"),
      },
    });

    await prisma.tripPosition.createMany({
      data: [
        [-22.9692, -42.9686],
        [-22.9512, -42.9201],
        [-22.9341, -42.8703],
        [-22.9192, -42.8186],
      ].map(([latitude, longitude], indice) => ({
        tripId: viagem.id,
        companyId: company.id,
        latitude: latitude!,
        longitude: longitude!,
        precisaoMetros: 8,
        capturadaEm: new Date(Date.UTC(2026, 10, 3, 9, 38 + indice * 8)),
      })),
    });

    return {
      companyId: company.id,
      userId,
      token: signTestToken({
        sub: userId,
        tenantId: company.id,
        role: Role.EMPRESA,
        vinculoId: randomUUID(),
      }),
      rotaId: route.id,
      alunoNome,
      placa,
    };
  }

  function abrirZip(corpo: Buffer): Record<string, string> {
    const entradas: Record<string, string> = {};
    for (const entrada of new AdmZip(corpo).getEntries()) {
      entradas[entrada.entryName] = entrada.getData().toString("utf-8");
    }
    return entradas;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1");
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = new PrismaClient();
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;

    empresaLicitada = await criarEmpresa("Alfa", [ServiceTag.LICITADA]);
    outraLicitada = await criarEmpresa("Beta", [ServiceTag.LICITADA]);
    empresaPrivada = await criarEmpresa("Gama", [ServiceTag.PRIVADA]);
  }, 60_000);

  afterAll(async () => {
    await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
    await prisma.routeStudent.deleteMany();
    await prisma.routeStop.deleteMany();
    await prisma.tripPosition.deleteMany();
    await prisma.trip.deleteMany();
    await prisma.route.deleteMany();
    await prisma.contract.deleteMany();
    await prisma.transportRequest.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.student.deleteMany();
    await prisma.companyServiceArea.deleteMany();
    await prisma.school.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.company.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await app.close();
  }, 60_000);

  describe("habilitação LICITADA (RN-SETE-01)", () => {
    it("empresa só PRIVADA recebe 403 nas três rotas, e a mensagem diz o motivo", async () => {
      for (const caminho of [
        "/v1/sete/pendencias",
        "/v1/sete/municipio",
        `/v1/sete/exportacao?codigoIbge=${CODIGO_IBGE_MARICA}`,
      ]) {
        const resposta = await request(app.getHttpServer())
          .get(caminho)
          .set("Authorization", `Bearer ${empresaPrivada.token}`);

        expect(resposta.status).toBe(403);
        // "Erro inesperado" aqui mandaria o gestor abrir chamado. A
        // mensagem nomeia a habilitação e quem pode acrescentá-la.
        expect(JSON.stringify(resposta.body)).toMatch(/habilitação/i);
      }
    });

    it("sem token, 401 — a rota não é pública", async () => {
      await request(app.getHttpServer()).get("/v1/sete/pendencias").expect(401);
    });

    it("empresa LICITADA passa", async () => {
      await request(app.getHttpServer())
        .get("/v1/sete/pendencias")
        .set("Authorization", `Bearer ${empresaLicitada.token}`)
        .expect(200);
    });
  });

  describe("isolamento entre empresas (RN-SETE-02)", () => {
    it("o pacote da Alfa não contém nada da Beta", async () => {
      const resposta = await request(app.getHttpServer())
        .get(`/v1/sete/exportacao?codigoIbge=${CODIGO_IBGE_MARICA}`)
        .set("Authorization", `Bearer ${empresaLicitada.token}`)
        .buffer()
        .parse((res, callback) => {
          const pedacos: Buffer[] = [];
          res.on("data", (pedaco: Buffer) => pedacos.push(pedaco));
          res.on("end", () => callback(null, Buffer.concat(pedacos)));
        })
        .expect(200);

      const arquivos = abrirZip(resposta.body as Buffer);
      const tudo = Object.values(arquivos).join("\n");

      expect(tudo).toContain(empresaLicitada.alunoNome);
      expect(tudo).toContain(empresaLicitada.placa);
      // O que importa de verdade: nome de criança e placa da OUTRA
      // transportadora não podem estar aqui de jeito nenhum.
      expect(tudo).not.toContain(outraLicitada.alunoNome);
      expect(tudo).not.toContain(outraLicitada.placa);
      expect(tudo).not.toContain(empresaPrivada.alunoNome);
    });

    it("EMPRESA mandando o companyId da outra é IGNORADA, não atendida", async () => {
      // O parâmetro existe para o Admin Rotta. Para quem tem tenant, o
      // escopo vem do token — se o serviço um dia passar a confiar na
      // URL, este teste cai.
      const resposta = await request(app.getHttpServer())
        .get(
          `/v1/sete/exportacao?codigoIbge=${CODIGO_IBGE_MARICA}&companyId=${outraLicitada.companyId}`,
        )
        .set("Authorization", `Bearer ${empresaLicitada.token}`)
        .buffer()
        .parse((res, callback) => {
          const pedacos: Buffer[] = [];
          res.on("data", (pedaco: Buffer) => pedacos.push(pedaco));
          res.on("end", () => callback(null, Buffer.concat(pedacos)));
        })
        .expect(200);

      const tudo = Object.values(abrirZip(resposta.body as Buffer)).join("\n");
      expect(tudo).toContain(empresaLicitada.alunoNome);
      expect(tudo).not.toContain(outraLicitada.alunoNome);
    });
  });

  describe("o conteúdo do .zip", () => {
    async function baixar(formato: "json" | "csv"): Promise<Record<string, string>> {
      const resposta = await request(app.getHttpServer())
        .get(`/v1/sete/exportacao?codigoIbge=${CODIGO_IBGE_MARICA}&formato=${formato}`)
        .set("Authorization", `Bearer ${empresaLicitada.token}`)
        .buffer()
        .parse((res, callback) => {
          const pedacos: Buffer[] = [];
          res.on("data", (pedaco: Buffer) => pedacos.push(pedaco));
          res.on("end", () => callback(null, Buffer.concat(pedacos)));
        })
        .expect(200);

      expect(resposta.headers["content-type"]).toBe("application/zip");
      expect(resposta.headers["content-disposition"]).toMatch(
        new RegExp(`filename="rotta-sete-${CODIGO_IBGE_MARICA}-\\d{4}-\\d{2}-\\d{2}\\.zip"`),
      );
      return abrirZip(resposta.body as Buffer);
    }

    it("JSON: seis coleções e o LEIA-ME", async () => {
      const arquivos = await baixar("json");

      expect(Object.keys(arquivos).sort()).toEqual([
        "LEIA-ME.txt",
        "alunos.json",
        "ligacoes.json",
        "monitores.json",
        "motoristas.json",
        "rotas.json",
        "veiculos.json",
      ]);
    });

    it("CSV: só a planilha de alunos e o LEIA-ME", async () => {
      const arquivos = await baixar("csv");

      expect(Object.keys(arquivos).sort()).toEqual(["LEIA-ME.txt", "alunos.csv"]);
      // Os cabeçalhos são os nomes que `ImportacaoModel::validarAlunos`
      // procura: um nome diferente faz o SETE recusar a linha inteira.
      expect(arquivos["alunos.csv"]!.split("\n")[0]).toBe(
        "nome;data_nascimento;sexo;cor;turno;nivel;mec_tp_localizacao;loc_endereco;loc_cep;" +
          "loc_latitude;loc_longitude;nome_responsavel;telefone_responsavel",
      );
    });

    it("cor/raça sai sempre como 0 (Não informada) — nunca o dado real", async () => {
      // LGPD art. 11 combinado com o art. 14: cor/raça de criança é dado
      // sensível, e a Rotta nem coleta. O SETE exige a coluna e aceita
      // `0`, porque `validarAlunos` rejeita apenas string vazia.
      const arquivos = await baixar("json");
      const alunos = JSON.parse(arquivos["alunos.json"]!) as { cor: number; nome: string }[];

      expect(alunos.length).toBeGreaterThan(0);
      for (const aluno of alunos) expect(aluno.cor).toBe(0);
    });

    it("não vaza campo sensível que a Rotta tem e o SETE não pede", async () => {
      const arquivos = await baixar("json");
      const tudo = Object.values(arquivos).join("\n");

      // Deficiência e necessidade especial não têm conversor nenhum no
      // módulo: são dado sensível de criança (LGPD arts. 11 e 14), e a
      // Rotta não os entrega a um sistema federal sem base legal que o
      // Davi confirme.
      for (const proibido of [
        "necessidadesEspeciais",
        "medicamentos",
        "deficiencia",
        "def_",
        "nivel_deficiencia",
      ]) {
        expect(tudo).not.toContain(proibido);
      }

      // CPF: o de MOTORISTA e MONITOR sai, porque é a chave deles no
      // SETE e são profissionais adultos. O do ALUNO não — e é essa a
      // distinção que este teste tranca.
      expect(arquivos["alunos.json"]).not.toContain("cpf");
      expect(arquivos["motoristas.json"]).toContain('"cpf"');
    });

    it("o shape da rota vem em metros do Web Mercator, não em graus", async () => {
      // Confirmado contra dois dumps reais do SETE (10/11/2026): o campo
      // contradiz a RFC 7946, e mandar graus faria a prefeitura ver a
      // rota no meio do Atlântico, perto da ilha de Null.
      const arquivos = await baixar("json");
      const rotas = JSON.parse(arquivos["rotas.json"]!) as {
        shape: { features: { geometry: { coordinates: [number, number][] } }[] } | null;
      }[];
      const comShape = rotas.find((rota) => rota.shape);
      // A fixture grava uma viagem FINALIZADA com quatro posições, então
      // o shape TEM de existir. Um `return` silencioso aqui deixaria o
      // teste passar justamente no dia em que o shape parasse de sair.
      expect(comShape?.shape).toBeTruthy();

      // Objeto, não string: no banco do SETE a coluna `shape` é `text`
      // com um JSON dentro, mas aqui ele vai aninhado, que é a forma
      // natural num arquivo JSON. Se o POST do SETE exigir a string, a
      // conversão é de uma linha — está na lista de confirmações
      // pendentes com o CECATE/UFG.
      const geo = comShape!.shape!;
      const [x, y] = geo.features[0]!.geometry.coordinates[0]!;
      // Maricá em EPSG:3857 fica perto de (-4 766 000, -2 622 000). Em
      // graus seria (-42,9, -22,9): três ordens de grandeza abaixo, e a
      // prefeitura veria a rota no meio do Atlântico.
      expect(Math.abs(x)).toBeGreaterThan(1_000_000);
      expect(Math.abs(y)).toBeGreaterThan(1_000_000);
    });
  });

  describe("validação do código IBGE", () => {
    it.each(["33027", "33027000", "abcdefg", ""])("recusa %p com 400", async (codigo) => {
      const resposta = await request(app.getHttpServer())
        .get(`/v1/sete/exportacao?codigoIbge=${codigo}`)
        .set("Authorization", `Bearer ${empresaLicitada.token}`);

      expect(resposta.status).toBe(400);
    });

    it("sugere o município da área de atuação", async () => {
      const resposta = await request(app.getHttpServer())
        .get("/v1/sete/municipio")
        .set("Authorization", `Bearer ${empresaLicitada.token}`)
        .expect(200);

      expect(resposta.body.data).toEqual({
        cidade: "Maricá",
        estado: "RJ",
        codigoIbge: CODIGO_IBGE_MARICA,
      });
    });
  });

  describe("pendências", () => {
    it("rota sem motorista escalado aparece como pendência, sem dado sensível", async () => {
      await prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', false)`;
      await prisma.route.update({
        where: { id: empresaLicitada.rotaId },
        data: { motoristaPadraoId: null },
      });

      const resposta = await request(app.getHttpServer())
        .get("/v1/sete/pendencias")
        .set("Authorization", `Bearer ${empresaLicitada.token}`)
        .expect(200);

      const pendencias = resposta.body.data as { descricao: string; caminhoDeCorrecao: string }[];
      // Nome de criança e telefone de responsável nunca entram na
      // descrição: a lista é lida na tela e vai para o log de erro.
      for (const pendencia of pendencias) {
        expect(pendencia.descricao).not.toContain(empresaLicitada.alunoNome);
        expect(pendencia.caminhoDeCorrecao.startsWith("/")).toBe(true);
      }

      await prisma.route.update({
        where: { id: empresaLicitada.rotaId },
        data: { motoristaPadraoId: empresaLicitada.userId },
      });
    });
  });
});
