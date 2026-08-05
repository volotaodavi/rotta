import { BadGatewayException, Inject, Injectable, Logger } from "@nestjs/common";
import AdmZip from "adm-zip";

import { SCHOOL_GEOCODE_QUEUE } from "../geo.constants";
import { mapInepRowToSchoolData } from "../inep/inep-row.mapper";

import type { SchoolRepository } from "@/modules/schools/repositories/school.repository";
import type { School } from "@prisma/client";

import { QstashPublisherService } from "@/infra/queue/qstash/qstash-publisher.service";
import { parseCsvRows } from "@/modules/schools/school-import.util";
import { SCHOOL_REPOSITORY } from "@/modules/schools/schools.constants";

const CENSO_ZIP_URL = (ano: number): string =>
  `https://download.inep.gov.br/dados_abertos/microdados_censo_escolar_${ano}.zip`;

export interface InepSyncResumo {
  ano: number;
  totalLinhas: number;
  novas: number;
  atualizadas: number;
  inalteradas: number;
  ignoradas: number;
  enfileiradasParaGeocodificacao: number;
  erros: { codigoInep?: string; mensagem: string }[];
}

/**
 * Education Sync Agent (briefing "ROTTA GEO PLATFORM" §"AGENTES DE IA"
 * — agente 1/5). Fecha o "estágio à parte" já previsto desde a
 * importação manual de Escolas (`import-schools.dto.ts`,
 * `school-import.util.ts`) para a "API Oficial" do INEP/MEC.
 *
 * Fluxo (briefing, diagrama "Nova escola encontrada → Education Sync
 * Agent → Geocoding AI Agent → Validation AI Agent → ..."):
 *  1. Baixa o ZIP público do Censo Escolar do ano informado.
 *  2. Extrai o CSV de escolas (delimitador `;`, como as demais
 *     planilhas públicas do INEP).
 *  3. Para cada linha: mapeia para o formato da Rotta
 *     (`mapInepRowToSchoolData`) e compara contra a base atual por
 *     `codigoInep` (busca em lote, nunca N consultas individuais).
 *  4. Escola nova → cria (`status: EM_ANALISE`, `origemCadastro:
 *     "SYNC_INEP"`) e publica um job via QStash (`GeoQueueController.
 *     schoolGeocode`) para geocodificar de forma assíncrona — a escala
 *     nacional (~200 mil escolas) nunca cabe numa chamada em série
 *     dentro desta única requisição/execução.
 *  5. Escola existente com endereço alterado → atualiza e enfileira o
 *     mesmo job de novo (endereço mudou, a coordenada antiga não vale
 *     mais). Sem alteração de endereço → não mexe (nunca sobrescreve
 *     dados que a própria Empresa/Gestor tenha editado manualmente,
 *     como telefone/nome fantasia).
 *  6. Escola que sumiu desta edição do Censo NÃO é excluída
 *     automaticamente (fechamento de escola é uma decisão que exige
 *     revisão humana) — só contabilizada no resumo para acompanhamento.
 *
 * Nunca finge sucesso: se o download falhar (rede indisponível — ex.
 * bloqueio de rede do ambiente, ou o INEP fora do ar), lança
 * `BadGatewayException` e não sincroniza nada, mesma disciplina do
 * `GeoEngineService`.
 */
@Injectable()
export class InepSyncService {
  private readonly logger = new Logger(InepSyncService.name);

  constructor(
    @Inject(SCHOOL_REPOSITORY)
    private readonly schoolRepository: SchoolRepository,
    private readonly qstashPublisher: QstashPublisherService,
  ) {}

