import type { CreateSchoolData } from "@/modules/schools/repositories/school.repository";
import type { ImportRow } from "@/modules/schools/school-import.util";
import type { SchoolAdministrativeDependency } from "@prisma/client";

/**
 * Tradução de uma linha bruta do Censo Escolar (INEP) para o formato
 * `CreateSchoolData`/`UpdateSchoolData` da Rotta — usada só pelo
 * `InepSyncService` (nunca por `mapRowToCreateSchoolData`, que é para
 * importação manual com o header já no formato da Rotta).
 *
 * AVISO IMPORTANTE (honestidade de implementação, mesma disciplina do
 * `GeoEngineService`): os nomes de coluna e os códigos abaixo vêm do
 * Dicionário de Dados público do Censo Escolar (documentação geral,
 * estável entre edições recentes) — NÃO foi possível baixar o
 * `DICIONARIO_DADOS.xlsx` do ano-alvo a partir deste ambiente (bloqueio
 * de rede do sandbox para `download.inep.gov.br`). Antes da primeira
 * sincronização real em produção, confirme estes nomes contra o
 * dicionário do ano efetivamente baixado — se algum nome mudou, só
 * `INEP_COLUMNS`/as funções `mapTp*` abaixo precisam de ajuste, o resto
 * do pipeline (`InepSyncService`) não muda.
 */
export const INEP_COLUMNS = {
  codigoInep: "CO_ENTIDADE",
  nomeOficial: "NO_ENTIDADE",
  situacaoFuncionamento: "TP_SITUACAO_FUNCIONAMENTO",
  dependenciaAdministrativa: "TP_DEPENDENCIA",
  categoriaEscolaPrivada: "TP_CATEGORIA_ESCOLA_PRIVADA",
  cep: "CO_CEP",
  logradouro: "DS_ENDERECO",
  numero: "NU_ENDERECO",
  complemento: "DS_COMPLEMENTO",
  bairro: "NO_BAIRRO",
  cidade: "NO_MUNICIPIO",
  estado: "SG_UF",
  ddd: "NU_DDD",
  telefone: "NU_TELEFONE",
} as const;

/** `TP_SITUACAO_FUNCIONAMENTO` — só sincroniza escolas "Em atividade" (código 1). */
const SITUACAO_EM_ATIVIDADE = "1";

/** `TP_DEPENDENCIA` (1 Federal, 2 Estadual, 3 Municipal, 4 Privada). */
function mapDependencia(
  tpDependencia: string,
  tpCategoriaEscolaPrivada: string | undefined,
): SchoolAdministrativeDependency | null {
  switch (tpDependencia) {
    case "1":
      return "FEDERAL";
    case "2":
      return "ESTADUAL";
    case "3":
      return "MUNICIPAL";
    case "4":
      // `TP_CATEGORIA_ESCOLA_PRIVADA` refina o subtipo de rede privada (2 Comunitária, 4 Filantrópica); default PRIVADA.
      if (tpCategoriaEscolaPrivada === "2") return "COMUNITARIA";
      if (tpCategoriaEscolaPrivada === "4") return "FILANTROPICA";
      return "PRIVADA";
    default:
      return null;
  }
}

function formatCep(rawCep: string): string {
  const digitos = rawCep.replace(/\D/g, "");
  return digitos.length === 8 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : rawCep.trim();
}

export interface InepRowMapped {
  codigoInep: string;
  /**
   * Campos endereçáveis do Censo — deliberadamente SEM `tipos`/
   * `turnosAtendidos` (o Censo não expõe essa granularidade da mesma
   * forma que o cadastro da Rotta; ficam com o default de
   * `InepSyncService` para escolas novas e nunca são sobrescritos numa
   * atualização, já que não são campo "de origem INEP").
   */
  data: Pick<
    CreateSchoolData,
    | "codigoInep"
    | "nomeOficial"
    | "dependenciaAdministrativa"
    | "cep"
    | "logradouro"
    | "numero"
    | "complemento"
    | "bairro"
    | "cidade"
    | "estado"
    | "telefone"
  >;
}

export interface InepRowMapResult {
  mapped?: InepRowMapped;
  /** Linha ignorada (não é erro) — ex. escola fora de atividade, ou sem dependência administrativa reconhecida. */
  ignorada?: string;
  error?: string;
}

/** Converte uma linha bruta do CSV do Censo Escolar (`ImportRow`, já com `;` tokenizado por `parseCsvRows`) em dados de Escola da Rotta, ou explica por que a linha foi ignorada/rejeitada. */
export function mapInepRowToSchoolData(row: ImportRow): InepRowMapResult {
  const codigoInep = row[INEP_COLUMNS.codigoInep]?.trim();
  if (!codigoInep) {
    return { error: `Coluna obrigatória "${INEP_COLUMNS.codigoInep}" ausente ou vazia.` };
  }

  const situacao = row[INEP_COLUMNS.situacaoFuncionamento]?.trim();
  if (situacao && situacao !== SITUACAO_EM_ATIVIDADE) {
    return { ignorada: `Escola ${codigoInep} fora de atividade (situação "${situacao}").` };
  }

  const nomeOficial = row[INEP_COLUMNS.nomeOficial]?.trim();
  const logradouro = row[INEP_COLUMNS.logradouro]?.trim();
  const numero = row[INEP_COLUMNS.numero]?.trim();
  const bairro = row[INEP_COLUMNS.bairro]?.trim();
  const cidade = row[INEP_COLUMNS.cidade]?.trim();
  const estado = row[INEP_COLUMNS.estado]?.trim();
  const cep = row[INEP_COLUMNS.cep]?.trim();
  if (!nomeOficial || !logradouro || !numero || !bairro || !cidade || !estado || !cep) {
    return { error: `Escola ${codigoInep}: endereço incompleto no Censo Escolar.` };
  }

  const dependencia = mapDependencia(
    row[INEP_COLUMNS.dependenciaAdministrativa]?.trim() ?? "",
    row[INEP_COLUMNS.categoriaEscolaPrivada]?.trim(),
  );
  if (!dependencia) {
    return {
      error: `Escola ${codigoInep}: TP_DEPENDENCIA "${row[INEP_COLUMNS.dependenciaAdministrativa]}" não reconhecido.`,
    };
  }

  const ddd = row[INEP_COLUMNS.ddd]?.trim();
  const telefoneRaw = row[INEP_COLUMNS.telefone]?.trim();
  const telefone = telefoneRaw ? `${ddd ? `(${ddd}) ` : ""}${telefoneRaw}` : undefined;

  return {
    mapped: {
      codigoInep,
      data: {
        codigoInep,
        nomeOficial,
        dependenciaAdministrativa: dependencia,
        cep: formatCep(cep),
        logradouro,
        numero,
        complemento: row[INEP_COLUMNS.complemento]?.trim() || undefined,
        bairro,
        cidade,
        estado: estado.toUpperCase(),
        telefone,
      },
    },
  };
}
