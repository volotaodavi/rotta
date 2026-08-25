/**
 * Migração para React 19: `@types/react@19` moveu o namespace `JSX`
 * global (usado em centenas de arquivos deste projeto como tipo de
 * retorno — `): JSX.Element {`) pra dentro de `React.JSX`. Reexportar o
 * namespace global aqui é a solução documentada oficialmente pelo React
 * pra evitar reescrever toda a base de código
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
