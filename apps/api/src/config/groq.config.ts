import { registerAs } from "@nestjs/config";

export interface GroqConfig {
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
}

const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
// Llama 3.3 70B — modelo gratuito do plano Groq (console.groq.com), formato
// de resposta compatível com a Chat Completions da OpenAI.
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

/**
 * Groq (Frente 5 — IA de suporte, decisão do usuário: "Groq (Llama,
 * grátis)"). `apiKey` opcional: sem ela, `GroqService` recusa a chamada
 * com um erro claro (mesmo padrão "stub honesto" de `FcmService`/
 * `DiditService`) — `SupportService.createTicket` já trata essa recusa
 * como best-effort, então um chamado continua funcionando normalmente,
 * só sem resposta automática.
 */
export default registerAs("groq", (): GroqConfig => ({
  apiKey: process.env.GROQ_API_KEY || undefined,
  baseUrl: process.env.GROQ_BASE_URL || DEFAULT_BASE_URL,
  model: process.env.GROQ_MODEL || DEFAULT_MODEL,
}));
