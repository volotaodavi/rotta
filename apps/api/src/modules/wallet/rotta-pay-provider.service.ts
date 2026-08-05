import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { LytexConfig } from "@/config/lytex.config";

export interface IniciarTransferenciaPixResult {
  sucesso: boolean;
  /** Id da transferência no provedor real — só presente quando `sucesso = true`. */
  referenciaExterna?: string;
  motivo?: string;
}

/**
 * Ponto de integração com a Lytex (lytex.com.br) — provedora de
 * pagamento parceira escolhida para a Rotta Pay (Dossiê 26, Seção 4).
 *
 * Estado atual (2026-08-05): `LYTEX_CLIENT_ID`/`LYTEX_CLIENT_SECRET`
 * JÁ FORAM configurados (par OAuth2 client credentials fornecido pelo
 * usuário) — mas o AMBIENTE DE DESENVOLVIMENTO não teve acesso de rede
 * a `docs.lytex.com.br` para confirmar o contrato real da API (URL
 * base, endpoint de autenticação, formato do split de pagamento).
 * Implementar chamadas a endpoints adivinhados seria pior do que
 * declarar honestamente que a chamada real ainda não está implementada
 * — mesma disciplina de `AuthentiqueService`/`RottaAiService`: "credenciais
 * presentes" e "integração implementada" são dois estados DIFERENTES,
 * nunca tratados como o mesmo.
 *
 * `WalletService.solicitarSaque` chama este método de forma
 * best-effort — a solicitação de saque NUNCA fica bloqueada esperando
 * por ele; a `WithdrawalRequest` fica `SOLICITADO` aguardando
 * processamento manual (Admin Rotta) até o dia em que
 * `iniciarTransferenciaPix` passar a chamar a Lytex de verdade.
 *
 * Próximo passo real: colar aqui a documentação da Lytex (autenticação
 * + endpoint de split/transferência) para implementar as chamadas de
 * verdade — ou liberar acesso de rede a `docs.lytex.com.br`/
 * `api.lytex.com.br` neste ambiente.
 */
@Injectable()
export class RottaPayProviderService {
  private readonly logger = new Logger(RottaPayProviderService.name);
  private readonly config: LytexConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<LytexConfig>("lytex")!;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async iniciarTransferenciaPix(
    _valorCentavos: number,
    _chavePix: string,
  ): Promise<IniciarTransferenciaPixResult> {
    if (!this.config.clientId || !this.config.clientSecret) {
      this.logger.warn(
        "Lytex não configurada (LYTEX_CLIENT_ID/LYTEX_CLIENT_SECRET ausentes) — saque registrado localmente e aguardando processamento manual.",
      );
      return {
        sucesso: false,
        motivo: "Provedora de pagamento parceira (Lytex) ainda não configurada neste ambiente.",
      };
    }

    this.logger.warn(
      "Lytex configurada (credenciais presentes), mas a chamada real de transferência PIX/split ainda não foi implementada — contrato da API pendente de verificação (docs.lytex.com.br). Saque registrado localmente e aguardando processamento manual.",
    );
    return {
      sucesso: false,
      motivo:
        "Integração com a Lytex tem credenciais configuradas, mas a chamada real ainda não foi implementada nesta base de código — pendente de confirmação do contrato da API (endpoints de autenticação e split de pagamento).",
    };
  }
}
