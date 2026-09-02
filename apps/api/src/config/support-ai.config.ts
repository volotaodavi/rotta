import { registerAs } from "@nestjs/config";

export interface SupportAiConfig {
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
}

// Gemini expõe uma camada compatível com a Chat Completions da OpenAI
// (`/v1beta/openai/chat/completions`, `Authorization: Bearer <GEMINI_API_KEY>`)
// — chave gratuita em aistudio.google.com. Qualquer outro provedor com o
// mesmo formato (Groq, OpenRouter etc.) funciona só trocando as 3 env vars,
// sem tocar em código.
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const DEFAULT_MODEL = "gemini-2.0-flash";

/**
 * IA de suporte (Frente 5 — responde dúvidas simples/bugs relatados).
 * Trocada de Groq pra Gemini a pedido do usuário 02/09/2026 ("Groq não
 * está indo") — mesmo cliente HTTP genérico (formato OpenAI Chat
 * Completions), só o provedor padrão mudou. `apiKey` opcional: sem ela,
 * `SupportAiService` recusa a chamada com um erro claro (mesmo padrão
 * "stub honesto" de `FcmService`/`DiditService`) — `SupportService`
 * já trata essa recusa como best-effort.
 */
export default registerAs("supportAi", (): SupportAiConfig => ({
  apiKey: process.env.SUPPORT_AI_API_KEY || undefined,
  baseUrl: process.env.SUPPORT_AI_BASE_URL || DEFAULT_BASE_URL,
  model: process.env.SUPPORT_AI_MODEL || DEFAULT_MODEL,
}));
