# Dossiê 36 — Evolução de UX/UI e Auditoria do Design System

> Escopo original (Prompt 26): evolução do UX/UI da Rotta como **Design
> System puro** — sem funcionalidade nova, sem regra de negócio nova.
> Auditoria real da UI existente (web/admin/mobile), padronização de
> tipografia/cor/ícone, microinterações, revisão mobile-first, GPS/mapa
> com identidade própria, responsividade, copy sem "cara de IA", e um
> relatório final de problemas encontrados + melhorias feitas.

## 1. Método

Auditoria de código real (grep/Read em `apps/web`, `apps/admin`,
`apps/mobile`, `packages/ui`, `packages/theme`) antes de qualquer
implementação — mesmo método de todos os Dossiês anteriores. Nenhuma
funcionalidade nova foi adicionada; todo trabalho abaixo é fechamento de
gap do próprio Design System (Dossiê 24/25) ou correção de anti-padrão
já em produção.

## 2. Problemas encontrados (auditoria)

### 2.1 Diálogos nativos do navegador (`window.confirm`/`prompt`/`alert`)

Achado mais grave: três telas reais usavam diálogos nativos do
navegador — sem identidade visual da Rotta, sem Design System, bloqueando
a thread principal e impossíveis de estilizar ou testar:

| Arquivo                                   | Uso                                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `apps/web/.../notificacoes/[id]/page.tsx` | `window.confirm` para excluir notificação                                              |
| `apps/admin/.../empresas/[id]/page.tsx`   | `window.prompt` (2x: "Acessar como suporte", "Suspender") + `window.alert` (validação) |

Causa raiz: `Modal` estava especificado no catálogo (Dossiê 25 §4.6)
desde a primeira versão, mas nunca implementado — nenhuma tela tinha um
diálogo real para usar, então cada uma resolveu com `window.*`.

### 2.2 Emoji/caractere solto no lugar de ícone (viola Dossiê 10 §4: "Lucide Icons, nunca emoji")

| Arquivo                                              | Uso                                              |
| ---------------------------------------------------- | ------------------------------------------------ |
| `apps/web/.../notificacoes/[id]/page.tsx`            | `"★ Remover dos favoritos" / "☆ Favoritar"`      |
| `apps/web/.../notificacoes/page.tsx`                 | `<Badge>★</Badge>`                               |
| `apps/web/.../marketplace/contratos/[id]/page.tsx`   | `` `★ ${nota}` ``                                |
| `apps/admin/.../marketplace/contratos/[id]/page.tsx` | `` `★ ${nota}` `` (mesmo padrão, tela espelhada) |
| `apps/admin/.../inteligencia/page.tsx`               | `⚠ {alerta}`                                     |

Todos em `apps/web`/`apps/admin` — únicos apps com `@rotta/icons`
(Lucide) já disponível — foram substituídos por ícones reais (`Star`,
`AlertTriangle`).

