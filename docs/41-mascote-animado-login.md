# Dossiê 41 — Mascote animado na tela de login (`/entrar`)

> Pedido do usuário: uma referência visual de um showcase de componentes
> de terceiro ("Huddle" — personagens que reagem ao campo de senha,
> olhando para longe/fechando os olhos enquanto a pessoa digita) e o
> pedido "quero algo relacionado a isso na hora do login, para ser
> animado". Implementado com conceito equivalente (personagens reagem
> ao foco/preenchimento dos campos) — nenhuma forma, cor, texto, ícone
> ou elemento de marca copiado da referência; desenho, paleta e textos
> são 100% Rotta.

## 1. O que foi construído

- **`apps/web/src/components/login-mascot.tsx`** (novo) — `LoginMascot`,
  3 "blobs" arredondados (mesma linguagem visual já usada em
  `HeroTripPhoneMockup`/`RouteMark`: SVG/CSS desenhado à mão, nunca
  emoji — Dossiê 36) nas cores institucionais (`--color-primary`,
  `--color-success`, `--color-warning`), cada um com olhos (pálpebra
  animável) e boca. Recebe só uma prop, `mood`, e desenha — nunca lê
  `document`/estado de formulário sozinho.
- **CSS em `globals.css`** — toda a animação (pálpebra fechando,
  sobrancelha subindo, cabeça virando, boca mudando de forma) é CSS
  puro dirigido pelo atributo `data-mood`, mesmo padrão de "sem
  biblioteca de animação" já usado no resto do app.
- **`apps/web/src/app/(auth)/entrar/page.tsx`** — a página decide o
  `mood` a partir do estado REAL dos campos (`onFocus`/`onBlur`, e o
  novo toggle de mostrar/ocultar senha — que também não existia antes):
  - `idle` — nada focado.
  - `nosy` — campo de e-mail focado (não é dado sensível, então os
    personagens ficam curiosos, sobrancelha sobe).
  - `shy` — campo de senha focado/sendo digitado: olhos fecham, cada
    "blob" vira a cabeça num ângulo diferente.
  - `exposed` — só quando a própria pessoa clica no ícone de
    olho para revelar a senha em texto E ela já está preenchida (nunca
    antes disso — a senha só "aparece" para o mascote quando já está
    visível na tela mesmo).
- **Toggle de mostrar/ocultar senha** (`SenhaField`, ícones `Eye`/
  `EyeOff` de `@rotta/icons`) — não existia antes; construído junto
  porque o estado "exposed" do mascote depende dele existir de verdade
  (nunca fingir que a senha "aparece" sem um jeito real de revelá-la).

## 2. Por que só `apps/web` (por enquanto)

A imagem de referência é claramente um mockup desktop/web (chrome de
navegador, "localhost"). `apps/admin` (painel do Admin Rotta) foi
deixado de fora de propósito — tom mais sério, sem elemento lúdico,
mesma decisão editorial já aplicada ao resto do painel administrativo.
`apps/mobile` exigiria uma implementação inteiramente separada
(SVG + `Animated`/Reanimated do React Native, em vez de CSS do DOM) —
registrado como possível próximo passo, não construído aqui.

## 3. Verificação

- `pnpm --filter @rotta/web run typecheck` — **passou** (0 erros).
- `eslint --fix` nos arquivos novos/editados — 0 erros, 0 avisos.
- `pnpm run build` (com `NEXT_PUBLIC_API_URL` setado, exigido pela
  validação de ambiente do app) — **build completo, 41/41 páginas
  geradas**, incluindo `/entrar` (2.86 kB). A falha de build inicial
  sem essa env var é preexistente e não relacionada — reproduzível em
  qualquer rota do app neste ambiente sem a variável configurada, não
  algo introduzido por esta entrega.
