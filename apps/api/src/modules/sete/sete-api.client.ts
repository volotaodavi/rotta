import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

/**
 * Cliente da API do SETE — preparado, e DESLIGADO por padrão.
 *
 * ## Por que existe sem estar ligado
 *
 * Porque o envio direto depende de duas coisas que não estão nas mãos
 * da Rotta: a credencial, que só a prefeitura emite, e a confirmação
 * dos endpoints com o CECATE/UFG — o código público do SETE é de
 * **01/03/2023**, e endpoint de três anos atrás não se assume vivo.
 *
 * Deixar o cliente pronto e desligado custa pouco e troca semanas por
 * uma variável de ambiente no dia em que a prefeitura disser sim.
 *
 * ## Nenhuma credencial é armazenada aqui
 *
 * O token chega por parâmetro e vive na memória da requisição.
 * Guardar credencial de órgão público pede cofre, rotação e trilha
 * própria — é escopo inteiro, e está em "Melhorias futuras" do
 * `docs/52-integracao-sete.md` (RN-SETE-14).
 */
@Injectable()
export class SeteApiClient {
  private readonly logger = new Logger(SeteApiClient.name);

  private get ligado(): boolean {
    return process.env.SETE_SYNC_ENABLED === "true";
  }

  private get baseUrl(): string | undefined {
    return process.env.SETE_API_URL;
  }

  /**
   * Recusa cedo, e dizendo o nome da variável.
   *
   * "Erro inesperado" aqui mandaria alguém procurar defeito onde há uma
   * configuração ausente de propósito.
   */
  private exigirHabilitado(): string {
    if (!this.ligado) {
      throw new ServiceUnavailableException(
        "O envio direto ao SETE está desligado. Ligue SETE_SYNC_ENABLED=true quando os " +
          "endpoints estiverem confirmados com o CECATE/UFG.",
      );
    }
    if (!this.baseUrl) {
      throw new ServiceUnavailableException(
        "SETE_API_URL não está configurada: o cliente do SETE não adivinha o endereço.",
      );
    }
    return this.baseUrl.replace(/\/+$/, "");
  }

  /** `POST /authenticator/sete` — devolve o token de acesso. */
  async autenticar(email: string, senha: string): Promise<string> {
    const base = this.exigirHabilitado();

    const resposta = await fetch(`${base}/authenticator/sete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    if (!resposta.ok) {
      throw new ServiceUnavailableException(
        `O SETE recusou a autenticação (HTTP ${resposta.status}).`,
      );
    }

    const corpo = (await resposta.json()) as { access_token?: string; token?: string };
    const token = corpo.access_token ?? corpo.token;
    if (!token) {
      throw new ServiceUnavailableException(
        "O SETE respondeu sem token. O formato da resposta mudou desde 2023.",
      );
    }
    return token;
  }

  /**
   * Envia uma coleção a um recurso do SETE.
   *
   * `401` e `422` ganham mensagem própria porque são os dois que têm
   * conserto do lado de cá: token expirado e validação. Qualquer outro
   * é problema do SETE, e dizer isso é mais útil que inventar causa.
   */
  async enviar(
    recurso: "rotas" | "veiculos" | "motoristas" | "monitores" | "alunos",
    codigoCidade: string,
    token: string,
    itens: unknown[],
  ): Promise<{ enviados: number }> {
    const base = this.exigirHabilitado();

    const resposta = await fetch(`${base}/${recurso}/${codigoCidade}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token },
      body: JSON.stringify(itens),
    });

    if (resposta.status === 401) {
      throw new ServiceUnavailableException(
        "O token do SETE expirou. Autentique de novo antes de reenviar.",
      );
    }

    if (resposta.status === 422) {
      const detalhe = (await resposta.json().catch(() => null)) as {
        messages?: string[];
      } | null;
      throw new ServiceUnavailableException(
        `O SETE recusou os dados de ${recurso}: ${(detalhe?.messages ?? ["sem detalhe"]).join("; ")}`,
      );
    }

    if (!resposta.ok) {
      this.logger.warn(`SETE respondeu HTTP ${resposta.status} em /${recurso}/${codigoCidade}`);
      throw new ServiceUnavailableException(
        `O SETE respondeu HTTP ${resposta.status} ao receber ${recurso}.`,
      );
    }

    return { enviados: itens.length };
  }
}
