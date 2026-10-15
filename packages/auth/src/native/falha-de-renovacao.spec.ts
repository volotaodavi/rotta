import { ehFalhaTecnica } from "./falha-de-renovacao";

/**
 * O teste que teria pego o "app não abre" de 06/10/2026.
 *
 * Naquele dia a renovação de sessão estourava no teto de tempo e a
 * pessoa era jogada para o login. O plantão de erro do CTO marcava zero
 * ocorrências em uma semana inteira, porque esse caminho era tratado
 * igual a um token expirado: silêncio nos dois casos. O defeito só
 * apareceu quando o fundador reclamou.
 */
describe("ehFalhaTecnica", () => {
  it("reporta tempo esgotado, que foi o caso que ficou invisível", () => {
    expect(ehFalhaTecnica({ status: 408, code: "TEMPO_ESGOTADO" })).toBe(true);
  });

  it("reporta servidor fora do ar", () => {
    expect(ehFalhaTecnica({ status: 502 })).toBe(true);
    expect(ehFalhaTecnica({ status: 503 })).toBe(true);
  });

  it("reporta falha de rede, que nem chega a ter status", () => {
    expect(ehFalhaTecnica(new TypeError("Network request failed"))).toBe(true);
  });

  it("NÃO reporta sessão expirada: é o caminho normal de quem ficou fora", () => {
    expect(ehFalhaTecnica({ status: 401 })).toBe(false);
  });

  it("NÃO reporta token revogado", () => {
    expect(ehFalhaTecnica({ status: 403 })).toBe(false);
  });

  it("em dúvida, reporta", () => {
    // Um falso positivo custa um minuto de leitura no plantão. Um falso
    // negativo custou um dia de app fora do ar.
    expect(ehFalhaTecnica(null)).toBe(true);
    expect(ehFalhaTecnica(undefined)).toBe(true);
    expect(ehFalhaTecnica("alguma coisa estranha")).toBe(true);
    expect(ehFalhaTecnica({ status: "401" })).toBe(true);
  });
});
