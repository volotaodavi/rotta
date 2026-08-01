# @rotta/theme

Tokens de design da Rotta — cores (dark/light), tipografia, espaçamento, raio, elevação, border (espessura), motion, opacity, breakpoints, z-index e transitions. Fonte única de verdade consumida por `@rotta/ui/web` e `@rotta/ui/native`.

Especificação completa e vinculante: [`docs/24-design-system-oficial-fundamentos.md`](../../docs/24-design-system-oficial-fundamentos.md) (tokens) e [`docs/25-design-system-oficial-catalogo-de-componentes.md`](../../docs/25-design-system-oficial-catalogo-de-componentes.md) (componentes). O Dossiê 10 é o rascunho inicial, superado por estes dois.

## Uso

```ts
import { darkTheme, lightTheme, themes } from "@rotta/theme";
```

## Regra de ouro

Nenhum app ou componente define uma cor/tamanho/espaçamento "solto" — todo valor visual vem de um token exportado aqui. Uma mudança de marca (ex. ajustar o tom do azul primário) se propaga a toda a plataforma alterando um único arquivo.

## Scripts

- `pnpm lint` — ESLint (preset `@rotta/config/eslint/base`)
- `pnpm typecheck` — checagem de tipos sem emissão
- `pnpm test` — placeholder até o primeiro teste real ser escrito (Dossiê 23, Seção 10)
