/**
 * O workspace usa `@types/react` numa única versão (19, via
 * `pnpm.overrides` na raiz) pra evitar dois tipos de `ReactNode`
 * incompatíveis nos pacotes compartilhados (`packages/ui`, `auth`,
 * etc.) consumidos por `apps/web` (migrado pro React 19 em runtime) e
 * por este app — isso é só de TIPO aqui: `react`/`react-dom` seguem na
 * versão real 18.3.1 no `apps/admin` em runtime, sem mudança nenhuma.
 * `@types/react@19` moveu o namespace `JSX` global (usado em centenas
 * de arquivos deste projeto como tipo de retorno — `): JSX.Element {`)
 * pra dentro de `React.JSX`. Reexportar o namespace global aqui é a
 * solução documentada oficialmente pelo React
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
