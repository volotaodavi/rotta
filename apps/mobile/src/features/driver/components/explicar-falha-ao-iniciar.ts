import { ApiError, STATUS_TEMPO_ESGOTADO } from "@rotta/api-client";

/**
 * O que dizer quando `POST /identity-verification/me/sessions` falha.
 *
 * Antes isto era uma frase só, fixa: "Não foi possível iniciar uma nova
 * verificação agora. Tente novamente em instantes." Ela joga fora a
 * mensagem que o servidor mandou e, pior, MENTE sobre o remédio — se a
 * integração da Didit está sem chave no ambiente, tentar de novo não
 * resolve nunca, e o transportador fica apertando o botão achando que é
 * instabilidade (relato real de 01/10/2026).
 *
 * Três casos, três conversas diferentes:
 *
 * - 503: a Rotta não terminou de configurar a integração. Não é a
 *   conta da pessoa nem a internet dela, e insistir não adianta — então
 *   a frase não manda tentar de novo, manda falar com o suporte.
 * - 408: tempo esgotado (`STATUS_TEMPO_ESGOTADO` do cliente HTTP) —
 *   esse SIM costuma passar sozinho, e aqui "tente de novo" é verdade.
 * - Qualquer outro `ApiError`: mostra a mensagem do próprio servidor,
 *   que é escrita para ser lida por quem usa (padrão já seguido em
 *   `carteira-screen.tsx`, `convite-preview-screen.tsx` e outras).
 */
export function explicarFalhaAoIniciar(causa: unknown): string {
  if (!(causa instanceof ApiError)) {
    return "Não foi possível iniciar a verificação agora. Verifique sua conexão e tente de novo.";
  }
  if (causa.status === 503) {
    return (
      "A verificação de identidade está indisponível no momento — é uma configuração nossa, " +
      "não um problema da sua conta. Fale com o suporte da Rotta."
    );
  }
  if (causa.status === STATUS_TEMPO_ESGOTADO) {
    return "O servidor demorou para responder. Tente de novo em instantes.";
  }
  return causa.message;
}
