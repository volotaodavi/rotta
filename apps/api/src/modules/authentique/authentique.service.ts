import { Injectable, NotImplementedException } from "@nestjs/common";

import type { PrepararDocumentoAssinaturaDto } from "./dto/preparar-documento-assinatura.dto";

/**
 * Ponto de integração preparado para a Authentique (briefing "CONTRATO"
 * — "Preparar integração com Authentique para assinatura digital").
 * Nenhuma credencial/API da Authentique (authentique.com.br) foi
 * contratada ou configurada — implementar um "documento preparado" ou
 * uma URL de assinatura falsos aqui seria pior do que declarar
 * honestamente que a integração ainda não roda, exatamente a mesma
 * disciplina já adotada em `RottaAiService` (Dossiê 15): times a
 * jusante (`ContractsService`) não podem tratar uma preparação simulada
 * como se um documento real estivesse aguardando assinatura na
 * Authentique.
 *
 * `ContractsService.gerarContrato` chama este método de forma
 * best-effort logo após criar o `Contract` — a geração do contrato em
 * si NUNCA fica bloqueada esperando por ele; `Contract.authentiqueDocumentId`
 * permanece `null` até o dia em que este método passar a retornar um
 * ID real.
 */
@Injectable()
export class AuthentiqueService {
  // eslint-disable-next-line @typescript-eslint/require-await
  async prepararDocumentoParaAssinatura(_dto: PrepararDocumentoAssinaturaDto): Promise<never> {
    throw new NotImplementedException(
      "A integração com a Authentique ainda não está disponível — integração pendente de contratação da API (authentique.com.br).",
    );
  }
}
