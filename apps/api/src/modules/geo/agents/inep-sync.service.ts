import { BadGatewayException, Inject, Injectable, Logger } from "@nestjs/common";
import AdmZip from "adm-zip";

import { SCHOOL_GEOCODE_QUEUE } from "../geo.constants";
import { mapInepRowToSchoolData } from "../inep/inep-row.mapper";

import type { SchoolRepository } from "@/modules/schools/repositories/school.repository";
import type { School } from "@prisma/client";

import { RedisService } from "@/infra/cache/redis.service";
import { QstashPublisherService } from "@/infra/queue/qstash/qstash-publisher.service";
import { parseCsvRows } from "@/modules/schools/school-import.util";
import { SCHOOL_REPOSITORY } from "@/modules/schools/schools.constants";

const CENSO_ZIP_URL = (ano: number): string =>
  `https://download.inep.gov.br/dados_abertos/microdados_censo_escolar_${ano}.zip`;

/**
 * O CDN do INEP (gov.br) já foi observado rejeitando requisições sem
 * `User-Agent`/`Accept` "de navegador" com um reset de conexão — que o
 * `fetch` nativo do Node relata como falha de rede genérica, sem status
 * HTTP algum, mascarando a causa real. Mesma disciplina de identificação
 * já usada para o Nominatim (`geo.config.ts`, `nominatimUserAgent`).
 */
const INEP_DOWNLOAD_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (compatible; RottaGeoPlatform/1.0; +https://rotta.com.br) EducationSyncAgent",
  Accept: "application/zip, application/octet-stream, */*",
};