**Gap documentado, não corrigido nesta entrega**: `apps/mobile` usa
emoji para ícone de tipo de notificação
(`features/notifications/labels.ts`) e para estrelas de avaliação
(`transporter-card.tsx`, `transportador-detalhes-screen.tsx`,
`detalhes-screen.tsx`). Isso já era uma decisão de escopo **documentada
no próprio código** (`labels.ts`: _"sem biblioteca de ícones nativa no
monorepo ainda"_) — `packages/ui/src/native` continua `export {}`
(nenhum Design System nativo implementado, mesma limitação já registrada
em Dossiês anteriores para `apps/mobile`). Resolver isso de verdade exige
adicionar `lucide-react-native` como uma nova capacidade de
`@rotta/icons`/`@rotta/ui` e substituir ~20 ícones de tipo de
notificação — trabalho real, mas maior que uma correção pontual de
anti-padrão; fica registrado aqui como próximo passo mecânico, não
escondido.

### 2.3 Gap de infraestrutura do Design System: `zIndex`/`boxShadow` nunca chegaram ao Tailwind

`packages/theme` já exportava `zIndex` (Dossiê 24 §4.10) e `elevation`
como objetos TypeScript reais, prontos para uso — mas **nenhum dos dois
apps Next.js jamais estendeu `theme.zIndex`/`theme.boxShadow` no
`tailwind.config.ts`** (só `colors`/`borderRadius`/`fontFamily` eram
mapeados). Isso só ficou visível ao especificar `Modal` (que precisa de
`z-overlay`/`z-modal`/sombra de elevação 3) — qualquer classe usando
esses tokens simplesmente não seria gerada pelo Tailwind e renderizaria
sem estilo, silenciosamente.

**Corrigido**: `apps/web/tailwind.config.ts` e `apps/admin/tailwind.config.ts`
agora importam `{ elevation, zIndex }` de `@rotta/theme` e estendem
`theme.extend.zIndex`/`theme.extend.boxShadow` com os 7 níveis de
z-index e as 3 sombras de elevação (`card`/`dropdown`/`modal`) — direto
da fonte de tokens, nunca um número solto ad-hoc.

### 2.4 `packages/ui` sem `lib: ["dom"]` no `tsconfig.json`

`packages/ui/tsconfig.json` herdava `lib: ["ES2022"]` de
`@rotta/config/typescript/base` — suficiente enquanto nenhum componente
chamava API de DOM de verdade (`Button`/`Input`/`Select` só referenciam
`HTMLButtonElement` etc. como _tipo_ de prop, nunca `document`,
`querySelectorAll`, `.focus()`). `Modal` é o primeiro componente do
pacote a precisar de DOM real (portal via `createPortal`, focus trap via
`querySelectorAll` + `.focus()`, `document.activeElement`) — o
`tsc --noEmit` do pacote falhava com 14 erros (`Cannot find name
'document'`, `Property 'focus' does not exist on type 'HTMLElement'`
etc.) até a correção.

**Corrigido**: `lib: ["dom", "dom.iterable", "ES2022"]` adicionado ao
`compilerOptions` de `packages/ui/tsconfig.json` (mesmo conjunto de
`nextjs.json`). `src/native` continua inofensivo (`export {}`).

### 2.5 `packages/ui` sem `react-dom`

Necessário para `createPortal`, nunca declarado. `react-dom` +
`@types/react-dom` adicionados a `devDependencies`, e `react-dom`
adicionado a `peerDependencies`/`peerDependenciesMeta` como opcional
(mesmo padrão já usado para `react-native`).

## 3. Componente novo: `Modal`

`packages/ui/src/web/organisms/Modal/Modal.tsx` — especificado desde o
Dossiê 25 §4.6, implementado agora porque agora existe uma necessidade
real e concreta (substituir os três `window.*` do item 2.1). Compound
component (`Modal.Header`/`Modal.Body`/`Modal.Footer`), sem dependência
externa (mesmo princípio de `Card`/`Table`: construído do zero):

- `createPortal` para `document.body` — overflow/z-index de um
  container pai não corta o modal.
- Focus trap: Tab/Shift+Tab não escapam do modal; foco inicial vai para
  o primeiro elemento focável; foco volta ao elemento que abriu o modal
  ao fechar.
- `Esc` fecha; clique no scrim fecha (conveniência de mouse — teclado já
  coberto por Esc/foco).
- `role="dialog"` + `aria-modal="true"`.
- Usa os tokens corrigidos no item 2.3: `z-overlay`/`z-modal` e
  `shadow-modal`; scrim usa `bg-black/60` (opacidade real do Tailwind,
  já que não existe token de cor `scrim` dedicado no Design System).
- `"use client"` explícito — primeiro componente do pacote que usa hook
  (`useEffect`/`useRef`); sem isso o Next.js falha o build ao tentar
  incluir o módulo na árvore de um Server Component (ex.: a landing page
  importa `@rotta/ui/web` para `Typography`/`Button`, e o barrel agora
  também reexporta `Modal`).

Exportado em `packages/ui/src/web/organisms/Modal/index.ts` e
`packages/ui/src/web/index.ts` (header do barrel atualizado).

## 4. Correções aplicadas

### 4.1 `apps/web/.../notificacoes/[id]/page.tsx`

- `window.confirm` → `Modal` de confirmação real (`Modal.Header` com
  botão fechar, `Modal.Body` com o texto de aviso, `Modal.Footer` com
  "Cancelar"/"Excluir" — `Excluir` em `variant="danger"`, com
  `isLoading` ligado à mutation).
- `"★ Remover dos favoritos" / "☆ Favoritar"` → ícone `Star` (Lucide,
  `fill="currentColor"` quando favoritada) + texto sem o caractere.

### 4.2 `apps/admin/.../empresas/[id]/page.tsx`

- "Acessar como suporte": `window.prompt` + `window.alert` de validação
  → `Modal` com `Input` real para o motivo, validação inline (mensagem
  de erro no próprio modal, não um `alert` bloqueante), texto explicando
  o log de auditoria (ADM-01/RN-10) permanece.
- "Suspender": `window.prompt` → `Modal` com `Input` pré-preenchido com
  o motivo anterior (mesmo comportamento do `window.prompt(msg, motivo)`
  original).
- `autoFocus` nos dois `Input` foi removido após o lint apontar
  `jsx-a11y/no-autofocus` — o próprio `Modal` já move o foco para dentro
  do painel na abertura (Dossiê 25 §4.6), tornando o `autoFocus` extra
  redundante e um problema de acessibilidade.

### 4.3 Estrelas de avaliação e alerta (item 2.2)

`apps/web/.../notificacoes/page.tsx`,
`apps/web/.../marketplace/contratos/[id]/page.tsx`,
`apps/admin/.../marketplace/contratos/[id]/page.tsx`,
`apps/admin/.../inteligencia/page.tsx` — caractere solto trocado por
`Star`/`AlertTriangle` do `@rotta/icons`.

## 5. Verificação

- `pnpm --filter @rotta/ui --filter @rotta/theme --filter @rotta/icons run typecheck` — **passou** (0 erros, incluindo o `Modal` novo).
- `pnpm --filter @rotta/web --filter @rotta/admin run typecheck` — **passou**.
- `next build` de `apps/web` e `apps/admin` (com `NEXT_PUBLIC_API_URL` definido, exigido pelo schema de env de ambos — não é regressão desta entrega) — **passou**, todas as rotas geradas, incluindo as páginas editadas.
- `eslint` escopado a cada arquivo novo/editado (nunca glob recursivo) — **0 erros** em todos; only pre-existing `import/order` warnings em arquivos não tocados por este Prompt.
- `vitest run` (`apps/web`) — **3/3 passaram**, sem regressão.
- `git status --short` conferido antes do commit — só os arquivos desta entrega.

## 6. Fora do escopo desta entrega (registrado, não escondido)

- **Ícones nativos em `apps/mobile`**: emoji continuam em uso
  (`notifications/labels.ts` e 3 telas de avaliação/estrela) — gap
  documentado no item 2.2, requer adicionar `lucide-react-native` como
  nova capacidade de `@rotta/icons`, fora do escopo de "corrigir
  anti-padrão pontual".
- **Auditoria completa de copy "cara de IA"**: as páginas de marketing
  já passaram por uma revisão de copywriting dedicada (ver item de
  histórico "Landing page: passe de copywriting substantivo"); esta
  entrega não repetiu esse trabalho por falta de indício de regressão
  desde então.
- **Microinterações/animação 60fps, revisão mobile-first tela a tela,
  GPS/mapa com identidade própria**: o Rotta Geo Platform (Dossiê
  109-120) e o Design System (Dossiê 24/25) já cobrem esses temas na
  arquitetura; esta entrega focou em anti-padrões concretos e
  verificáveis por código (diálogo nativo, emoji, token não conectado)
  em vez de uma reescrita visual especulativa sem um problema real
  identificado para justificá-la — consistente com o próprio princípio
  do catálogo (`packages/ui/src/web/index.ts`): "componente chega junto
  com a tela que precisar dele pela primeira vez", nunca antecipado.
