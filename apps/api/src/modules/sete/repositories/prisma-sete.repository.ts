import { Injectable } from "@nestjs/common";

import { VIAGENS_CONSIDERADAS } from "../sete.constants";

import type { DadosDaExportacao, SeteRepository } from "./sete.repository";
import type {
  AlunoDaRotta,
  MotoristaDaRotta,
  PessoaDaRotta,
  RotaDaRotta,
  VeiculoDaRotta,
} from "../mappers";

import { PrismaService } from "@/infra/database/prisma.service";

/**
 * A leitura da exportação do SETE.
 *
 * ## `withTenant` em tudo, e `companyId` explícito por cima
 *
 * As duas coisas, e não uma. O `withTenant` é a defesa do banco (RLS); o
 * `where: { companyId }` é a defesa do código. Quem confia só na
 * primeira descobre o problema no dia em que alguém consulta uma tabela
 * sem política; quem confia só na segunda, no dia em que alguém esquece
 * o `where`. Aqui o pacote carrega nome, endereço e telefone de criança
 * (LGPD arts. 11 e 14) — é o lugar errado para economizar uma linha.
 *
 * ## Três tabelas não têm `companyId`, e não é esquecimento
 *
 * `User`, `Student` e `School` não têm a coluna: um usuário se liga à
 * empresa por `Membership`, uma escola serve várias transportadoras
 * (`SchoolCompanyLink`), e um aluno se liga por contrato e por rota.
 * Nessas três, o recorte é a LISTA DE IDS — e cada lista é derivada das
 * rotas ATIVAS desta empresa, que já vieram filtradas por `companyId`.
 * `User` leva, por cima, `memberships: { some: { companyId } }`: um id
 * que escapasse para cá não traria nome e CPF de alguém de fora.
 *
 * Ver `docs/52-integracao-sete.md`, RN-SETE-01.
 */
@Injectable()
export class PrismaSeteRepository implements SeteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async municipioDeAtuacao(companyId: string): Promise<{ cidade: string; estado: string } | null> {
    const area = await this.prisma.withTenant(
      this.prisma.companyServiceArea.findFirst({
        where: { companyId, cidade: { not: null }, estado: { not: null } },
        orderBy: { createdAt: "asc" },
        select: { cidade: true, estado: true },
      }),
    );

