/**
 * Migração para React 19: `@types/react@19` moveu o namespace `JSX`
 * global (usado em vários arquivos deste pacote como tipo de retorno —
 * `): JSX.Element {`) pra dentro de `React.JSX`. Reexportar o namespace
 * global aqui é a solução documentada oficialmente pelo React pra
 * evitar reescrever toda a base de código
 * (https://react.dev/blog/2024/04/25/react-19-upgrade-guide#typescript-changes).
 *
 * Mesma cópia de `apps/web/src/global.d.ts` / `apps/admin/src/global.d.ts` /
 * `apps/mobile/src/global.d.ts` / `packages/auth/src/global.d.ts` /
 * `packages/maps/src/global.d.ts` — auditoria minuciosa 04/09/2026: como
 * `@rotta/ui` é um pacote com seu próprio `tsc --noEmit` isolado (não
 * herda o `global.d.ts` de nenhum app consumidor), faltava esta mesma
 * cópia aqui — `pnpm turbo run typecheck` falhava de verdade
 * (`Cannot find namespace 'JSX'` em vários componentes web e native),
 * quebraria o CI no próximo PR que tocasse este pacote.
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
