import { ForbiddenException, Inject, Injectable, Logger } from "@nestjs/common";
import { ServiceTag } from "@prisma/client";
import AdmZip from "adm-zip";

import { toSeteAluno, toSeteMonitor, toSeteMotorista, toSeteRota, toSeteVeiculo } from "./mappers";
import { SETE_REPOSITORY } from "./sete.constants";

import type { SeteRepository } from "./repositories/sete.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { SetePacote, SetePendencia } from "@rotta/shared-contracts";

import { AuditLogService } from "@/modules/audit/audit-log.service";
import { CompanyTagsService } from "@/modules/companies/company-tags.service";
import { Role } from "@/shared/enums";

/**
 * Exportação para o SETE (FNDE).
 *
 * Especificação: `docs/52-integracao-sete.md`.
 */
@Injectable()
export class SeteService {
  private readonly logger = new Logger(SeteService.name);

  constructor(
    @Inject(SETE_REPOSITORY) private readonly repository: SeteRepository,
    private readonly companyTagsService: CompanyTagsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * De qual empresa é a exportação.
   *
   * Empresa e Gestor usam SEMPRE o próprio `tenantId`, e o parâmetro é
   * ignorado — ler `companyId` da URL para eles entregaria o pacote de
   * qualquer transportadora a quem trocasse o UUID. Só o Admin Rotta,
   * que não tem tenant, pode apontar a empresa. É a mesma disciplina de
   * `TripsService.listActiveForMap`.
   */
  private resolverEmpresa(actor: AuthenticatedUser, companyIdParam?: string): string {
    if (actor.role === Role.ADMIN_ROTTA) {
      if (!companyIdParam) {
        throw new ForbiddenException(
          "Admin Rotta precisa informar de qual transportadora é a exportação (companyId).",
        );
      }
      return companyIdParam;
    }

    if (!actor.tenantId) {
      throw new ForbiddenException("Esta conta não está vinculada a uma transportadora.");
    }
    return actor.tenantId;
  }

  /** Só transportadora que atende contrato público exporta (RN-SETE-02). */
  private async exigirLicitada(companyId: string): Promise<void> {
    await this.companyTagsService.assertTag(
      companyId,
      ServiceTag.LICITADA,
      "A exportação para o SETE",
    );
  }

  /**
   * O município da área de atuação, para a tela sugerir o código IBGE.
   *
   * ## O limite, dito em voz alta
   *
   * A Rotta **não tem** tabela de códigos IBGE — são 5.570 municípios, e
   * carregá-los é um conjunto de dados próprio, com atualização própria.
   * Então a sugestão cobre só os municípios onde a Rotta opera hoje, e
   * para qualquer outro devolve o nome da cidade sem o código, para a
   * pessoa digitar. Inventar um código de sete dígitos seria pior que
   * não sugerir: ninguém confere, e o pacote iria para o município
   * errado. Está em "Melhorias futuras" do `docs/52`.
   */
  private static readonly CODIGO_IBGE_CONHECIDO: Record<string, string> = {
    "marica/rj": "3302700",
  };

  async sugerirMunicipio(
    actor: AuthenticatedUser,
    companyIdParam?: string,
  ): Promise<{ cidade: string | null; estado: string | null; codigoIbge: string | null }> {
    const companyId = this.resolverEmpresa(actor, companyIdParam);
    await this.exigirLicitada(companyId);

    const municipio = await this.repository.municipioDeAtuacao(companyId);
    if (!municipio) return { cidade: null, estado: null, codigoIbge: null };

    const chave = `${municipio.cidade
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim()}/${municipio.estado.toLowerCase().trim()}`;

    return {
      cidade: municipio.cidade,
      estado: municipio.estado,
      codigoIbge: SeteService.CODIGO_IBGE_CONHECIDO[chave] ?? null,
    };
  }

  async listarPendencias(
    actor: AuthenticatedUser,
    companyIdParam?: string,
  ): Promise<SetePendencia[]> {
    const companyId = this.resolverEmpresa(actor, companyIdParam);
    await this.exigirLicitada(companyId);

    const dados = await this.repository.carregarDadosDaExportacao(companyId);
    return this.calcularPendencias(dados);
  }

  /**
   * O que falta para o pacote ficar completo.
   *
   * A descrição é o que a pessoa lê, e por isso NUNCA carrega dado
   * sensível: nome de escola e placa de veículo sim, condição de saúde
   * de criança nunca. Cor e deficiência também não aparecem como
   * pendência — eles são uma decisão da Rotta, não uma lacuna
   * (RN-SETE-10).
   */
  private calcularPendencias(
    dados: Awaited<ReturnType<SeteRepository["carregarDadosDaExportacao"]>>,
  ): SetePendencia[] {
    const pendencias: SetePendencia[] = [];
    const hoje = new Date();

    for (const escola of dados.escolasSemInep) {
      pendencias.push({
        tipo: "ESCOLA_SEM_INEP",
        descricao: `A escola "${escola.nome}" não tem código INEP, e é por ele que o SETE identifica escola.`,
        caminhoDeCorrecao: `/escolas/${escola.id}`,
      });
    }

    for (const rota of dados.rotas) {
      const convertida = toSeteRota(rota);
      if (convertida.km === null) {
        pendencias.push({
          tipo: "ROTA_SEM_GPS",
          descricao: `A rota "${rota.nome}" não tem viagem com GPS confiável: o SETE fica sem quilometragem e sem traçado.`,
          caminhoDeCorrecao: `/rotas/${rota.id}`,
        });
      }
      if (convertida.hora_ida_inicio === null) {
        pendencias.push({
          tipo: "ROTA_SEM_HORARIO",
          descricao: `A rota "${rota.nome}" não tem viagem finalizada nem horário previsto nas paradas.`,
          caminhoDeCorrecao: `/rotas/${rota.id}`,
        });
      }
    }

    for (const veiculo of dados.veiculos) {
      if (!veiculo.renavam) {
        pendencias.push({
          tipo: "VEICULO_SEM_RENAVAM",
          descricao: `O veículo de placa ${veiculo.placa} está sem Renavam.`,
          caminhoDeCorrecao: `/veiculos/${veiculo.id}`,
        });
      }
      if (veiculo.origemFrota === null) {
        pendencias.push({
          tipo: "VEICULO_SEM_ORIGEM",
          descricao: `O veículo de placa ${veiculo.placa} não diz se é próprio do município ou terceirizado.`,
          caminhoDeCorrecao: `/veiculos/${veiculo.id}`,
        });
      }
      if (toSeteVeiculo(veiculo).tipo === null) {
        pendencias.push({
          tipo: "VEICULO_TIPO_SEM_EQUIVALENTE",
          descricao: `O tipo do veículo de placa ${veiculo.placa} não existe na lista do SETE, que vai de ônibus a canoa.`,
          caminhoDeCorrecao: `/veiculos/${veiculo.id}`,
        });
      }
    }

    for (const motorista of dados.motoristas) {
      if (!motorista.cnh) {
        pendencias.push({
          tipo: "MOTORISTA_SEM_CNH",
          descricao: `${motorista.nome} está escalado numa rota e não tem CNH cadastrada.`,
          caminhoDeCorrecao: "/equipe",
        });
      } else if (motorista.cnh.vencimentoEm && motorista.cnh.vencimentoEm < hoje) {
        pendencias.push({
          tipo: "MOTORISTA_CNH_VENCIDA",
          descricao: `A CNH de ${motorista.nome} está vencida.`,
          caminhoDeCorrecao: "/equipe",
        });
      }
    }

    for (const aluno of dados.alunos) {
      if (aluno.embarqueLatitude === null || aluno.embarqueLongitude === null) {
        pendencias.push({
          tipo: "ALUNO_SEM_COORDENADA",
          descricao: `O ponto de embarque de ${aluno.nome} não tem coordenada, e o trajeto sai errado no mapa do SETE.`,
          caminhoDeCorrecao: `/alunos/${aluno.id}`,
        });
      }
      if (!aluno.nomeDoResponsavel || !aluno.telefoneDoResponsavel) {
        pendencias.push({
          tipo: "ALUNO_SEM_RESPONSAVEL",
          descricao: `${aluno.nome} está sem responsável com telefone.`,
          caminhoDeCorrecao: `/alunos/${aluno.id}`,
        });
      }
    }

    return pendencias;
  }

  async montarPacote(
    actor: AuthenticatedUser,
    codigoIbge: string,
    companyIdParam?: string,
  ): Promise<SetePacote> {
    const companyId = this.resolverEmpresa(actor, companyIdParam);
    await this.exigirLicitada(companyId);

    const dados = await this.repository.carregarDadosDaExportacao(companyId);
    const agora = new Date();

    const pacote: SetePacote = {
      codigoIbge,
      geradoEm: agora.toISOString(),
      rotas: dados.rotas.map(toSeteRota),
      veiculos: dados.veiculos.map(toSeteVeiculo),
      motoristas: dados.motoristas.map(toSeteMotorista),
      monitores: dados.monitores.map(toSeteMonitor),
      alunos: dados.alunos.map((aluno) => toSeteAluno(aluno, agora)),
      ligacoes: dados.ligacoes,
      pendencias: this.calcularPendencias(dados),
    };

    await this.registrarAuditoria(actor, companyId, pacote);
    return pacote;
  }

  /**
   * Auditoria da exportação (RN-SETE-06).
   *
   * Só CONTAGEM, nunca nome. O log fica no banco por muito tempo e é
   * lido por gente que não precisa saber quais crianças foram
   * exportadas — registrar "47 alunos" responde "o que saiu daqui?" sem
   * criar uma segunda cópia do dado pessoal.
   *
   * Best-effort de propósito: falha de auditoria não pode derrubar a
   * exportação, que é o que a transportadora precisa entregar à
   * prefeitura. A falha vira log de aplicação.
   */
  private async registrarAuditoria(
    actor: AuthenticatedUser,
    companyId: string,
    pacote: SetePacote,
  ): Promise<void> {
    try {
      await this.auditLogService.record({
        companyId,
        entidadeTipo: "ExportacaoSete",
        entidadeId: companyId,
        acao: "EXPORTAR",
        atorUserId: actor.sub,
        dadosDepois: {
          codigoIbge: pacote.codigoIbge,
          rotas: pacote.rotas.length,
          veiculos: pacote.veiculos.length,
          motoristas: pacote.motoristas.length,
          monitores: pacote.monitores.length,
          alunos: pacote.alunos.length,
          pendencias: pacote.pendencias.length,
        },
      });
    } catch (erro) {
      this.logger.warn(
        `Falha ao registrar auditoria da exportação SETE da empresa ${companyId}: ${
          erro instanceof Error ? erro.message : String(erro)
        }`,
      );
    }
  }

  /**
   * O `.zip` que a pessoa leva ao SETE.
   *
   * Um arquivo por entidade mais um `LEIA-ME.txt`, porque o SETE importa
   * uma coisa de cada vez e porque a prefeitura precisa ler as
   * pendências ANTES de subir qualquer coisa.
   */
  async exportarZip(
    actor: AuthenticatedUser,
    opcoes: { formato: "json" | "csv"; codigoIbge: string; companyId?: string },
  ): Promise<{ buffer: Buffer; filename: string }> {
    const pacote = await this.montarPacote(actor, opcoes.codigoIbge, opcoes.companyId);
    const zip = new AdmZip();

    zip.addFile("LEIA-ME.txt", Buffer.from(this.leiaMe(pacote), "utf-8"));

    if (opcoes.formato === "json") {
      for (const [nome, conteudo] of [
        ["rotas", pacote.rotas],
        ["veiculos", pacote.veiculos],
        ["motoristas", pacote.motoristas],
        ["monitores", pacote.monitores],
        ["alunos", pacote.alunos],
        ["ligacoes", pacote.ligacoes],
      ] as const) {
        zip.addFile(`${nome}.json`, Buffer.from(JSON.stringify(conteudo, null, 2), "utf-8"));
      }
    } else {
      zip.addFile("alunos.csv", Buffer.from(this.alunosEmCsv(pacote), "utf-8"));
    }

    return {
      buffer: zip.toBuffer(),
      filename: `rotta-sete-${opcoes.codigoIbge}-${pacote.geradoEm.slice(0, 10)}.zip`,
    };
  }

  /**
   * A planilha de alunos no formato que o `/importacao` do SETE aceita.
   *
   * Os cabeçalhos são exatamente os nomes que `ImportacaoModel::
   * validarAlunos` procura — um nome diferente faz o SETE recusar a
   * linha inteira dizendo que o campo "está ausente".
   */
  private alunosEmCsv(pacote: SetePacote): string {
    const colunas = [
      "nome",
      "data_nascimento",
      "sexo",
      "cor",
      "turno",
      "nivel",
      "mec_tp_localizacao",
      "loc_endereco",
      "loc_cep",
      "loc_latitude",
      "loc_longitude",
      "nome_responsavel",
      "telefone_responsavel",
    ] as const;

    // `string | number | null`: e o que os campos do CSV sao no
    // contrato. `unknown` aqui deixaria um objeto virar
    // "[object Object]" calado dentro da planilha do FNDE.
    const escapar = (valor: string | number | null): string => {
      if (valor === null) return "";
      const texto = String(valor);
      return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    };

    const linhas = pacote.alunos.map((aluno) =>
      colunas.map((coluna) => escapar(aluno[coluna as keyof typeof aluno])).join(";"),
    );

    return [colunas.join(";"), ...linhas].join("\n");
  }

  private leiaMe(pacote: SetePacote): string {
    const linhas = [
      "PACOTE PARA O SETE (FNDE) — gerado pela Rotta",
      "",
      `Município (código IBGE): ${pacote.codigoIbge}`,
      `Gerado em: ${pacote.geradoEm}`,
      "",
      "O QUE VEM AQUI",
      `  rotas ........ ${pacote.rotas.length}`,
      `  veículos ..... ${pacote.veiculos.length}`,
      `  motoristas ... ${pacote.motoristas.length}`,
      `  monitores .... ${pacote.monitores.length}`,
      `  alunos ....... ${pacote.alunos.length}`,
      "",
      "O QUE A ROTTA NÃO EXPORTA, E POR QUÊ",
      "",
      "  Cor/raça e deficiência não saem daqui. São dados sensíveis",
      "  (LGPD, art. 11) de criança (art. 14), e a Rotta não os coleta",
      "  nem os repassa. No campo `cor` vai 0, que é o código do próprio",
      '  SETE para "não informada" — é a declaração de que não há dado.',
      "  Esses campos vêm da Secretaria de Educação, e é lá que eles",
      "  devem ser preenchidos.",
      "",
      "  Data de nascimento e sexo de motorista e monitor também não",
      "  saem: a Rotta não coleta esses dados hoje. São dois campos por",
      "  pessoa, preenchidos uma vez no SETE.",
      "",
    ];

    if (pacote.pendencias.length === 0) {
      linhas.push("PENDÊNCIAS", "", "  Nenhuma. O pacote está completo.", "");
    } else {
      linhas.push(
        "PENDÊNCIAS",
        "",
        `  ${pacote.pendencias.length} item(ns) precisam de atenção antes de enviar:`,
        "",
      );
      for (const pendencia of pacote.pendencias) {
        linhas.push(`  [${pendencia.tipo}] ${pendencia.descricao}`);
      }
      linhas.push(
        "",
        "  O pacote foi gerado assim mesmo, de propósito: resolver tudo",
        "  antes de ver qualquer resultado seria pior do que começar.",
        "",
      );
    }

    linhas.push(
      "ANTES DE ENVIAR PELA API",
      "",
      "  Os endpoints do SETE precisam ser confirmados com o CECATE/UFG",
      "  (cecate.ufg@fnde.gov.br): o código público do SETE é de março de",
      "  2023. O traçado (`shape`) vai em EPSG:3857, que é o que as",
      "  amostras reais do SETE mostram — confirme também isso.",
      "",
    );

    return linhas.join("\n");
  }
}
