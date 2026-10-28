/**
 * Quais áreas do produto estão abertas ao usuário final.
 *
 * ## O que isto substitui
 *
 * Dois arquivos cuja única função era substituir a tela real por um
 * "em breve" — `MarketplaceComingSoonScreen` e
 * `WalletComingSoonScreen` — ligados e desligados por commit. O
 * histórico está nos comentários deles: o Marketplace fechou em
 * 01/09/2026, reabriu em 11/09, e o Rotta Pay fechou em 02/09 para
 * funcionário e reabriu em 11/09 só para o dono autônomo. Cada uma
 * dessas viradas foi uma troca de `component` no navegador, com build
 * e publicação na loja atrás.
 *
 * As telas de "em breve" continuam existindo e continuam sendo o que a
 * pessoa vê. O que muda é quem decide: uma variável de ambiente, não o
 * código.
 *
 * ## Desligado é o padrão
 *
 * Variável ausente significa área fechada — o mesmo critério do painel
 * web (`apps/web/src/lib/funcionalidades.ts`), pelo mesmo motivo: um
 * build novo não pode abrir sozinho uma área meio pronta.
 *
 * ## `process.env.X` literal
 *
 * O Expo substitui `EXPO_PUBLIC_*` por texto no bundle, e a troca é
 * textual: `process.env[nome]` com nome em variável não vira nada.
 * Daí cada nome escrito por inteiro.
 */

/**
 * Só `"1"` e `"true"` ligam. Qualquer outra coisa — inclusive `""`,
 * `"0"` e `"false"` — é desligado.
 *
 * A lista é curta e explícita porque `Boolean(valor)` abriria a área
 * com `"0"` e com `"false"`, que é exatamente o que alguém escreve
 * querendo FECHAR.
 *
 * Exportada para ter teste próprio: o valor lido do ambiente é
 * substituído por texto em tempo de build, então um teste não consegue
 * variá-lo — mas consegue conferir a regra.
 */
export function ligada(valor: string | undefined): boolean {
  return valor === "1" || valor === "true";
}

export const FUNCIONALIDADES = {
  /** Marketplace: a família buscando, pedindo e contratando transporte. */
  marketplace: ligada(process.env.EXPO_PUBLIC_FEATURE_MARKETPLACE),
  /** Rotta Pay: carteira digital, saldo e repasses. */
  rottaPay: ligada(process.env.EXPO_PUBLIC_FEATURE_ROTTA_PAY),
} as const;