  private async downloadCensoZip(ano: number): Promise<Buffer> {
    const url = CENSO_ZIP_URL(ano);
    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new BadGatewayException(
        `Education Sync Agent: falha de rede ao baixar o Censo Escolar ${ano} (${url}).`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
    if (!response.ok) {
      throw new BadGatewayException(
        `Education Sync Agent: INEP retornou ${response.status} ao baixar o Censo Escolar ${ano}.`,
      );
    }
    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * O ZIP público do Censo Escolar traz várias planilhas (escolas,
   * turmas, matrículas, docentes) dentro de `dados/` — a de escolas é a
   * única com uma linha por `CO_ENTIDADE`; identificada aqui pelo nome
   * conter "escolas" (case-insensitive), com fallback para o primeiro
   * `.csv` do arquivo caso a convenção de nome mude entre edições.
   */
  private extractSchoolsCsv(zipBuffer: Buffer): string {
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries().filter((entry) => entry.entryName.endsWith(".csv"));
    const entry = entries.find((candidate) => /escolas/i.test(candidate.entryName)) ?? entries[0];
    if (!entry) {
      throw new BadGatewayException(
        "Education Sync Agent: nenhum CSV de escolas encontrado no ZIP do Censo Escolar.",
      );
    }
    // Microdados do Censo Escolar são publicados em ISO-8859-1 (Latin-1).
    return entry.getData().toString("latin1");
  }

  /** Sincronização real, a partir do download oficial do INEP para o ano informado. */
  async sincronizar(ano: number): Promise<InepSyncResumo> {
    const zipBuffer = await this.downloadCensoZip(ano);
    const csv = this.extractSchoolsCsv(zipBuffer);
    return this.sincronizarDeCsv(ano, csv);
  }

  /**
   * Núcleo da sincronização, separado de `sincronizar()` para permitir
   * testar todo o pipeline de parsing/diff/disparo de geocodificação
   * com um CSV fabricado em memória — sem depender de download real
   * nem do ZIP (o bloqueio de rede do INEP neste ambiente de
   * desenvolvimento nunca impede validar esta lógica).
   */
  async sincronizarDeCsv(ano: number, csvContent: string): Promise<InepSyncResumo> {
    const rows = parseCsvRows(csvContent, ";");
    const resumo: InepSyncResumo = {
      ano,
      totalLinhas: rows.length,
      novas: 0,
      atualizadas: 0,
      inalteradas: 0,
      ignoradas: 0,
      enfileiradasParaGeocodificacao: 0,
      erros: [],
    };

    const mapeadas: {
      codigoInep: string;
      data: ReturnType<typeof mapInepRowToSchoolData>["mapped"];
    }[] = [];
    for (const row of rows) {
      const resultado = mapInepRowToSchoolData(row);
      if (resultado.error) {
        resumo.erros.push({ mensagem: resultado.error });
        continue;
      }
      if (resultado.ignorada) {
        resumo.ignoradas += 1;
        continue;
      }
      if (resultado.mapped) {
        mapeadas.push({ codigoInep: resultado.mapped.codigoInep, data: resultado.mapped });
      }
    }

    const existentes = await this.schoolRepository.findManyByCodigosInep(
      mapeadas.map((item) => item.codigoInep),
    );
    const existentesPorCodigo = new Map(existentes.map((school) => [school.codigoInep, school]));

    const paraGeocodificar: string[] = [];

    for (const { codigoInep, data } of mapeadas) {
      if (!data) continue;
      const existente = existentesPorCodigo.get(codigoInep);

      if (!existente) {
        try {
          const sequence = await this.schoolRepository.nextCodigoInternoSequence();
          const criada = await this.schoolRepository.create({
            ...data.data,
            codigoInterno: `ESC-${String(sequence).padStart(6, "0")}`,
            // O Censo Escolar não expõe `tipos`/`turnosAtendidos` na
            // mesma granularidade do cadastro da Rotta (exigiria cruzar
            // com as tabelas de TP_ETAPA_ENSINO, fora do escopo desta
            // integração) — placeholder honesto, igual a qualquer outra
            // importação: `status: EM_ANALISE` já sinaliza que uma
            // Empresa/Gestor precisa revisar e completar antes da escola
            // virar candidata a vínculo real.
            tipos: ["OUTRO"],
            turnosAtendidos: ["PERSONALIZADO"],
            status: "EM_ANALISE",
            origemCadastro: "SYNC_INEP",
          });
          resumo.novas += 1;
          paraGeocodificar.push(criada.id);
        } catch (error) {
          resumo.erros.push({
            codigoInep,
            mensagem: error instanceof Error ? error.message : "Erro desconhecido ao criar escola.",
          });
        }
        continue;
      }

      if (this.enderecoMudou(existente, data.data)) {
        try {
          await this.schoolRepository.update(existente.id, data.data);
          resumo.atualizadas += 1;
          paraGeocodificar.push(existente.id);
        } catch (error) {
          resumo.erros.push({
            codigoInep,
            mensagem:
              error instanceof Error ? error.message : "Erro desconhecido ao atualizar escola.",
          });
        }
      } else {
        resumo.inalteradas += 1;
      }
    }

    await this.enfileirarGeocodificacao(paraGeocodificar, resumo);

    this.logger.log(
      `Sincronização INEP ${ano}: ${resumo.novas} novas, ${resumo.atualizadas} atualizadas, ${resumo.inalteradas} inalteradas, ${resumo.ignoradas} ignoradas, ${resumo.enfileiradasParaGeocodificacao} enfileiradas para geocodificação, ${resumo.erros.length} erros.`,
    );
    return resumo;
  }

  private enderecoMudou(
    existente: School,
    proposto: {
      cep: string;
      logradouro: string;
      numero: string;
      bairro: string;
      cidade: string;
      estado: string;
    },
  ): boolean {
    return (
      existente.cep !== proposto.cep ||
      existente.logradouro !== proposto.logradouro ||
      existente.numero !== proposto.numero ||
      existente.bairro !== proposto.bairro ||
      existente.cidade !== proposto.cidade ||
      existente.estado !== proposto.estado
    );
  }

  /**
   * Publica um job por escola via QStash (`GeoQueueController.schoolGeocode`)
   * em vez de chamar `GeoPipelineService.geocodeSchool` direto — a
   * entrega roda com `flowControl` limitado (isolado das demais
   * publicações pela `flowControlKey` de `SCHOOL_GEOCODE_QUEUE`),
   * independente desta sincronização (que pode terminar antes de toda
   * geocodificação ter sido concluída; acompanhar o resultado real é
   * responsabilidade dos logs do "worker", não deste resumo).
   *
   * `retries` aqui cobre falha de INFRAESTRUTURA (rede/DB durante o
   * processamento do job já entregue) — não confundir com as 3
   * tentativas do Validation AI Agent, que são sobre PRECISÃO da
   * geocodificação e resolvidas dentro do próprio job.
   */
  private async enfileirarGeocodificacao(
    schoolIds: string[],
    resumo: InepSyncResumo,
  ): Promise<void> {
    if (schoolIds.length === 0) return;

    await this.qstashPublisher.publishBatchJSON(
      schoolIds.map((schoolId) => ({
        route: `geo/${SCHOOL_GEOCODE_QUEUE}`,
        body: { schoolId },
        options: {
          retries: 3,
          flowControlKey: SCHOOL_GEOCODE_QUEUE,
          // Respeita a política de uso do Nominatim público (~1
          // requisição/segundo — ver divulgação honesta em
          // `GeoEngineService`); quem apontar `NOMINATIM_BASE_URL`
          // para uma instância self-hosted pode aumentar com segurança.
          flowControlParallelism: 1,
          flowControlRate: 1,
          flowControlPeriod: "1.1s",
        },
      })),
    );
    resumo.enfileiradasParaGeocodificacao = schoolIds.length;
  }
}
