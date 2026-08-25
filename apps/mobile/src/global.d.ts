/**
 * Migração pro React 19 (só apps/web — apps/mobile continua em React
 * 18.3.1 em runtime, exigência do react-native): `@types/react@19`
 * moveu o namespace `JSX` global (usado em centenas de arquivos deste
 * projeto como tipo de retorno — `): JSX.Element {`) pra dentro de
 * `React.JSX`. O workspace usa `@types/react` numa única versão (19,
 * via `pnpm.overrides` na raiz) pra evitar dois tipos de `ReactNode`
 * incompatíveis nos pacotes compartilhados (`packages/ui`, `auth`,
 * etc.) consumidos tanto por `apps/web` quanto por `apps/mobile` — isso
 * é só de TIPO, sem nenhum efeito em runtime (`react`/`react-native`
 * seguem na versão real 18.3.1 aqui). Reexportar o namespace global
 * aqui é a solução documentada oficialmente pelo React
 * (https://react.dev/blog/2024/04/25/react-19-upgrade-guide#typescript-changes).
 */
declare global {
  namespace JSX {
    type Element = React.JSX.Element;
    type ElementClass = React.JSX.ElementClass;
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
    type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>;
    type IntrinsicElements = React.JSX.IntrinsicElements;
  }
}

export {};
