/**
 * Decide se uma falha ao renovar a sessão merece virar registro de erro.
 *
 * ## Por que esta função existe separada
 *
 * Porque ela é a lição de 06/10/2026, e precisa estar travada por teste.
 *
 * Naquele dia o app "não abria": a renovação de sessão estourava no teto
 * de tempo (60s, contra um cold start de ~89s do plano gratuito do
 * Render), o `catch` jogava a pessoa para o login, e o login falhava
 * pelo mesmo motivo. O plantão de erro do CTO marcava **zero ocorrências
 * em uma semana inteira**, porque do ponto de vista do código não havia
 * erro: havia uma sessão que não deu para renovar, e isso era tratado
 * igual a um token expirado.
 *
 * O defeito só apareceu porque o fundador reclamou. A diferença entre os
 * dois casos é esta função, e é por isso que ela não ficou embutida
 * dentro de um `catch` onde ninguém a testaria.
 *
 * ## A regra
 *
 * - **401 e 403**: o refresh token expirou ou foi revogado. Caminho
 *   normal de quem ficou muito tempo fora. Silêncio.
 * - **Qualquer outra coisa**: tempo esgotado, rede caída, servidor fora
 *   do ar, resposta inválida. A pessoa perdeu a sessão sem ter feito
 *   nada errado, e o plantão precisa ver.
 *
 * Em dúvida, reporta. Um falso positivo no plantão custa um minuto de
 * leitura; um falso negativo custou um dia de app fora do ar.
 */
export function ehFalhaTecnica(erro: unknown): boolean {
  const status = (erro as { status?: unknown } | null | undefined)?.status;
  if (typeof status !== "number") return true;
  return status !== 401 && status !== 403;
}