/** ~200 mil escolas em ZIP costuma passar de 300MB — download real, sem timeout padrão do runtime cortando cedo demais nem ficando pendurado pra sempre. */
const CENSO_DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Achado real (pedido do usuário: "verifique TODAS as escolas antes de
 * lançar essa atualização de vez, pois tem escola faltando, ex.: EM
 * Antonio Lopes (Maricá, RJ)"): investigação nos logs de produção
 * (Render) mostrou que TODA execução do Education Sync Agent desde que
 * o QStash foi configurado falhou com "TypeError: fetch failed" ao
 * baixar `microdados_censo_escolar_2025.zip` — a sincronização
 * nacional nunca completou nem uma vez. Duas causas reais, não
 * excludentes: (1) o CDN do INEP nem sempre publica o Censo do ano
 * corrente ainda (`ano = anoAtual - 1`, calculado em
 * `InepSyncSchedulerService`) — testado agora, `.../2025.zip` devolve
 * 404, enquanto `.../2024.zip`/`2023.zip` respondem 200 normalmente;
 * (2) falhas de rede transitórias ao alcançar um servidor gov.br a
 * partir da região do Render são plausíveis e nunca tinham nenhum
 * retry. `DOWNLOAD_RETRY_ATTEMPTS`/`DOWNLOAD_RETRY_DELAY_MS` cobrem a
 * causa (2); `sincronizarComFallbackDeAno` cobre a causa (1) — só para
 * a execução AUTOMÁTICA (scheduler), nunca para um `POST
 * /geo/inep-sync?ano=X` manual, que é uma escolha explícita do
 * operador e nunca deve ser silenciosamente trocada por outro ano.
 */
export const DOWNLOAD_RETRY_ATTEMPTS = 3;
export const DOWNLOAD_RETRY_DELAY_MS = 5000;
/** Quantos anos anteriores tentar, em sequência, quando o ano preferido falhar (só na sincronização automática). */
export const FALLBACK_ANOS_ANTERIORES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
 * Última execução (sucesso ou falha) — persistida no Redis, sem TTL
 * (mesmo padrão de `WEBHOOK_SECRET_KEY` da Didit: estado durável, só
 * some se alguém apagar). Fecha o gap admitido no comentário antigo do
 * `GeoController.sincronizarInep` ("o resultado... fica só nos logs do
 * worker — não há hoje uma tela de acompanhamento") — `GET
 * /geo/inep-sync/status` lê exatamente isto.
 */
export interface InepSyncStatus {
  ano: number;
  executadoEm: string;
  sucesso: boolean;
  resumo?: InepSyncResumo;
  erro?: string;
}

const STATUS_KEY = "geo:inep-sync:status";

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
    private readonly redis: RedisService,
  ) {}

  /**
   * `DOWNLOAD_RETRY_ATTEMPTS` tentativas só cobrem a falha de REDE (o
   * `catch` — ECONNRESET, DNS, timeout, TLS...), nunca um HTTP não-ok:
   * um 404 (ano ainda não publicado) ou 5xx do INEP é determinístico —
   * tentar de novo a mesma URL não muda o resultado, só atrasa o erro
   * real chegar a quem decide (aqui, `sincronizarComFallbackDeAno`, ou
   * o operador no disparo manual).
   */
  private async downloadCensoZip(ano: number): Promise<Buffer> {
    const url = CENSO_ZIP_URL(ano);
    let ultimoErroDeRede: unknown;

    for (let tentativa = 1; tentativa <= DOWNLOAD_RETRY_ATTEMPTS; tentativa += 1) {
      let response: Response;
      try {
        response = await fetch(url, {
          headers: INEP_DOWNLOAD_HEADERS,
          signal: AbortSignal.timeout(CENSO_DOWNLOAD_TIMEOUT_MS),
        });
      } catch (error) {
        ultimoErroDeRede = error;
        const causa = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        this.logger.warn(
          `Education Sync Agent: download do Censo Escolar ${ano} falhou (${url}) na tentativa ${tentativa}/${DOWNLOAD_RETRY_ATTEMPTS}. Causa: ${causa}`,
        );
        if (tentativa < DOWNLOAD_RETRY_ATTEMPTS) {
          await sleep(DOWNLOAD_RETRY_DELAY_MS);
        }
        continue;
      }

      if (!response.ok) {
        throw new BadGatewayException(
          `Education Sync Agent: INEP retornou ${response.status} ao baixar o Censo Escolar ${ano}.`,
        );
      }
      return Buffer.from(await response.arrayBuffer());
    }

    // Esgotou as tentativas — só chega aqui se todas falharam por rede
    // (um HTTP não-ok já retornou/lançou acima, sem consumir tentativas
    // adicionais).
    const causa =
      ultimoErroDeRede instanceof Error
        ? `${ultimoErroDeRede.name}: ${ultimoErroDeRede.message}`
        : String(ultimoErroDeRede);
    this.logger.error(
      `Education Sync Agent: download do Censo Escolar ${ano} falhou (${url}) após ${DOWNLOAD_RETRY_ATTEMPTS} tentativas. Causa: ${causa}`,
    );
    throw new BadGatewayException(
      `Education Sync Agent: falha de rede ao baixar o Censo Escolar ${ano} (${url}) após ${DOWNLOAD_RETRY_ATTEMPTS} tentativas. Causa: ${causa}`,
      { cause: ultimoErroDeRede instanceof Error ? ultimoErroDeRede : undefined },
    );
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

  /**
   * Sincronização real, a partir do download oficial do INEP para o ano
   * informado. Registra o resultado (sucesso ou falha) em
   * `getStatus()` antes de retornar/relançar — nunca engole o erro
   * (ainda propaga pro QStash tentar de novo), só grava um retrato do
   * que aconteceu pra alguém sem acesso aos logs do servidor conseguir
   * ver.
   */
  async sincronizar(ano: number): Promise<InepSyncResumo> {
    try {
      const zipBuffer = await this.downloadCensoZip(ano);
      const csv = this.extractSchoolsCsv(zipBuffer);
      const resumo = await this.sincronizarDeCsv(ano, csv);
      await this.registrarStatus({
        ano,
        executadoEm: new Date().toISOString(),
        sucesso: true,
        resumo,
      });
      return resumo;
    } catch (error) {
      await this.registrarStatus({
        ano,
        executadoEm: new Date().toISOString(),
        sucesso: false,
        erro: error instanceof Error ? error.message : "Erro desconhecido.",
      });
      throw error;
    }
  }

  /**
   * Só usado pela sincronização AUTOMÁTICA (`InepSyncSchedulerService`,
   * via QStash). O disparo manual (`POST /geo/inep-sync?ano=X`) chama
   * `sincronizar(ano)` direto — é uma escolha explícita do operador e
   * nunca deve ser silenciosamente trocada por outro ano.
   *
   * Tenta `anoPreferido`, depois `anoPreferido - 1`, `anoPreferido - 2`
   * (`FALLBACK_ANOS_ANTERIORES`), na ordem, parando no primeiro que
   * sincronizar com sucesso — cobre o INEP ainda não ter publicado o
   * Censo do ano corrente quando o agendamento roda (achado real:
   * `.../2025.zip` → 404, `.../2024.zip`/`2023.zip` → 200). Cada
   * tentativa já passa pelo retry de rede de `downloadCensoZip`; isto
   * aqui só lida com "ano não existe ainda", não com falha transitória.
   * Se todos os anos falharem, relança o erro do ÚLTIMO ano tentado
   * (o mais informativo — o mais próximo do ano preferido).
   */
  async sincronizarComFallbackDeAno(anoPreferido: number): Promise<InepSyncResumo> {
    let ultimoErro: unknown;
    for (let offset = 0; offset <= FALLBACK_ANOS_ANTERIORES; offset += 1) {
      const ano = anoPreferido - offset;
      try {
        return await this.sincronizar(ano);
      } catch (error) {
        ultimoErro = error;
        this.logger.warn(
          `Education Sync Agent: sincronização automática do Censo Escolar ${ano} falhou${
            offset < FALLBACK_ANOS_ANTERIORES ? `, tentando o ano anterior (${ano - 1})` : ""
          }. Causa: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    throw ultimoErro;
  }

  /** Nunca lança — uma falha ao registrar o status (Redis indisponível) não pode mascarar o resultado real da sincronização. */
  private async registrarStatus(status: InepSyncStatus): Promise<void> {
    try {
      await this.redis.set(STATUS_KEY, status);
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar status da sincronização INEP no Redis: ${error instanceof Error ? error.message : "erro desconhecido"}`,
      );
    }
  }

  /** Última execução registrada (sucesso ou falha) — `null` se a sincronização nunca rodou neste ambiente. */
  async getStatus(): Promise<InepSyncStatus | null> {
    return this.redis.get<InepSyncStatus>(STATUS_KEY);
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
