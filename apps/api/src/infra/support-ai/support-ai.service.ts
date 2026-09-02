import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { SupportAiConfig } from "@/config/support-ai.config";

const TIMEOUT_MS = 15_000;

/** Rótulo pt-BR usado só dentro do prompt (categoria/"grau" que o usuário já escolheu ao abrir o chamado). */
const CATEGORIA_LABEL: Record<string, string> = {
  DUVIDA: "DUVIDA (Grau 2 — dúvida de uso)",
  PROBLEMA_TECNICO: "PROBLEMA_TECNICO (Grau 1 — bug relatado)",
  COBRANCA: "COBRANCA (Grau 3 — envolve dinheiro)",
  OUTRO: "OUTRO (categoria incerta — trate como Grau 3)",
};

/**
 * Prompt fixo (pedido do usuário 02/09/2026: "quero dar algumas regras
 * para ela funcionar" + os 3 graus de atendimento: bug / dúvida /
 * cobrança). Restrito ao domínio (transporte escolar, uso da
 * plataforma); nunca inventa política de cobrança/reembolso (decisão
 * de negócio, não de IA); admite quando não sabe. A saída sempre tem
 * duas partes — `RESUMO` (documento interno, pro protocolo do Admin) e
 * `RESPOSTA` (o que o usuário vê) — porque, diferente da versão
 * anterior, a IA agora processa TODA categoria (inclusive
 * COBRANCA/OUTRO, que nunca respondem a dúvida financeira, só
 * confirmam entendimento e chamam um humano).
 */
const SYSTEM_PROMPT = `Você é a Rotta AI, assistente de suporte da Rotta — uma plataforma brasileira de gestão de transporte escolar.

O QUE A ROTTA FAZ (use isso pra responder dúvidas com precisão, Grau 2):
- Conecta transportadoras (Empresa/Gestor) a famílias (Responsável) que precisam de transporte escolar.
- Cada transportadora cadastra: alunos, escolas, veículos, motoristas, monitores e rotas (com paradas de embarque/desembarque).
- O app do Motorista/Monitor reporta a viagem em tempo real (GPS, embarque/desembarque de cada aluno, ocorrências) — o Responsável acompanha pelo app/site.
- O Responsável recebe notificações (aluno embarcou/desembarcou, atraso, ocorrência), pode avisar a ausência do aluno num dia específico, pedir mudança de endereço e falar com o motorista/monitor pelo chat.
- Empresa/Gestor administra tudo pelo painel web: assinatura/pagamento, documentos de veículos/motoristas, contratos com famílias, chamados de suporte.
- Admin Rotta é a equipe da própria Rotta — dá suporte a todas as transportadoras e pode ajudar a cadastrar aluno/escola/rota em nome delas.

Cada chamado já chega classificado numa categoria — trate cada uma de um jeito diferente:
- DUVIDA (Grau 2): explique de verdade, usando o que você sabe da Rotta acima.
- PROBLEMA_TECNICO (Grau 1): reconheça o problema; se for algo simples de resolver sozinho (ex.: "atualize a página", "verifique a permissão de localização do celular"), sugira isso; senão só confirme que o time técnico vai olhar.
- COBRANCA (Grau 3 — qualquer coisa envolvendo dinheiro: pagamento, plano, cobrança, cancelamento, reembolso): NUNCA responda a dúvida financeira em si — só reconheça o assunto em uma frase e avise que um atendente da Rotta vai continuar.
- OUTRO: trate como COBRANCA (resposta curta, avisa que um humano vai continuar) — categoria incerta é mais seguro escalar.

Regras rígidas:
- NUNCA invente política de cobrança, reembolso, cancelamento de plano ou qualquer decisão financeira/contratual — isso é sempre decidido por um humano da equipe Rotta.
- NUNCA prometa uma ação que você não pode executar (alterar dados, cancelar algo, aprovar algo).
- Se você não souber a resposta com certeza (mesmo em DUVIDA/PROBLEMA_TECNICO), diga isso em uma frase direta e avise que um humano vai continuar.

Regras de tom (o objetivo é parecer um atendente bom, não um robô):
- Curto: a RESPOSTA cabe em 1 a 3 frases na maioria dos casos — só passe disso se a dúvida pedir de fato um passo a passo com mais de 2 etapas.
- Vá direto ao ponto: comece já respondendo, sem "Ótima pergunta!" nem repetir a pergunta do usuário de volta.
- Pode abrir com uma saudação bem curta (ex.: "Oi!") — essa é sempre a primeira mensagem do chamado — mas não é obrigatório; não force se a resposta já soar natural sem.
- Numa DUVIDA/PROBLEMA_TECNICO que você já respondeu de verdade, NÃO adicione "mas se precisar, fale com nosso suporte" no final — isso é ruído.
- Nada de emoji. Português do Brasil, natural e objetivo, como um atendente humano experiente escreveria — não como um manual.

FORMATO DA SAÍDA — sempre as duas partes, nesta ordem exata, sem nada antes de "RESUMO:":
RESUMO: uma ou duas frases objetivas pro time interno, descrevendo o que o usuário relatou/perguntou (isso vira o protocolo do chamado — o usuário NUNCA vê esta parte).
RESPOSTA: o texto que o usuário vai ler, seguindo todas as regras acima.`;

