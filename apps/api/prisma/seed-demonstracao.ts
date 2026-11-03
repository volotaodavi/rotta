import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from "../src/modules/auth/legal-versions";

import { CONTAS, EMPRESA } from "./seed-dados-fixos";

/**
 * Uma operação de demonstração: escola, aluno, rota e uma viagem EM
 * ANDAMENTO com rastro de GPS.
 *
 * ## Por que isto existe, separado do `seed-e2e`
 *
 * Porque `seed-e2e` semeia o mínimo para um teste de interface afirmar
 * coisas: uma transportadora, uma dona, uma responsável, um ônibus. Com
 * isso, quem abre o aplicativo vê telas VAZIAS — corretas, e vazias.
 * Não dá para mostrar a ninguém o que o produto faz.
 *
 * Este aqui semeia o que o produto É: uma criança que embarca numa
 * parada, uma van que está na rua agora, e uma mãe que vê o ônibus se
 * aproximando no mapa.
 *
 * ## O bypass de RLS, e por que ele é obrigatório aqui
 *
 * As tabelas com isolamento por empresa têm **FORCE ROW LEVEL
 * SECURITY** no Postgres, e isso tem uma consequência que custou uma
 * hora para achar em 03/11/2026: com FORCE, nem o DONO da tabela é
 * isento das políticas — e a checagem de CHAVE ESTRANGEIRA também
 * passa a ser filtrada.
 *
 * O sintoma engana. Inserir um `Membership` apontando para uma
 * `Company` que existe falhava com "Foreign key constraint violated",
 * e não com "new row violates row-level security policy". A empresa
 * estava lá; o que não enxergava era a checagem da FK.
 *
 * Por isso este seed liga `app.bypass_rls` na PRÓPRIA conexão, via o
 * parâmetro `options` da URL — e não com um `set_config` avulso, que o
 * pool do Prisma não garante que caia na mesma conexão da query
 * seguinte (a mesma lição que `PrismaService.withTenant` já documenta).
 *
 * ## Isto NUNCA roda contra produção
 *
 * Mesma trava do `seed-e2e`, e reusada dele em vez de recopiada: o
 * nome do banco precisa parecer de teste E o host precisa ser local.
 * Uma viagem falsa gravada num banco real apareceria no mapa de uma
 * família de verdade.
 *
 * ## A viagem fica EM_ANDAMENTO de propósito
 *
 * É o único estado em que o produto mostra o que o diferencia: o mapa
 * ao vivo, a próxima parada, o aviso de aproximação. Viagem encerrada é
 * histórico, e histórico qualquer planilha mostra.
 */

const NOMES_PERMITIDOS = [/e2e/i, /test/i, /_ci\b/i];
const HOSTS_PERMITIDOS = ["localhost", "127.0.0.1", "::1", "postgres", "db"];