    if (!area?.cidade || !area.estado) return null;
    return { cidade: area.cidade, estado: area.estado };
  }

  async carregarDadosDaExportacao(companyId: string): Promise<DadosDaExportacao> {
    const rotas = await this.prisma.withTenant(
      this.prisma.route.findMany({
        where: { companyId, status: "ATIVA", deletedAt: null },
        select: {
          id: true,
          nome: true,
          turno: true,
          acessoPorteira: true,
          acessoMataBurro: true,
          acessoColchete: true,
          acessoAtoleiro: true,
          acessoPonteRustica: true,
          veiculoPadraoId: true,
          motoristaPadraoId: true,
          monitorPadraoId: true,
          paradas: {
            orderBy: { ordem: "asc" },
            select: { horarioPrevisto: true, schoolId: true },
          },
          alunos: {
            where: { ativo: true },
            select: { studentId: true },
          },
        },
        orderBy: { nome: "asc" },
      }),
    );

    const idsDasRotas = rotas.map((rota) => rota.id);

    // Viagens finalizadas, para a mediana de horário (RN-SETE-07). Uma
    // consulta só para todas as rotas: uma por rota seria N idas ao
    // banco numa frota de setenta.
    const viagens = idsDasRotas.length
      ? await this.prisma.withTenant(
          this.prisma.trip.findMany({
            where: { companyId, routeId: { in: idsDasRotas }, status: "FINALIZADA" },
            select: {
              routeId: true,
              sentido: true,
              iniciadaEm: true,
              finalizadaEm: true,
            },
            orderBy: { iniciadaEm: "desc" },
            // Teto generoso: o recorte por rota e por sentido acontece
            // no conversor, que é quem conhece a regra das 20.
            take: idsDasRotas.length * VIAGENS_CONSIDERADAS * 2,
          }),
        )
      : [];

    // A viagem mais recente de cada rota que TEM posição — é dela que
    // saem o `km` e o `shape`.
    const posicoesPorRota = new Map<string, RotaDaRotta["posicoesDaViagemMaisRecente"]>();
    for (const rotaId of idsDasRotas) {
      const maisRecente = await this.prisma.withTenant(
        this.prisma.trip.findFirst({
          where: { companyId, routeId: rotaId, posicoes: { some: {} } },
          orderBy: { iniciadaEm: "desc" },
          select: {
            posicoes: {
              orderBy: { capturadaEm: "asc" },
              select: {
                latitude: true,
                longitude: true,
                capturadaEm: true,
                simuladoSuspeito: true,
                precisaoMetros: true,
              },
            },
          },
        }),
      );

      posicoesPorRota.set(
        rotaId,
        (maisRecente?.posicoes ?? []).map((posicao) => ({
          latitude: Number(posicao.latitude),
          longitude: Number(posicao.longitude),
          capturadaEm: posicao.capturadaEm,
          simuladoSuspeito: posicao.simuladoSuspeito,
          precisaoMetros: posicao.precisaoMetros === null ? null : Number(posicao.precisaoMetros),
        })),
      );
    }

    const rotasDaRotta: RotaDaRotta[] = rotas.map((rota) => ({
      id: rota.id,
      nome: rota.nome,
      turno: rota.turno,
      acessoPorteira: rota.acessoPorteira,
      acessoMataBurro: rota.acessoMataBurro,
      acessoColchete: rota.acessoColchete,
      acessoAtoleiro: rota.acessoAtoleiro,
      acessoPonteRustica: rota.acessoPonteRustica,
      horariosDasParadas: rota.paradas.map((parada) => parada.horarioPrevisto),
      viagensFinalizadas: viagens
        .filter((viagem) => viagem.routeId === rota.id)
        .map((viagem) => ({
          sentido: viagem.sentido,
          iniciadaEm: viagem.iniciadaEm,
          finalizadaEm: viagem.finalizadaEm,
        })),
      posicoesDaViagemMaisRecente: posicoesPorRota.get(rota.id) ?? [],
    }));

    const veiculos = await this.prisma.withTenant(
      this.prisma.vehicle.findMany({
        where: { companyId, deletedAt: null },
        select: {
          id: true,
          placa: true,
          marca: true,
          modelo: true,
          ano: true,
          renavam: true,
          capacidadePassageiros: true,
          tipo: true,
          origemFrota: true,
          quilometragemAtual: true,
          status: true,
        },
        orderBy: { placa: "asc" },
      }),
    );

    const veiculosDaRotta: VeiculoDaRotta[] = veiculos.map((veiculo) => ({
      id: veiculo.id,
      placa: veiculo.placa,
      marca: veiculo.marca,
      modelo: veiculo.modelo,
      ano: veiculo.ano,
      renavam: veiculo.renavam,
      capacidadePassageiros: veiculo.capacidadePassageiros,
      tipo: veiculo.tipo,
      origemFrota: veiculo.origemFrota,
      quilometragemAtual: veiculo.quilometragemAtual,
      status: veiculo.status,
    }));

    // Motorista e monitor: só quem está escalado como padrão em alguma
    // rota ATIVA. A frota inteira de ex-funcionários não vai ao FNDE.
    const idsDeMotoristas = [
      ...new Set(rotas.map((r) => r.motoristaPadraoId).filter((id): id is string => Boolean(id))),
    ];
    const idsDeMonitores = [
      ...new Set(rotas.map((r) => r.monitorPadraoId).filter((id): id is string => Boolean(id))),
    ];

    const pessoas = await this.prisma.withTenant(
      this.prisma.user.findMany({
        // `User` não tem `companyId`: o vínculo é a `Membership`. Sem
        // esta condição, um `motoristaPadraoId` apontando para fora da
        // empresa traria nome e CPF de quem não é dela.
        where: {
          id: { in: [...idsDeMotoristas, ...idsDeMonitores] },
          memberships: { some: { companyId } },
        },
        select: { id: true, nome: true, cpf: true, telefone: true },
      }),
    );

    const documentos = idsDeMotoristas.length
      ? await this.prisma.withTenant(
          this.prisma.driverDocument.findMany({
            where: {
              companyId,
              userId: { in: idsDeMotoristas },
              tipo: { in: ["CNH", "ANTECEDENTES_CRIMINAIS"] },
              deletedAt: null,
            },
            select: {
              userId: true,
              tipo: true,
              numero: true,
              categoria: true,
              vencimentoEm: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          }),
        )
      : [];

    const turnosDe = (userId: string, campo: "motoristaPadraoId" | "monitorPadraoId") =>
      rotas.filter((rota) => rota[campo] === userId).map((rota) => rota.turno);

    const motoristas: MotoristaDaRotta[] = idsDeMotoristas
      .map((id): MotoristaDaRotta | null => {
        const pessoa = pessoas.find((p) => p.id === id);
        if (!pessoa?.cpf) return null;
        // O MAIS RECENTE não excluído: a lista já vem ordenada por
        // `createdAt desc`, então o primeiro é o que vale.
        const cnh = documentos.find((d) => d.userId === id && d.tipo === "CNH");
        return {
          cpf: pessoa.cpf,
          nome: pessoa.nome,
          telefone: pessoa.telefone,
          turnosEscalados: turnosDe(id, "motoristaPadraoId"),
          cnh: cnh?.numero
            ? { numero: cnh.numero, categoria: cnh.categoria, vencimentoEm: cnh.vencimentoEm }
            : null,
          temAntecedentesCriminais: documentos.some(
            (d) => d.userId === id && d.tipo === "ANTECEDENTES_CRIMINAIS",
          ),
        };
      })
      .filter((m): m is MotoristaDaRotta => m !== null);

    const monitores: PessoaDaRotta[] = idsDeMonitores
      .map((id): PessoaDaRotta | null => {
        const pessoa = pessoas.find((p) => p.id === id);
        if (!pessoa?.cpf) return null;
        return {
          cpf: pessoa.cpf,
          nome: pessoa.nome,
          telefone: pessoa.telefone,
          turnosEscalados: turnosDe(id, "monitorPadraoId"),
        };
      })
      .filter((m): m is PessoaDaRotta => m !== null);

    // Alunos: só os vinculados a rota ATIVA desta empresa.
    const idsDeAlunos = [...new Set(rotas.flatMap((r) => r.alunos.map((a) => a.studentId)))];

    const alunosBrutos = idsDeAlunos.length
      ? await this.prisma.withTenant(
          this.prisma.student.findMany({
            where: { id: { in: idsDeAlunos } },
            select: {
              id: true,
              nome: true,
              dataNascimento: true,
              sexo: true,
              turno: true,
              embarqueLogradouro: true,
              embarqueNumero: true,
              embarqueBairro: true,
              embarqueCep: true,
              embarqueLatitude: true,
              embarqueLongitude: true,
              responsavel: { select: { nome: true, telefone: true } },
              school: { select: { id: true, nomeOficial: true, codigoInep: true, tipos: true } },
            },
          }),
        )
      : [];

    const rotaDoAluno = new Map<string, (typeof rotas)[number]>();
    for (const rota of rotas) {
      for (const vinculo of rota.alunos) {
        if (!rotaDoAluno.has(vinculo.studentId)) rotaDoAluno.set(vinculo.studentId, rota);
      }
    }

    const temAcessoRural = (rota: (typeof rotas)[number] | undefined): boolean =>
      Boolean(
        rota &&
        (rota.acessoPorteira ||
          rota.acessoMataBurro ||
          rota.acessoColchete ||
          rota.acessoAtoleiro ||
          rota.acessoPonteRustica),
      );

    const alunos: AlunoDaRotta[] = alunosBrutos.map((aluno) => ({
      id: aluno.id,
      nome: aluno.nome,
      dataNascimento: aluno.dataNascimento,
      sexo: aluno.sexo,
      turno: aluno.turno,
      tiposDaEscola: aluno.school?.tipos ?? [],
      embarqueLogradouro: aluno.embarqueLogradouro,
      embarqueNumero: aluno.embarqueNumero,
      embarqueBairro: aluno.embarqueBairro,
      embarqueCep: aluno.embarqueCep,
      embarqueLatitude: aluno.embarqueLatitude === null ? null : Number(aluno.embarqueLatitude),
      embarqueLongitude: aluno.embarqueLongitude === null ? null : Number(aluno.embarqueLongitude),
      nomeDoResponsavel: aluno.responsavel?.nome ?? null,
      telefoneDoResponsavel: aluno.responsavel?.telefone ?? null,
      rotaTemAcessoRural: temAcessoRural(rotaDoAluno.get(aluno.id)),
    }));

    // Escolas das paradas, para a ligação rota × escola (pelo INEP).
    const idsDeEscolas = [
      ...new Set(
        rotas.flatMap((rota) =>
          rota.paradas.map((parada) => parada.schoolId).filter((id): id is string => Boolean(id)),
        ),
      ),
    ];

    const escolas = idsDeEscolas.length
      ? await this.prisma.withTenant(
          this.prisma.school.findMany({
            where: { id: { in: idsDeEscolas } },
            select: { id: true, nomeOficial: true, codigoInep: true },
          }),
        )
      : [];

    const inepPorEscola = new Map(escolas.map((e) => [e.id, e.codigoInep]));
    const placaPorVeiculo = new Map(veiculos.map((v) => [v.id, v.placa]));
    const cpfPorPessoa = new Map(pessoas.map((p) => [p.id, p.cpf]));

    const ligacoes: DadosDaExportacao["ligacoes"] = {
      rotaPossuiVeiculo: [],
      rotaDirigidaPorMotorista: [],
      rotaAtendidaPorMonitor: [],
      rotaPassaPorEscola: [],
      rotaAtendeAluno: [],
    };

    for (const rota of rotas) {
      const placa = rota.veiculoPadraoId ? placaPorVeiculo.get(rota.veiculoPadraoId) : null;
      if (placa) ligacoes.rotaPossuiVeiculo.push({ rota: rota.id, placa });

      const cpfMotorista = rota.motoristaPadraoId ? cpfPorPessoa.get(rota.motoristaPadraoId) : null;
      if (cpfMotorista)
        ligacoes.rotaDirigidaPorMotorista.push({ rota: rota.id, cpf: cpfMotorista });

      const cpfMonitor = rota.monitorPadraoId ? cpfPorPessoa.get(rota.monitorPadraoId) : null;
      if (cpfMonitor) ligacoes.rotaAtendidaPorMonitor.push({ rota: rota.id, cpf: cpfMonitor });

      for (const parada of rota.paradas) {
        if (!parada.schoolId) continue;
        const inep = inepPorEscola.get(parada.schoolId);
        if (inep) ligacoes.rotaPassaPorEscola.push({ rota: rota.id, codigoInep: inep });
      }

      for (const vinculo of rota.alunos) {
        ligacoes.rotaAtendeAluno.push({ rota: rota.id, aluno: vinculo.studentId });
      }
    }

    return {
      rotas: rotasDaRotta,
      veiculos: veiculosDaRotta,
      motoristas,
      monitores,
      alunos,
      ligacoes,
      escolasSemInep: escolas
        .filter((escola) => !escola.codigoInep)
        .map((escola) => ({ id: escola.id, nome: escola.nomeOficial })),
    };
  }
}
