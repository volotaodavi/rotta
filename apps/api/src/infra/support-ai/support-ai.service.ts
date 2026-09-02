import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { SupportAiConfig } from "@/config/support-ai.config";

const TIMEOUT_MS = 15_000;

/**
 * Prompt fixo, restrito ao domínio (transporte escolar, uso da
 * plataforma) — nunca inventa política de cobrança/reembolso (isso é
 * decisão de negócio, não de IA) e é instruído a admitir quando não
 * sabe, em vez de alucinar uma resposta. `SupportService` só chama esta
 * IA pra `categoria === "DUVIDA"` (nunca `PROBLEMA_TECNICO`/`COBRANCA`/
 * `OUTRO`, que já vão direto pro humano) — reforçado aqui de novo, no
 * próprio prompt, como segunda camada de proteção.
 *
 * Regras de tom (pedido do usuário 02/09/2026: "quero dar algumas
 * regras para ela funcionar, para não ficar chato") — resposta curta
 * de verdade, sem empurrar pro humano à toa, sem cara de bot.
 */
const SYSTEM_PROMPT = `Você é a Rotta AI, assistente de suporte da Rotta — uma plataforma brasileira de gestão de transporte escolar (rotas, motoristas, monitores, alunos, responsáveis).

Responda SOMENTE dúvidas sobre como usar a plataforma Rotta (cadastros, rotas, alunos, veículos, documentos, notificações, etc.) e sobre transporte escolar em geral.

Regras rígidas:
- NUNCA invente política de cobrança, reembolso, cancelamento de plano ou qualquer decisão financeira/contratual — isso é sempre decidido por um humano da equipe Rotta.
- NUNCA prometa uma ação que você não pode executar (alterar dados, cancelar algo, aprovar algo).
- Se a pergunta for sobre um problema técnico específico (erro, bug, tela travada) ou sobre cobrança, diga em UMA frase que um humano da equipe Rotta vai continuar o atendimento — sem enrolar antes disso.
- Se você não souber a resposta com certeza, diga isso em uma frase direta, sem rodeio nem desculpa longa.

Regras de tom (o objetivo é parecer um atendente bom, não um robô):
- Seja curto. A maioria das respostas cabe em 1 a 3 frases. Só passe disso se a dúvida pedir de fato um passo a passo com mais de 2 etapas.
- Vá direto ao ponto: comece já respondendo, sem introdução tipo "Ótima pergunta!" ou "Claro, posso ajudar com isso!".
- NÃO sugira falar com um humano/equipe Rotta a não ser que a regra acima mande (bug específico, cobrança, ou você genuinamente não sabe). Numa dúvida simples que você já respondeu, não adicione "mas se precisar, fale com nosso suporte" no final — isso é ruído.
- Não repita a pergunta do usuário de volta antes de responder.
- Nada de emoji, nada de saudação ("Olá!", "Oi, tudo bem?") — vai direto na resposta, como quem já está no meio de uma conversa.
- Escreva em português do Brasil, natural e objetivo, como um atendente humano experiente escreveria num chat — não como um manual.`;

interface SupportAiChatChoice {
  message?: { content?: string };
}

interface SupportAiChatResponse {
  choices?: SupportAiChatChoice[];
}

/**
 * Cliente fino de IA de suporte — formato Chat Completions da OpenAI,
 * compatível com Gemini (padrão), Groq, OpenRouter e qualquer outro
 * provedor que fale o mesmo protocolo (ver `support-ai.config.ts`).
 * Trocado de Groq pra Gemini a pedido do usuário 02/09/2026 ("Groq não
 * está indo") — nada na assinatura pública mudou, `SupportService`
 * segue chamando `responderDuvida` normalmente.
 *
 * "Stub honesto": sem `SUPPORT_AI_API_KEY`, `responderDuvida` recusa com
 * um erro claro — `SupportService.createTicket` trata essa recusa como
 * best-effort (nunca bloqueia a criação do chamado, só não grava a
 * resposta automática).
 */
@Injectable()
export class SupportAiService {
  private readonly logger = new Logger(SupportAiService.name);
  private readonly config: SupportAiConfig;

  constructor(configService: ConfigService) {
    this.config = configService.get<SupportAiConfig>("supportAi")!;
  }

  /**
   * @throws ServiceUnavailableException Sem `SUPPORT_AI_API_KEY` configurada.
   */
  async responderDuvida(assunto: string, descricao: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new ServiceUnavailableException("SUPPORT_AI_API_KEY não configurada.");
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
        `Falha ao chamar a IA de suporte (rede/timeout): ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException("IA de suporte indisponível no momento.");
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      this.logger.warn(`IA de suporte respondeu HTTP ${response.status}.`);
      throw new ServiceUnavailableException("IA de suporte indisponível no momento.");
    }

    const data = (await response.json()) as SupportAiChatResponse;
    const conteudo = data.choices?.[0]?.message?.content?.trim();
    if (!conteudo) {
      throw new ServiceUnavailableException("IA de suporte respondeu sem conteúdo.");
    }
    return conteudo;
  }
}
