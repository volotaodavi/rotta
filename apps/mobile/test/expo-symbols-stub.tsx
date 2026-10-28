import type { ReactNode } from "react";

/**
 * `expo-symbols` no Jest.
 *
 * ## O defeito que isto conserta
 *
 * `RottaSymbol` desenha um SF Symbol quando `Platform.OS === "ios"` e
 * entrega o ícone comum como `fallback`, para o iPhone antigo que não
 * conhece aquele símbolo:
 *
 * ```tsx
 * <SymbolView name={ios} fallback={<Fallback size={size} />} />
 * ```
 *
 * No Jest, o `jest-expo` roda com `Platform.OS === "ios"`, então esse é
 * o caminho que todo teste atravessa. E o `SymbolView` de verdade não
 * roda em Node: sem módulo nativo, o componente trata `fallback` como
 * um filho qualquer, e o React estoura com "Objects are not valid as a
 * React child (found: object with keys {$$typeof, type, key, props})".
 *
 * Isso derrubava doze testes de navegação que nada têm a ver com
 * ícones, e a mensagem não aponta para lugar nenhum — o rastro morre
 * dentro do reconciliador.
 *
 * ## Por que o `fallback`, e não um quadrado vazio
 *
 * Porque é o que o aparelho Android desenha, e é o que o teste precisa
 * encontrar: os testes procuram o ícone por nome acessível. Um stub
 * vazio faria a árvore montar e as asserções de conteúdo falharem por
 * outro motivo.
 */
export function SymbolView({ fallback }: { fallback?: ReactNode }): ReactNode {
  return fallback ?? null;
}

/** O pacote exporta tipos além do componente; nada mais é usado em teste. */
export default { SymbolView };
