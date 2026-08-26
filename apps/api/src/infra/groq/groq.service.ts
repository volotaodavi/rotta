import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { GroqConfig } from "@/config/groq.config";

const TIMEOUT_MS = 15_000;

/**
 * Prompt fixo, restrito ao domínio (transporte escolar, uso da
 * plataforma) — nunca inventa política de cobrança/reembolso (isso é
 * decisão de negócio, não de IA) e é instruído a admitir quando não
 * sabe, em vez de alucinar uma resposta. `SupportService` só chama esta
 * IA pra `categoria === "DUVIDA"` (nunca `PROBLEMA_TECNICO`/`COBRANCA`/
 * `OUTRO`, que já vão direto pro humano) — reforçado aqui de novo, no
 * próprio prompt, como segunda camada de proteção.
 */
const SYSTEM_PROMPT = `Você é a Rotta AI, assistente de suporte da Rotta — uma plataforma brasileira de gestão de transporte escolar (rotas, motoristas, monitores, alunos, responsáveis).

Responda SOMENTE dúvidas sobre como usar a plataforma Rotta (cadastros, rotas, alunos, veículos, documentos, notificações, etc.) e sobre transporte escolar em geral.

Regras rígidas:
- NUNCA invente política de cobrança, reembolso, cancelamento de plano ou qualquer decisão financeira/contratual — isso é sempre decidido por um humano da equipe Rotta.
- NUNCA prometa uma ação que você não pode executar (alterar dados, cancelar algo, aprovar algo).
- Se a pergunta for sobre um problema técnico específico (erro, bug, tela travada) ou sobre cobrança, diga que um humano da equipe Rotta vai continuar o atendimento.
- Se você não souber a resposta com certeza, diga isso claramente em vez de inventar.
- Responda em português do Brasil, de forma direta e curta (poucos parágrafos).`;

interface GroqChatChoice {
  message?: { content?: string };
}

interface GroqChatResponse {
  choices?: GroqChatChoice[];
}

/**
 * Cliente fino da Groq (console.groq.com — camada gratuita real, Llama
 * 3.3 70B), decisão do usuário pra Frente 5 (IA de suporte). Formato de
 * chamada compatível com a Chat Completions da OpenAI.
 *
 * "Stub honesto": sem `GROQ_API_KEY`, `responderDuvida` recusa com um
 * erro claro — `SupportService.createTicket` trata essa recusa como
 * best-effort (nunca bloqueia a criação do chamado, só não grava a
 * resposta automática).
 */
@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private readonly config: GroqConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<GroqConfig>("groq")!;
  }

  /**
   * @throws ServiceUnavailableException Sem `GROQ_API_KEY` configurada.
   */
  async responderDuvida(assunto: string, descricao: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new ServiceUnavailableException("GROQ_API_KEY não configurada.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0.2,
          max_tokens: 500,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Assunto: ${assunto}\n\nDúvida: ${descricao}` },
          ],
        }),
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao chamar a Groq (rede/timeout): ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException("Groq indisponível no momento.");
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      this.logger.warn(`Groq respondeu HTTP ${response.status}.`);
      throw new ServiceUnavailableException("Groq indisponível no momento.");
    }

    const data = (await response.json()) as GroqChatResponse;
    const conteudo = data.choices?.[0]?.message?.content?.trim();
    if (!conteudo) {
      throw new ServiceUnavailableException("Groq respondeu sem conteúdo.");
    }
    return conteudo;
  }
}