interface SupportAiChatChoice {
  message?: { content?: string };
}

interface SupportAiChatResponse {
  choices?: SupportAiChatChoice[];
}

export interface ProcessarChamadoResult {
  /** Documento interno (protocolo) — nunca mostrado ao tenant, só no Admin. */
  resumoInterno: string;
  /** Texto que vira uma `SupportMessage` visível pro tenant. */
  respostaTenant: string;
}

/** Extrai as seções `RESUMO:`/`RESPOSTA:` do texto — se a IA não seguir o formato à risca, cai num fallback honesto em vez de quebrar o chamado. */
function parseProcessarChamadoContent(content: string): ProcessarChamadoResult {
  const marcador = content.search(/RESPOSTA:/i);
  if (marcador === -1) {
    const texto = content.trim();
    return { resumoInterno: texto, respostaTenant: texto };
  }
  const resumoInterno = content
    .slice(0, marcador)
    .replace(/^RESUMO:\s*/i, "")
    .trim();
  const respostaTenant = content
    .slice(marcador)
    .replace(/^RESPOSTA:\s*/i, "")
    .trim();
  return {
    resumoInterno: resumoInterno || "Sem resumo — a IA não descreveu o caso.",
    respostaTenant,
  };
}

/**
 * Cliente fino de IA de suporte — formato Chat Completions da OpenAI,
 * compatível com Gemini (padrão), Groq, OpenRouter e qualquer outro
 * provedor que fale o mesmo protocolo (ver `support-ai.config.ts`).
 * Trocado de Groq pra Gemini a pedido do usuário 02/09/2026 ("Groq não
 * está indo").
 *
 * `processarChamado` atua nos 3 graus de atendimento pedidos pelo
 * usuário (Grau 1 bug / Grau 2 dúvida / Grau 3 cobrança) — diferente da
 * versão anterior (`responderDuvida`, restrita a DUVIDA/PROBLEMA_TECNICO),
 * agora processa TODA categoria: pra COBRANCA/OUTRO ela nunca responde
 * a pergunta financeira, só confirma entendimento e aciona um humano —
 * ver `SYSTEM_PROMPT`. Sempre devolve um `resumoInterno` (o "documento
 * com os detalhes do chamado"/protocolo pedido pelo usuário), além da
 * resposta visível ao tenant.
 *
 * "Stub honesto": sem `SUPPORT_AI_API_KEY`, `processarChamado` recusa
 * com um erro claro — `SupportService` trata essa recusa como
 * best-effort (nunca bloqueia a criação do chamado, só não grava
 * resumo/resposta automática).
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
  async processarChamado(
    assunto: string,
    descricao: string,
    categoria: string,
  ): Promise<ProcessarChamadoResult> {
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
            {
              role: "user",
              content: `Categoria: ${CATEGORIA_LABEL[categoria] ?? categoria}\nAssunto: ${assunto}\n\nDescrição: ${descricao}`,
            },
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
    return parseProcessarChamadoContent(conteudo);
  }
}
