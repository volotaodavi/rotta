# @rotta/config

Configurações compartilhadas de ferramental — ESLint, Prettier e TypeScript. Nenhum app ou package do monorepo duplica essas regras; todos estendem os presets daqui.

Ver Dossiê 22 (Seção 5.18) e Dossiê 23 (Seção 15.1).

## Presets disponíveis

| Import                                  | Uso                                                           |
| --------------------------------------- | ------------------------------------------------------------- |
| `@rotta/config/eslint/base`             | Todo package TypeScript puro                                  |
| `@rotta/config/eslint/next`             | `apps/web`, `apps/admin`                                      |
| `@rotta/config/eslint/react-native`     | `apps/mobile`                                                 |
| `@rotta/config/eslint/nestjs`           | `apps/api`, `apps/realtime-gateway`, `apps/worker`            |
| `@rotta/config/prettier`                | Todo o monorepo (raiz `.prettierrc.js` também aponta para cá) |
| `@rotta/config/typescript/base`         | Todo package TypeScript puro                                  |
| `@rotta/config/typescript/nextjs`       | `apps/web`, `apps/admin`                                      |
| `@rotta/config/typescript/react-native` | `apps/mobile`                                                 |
| `@rotta/config/typescript/nestjs`       | `apps/api`, `apps/realtime-gateway`, `apps/worker`            |

## Por que isso importa

Uma regra de lint nova (ex. reforçar a fronteira de import entre `features/`) se propaga a todo o monorepo alterando um único arquivo aqui, em vez de exigir uma alteração coordenada em N `.eslintrc.cjs` diferentes.

## Nota técnica: `typescript/base.json` é autocontido, não `extends` o `tsconfig.base.json` da raiz

`packages/config/typescript/base.json` duplica (em vez de estender via `extends` relativo) as `compilerOptions` de `tsconfig.base.json` na raiz do monorepo. Isso é deliberado: como este pacote é consumido pelos demais workspaces através de um symlink do pnpm (`node_modules/@rotta/config`), uma cadeia de `extends` relativo (`../../../tsconfig.base.json`) resolve corretamente no `tsc` (que segue o link para o caminho real), mas **falha** no resolvedor de import do ESLint (`eslint-import-resolver-typescript` → `get-tsconfig`), que calcula o caminho relativo a partir da localização do symlink, não do arquivo real. Ao manter `typescript/base.json` autocontido, o problema desaparece para os dois. Se as opções do compilador mudarem, atualize os dois arquivos juntos.
