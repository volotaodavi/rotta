/**
 * Quais áreas do produto estão abertas ao usuário final.
 *
 * ## Por que isto existe
 *
 * A Rotta tem telas inteiras prontas de áreas que o produto ainda não
 * sustenta: o Marketplace (a família procurando e contratando
 * transportadora) e o Rotta Pay (carteira digital). Até aqui, desligar
 * uma delas era trocar código — o app mobile tem dois arquivos cuja
 * única função é substituir a tela real por um "em breve", e cada
 * reativação foi um commit. Quem decide quando uma área abre é o
 * produto, não o deploy, e por isso a chave passa a ser configuração.
 *
 * ## O código das telas NÃO sai do repositório
 *
 * Nada é apagado: as rotas continuam existindo, os componentes
 * continuam compilando e os testes continuam cobrindo. A flag muda uma
 * coisa só: se a porta de entrada aparece, e o que a pessoa vê se
 * chegar pela URL direta.
 *
 * ## Desligado é o padrão, e é deliberado
 *
 * Variável ausente significa área fechada. É o inverso do costume
 * ("flag some, volta ao normal"), e é o certo aqui: um ambiente novo —
 * um preview da Vercel, a máquina de alguém que acabou de clonar — não
 * pode abrir sozinho uma área meio pronta para quem estiver olhando.
 * Abrir exige alguém escrever a variável.
 *
 * ## Por que `process.env.X` literal em cada linha
 *
 * O Next substitui `NEXT_PUBLIC_*` por texto em tempo de build, e a
 * substituição é textual: `process.env[nome]` com nome em variável não
 * é trocado por nada e chega ao navegador como `undefined`. Então cada
 * nome aparece escrito por inteiro aqui, e é o preço de a flag valer no
 * cliente.
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

/**
 * Só o Marketplace, e isso é a verdade do painel web: a carteira do
 * Rotta Pay nunca teve tela aqui (o atalho dela foi removido da tela
 * da empresa a pedido do sócio: "não iremos utilizar"), e a flag dela
 * vive no aplicativo, onde a tela existe. Declarar aqui uma flag sem
 * nada do outro lado seria configuração morta — o tipo de coisa que
 * alguém liga esperando efeito e não entende por que nada muda.
 */
export const FUNCIONALIDADES = {
  /** Marketplace: a família buscando, pedindo e contratando transporte. */
  marketplace: ligada(process.env.NEXT_PUBLIC_FEATURE_MARKETPLACE),
} as const;

export type Funcionalidade = keyof typeof FUNCIONALIDADES;

export function funcionalidadeLigada(nome: Funcionalidade): boolean {
  return FUNCIONALIDADES[nome];
}
