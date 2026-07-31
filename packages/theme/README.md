# @rotta/theme

Tokens de design da Rotta — cores (dark/light), tipografia, espaçamento, raio, elevação e motion. Fonte única de verdade consumida por `@rotta/ui/web` e `@rotta/ui/native`.

Especificação completa: [`docs/10-design-system-fundamentos.md`](../../docs/10-design-system-fundamentos.md).

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