/** Valida a URL e devolve a MESMA url com o bypass de RLS ligado. */
function urlDeTesteComBypass(url: string | undefined): string {
  if (!url) throw new Error("DATABASE_URL não definida: este seed não adivinha banco.");

  const alvo = new URL(url);
  const nome = alvo.pathname.replace(/^\//, "");

  if (!NOMES_PERMITIDOS.some((padrao) => padrao.test(nome))) {
    throw new Error(`Recusado: o banco "${nome}" não parece de teste.`);
  }
  if (!HOSTS_PERMITIDOS.includes(alvo.hostname)) {
    throw new Error(`Recusado: o host "${alvo.hostname}" não é local.`);
  }

  // `-c app.bypass_rls=on` chega ao Postgres como opção de conexão e
  // vale para toda query do pool, inclusive as checagens internas de
  // chave estrangeira. Não sobrescreve se quem chamou já pôs.
  if (!alvo.searchParams.has("options")) {
    alvo.searchParams.set("options", "-c app.bypass_rls=on");
  }
  return alvo.toString();
}

/**
 * Dados fixos, nunca aleatórios — pelo mesmo motivo do `seed-e2e`: um
 * roteiro de demonstração afirma o que está escrito na tela.
 *
 * As coordenadas são de Maricá/RJ, onde a operação real começa.
 */
export const DEMO = {
  motorista: {
    nome: "Carlos Motorista",
    email: "motorista.demo@rotta.test",
    telefone: "21988887777",
    cpf: "45678912364",
    senha: "SenhaForte@123",
  },
  escola: {
    codigoInterno: "ESC-DEMO-001",
    nomeOficial: "Escola Municipal Jardim Maricá",
    cep: "24900000",
    logradouro: "Rua das Acácias",
    numero: "120",
    bairro: "Centro",
    cidade: "Maricá",
    estado: "RJ",
    latitude: -22.9192,
    longitude: -42.8186,
  },
  aluno: {
    nome: "Sofia Almeida",
    dataNascimento: new Date("2016-04-12T00:00:00.000Z"),
    embarque: {
      cep: "24901000",
      logradouro: "Rua Pedro Alves",
      numero: "45",
      bairro: "Itaipuaçu",
      latitude: -22.9655,
      longitude: -42.9712,
    },
  },
  rota: { nome: "Rota Itaipuaçu — Manhã", horarios: ["06:40", "06:55", "07:15"] },
  /**
   * O rastro da van: cinco pontos de Itaipuaçu em direção à escola, um
   * a cada três minutos. O último é o mais recente, e é ele que o mapa
   * mostra como "onde o ônibus está agora".
   */
  rastro: [
    { latitude: -22.9655, longitude: -42.9712, velocidadeKmh: 0 },
    { latitude: -22.9598, longitude: -42.9521, velocidadeKmh: 38 },
    { latitude: -22.9487, longitude: -42.9203, velocidadeKmh: 44 },
    { latitude: -22.9361, longitude: -42.8814, velocidadeKmh: 41 },
    { latitude: -22.9254, longitude: -42.8455, velocidadeKmh: 27 },
  ],
} as const;

const prisma = new PrismaClient({
  datasources: { db: { url: urlDeTesteComBypass(process.env.DATABASE_URL) } },
});

/** Meia-noite UTC do dia civil brasileiro — o mesmo recorte de `Trip.data`. */
function diaDaOperacao(): Date {
  const dia = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return new Date(`${dia}T00:00:00.000Z`);
}

async function main(): Promise<void> {
  const [empresa, responsavel] = await Promise.all([
    prisma.company.findUnique({ where: { cpfCnpj: EMPRESA.cnpj }, select: { id: true } }),
    prisma.user.findUnique({ where: { email: CONTAS.responsavel.email }, select: { id: true } }),
  ]);

  if (!empresa || !responsavel) {
    throw new Error("Rode `seed-e2e` primeiro: empresa ou responsável não existem.");
  }

  const veiculo = await prisma.vehicle.findFirst({
    where: { companyId: empresa.id },
    select: { id: true },
  });
  if (!veiculo) {
    throw new Error("Rode `seed-e2e` primeiro: a empresa não tem veículo.");
  }

  // Idempotente de ponta a ponta: um roteiro de demonstração é
  // executado muitas vezes, e ninguém quer três vans fantasmas no mapa.
  const motorista = await prisma.user.upsert({
    where: { email: DEMO.motorista.email },
    update: {},
    create: {
      nome: DEMO.motorista.nome,
      email: DEMO.motorista.email,
      telefone: DEMO.motorista.telefone,
      cpf: DEMO.motorista.cpf,
      passwordHash: await argon2.hash(DEMO.motorista.senha, { type: argon2.argon2id }),
      consentimentoLgpdAceitoEm: new Date(),
    },
    select: { id: true },
  });

  await prisma.membership.upsert({
    where: {
      userId_companyId_role: { userId: motorista.id, companyId: empresa.id, role: "motorista" },
    },
    update: {},
    create: { userId: motorista.id, companyId: empresa.id, role: "motorista", status: "ATIVO" },
  });

  // Sem o aceite, `GET /auth/me` devolve `pendingConsents` e a
  // interface para num modal de reaceite — legítimo, e que numa
  // demonstração só atrapalha.
  await prisma.consentRecord.createMany({
    data: [
      { userId: motorista.id, tipo: "TERMOS_DE_USO", versao: CURRENT_TERMS_VERSION },
      { userId: motorista.id, tipo: "POLITICA_PRIVACIDADE", versao: CURRENT_PRIVACY_VERSION },
    ],
    skipDuplicates: true,
  });

  const escola = await prisma.school.upsert({
    where: { codigoInterno: DEMO.escola.codigoInterno },
    update: {},
    create: {
      codigoInterno: DEMO.escola.codigoInterno,
      nomeOficial: DEMO.escola.nomeOficial,
      dependenciaAdministrativa: "MUNICIPAL",
      tipos: ["FUNDAMENTAL"],
      turnosAtendidos: ["MANHA", "TARDE"],
      status: "ATIVA",
      cep: DEMO.escola.cep,
      logradouro: DEMO.escola.logradouro,
      numero: DEMO.escola.numero,
      bairro: DEMO.escola.bairro,
      cidade: DEMO.escola.cidade,
      estado: DEMO.escola.estado,
      latitude: DEMO.escola.latitude,
      longitude: DEMO.escola.longitude,
    },
    select: { id: true },
  });

  const alunoExistente = await prisma.student.findFirst({
    where: { nome: DEMO.aluno.nome, schoolId: escola.id },
    select: { id: true },
  });
  const aluno =
    alunoExistente ??
    (await prisma.student.create({
      data: {
        responsavelId: responsavel.id,
        nome: DEMO.aluno.nome,
        dataNascimento: DEMO.aluno.dataNascimento,
        sexo: "FEMININO",
        schoolId: escola.id,
        turno: "MANHA",
        embarqueCep: DEMO.aluno.embarque.cep,
        embarqueLogradouro: DEMO.aluno.embarque.logradouro,
        embarqueNumero: DEMO.aluno.embarque.numero,
        embarqueBairro: DEMO.aluno.embarque.bairro,
        embarqueCidade: DEMO.escola.cidade,
        embarqueEstado: DEMO.escola.estado,
        embarqueLatitude: DEMO.aluno.embarque.latitude,
        embarqueLongitude: DEMO.aluno.embarque.longitude,
        desembarqueCep: DEMO.aluno.embarque.cep,
        desembarqueLogradouro: DEMO.aluno.embarque.logradouro,
        desembarqueNumero: DEMO.aluno.embarque.numero,
        desembarqueBairro: DEMO.aluno.embarque.bairro,
        desembarqueCidade: DEMO.escola.cidade,
        desembarqueEstado: DEMO.escola.estado,
        desembarqueLatitude: DEMO.aluno.embarque.latitude,
        desembarqueLongitude: DEMO.aluno.embarque.longitude,
      },
      select: { id: true },
    }));

  // `Contract.transportRequestId` é obrigatório e `@unique`: todo
  // contrato nasce de uma solicitação, inclusive um de demonstração.
  // Forjar o contrato sem ela deixaria o banco num estado que o próprio
  // produto não consegue produzir.
  const solicitacaoExistente = await prisma.transportRequest.findFirst({
    where: { studentId: aluno.id, companyId: empresa.id },
    select: { id: true },
  });
  const solicitacao =
    solicitacaoExistente ??
    (await prisma.transportRequest.create({
      data: {
        studentId: aluno.id,
        responsavelId: responsavel.id,
        companyId: empresa.id,
        schoolId: escola.id,
        turno: "MANHA",
        status: "APROVADA",
      },
      select: { id: true },
    }));

  const contrato = await prisma.contract.upsert({
    where: { transportRequestId: solicitacao.id },
    update: {},
    create: {
      transportRequestId: solicitacao.id,
      studentId: aluno.id,
      responsavelId: responsavel.id,
      companyId: empresa.id,
      schoolId: escola.id,
      vehicleId: veiculo.id,
      motoristaId: motorista.id,
      valorMensalidadeCentavos: 32_000,
      planoDescricao: "Ida e volta, cinco dias por semana",
      regras: "Embarque na porta. Tolerância de 5 minutos.",
      vigenciaInicio: new Date("2026-02-01T00:00:00.000Z"),
      status: "ATIVO",
      ativadoEm: new Date(),
      assinadoResponsavelEm: new Date(),
      assinadoEmpresaEm: new Date(),
    },
    select: { id: true },
  });

  const rotaExistente = await prisma.route.findFirst({
    where: { nome: DEMO.rota.nome, companyId: empresa.id },
    select: { id: true },
  });
  const rota =
    rotaExistente ??
    (await prisma.route.create({
      data: {
        companyId: empresa.id,
        nome: DEMO.rota.nome,
        turno: "MANHA",
        diasSemana: ["SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA"],
        status: "ATIVA",
        veiculoPadraoId: veiculo.id,
        motoristaPadraoId: motorista.id,
      },
      select: { id: true },
    }));

  let paradas = await prisma.routeStop.findMany({
    where: { routeId: rota.id },
    orderBy: { ordem: "asc" },
    select: { id: true },
  });

  if (paradas.length === 0) {
    await prisma.routeStop.createMany({
      data: [
        {
          routeId: rota.id,
          companyId: empresa.id,
          ordem: 1,
          endereco: `${DEMO.aluno.embarque.logradouro}, ${DEMO.aluno.embarque.numero} — ${DEMO.aluno.embarque.bairro}`,
          latitude: DEMO.aluno.embarque.latitude,
          longitude: DEMO.aluno.embarque.longitude,
          horarioPrevisto: DEMO.rota.horarios[0],
        },
        {
          routeId: rota.id,
          companyId: empresa.id,
          ordem: 2,
          endereco: "Av. Litorânea, 800 — Itaipuaçu",
          latitude: -22.9487,
          longitude: -42.9203,
          horarioPrevisto: DEMO.rota.horarios[1],
        },
        {
          routeId: rota.id,
          companyId: empresa.id,
          ordem: 3,
          endereco: `${DEMO.escola.nomeOficial} — ${DEMO.escola.bairro}`,
          latitude: DEMO.escola.latitude,
          longitude: DEMO.escola.longitude,
          horarioPrevisto: DEMO.rota.horarios[2],
          schoolId: escola.id,
        },
      ],
    });
    paradas = await prisma.routeStop.findMany({
      where: { routeId: rota.id },
      orderBy: { ordem: "asc" },
      select: { id: true },
    });
  }

  await prisma.routeStudent.upsert({
    where: { contractId: contrato.id },
    update: {},
    create: {
      routeId: rota.id,
      companyId: empresa.id,
      contractId: contrato.id,
      studentId: aluno.id,
      paradaEmbarqueId: paradas[0]!.id,
      paradaDesembarqueId: paradas[2]!.id,
      ativo: true,
    },
  });

  const hoje = diaDaOperacao();

  // Sem escala do dia, a viagem não abre — é a regra que o runbook de
  // incidentes descreve como "a causa quase sempre é a mesma".
  const escalaExistente = await prisma.routeAssignment.findFirst({
    where: { routeId: rota.id, data: hoje },
    select: { id: true },
  });
  if (!escalaExistente) {
    await prisma.routeAssignment.create({
      data: {
        companyId: empresa.id,
        routeId: rota.id,
        data: hoje,
        veiculoId: veiculo.id,
        motoristaId: motorista.id,
      },
    });
  }

  const viagemExistente = await prisma.trip.findFirst({
    where: { routeId: rota.id, data: hoje, status: "EM_ANDAMENTO" },
    select: { id: true, codigo: true },
  });
  const viagem =
    viagemExistente ??
    (await prisma.trip.create({
      data: {
        companyId: empresa.id,
        routeId: rota.id,
        data: hoje,
        status: "EM_ANDAMENTO",
        sentido: "IDA",
        // Seis maiúsculas, sem 0/O/1/I — a mesma regra de `TripsService`.
        codigo: "DEMO24",
        veiculoId: veiculo.id,
        motoristaId: motorista.id,
        iniciadaEm: new Date(Date.now() - 15 * 60_000),
      },
      select: { id: true, codigo: true },
    }));

  // O rastro é reescrito a cada execução, nunca acumulado: rodar três
  // vezes deixaria quinze pontos e um ziguezague no mapa.
  await prisma.tripPosition.deleteMany({ where: { tripId: viagem.id } });
  const agora = Date.now();
  await prisma.tripPosition.createMany({
    data: DEMO.rastro.map((ponto, indice) => ({
      tripId: viagem.id,
      companyId: empresa.id,
      latitude: ponto.latitude,
      longitude: ponto.longitude,
      velocidadeKmh: ponto.velocidadeKmh,
      origem: "CELULAR" as const,
      capturadaEm: new Date(agora - (DEMO.rastro.length - 1 - indice) * 3 * 60_000),
    })),
  });

  const ultimo = DEMO.rastro[DEMO.rastro.length - 1]!;
  await prisma.vehicle.update({
    where: { id: veiculo.id },
    data: {
      viagemAtualId: viagem.id,
      ultimaLatitude: ultimo.latitude,
      ultimaLongitude: ultimo.longitude,
      ultimaPosicaoEm: new Date(),
    },
  });

  console.log(`[demo] escola    ${DEMO.escola.nomeOficial}`);
  console.log(`[demo] aluno     ${DEMO.aluno.nome} (responsável: ${CONTAS.responsavel.email})`);
  console.log(`[demo] rota      ${DEMO.rota.nome}, ${paradas.length} paradas`);
  console.log(`[demo] motorista ${DEMO.motorista.email} / ${DEMO.motorista.senha}`);
  console.log(`[demo] viagem    ${viagem.codigo} EM_ANDAMENTO, ${DEMO.rastro.length} posições`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (erro: unknown) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });
