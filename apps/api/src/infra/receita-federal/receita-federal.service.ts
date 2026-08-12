import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";

const BASE_URL = "https://brasilapi.com.br/api/cnpj/v1";
const TIMEOUT_MS = 8_000;
const SITUACAO_ATIVA = "ATIVA";

/** Resposta normalizada da consulta de CNPJ — só os campos que `CompaniesService.create` precisa pra travar o cadastro. */
export interface ReceitaFederalCompanyData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacaoCadastral: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
}

/** Formato bruto documentado pela BrasilAPI (https://brasilapi.com.br/docs#tag/CNPJ). */
interface BrasilApiCnpjResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  descricao_situacao_cadastral: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
}

/**
 * Consulta pública de CNPJ na Receita Federal, via BrasilAPI
 * (brasilapi.com.br — serviço público brasileiro, gratuito, sem chave,
 * mesmo princípio de `useCepLookup`/ViaCEP no frontend, só que aqui do
 * lado do backend porque o resultado precisa ser AUTORITATIVO: o
 * usuário só pode editar `nomeFantasia` no cadastro — se a busca
 * rodasse só no navegador, dava pra burlar enviando outros valores
 * direto pra API. `CompaniesService.create` chama este serviço e
 * SOBRESCREVE o que veio do cliente com o que a Receita Federal
 * devolveu, pros campos de razão social/endereço.
 *
 * Sem API key (ao contrário de Didit/QStash/AbacatePay) — BrasilAPI é
 * público. Ainda assim nunca bloqueia o cadastro por indisponibilidade
 * de rede pura (timeout/erro 5xx): quem chama decide se aceita os
 * dados do cliente como fallback ou rejeita — ver
 * `CompaniesService.create` para a decisão de negócio.
 */
@Injectable()
export class ReceitaFederalService {
  private readonly logger = new Logger(ReceitaFederalService.name);

  /**
   * @throws NotFoundException CNPJ não encontrado na base da Receita Federal.
   * @throws BadRequestException Erro de rede/timeout/resposta inesperada — quem chama decide como reagir.
   */
  async lookupCnpj(cnpjDigits: string): Promise<ReceitaFederalCompanyData> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/${cnpjDigits}`, { signal: controller.signal });
    } catch (error) {
      this.logger.warn(
        `Falha ao consultar CNPJ ${cnpjDigits} na Receita Federal (BrasilAPI indisponível): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new BadRequestException(
        "Não foi possível consultar o CNPJ na Receita Federal agora. Tente novamente em instantes.",
      );
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 404) {
      throw new NotFoundException("CNPJ não encontrado na base da Receita Federal.");
    }
    if (!response.ok) {
      this.logger.warn(`BrasilAPI respondeu HTTP ${response.status} para o CNPJ ${cnpjDigits}.`);
      throw new BadRequestException(
        "Não foi possível consultar o CNPJ na Receita Federal agora. Tente novamente em instantes.",
      );
    }

    const data = (await response.json()) as BrasilApiCnpjResponse;
    return {
      cnpj: data.cnpj,
      razaoSocial: data.razao_social,
      nomeFantasia: data.nome_fantasia ?? data.razao_social,
      situacaoCadastral: data.descricao_situacao_cadastral,
      cep: data.cep ?? "",
      endereco: data.logradouro ?? "",
      numero: data.numero ?? "S/N",
      complemento: data.complemento || null,
      bairro: data.bairro ?? "",
      cidade: data.municipio ?? "",
      estado: data.uf ?? "",
    };
  }

  isAtiva(data: ReceitaFederalCompanyData): boolean {
    return data.situacaoCadastral.toUpperCase() === SITUACAO_ATIVA;
  }
}
