# @rotta/config

Configurações compartilhadas de ferramental — ESLint, Prettier e TypeScript. Nenhum app ou package do monorepo duplica essas regras; todos estendem os presets daqui.

Ver Dossiê 22 (Seção 5.18) e Dossiê 23 (Seção 15.1).

## Presets disponíveis

| Import | Uso |
|---|---|
| `@rotta/config/eslint/base` | Todo package TypeScript puro |
| `@rotta/config/eslint/next` | `apps/web`, `apps/admin` |
| `@rotta/config/eslint/react-native` | `apps/mobile` |
| `@rotta/config/eslint/nestjs` | `apps/api`, `apps/realtime-gateway`, `apps/worker` |
| `@rotta/config/prettier` | Todo o monorepo (raiz `.prettierrc.js` também aponta para cá) |
| `@rotta/config/typescript/base` | Todo package TypeScript puro |
| `@rotta/config/typescript/nextjs` | `apps/web`, `apps/admin` |
| `@rotta/config/typescript/react-native` | `apps/mobile` |
| `@rotta/config/typescript/nestjs` | `apps/api`, `apps/realtime-gateway`, `apps/worker` |

## Por que isso importa

Uma regra de lint nova (ex. reforçar a fronteira de import entre `features/`) se propaga a todo o monorepo alterando um único arquivo aqui, em vez de exigir uma alteração coordenada em N `.eslintrc.cjs` diferentes.
