import type { ColorTokens } from "@rotta/theme";

/**
 * As cores do app nativo, amostradas do conceito visual do fundador.
 *
 * ## Por que existe um arquivo só para isto
 *
 * Em 16/10/2026 o fundador olhou o app depois do redesenho e disse que
 * ele estava "com cara de IA", e que era para ficar idêntico ao print
 * que ele tinha mandado. Ele estava certo, e a causa era boba: os dois
 * prints saíram do contexto da conversa numa compactação, e o trabalho
 * seguiu pela lembrança do que eles mostravam. Lembrança não tem
 * hexadecimal.
 *
 * Os valores abaixo não foram escolhidos por gosto. Eles vieram de
 * amostragem pixel a pixel das duas imagens, com Pillow, contando a cor
 * mais frequente de cada região:
 *
 * - botão primário do conceito: `#1284FF`
 * - ícone de ação: `#0A63FD`
 * - pill ativa: `#0570FC`
 *
 * As três cercam `#1769FF`, que é o azul que o próprio fundador já
 * tinha dado como IDENTIDADE em 31/08/2026 (`driverPrimary`). Ou seja:
 * o conceito não trouxe um azul novo, trouxe o azul da marca aplicado
 * ao app inteiro. É esse que fica aqui.
 *
 * ## Por que aqui e não em `packages/theme`
 *
 * Porque `lightColors` é compartilhado com `apps/web` e `apps/admin`.
 * Trocar a tinta do texto para azul-marinho lá dentro mudaria o site e
 * o painel sem ninguém ter pedido, e sem eu conseguir olhar o
 * resultado. O app nativo é o que tem conceito aprovado, então a
 * sobreposição mora no app nativo.
 *
 * ## O que mudou de verdade, e por quê
 *
 * **A tinta deixou de ser preta.** Era `#0B0F14`, quase preto neutro.
 * No conceito, todo texto é azul-marinho. É a diferença entre uma tela
 * que parece um template e uma tela que parece da Rotta.
 *
 * **O cinza de apoio esfriou.** `#8794A5` foi amostrado direto do
 * subtítulo "Escola Municipal" do conceito.
 *
 * **A borda quase sumiu.** O conceito separa cartão do fundo com uma
 * linha muito clara e uma sombra macia, não com o cinza de contorno
 * forte que o app usava.
 *
 * **Os tons de estado ficaram mais leves e mais frios**, do jeito que
 * os quatro cartões de resumo de faturas mostram (verde menta, creme,
 * rosa, cinza-azulado).
 */
export const PALETA_DO_CONCEITO: Partial<ColorTokens> = {
  /* Azul da marca. Mesmo valor exato do spec IDENTIDADE do fundador. */
  primary: "#1769FF",
  primaryHover: "#0954DC",
  /* Fundo dos chips de ação e do avatar do cabeçalho. */
  primaryMuted: "#EDF4FF",

  /* O topo azul profundo das telas de conta, e a faixa de saldo. */
  brandDeep: "#0A3B85",
  brandBand: "#1180FE",
  onBrandMuted: "#A9C6F5",

  /* Tinta azul-marinho, não preto. */
  text: "#0F2748",
  textMuted: "#8794A5",
  placeholder: "#A3AEBE",

  /* Branco no fundo e no cartão; a separação vem de linha e sombra. */
  background: "#FFFFFF",
  surface: "#F2F4F8",
  surfaceElevated: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E6ECF5",
  borderStrong: "#D3DCE9",
  hairline: "#F0F3F8",
  muted: "#F2F4F8",

  /* Estados, nos tons exatos dos cartões de resumo do conceito. */
  success: "#0FA36B",
  successMuted: "#E8F9F1",
  warning: "#D98C0E",
  warningMuted: "#FFF4E4",
  danger: "#E5484D",
  dangerMuted: "#FFE6E6",
  info: "#1769FF",
  infoMuted: "#EDF4FF",

  disabled: { background: "#F2F4F8", text: "#A3AEBE" },
};
