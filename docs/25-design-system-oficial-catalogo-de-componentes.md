# Dossiê 25 — Design System Oficial da Rotta: Catálogo Completo de Componentes

> Companheiro direto do Dossiê 24 (Identidade, Tokens e Fundamentos). Juntos, os dois dossiês são a **fonte única de verdade da interface** da Rotta. **Nenhum componente pode ser criado fora do que está catalogado aqui.** Toda cor, espaçamento, raio, tipografia, elevação, borda, motion, opacity, z-index e transição citados abaixo referenciam exatamente os tokens definidos no Dossiê 24 §4 — nenhum valor novo é inventado neste documento.

---

## 1. Como ler este catálogo

Cada componente é especificado com o mesmo template de 7 partes, para que qualquer desenvolvedor navegue o documento sem re-aprender uma estrutura nova a cada seção:

1. **Camada e localização** — átomo/molécula/organismo e caminho em `packages/ui/src/{web,native}/...` (Dossiê 24 §12.3).
2. **Anatomia** — as partes visuais que compõem o componente.
3. **Variantes** (`variant`) e **tamanhos** (`size`).
4. **Estados** — todos os estados possíveis e como cada um se traduz visualmente em tokens.
5. **API conceitual** — props do componente, válidas tanto para a implementação web (`packages/ui/src/web`) quanto native (`packages/ui/src/native`), com nota explícita onde a convenção nativa de cada plataforma diverge (Dossiê 24 §12.4 — ex. `onClick` vs `onPress`).
6. **Acessibilidade** — regras específicas do componente, além das gerais do Dossiê 24 §9.
7. **Notas de plataforma** — diferenças legítimas entre web e mobile (nunca diferenças de aparência arbitrárias, apenas onde a convenção nativa exige).

### 1.1 Vocabulário comum (reutilizado por todo o catálogo, nunca redefinido por componente)

| Conceito               | Valores padrão                                                                                                            | Nota                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `size`                 | `sm` \| `md` \| `lg`                                                                                                      | `md` é sempre o padrão implícito quando a prop não é informada                                                                 |
| `variant` (ênfase)     | `primary` \| `secondary` \| `ghost` \| `danger`                                                                           | Nem todo componente usa todas — cada seção lista as que se aplicam                                                             |
| Estados de interação   | `default` → `hover` (web) → `pressed`/`active` → `focus` → `disabled`                                                     | Sequência de prioridade visual quando mais de um se sobrepõe: `disabled` > `error` > `focus` > `pressed` > `hover` > `default` |
| Estado de validação    | `default` \| `error` \| `success` (raro, apenas quando a confirmação em tempo real é útil, ex. usuário/e-mail disponível) | Nunca ambos `error` e `success` simultâneos                                                                                    |
| Estado de carregamento | `isLoading`                                                                                                               | Sempre desabilita interação simultaneamente (nunca um componente "carregando" mas clicável)                                    |

### 1.2 Convenção de API entre plataformas

Reafirmando o Dossiê 24 §12.4: a API pública (nomes de props, valores de `variant`/`size`) é **idêntica** entre `web` e `native`, exceto nos três pontos onde a convenção nativa de cada ecossistema é mais forte que a uniformidade:

| Ponto de divergência    | Web                                | Native                                |
| ----------------------- | ---------------------------------- | ------------------------------------- |
| Handler de toque/clique | `onClick`                          | `onPress`                             |
| Elemento de mídia       | `<img>`/CSS `background-image`     | `<Image>` (Expo)                      |
| Rolagem                 | CSS `overflow` nativo do navegador | `<ScrollView>`/`<FlatList>` explícito |

Nenhuma outra divergência é permitida — se uma implementação nativa precisar de uma prop que a web não tem, isso é um sinal de que o componente foi mal especificado (voltar a este dossiê antes de prosseguir).

---

## 2. Átomos (`packages/ui/src/{web,native}/atoms/`)

Componentes de responsabilidade única, sem partes internas com estado próprio compartilhado. API sempre por props diretas (nunca Compound Components — Dossiê 24 §12.2).

### 2.1 Button

- **Camada**: átomo · `atoms/Button/`
- **Anatomia**: contêiner clicável → [ícone à esquerda opcional] → rótulo de texto (tipografia `Button`, Dossiê 24 §4.4.2) → [ícone à direita opcional] → [spinner, substitui o conteúdo quando `isLoading`].
- **Variantes**: `primary` (fundo `Primary`, texto sobre fundo — ação principal, no máximo uma por tela, Dossiê 24 §2); `secondary` (fundo `Secondary`, texto `Text` — ação de segunda prioridade); `ghost` (sem fundo, texto `Primary`, hover com `Muted` sutil — ação terciária/dentro de card); `danger` (fundo `Danger` — ação destrutiva, sempre acompanhada de confirmação, Dossiê 24 §2 "Segurança").
- **Tamanhos**: `sm` (altura 32px, padding `space-2`/`space-3`, texto `Caption`), `md` (altura 40px, padding `space-3`/`space-4`, texto `Button` — padrão), `lg` (altura 48px, padding `space-4`/`space-6`, texto `Button`).
- **Estados**: `default` / `hover` (web: `transition-color`, leve clareamento) / `pressed` (escala 0.98, `transition-transform`) / `focus` (anel `border-medium` `Primary`) / `disabled` (opacity `opacity-disabled` + cursor `not-allowed` no web) / `isLoading` (spinner substitui rótulo, largura do botão preservada — nunca "pula" de tamanho).
- **API conceitual**:

| Prop                                 | Tipo                                              | Default     | Descrição                                                 |
| ------------------------------------ | ------------------------------------------------- | ----------- | --------------------------------------------------------- |
| `variant`                            | `"primary" \| "secondary" \| "ghost" \| "danger"` | `"primary"` | Ênfase visual                                             |
| `size`                               | `"sm" \| "md" \| "lg"`                            | `"md"`      | Altura/padding/tipografia                                 |
| `isLoading`                          | `boolean`                                         | `false`     | Substitui rótulo por spinner, desabilita interação        |
| `isDisabled`                         | `boolean`                                         | `false`     | Desabilita interação e aplica estado visual `disabled`    |
| `iconLeft` / `iconRight`             | `LucideIcon`                                      | —           | Ícone opcional (Dossiê 24 §6)                             |
| `fullWidth`                          | `boolean`                                         | `false`     | Ocupa 100% do contêiner pai (comum em formulários mobile) |
| `onClick` (web) / `onPress` (native) | `() => void`                                      | —           | —                                                         |
| `children`                           | `ReactNode`                                       | —           | Rótulo de texto                                           |

- **Acessibilidade**: `role="button"` implícito (elemento `<button>` nativo no web, nunca `<div onClick>`); `accessibilityRole="button"` no RN; foco visível obrigatório; `aria-busy`/`accessibilityState={{busy}}` quando `isLoading`.
- **Notas de plataforma**: nenhuma — comportamento e aparência idênticos.

### 2.2 IconButton

- **Camada**: átomo · `atoms/IconButton/`
- **Anatomia**: contêiner quadrado/circular → ícone único centralizado, sem rótulo textual.
- **Variantes**: mesmas de Button (`primary`/`secondary`/`ghost`/`danger`), `ghost` é o uso mais comum (ex. ícone de fechar em modal).
- **Tamanhos**: `sm` (28px), `md` (36px), `lg` (44px) — a área de toque real nunca é menor que 44×44px (mobile)/32×32px (web) mesmo quando o `size` visual é `sm` (Dossiê 24 §6.2 — hit-slop invisível adicionado ao redor do elemento visual quando necessário).
- **Estados**: idênticos ao Button.
- **API conceitual**: igual ao Button, substituindo `children`/`iconLeft`/`iconRight` por uma única prop `icon: LucideIcon` e exigindo `label: string` (mapeado para `aria-label`/`accessibilityLabel`, nunca opcional — Dossiê 24 §6.2, regra de ícone sem rótulo textual).
- **Acessibilidade**: `aria-label`/`accessibilityLabel` **obrigatório** (erro de type-check se omitido) — este é o único componente do catálogo sem rótulo visível, então o rótulo acessível é inegociável.

### 2.3 FAB (Floating Action Button)

- **Camada**: átomo · `atoms/Fab/` _(componente adicional ao mapeamento do Dossiê 24 §12.3 — adicionado aqui como átomo por ter responsabilidade única, sem partes internas; o dossiê de tokens é atualizado por referência a esta seção)_
- **Anatomia**: botão circular (`radius-full`), fixo sobre o conteúdo (posição `fixed`/`absolute`, `z-sticky`), ícone único centralizado, elevação `elevation-2`.
- **Variantes**: apenas `primary` (é sempre a ação mais importante da tela — nunca existe mais de um FAB simultâneo, reforça Dossiê 24 §2.1 "nunca mais de uma cor de destaque simultânea").
- **Tamanhos**: `md` (56px, padrão), `sm` (40px, uso raro — apenas quando o FAB precisa conviver com uma barra de ação secundária).
- **Estados**: `default` / `pressed` (escala 0.96) / `disabled` (raro — normalmente o FAB é ocultado, não desabilitado, quando a ação não se aplica).
- **API conceitual**: `icon: LucideIcon`, `label: string` (acessível, o FAB nunca tem texto visível), `onClick`/`onPress`, `size`.
- **Notas de plataforma**: mobile é o uso primário (convenção Android/Material de ação flutuante); no web, uso deliberadamente raro (preferir Button fixo em toolbar) — quando usado no web, sempre com `title` (tooltip) além do `aria-label`.

### 2.4 Input

- **Camada**: átomo · `atoms/Input/`
- **Anatomia**: contêiner com borda → [ícone à esquerda opcional] → campo de texto nativo → [ícone à direita opcional / botão de limpar] → borda de estado (default/focus/error).
- **Variantes**: nenhuma variante de ênfase (um único estilo visual — inputs nunca competem por atenção, Dossiê 24 §2 "Simplicidade"); variam apenas por `type` (`text`/`email`/`number`/`tel`), delegado ao HTML/teclado nativo.
- **Tamanhos**: `sm` (36px), `md` (44px, padrão), `lg` (52px, uso em formulários hero/landing).
- **Estados**: `default` (borda `Border`) / `focus` (borda `Border Strong`/`Primary`, `border-medium`) / `error` (borda `Danger` + ícone de alerta + mensagem abaixo, `Caption` em `Danger`) / `disabled` (fundo/texto `Disabled`) / `readOnly` (fundo `Muted`, sem borda de foco) / vazio (mostra `placeholder` em cor `Placeholder`, Dossiê 24 §4.1, nunca confundível com dado preenchido).
- **API conceitual**: `value`, `onChange`(web)/`onChangeText`(native), `placeholder`, `type`, `size`, `isDisabled`, `isReadOnly`, `hasError`, `iconLeft`/`iconRight`, `onClear` (mostra "x" quando há valor).
- **Acessibilidade**: sempre associado a um `<label>`/`accessibilityLabel` via o molecule `FormField` (Seção 3.5) — o átomo `Input` isolado nunca é usado diretamente em uma tela de produto sem rótulo.

### 2.5 Checkbox

- **Camada**: átomo · `atoms/Checkbox/`
- **Anatomia**: quadrado `radius-sm` → check interno (ícone Lucide `Check`) quando marcado → [rótulo de texto opcional ao lado, via `FormField`].
- **Estados**: `unchecked` / `checked` (fundo `Primary`, check branco) / `indeterminate` (traço horizontal, uso em "selecionar todos" parcial) / `disabled` / `error` (borda `Danger`, uso raro — ex. termo obrigatório não aceito).
- **Tamanho**: único, 20×20px (área de toque estendida invisível até 44×44px no mobile).
- **API conceitual**: `checked: boolean`, `indeterminate: boolean`, `onChange`/`onValueChange` (native), `isDisabled`.
- **Acessibilidade**: `role="checkbox"` + `aria-checked` (suporta `"mixed"` para indeterminate) / `accessibilityRole="checkbox"` + `accessibilityState={{checked}}`.

### 2.6 Radio

- **Camada**: átomo · `atoms/Radio/`
- **Anatomia**: círculo `radius-full` → ponto interno sólido `Primary` quando selecionado.
- **Estados**: `unselected` / `selected` / `disabled`. Sempre usado dentro de um grupo (`RadioGroup`, gerenciado pelo `FormField` ou tela consumidora — o grupo em si não é um componente do catálogo por ser um simples `map` sobre `Radio`, não uma peça de UI nova).
- **Tamanho**: único, 20×20px.
- **API conceitual**: `checked: boolean`, `value: string`, `onChange`/`onValueChange`, `isDisabled`, `name` (agrupamento web).

### 2.7 Switch

- **Camada**: átomo · `atoms/Switch/`
- **Anatomia**: trilho arredondado (`radius-full`) → círculo (thumb) que desliza entre esquerda (desligado) e direita (ligado).
- **Estados**: `off` (trilho `Border Strong`) / `on` (trilho `Primary`) / `disabled` (opacity `opacity-disabled`) — transição do thumb via `transition-transform` (`duration-base`).
- **Tamanho**: único, trilho 40×24px.
- **API conceitual**: `checked: boolean`, `onChange`/`onValueChange`, `isDisabled`.
- **Acessibilidade**: `role="switch"`/`accessibilityRole="switch"` (não `checkbox` — semântica correta de liga/desliga imediato, sem necessidade de "confirmar").

### 2.8 Avatar

- **Camada**: átomo · `atoms/Avatar/`
- **Anatomia**: círculo (`radius-full`) contendo foto (quando disponível) **ou** iniciais do nome sobre fundo `Primary Muted` **ou** ícone genérico de pessoa (fallback final) → [badge de status sobreposto opcional, ex. ponto verde "online"].
- **Tamanhos**: `sm` (24px, item de lista densa), `md` (40px, padrão — cabeçalho, card), `lg` (64px, perfil), `xl` (96px, tela de perfil completo).
- **Estados**: `loaded` / `loading` (Skeleton circular enquanto a foto carrega) / `fallback-initials` / `fallback-icon`.
- **API conceitual**: `src?: string`, `name: string` (usado para gerar iniciais e para `alt`/`accessibilityLabel`), `size`, `statusBadge?: "online" | "offline"`.
- **Nota de produto**: reforça Dossiê 24 §2.2 "Airbnb — confiança via fotografia real"; perfis de Motorista sempre priorizam foto real sobre iniciais quando disponível (Dossiê 10 §1).

### 2.9 Badge

- **Camada**: átomo · `atoms/Badge/`
- **Anatomia**: pequena etiqueta arredondada (`radius-sm`) com texto curto (`Caption`, peso 600) ou apenas um número — usada para status/contagem, não para ação (não clicável, ao contrário do Chip, Seção 2.10).
- **Variantes semânticas**: `neutral` (`Secondary`), `success`, `danger`, `warning`, `info` (cores diretas dos tokens semânticos, Dossiê 24 §4.1) — usado, por exemplo, para "Documento vencido" (`danger`), "Rota no horário" (`success`).
- **API conceitual**: `variant: "neutral" | "success" | "danger" | "warning" | "info"`, `children: string | number`.
- **Acessibilidade**: nunca a única forma de comunicar o estado (Dossiê 24 §9 — cor nunca é único portador de informação) — sempre acompanhado de texto explícito no próprio Badge, nunca apenas uma bolinha colorida sem texto.

### 2.10 Chip

- **Camada**: átomo · `atoms/Chip/`
- **Anatomia**: pill (`radius-full`) clicável, com texto (`Button`, tamanho reduzido) e [ícone opcional de remover "x"].
- **Variantes**: `filter` (chip de filtro, alterna `selected`/`unselected`, usado em listas com filtro rápido); `input` (chip removível dentro de um campo multi-seleção, ex. tags); `action` (chip que dispara uma ação simples, ex. sugestão rápida).
- **Estados**: `default` / `selected` (fundo `Primary Muted`, texto `Primary`) / `disabled`.
- **Diferença de Badge**: Chip é sempre interativo (clicável/removível); Badge nunca é (apenas informativo). Esta distinção é a razão de serem dois componentes, não um com prop `interactive`.
- **API conceitual**: `label: string`, `selected?: boolean`, `onRemove?: () => void`, `onClick`/`onPress`, `isDisabled`.

### 2.11 Divider

- **Camada**: átomo · `atoms/Divider/`
- **Anatomia**: linha simples, `border-hairline`, cor `Border`.
- **Variantes**: `horizontal` (padrão) / `vertical` (uso em toolbars, separando grupos de ícones).
- **API conceitual**: `orientation: "horizontal" | "vertical"`, `inset?: boolean` (recuo lateral igual ao padding do contêiner pai, uso comum em listas).

### 2.12 Spinner (Loading)

- **Camada**: átomo · `atoms/Spinner/`
- **Anatomia**: círculo com arco em `Primary`, rotação contínua.
- **Tamanhos**: `sm` (16px, dentro de Button), `md` (24px, dentro de card), `lg` (40px, tela inteira/carregamento inicial).
- **Motion**: rotação `360°` em loop, `duration-slow`× repetição, `easing-standard` — nunca acelera/desacelera (rotação linear constante, sinaliza "processo em andamento" sem prometer um fim iminente).
- **API conceitual**: `size: "sm" | "md" | "lg"`, `color?: token` (por padrão `Primary`; `currentColor`/herda cor do texto quando dentro de um Button `secondary`/`danger`).
- **Acessibilidade**: `role="status"`/`accessibilityLiveRegion="polite"` com texto acessível "Carregando" (nunca apenas visual).

### 2.13 Skeleton

- **Camada**: átomo · `atoms/Skeleton/`
- **Anatomia**: bloco retangular ou circular (espelha a forma do conteúdo real que vai substituir — texto, avatar, card) em `Muted`, com pulso de opacidade em loop.
- **Motion**: `opacity-subtle` ↔ `1`, `duration-slow`, `easing-standard`, loop suave (Dossiê 24 §10 "Loading").
- **Variantes de forma**: `text` (linha, altura igual à linha de tipografia que representa), `circle` (avatar), `rect` (card/imagem).
- **API conceitual**: `shape: "text" | "circle" | "rect"`, `width`, `height`, `count?: number` (repete N linhas, uso comum em skeleton de lista).
- **Regra de uso**: sempre a primeira opção de estado de carregamento de conteúdo estruturado (lista, card, tabela); o Spinner (Seção 2.12) é reservado para ações pontuais (botão, submissão) — nunca skeleton para um botão nem spinner para uma lista inteira.

### 2.14 Typography

- **Camada**: átomo · `atoms/Typography/`
- **Anatomia**: componente de texto puro, sem contêiner visual — um wrapper tipado sobre os 9 tokens da escala oficial (Dossiê 24 §4.4.2) mais `hero` (Dossiê 26 — headline gigante exclusivo da Landing Page, nunca usado em telas de produto).
- **API conceitual**: `variant: "hero" | "display" | "headline" | "title" | "subtitle" | "body" | "bodySmall" | "caption" | "overline" | "button"`, `color?: token` (por padrão `Text`), `as?` (web: elemento HTML semântico a renderizar — `h1`-`h6`/`p`/`span`; native: sempre `Text` do RN com `accessibilityRole` correspondente), `numberOfLines?` (truncamento com reticências).
- **Regra inegociável**: nenhuma tela usa `font-size`/`fontWeight` inline — toda apresentação de texto passa por este componente (Dossiê 24 §4.4.2, "hierarquia nunca por cor" se estende a "nunca por CSS solto").

---

## 3. Moléculas (`packages/ui/src/{web,native}/molecules/`)

Combinam 2+ átomos para resolver uma necessidade de UI coesa. Ainda API por props diretas (Dossiê 24 §12.2) — exceto onde notado.

### 3.1 PasswordInput

- **Camada**: molécula · `molecules/PasswordInput/` (compõe `atoms/Input` + `atoms/IconButton`)
- **Anatomia**: Input (Seção 2.4) → botão de alternância "mostrar/ocultar" (ícone `Eye`/`EyeOff`) à direita → [indicador de força de senha opcional, barra de 3 segmentos coloridos `Danger`/`Warning`/`Success`, usado apenas na tela de criação/alteração de senha, nunca no login].
- **Estados**: herda todos os de Input, mais `visible`/`hidden` (alterna `type="password"`/`"text"` no web, `secureTextEntry` no native).
- **API conceitual**: estende Input + `showStrengthMeter?: boolean`.
- **Acessibilidade**: o botão de alternância tem `aria-label`/`accessibilityLabel` dinâmico ("Mostrar senha"/"Ocultar senha").

### 3.2 OtpInput

- **Camada**: molécula · `molecules/OtpInput/` (compõe N `atoms/Input` de um único caractere)
- **Anatomia**: N caixas quadradas (padrão N=6, Dossiê 15 `AUTH-03`), uma por dígito, avanço automático de foco ao digitar, retrocesso automático no backspace em caixa vazia.
- **Estados**: `default` / `filled` (dígito preenchido, borda `Border Strong`) / `error` (todas as caixas em borda `Danger` + shake, Dossiê 24 §10 "Error") / `disabled` (durante verificação/reenvio).
- **API conceitual**: `length: number` (padrão 6), `value: string`, `onChange`/`onCodeFilled` (native: chamado quando todas as caixas são preenchidas), `hasError`, `isDisabled`.
- **Nota de plataforma**: mobile suporta autopreenchimento via SMS (`textContentType="oneTimeCode"` iOS / `autoComplete="sms-otp"` Android) — comportamento nativo, não replicável no web.

### 3.3 Textarea

- **Camada**: molécula · `molecules/Textarea/` (variação multi-linha do Input, tratada como molécula por gerenciar auto-resize)
- **Anatomia**: idêntica ao Input, altura variável (auto-cresce até um máximo de linhas, depois rola internamente).
- **API conceitual**: estende Input, mais `rows?: number` (altura inicial), `maxRows?: number`, `autoResize?: boolean` (padrão `true`).

### 3.4 SearchInput

- **Camada**: molécula · `molecules/SearchInput/` (compõe `atoms/Input` + ícone `Search` fixo à esquerda + `atoms/IconButton` "limpar" à direita)
- **Anatomia**: Input com ícone de lupa permanente à esquerda (nunca removível — reforça affordance de busca sem depender só do placeholder) → botão "x" que aparece apenas quando há texto digitado.
- **Estados**: `default` / `focused` / `hasQuery` (mostra botão limpar) / `isSearching` (Spinner substitui o ícone de lupa durante busca assíncrona com debounce).
- **API conceitual**: `value`, `onChange`, `onClear`, `debounceMs?: number` (padrão 300ms), `isSearching?: boolean`, `placeholder`.

### 3.5 FormField

_(molécula de suporte, não pedida explicitamente na lista original mas indispensável — compõe qualquer átomo de input com rótulo, texto de ajuda e mensagem de erro; sem ela, `Input`/`Checkbox`/`Select` isolados nunca teriam rótulo acessível, violando o Dossiê 24 §9)_

- **Camada**: molécula · `molecules/FormField/`
- **Anatomia**: rótulo (`Body Small`, peso 600) → [indicador "opcional"/asterisco obrigatório] → o campo filho (qualquer input) → texto de ajuda (`Caption`, `Text Muted`) **ou** mensagem de erro (`Caption`, `Danger`, substitui o texto de ajuda quando presente, nunca os dois simultâneos).
- **API conceitual**: `label: string`, `helperText?: string`, `errorText?: string`, `isRequired?: boolean`, `children: ReactNode` (o input/select/checkbox filho).
- **Acessibilidade**: gera o `id`/`htmlFor` (web) ou associa via `accessibilityLabelledBy` (native) automaticamente entre rótulo e campo — nenhum consumidor precisa gerenciar isso manualmente.

### 3.6 Autocomplete

- **Camada**: molécula · `molecules/Autocomplete/` (compõe `SearchInput` + lista suspensa de sugestões)
- **Anatomia**: SearchInput → lista suspensa (`z-dropdown`) de opções filtradas conforme digitação, cada opção destacando o trecho correspondente ao texto buscado → [estado vazio "nenhum resultado", Seção 3.9].
- **Estados**: `closed` / `open-loading` / `open-results` / `open-empty`.
- **API conceitual**: `value`, `onChange`, `options: T[]`, `onSelect: (option: T) => void`, `renderOption?`, `isLoading?`, `minCharsToSearch?: number` (padrão 2).
- **Acessibilidade**: `role="combobox"` + `aria-expanded`/`aria-activedescendant` (navegação por seta no web); native usa lista customizada com `accessibilityRole="menu"`.

### 3.7 Pagination

- **Camada**: molécula · `molecules/Pagination/` (compõe `IconButton` × 2 + botões de número de página)
- **Anatomia**: seta anterior → números de página (com reticências quando há muitas páginas, ex. `1 … 4 5 [6] 7 8 … 42`) → seta próxima → [texto "Página X de Y" em telas estreitas, substituindo os números por espaço].
- **API conceitual**: `currentPage: number`, `totalPages: number`, `onPageChange: (page: number) => void`, `siblingCount?: number` (padrão 1).
- **Nota de plataforma**: no app mobile, listas longas preferem _infinite scroll_ (Dossiê 13, padrão de API paginada por cursor) — Pagination numerada é majoritariamente um padrão do painel web/admin (tabelas).

### 3.8 ProgressBar

- **Camada**: molécula · `molecules/ProgressBar/`
- **Anatomia**: trilho (`Muted`, `radius-full`) → barra preenchida (`Primary`, mesma altura, `transition-transform` na largura via `scaleX`).
- **Variantes**: `determinate` (percentual conhecido, ex. upload de documento) / `indeterminate` (percentual desconhecido, animação de bloco deslizante em loop, ex. processamento no servidor).
- **API conceitual**: `value?: number` (0–100, omitido = indeterminate), `size: "sm" | "md"`, `label?: string` (texto de contexto acima, ex. "Enviando 2 de 5 arquivos").

### 3.9 EmptyState

- **Camada**: molécula · `molecules/EmptyState/`
- **Anatomia**: ilustração/ícone grande (32px+, `Text Muted`) → título (`Subtitle`) → descrição curta (`Body Small`, `Text Muted`) → [Button de ação primária opcional, ex. "Cadastrar primeiro aluno"].
- **Regra de conteúdo** (Dossiê 24 §2 "Inteligência"): a descrição sempre orienta o próximo passo concreto — nunca apenas "Nenhum item encontrado" sem indicar o que fazer a seguir.
- **API conceitual**: `icon: LucideIcon`, `title: string`, `description: string`, `actionLabel?: string`, `onAction?: () => void`.

### 3.10 ErrorState

- **Camada**: molécula · `molecules/ErrorState/`
- **Anatomia**: idêntica ao EmptyState, ícone em `Danger`, com botão de ação sempre presente ("Tentar novamente") — ao contrário do EmptyState, cuja ação é opcional.
- **API conceitual**: `title?: string` (padrão "Algo deu errado"), `description?: string`, `onRetry: () => void` (obrigatório).

### 3.11 OfflineState

- **Camada**: molécula · `molecules/OfflineState/`
- **Anatomia**: faixa compacta (não tela cheia — ao contrário de EmptyState/ErrorState) fixada no topo do conteúdo, ícone de wi-fi cortado + texto "Sem conexão — mostrando os últimos dados sincronizados" (`Warning`, nunca `Danger` — estar offline não é um erro crítico no contexto de GPS/rotas já carregadas, Dossiê 8 §6.6).
- **API conceitual**: `lastSyncedAt?: Date` (usado para compor a mensagem "última atualização há Xmin").

### 3.12 Alert

- **Camada**: molécula · `molecules/Alert/`
- **Anatomia**: bloco inline (dentro do fluxo da tela, não flutuante — diferença-chave em relação a Banner e Toast) com ícone semântico + título opcional + texto + [ação inline opcional, ex. link "Ver detalhes"].
- **Variantes semânticas**: `info`, `success`, `warning`, `danger` (cores do Dossiê 24 §4.1, sempre ícone + cor + texto juntos).
- **API conceitual**: `variant`, `title?: string`, `children: ReactNode`, `onDismiss?: () => void` (X opcional).

### 3.13 Banner

- **Camada**: molécula · `molecules/Banner/`
- **Anatomia**: faixa de largura total, fixada no topo da tela/seção (não inline como o Alert), usada para comunicados de escopo amplo (ex. "Manutenção programada às 22h", Dossiê 20 `SUP-*`).
- **Diferença de Alert**: Banner é de **contexto de aplicação** (afeta a tela toda ou o sistema inteiro), Alert é de **contexto local** (dentro de um formulário/card específico). Nunca usar um no lugar do outro.
- **API conceitual**: `variant`, `children`, `onDismiss?`, `actionLabel?`, `onAction?`.

### 3.14 Toast (unifica também "Snackbar")

- **Camada**: molécula · `molecules/Toast/`
- **Nota de unificação deliberada**: o briefing lista "Snackbar" e "Toast" como itens separados. Tratamos como **um único componente** — nas referências de mercado (Dossiê 24 §2.2) os dois nomes descrevem exatamente a mesma peça de UI (notificação transitória, não bloqueante, no canto/base da tela); mantê-los como dois componentes distintos criaria dois caminhos de código para o mesmo resultado visual, contrariando a regra do Dossiê 24 §12.5 ("isso é uma variante ou um componente novo?"). Todo texto de produto/documentação usa o nome **Toast**.
- **Anatomia**: bloco flutuante (`elevation-2`, `z-toast`) — ícone semântico + texto curto → [ação inline opcional, ex. "Desfazer"] → auto-dispensa após um tempo (padrão 4s), com barra de progresso sutil opcional.
- **Variantes semânticas**: `info`, `success`, `warning`, `danger`.
- **Comportamento de posição**: web — canto inferior direito (empilha até 3, mais antigo sai primeiro); mobile — base da tela, acima da tab bar, largura total menos margem.
- **API conceitual**: exposto via hook/serviço imperativo (`useToast().show({ variant, message, actionLabel?, onAction? })`), nunca como componente declarado diretamente numa árvore de tela — é sempre disparado por um evento (sucesso de submit, erro de rede).
- **Acessibilidade**: `role="status"`/`accessibilityLiveRegion="polite"`; nunca a única confirmação de uma ação crítica (ações críticas usam Dialog de confirmação, Seção 4.7, além do Toast de resultado).

### 3.15 StatisticCard

- **Camada**: molécula · `molecules/StatisticCard/` (compõe `atoms/Typography` + ícone + Badge de variação)
- **Anatomia**: rótulo (`Caption`, `Text Muted`) → valor grande (`Headline` ou `Display` em KPIs de destaque) → [ícone contextual] → [indicador de variação: seta + percentual, `Success`/`Danger` conforme sinal].
- **Uso**: cartões de KPI do Dashboard (Dossiê 19 `DASH-*`) — ex. "Alunos embarcados hoje: 128 (+4% vs. ontem)".
- **API conceitual**: `label: string`, `value: string | number`, `icon?: LucideIcon`, `trend?: { value: number; direction: "up" | "down" }`, `isLoading?: boolean` (mostra Skeleton no lugar do valor).

---

## 4. Organismos (`packages/ui/src/{web,native}/organisms/`)

Componentes com múltiplas partes relacionadas que compartilham estado — API via **Compound Components** onde a tabela do Dossiê 24 §12.2 exige (marcado explicitamente abaixo em cada item).

### 4.1 Select — _Compound_

- **Camada**: organismo · `organisms/Select/`
- **Anatomia**: `Select` (contêiner, gerencia estado aberto/fechado e valor selecionado via Context) → `Select.Trigger` (o campo visível, mesma aparência do Input com um chevron à direita) → `Select.Options` (lista suspensa, `z-dropdown`, `elevation-2`) → `Select.Option` (item individual, com estado `selected`/`highlighted`).
- **API conceitual**:

```
<Select value={value} onChange={setValue}>
  <Select.Trigger placeholder="Selecione a escola" />
  <Select.Options>
    <Select.Option value="a">Escola A</Select.Option>
    <Select.Option value="b">Escola B</Select.Option>
  </Select.Options>
</Select>
```

- **Estados**: `closed` / `open` / `disabled` / `hasError` (propagado ao `Trigger`, aparência igual ao Input com erro).
- **Acessibilidade**: `role="listbox"`/`role="option"` (web), navegação por seta + `Enter` para selecionar + `Esc` para fechar (Dossiê 24 §9).

### 4.2 Tabs — _Compound_

- **Camada**: organismo · `organisms/Tabs/`
- **Anatomia**: `Tabs` (contêiner, estado da aba ativa) → `Tabs.List` (linha de abas, com indicador deslizante `Primary` sob a aba ativa, `transition-transform`) → `Tabs.Tab` (rótulo individual, tipografia `Button`) → `Tabs.Panel` (conteúdo correspondente, só um visível por vez).
- **API conceitual**:

```
<Tabs value={tab} onChange={setTab}>
  <Tabs.List>
    <Tabs.Tab value="overview">Visão geral</Tabs.Tab>
    <Tabs.Tab value="history">Histórico</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="overview">...</Tabs.Panel>
  <Tabs.Panel value="history">...</Tabs.Panel>
</Tabs>
```

- **Variante**: `Tabs.List` com `scrollable` (quando o número de abas excede a largura, rola horizontalmente — comum no mobile).
- **Acessibilidade**: `role="tablist"`/`"tab"`/`"tabpanel"`, navegação por seta esquerda/direita entre abas (web).

### 4.3 Accordion — _Compound_

- **Camada**: organismo · `organisms/Accordion/`
- **Anatomia**: `Accordion` (contêiner, controla quais itens estão expandidos) → `Accordion.Item` → `Accordion.Trigger` (cabeçalho clicável, chevron que rotaciona 180° via `transition-transform`) → `Accordion.Content` (corpo, expande/colapsa com altura animada).
- **Variante**: `allowMultiple?: boolean` (padrão `false` — apenas um item aberto por vez, comportamento tipo FAQ).
- **API conceitual**:

```
<Accordion allowMultiple={false}>
  <Accordion.Item value="doc-1">
    <Accordion.Trigger>CNH do motorista</Accordion.Trigger>
    <Accordion.Content>...</Accordion.Content>
  </Accordion.Item>
</Accordion>
```

### 4.4 Stepper

- **Camada**: organismo · `organisms/Stepper/` (props diretas — sequência linear simples, sem partes com estado independente que justifiquem Compound, Dossiê 24 §12.2)
- **Anatomia**: linha horizontal (web)/vertical (mobile, telas estreitas) de círculos numerados conectados por uma linha → círculo preenchido `Primary` (concluído, com check no lugar do número) / contorno `Primary` (atual) / `Border` (futuro).
- **Uso**: fluxos multi-etapa (ex. cadastro de veículo com documentos, Dossiê 15 `VEI-02`).
- **API conceitual**: `steps: { label: string }[]`, `currentStep: number`, `onStepClick?: (index: number) => void` (navegação livre entre etapas já visitadas, nunca para etapas futuras não alcançadas).

### 4.5 Table — _Compound_

- **Camada**: organismo · `organisms/Table/`
- **Anatomia**: `Table` (contêiner, rolagem horizontal automática quando excede a largura) → `Table.Header` → `Table.Row` → `Table.Cell` (ou `Table.HeaderCell` com suporte a ordenação, ícone de seta) → [zebra opcional muito sutil (`opacity-subtle`), rodapé com `Pagination`].
- **Estados de linha**: `default` / `hover` (web, `Muted`) / `selected` (checkbox de linha marcado, fundo `Primary Muted`) / `loading` (linhas de `Skeleton`).
- **API conceitual**:

```
<Table>
  <Table.Header>
    <Table.HeaderCell sortable sortDirection="asc">Nome</Table.HeaderCell>
  </Table.Header>
  <Table.Row selected={isSelected}>
    <Table.Cell>Ana Souza</Table.Cell>
  </Table.Row>
</Table>
```

- **Nota de plataforma**: no app mobile, Table nunca é usada como grade densa (tela estreita) — a mesma informação tabular é reorganizada como lista de `Card`s empilhados (Dossiê 11 §7); Table é primariamente um componente do painel web/admin.

### 4.6 Modal — _Compound_

- **Camada**: organismo · `organisms/Modal/`
- **Anatomia**: overlay/scrim (`opacity-scrim`, `z-overlay`) → painel centralizado (`elevation-3`, `radius-lg`, `z-modal`) → `Modal.Header` (título `Subtitle` + botão fechar) → `Modal.Body` (conteúdo rolável se necessário) → `Modal.Footer` (ações, botões alinhados à direita no web / empilhados no mobile).
- **Comportamento de fechamento**: clique no scrim, `Esc` (web), botão "x", ou botão de ação — nunca fecha sozinho por timeout (diferente do Toast).
- **API conceitual**:

```
<Modal isOpen={open} onClose={close}>
  <Modal.Header>Confirmar exclusão</Modal.Header>
  <Modal.Body>...</Modal.Body>
  <Modal.Footer>
    <Button variant="ghost" onClick={close}>Cancelar</Button>
    <Button variant="danger" onClick={confirm}>Excluir</Button>
  </Modal.Footer>
</Modal>
```

- **Acessibilidade**: foco preso dentro do modal (_focus trap_) enquanto aberto; foco retorna ao elemento que abriu o modal ao fechar; `role="dialog"` + `aria-modal="true"`.

### 4.7 Drawer — _Compound_

- **Camada**: organismo · `organisms/Drawer/` (mesma API de `Modal.Header`/`Body`/`Footer`, herdadas)
- **Anatomia**: idêntica ao Modal, exceto que o painel desliza a partir de uma borda da tela (direita no web para painéis de detalhe/edição; base da tela no mobile, com alça de arraste no topo) em vez de aparecer centralizado.
- **Uso típico**: edição rápida de um registro sem sair da lista (ex. editar dados de um aluno a partir da tabela) — Modal é reservado para confirmações/formulários curtos, Drawer para formulários mais longos que se beneficiam de mais altura/largura.

### 4.8 Dialog — _Compound (herda de Modal)_

- **Camada**: organismo · `organisms/Dialog/`
- **Anatomia**: variação **restrita** do Modal — tamanho fixo pequeno, sempre título + texto curto + 1–2 botões, usada exclusivamente para **confirmação de ação crítica** (Dossiê 24 §2 "Segurança": "toda ação irreversível exige confirmação explícita"). Nunca contém formulário — se precisar de um campo de input, é um Modal, não um Dialog.
- **API conceitual**: `<Dialog title="Excluir rota?" description="Esta ação não pode ser desfeita." confirmLabel="Excluir" onConfirm={...} onCancel={...} isDanger />` — API de props diretas (não Compound) porque sua composição interna é sempre a mesma, sem variação de estrutura entre usos.

### 4.9 Tooltip

- **Camada**: organismo · `organisms/Tooltip/` (props diretas — envolve um único filho, sem múltiplas partes)
- **Anatomia**: rótulo curto (`Caption`) flutuante (`z-tooltip`, o nível mais alto do sistema, Dossiê 24 §4.10) próximo ao elemento-alvo, aparece no hover (web)/toque longo (mobile, uso raro).
- **API conceitual**: `<Tooltip content="Exportar como CSV"><IconButton .../></Tooltip>`.
- **Nota de plataforma**: no mobile, Tooltip é usado com moderação (não existe "hover" nativo) — preferir sempre um rótulo visível (Dossiê 24 §6.2) a depender de toque longo para revelar informação essencial.

### 4.10 Calendar

- **Camada**: organismo · `organisms/Calendar/` (props diretas — grade de dias com uma única fonte de estado, o mês/ano exibido)
- **Anatomia**: cabeçalho (mês/ano + setas de navegação) → grade de 7 colunas (dias da semana) × até 6 linhas → dia individual (`default`/`today`/`selected`/`inRange`/`disabled`).
- **Variante**: seleção única (`single`) ou intervalo (`range`, usado em relatórios por período, Dossiê 19 `REL-*`).
- **API conceitual**: `mode: "single" | "range"`, `value`, `onChange`, `minDate?`, `maxDate?`, `disabledDates?`.

### 4.11 DatePicker

- **Camada**: organismo · `organisms/DatePicker/` (compõe `atoms/Input` + `organisms/Calendar` dentro de um popover/`z-popover`)
- **Anatomia**: Input com ícone de calendário → ao focar/clicar, abre `Calendar` flutuante.
- **Nota de plataforma**: no mobile, abre o seletor de data **nativo** do sistema operacional (não o `Calendar` customizado) sempre que a plataforma o fornecer — respeita a convenção nativa (Dossiê 24 §2.2 "Apple — respeito às convenções nativas"); o `Calendar` customizado do catálogo é usado apenas no web e nos casos mobile de seleção de intervalo (que o seletor nativo não cobre bem).

### 4.12 TimePicker

- **Camada**: organismo · `organisms/TimePicker/`
- **Anatomia**: Input com ícone de relógio → seletor de hora:minuto (rolagem de colunas no mobile nativo; dropdown de horários pré-definidos em intervalos de 15min no web, com opção de digitar valor exato).
- **Uso**: horário de rota (Dossiê 18 `ROT-05`), janela de agenda (Dossiê 20 `AGE-*`).
- **API conceitual**: `value: string` (formato `HH:mm`), `onChange`, `minTime?`, `maxTime?`, `step?: number` (padrão 15min).

### 4.13 Card — _Compound_

- **Camada**: organismo · `organisms/Card/` — **base estrutural de todos os `*Card` especializados abaixo (4.14–4.24)**.
- **Anatomia**: contêiner (`Surface`/`Card` token, `radius-lg`, `border-hairline` `Border`, `elevation-0` por padrão) → `Card.Header` (título `Subtitle` + [ação/ícone à direita]) → `Card.Body` (conteúdo livre) → `Card.Footer` (ações, alinhadas à direita).
- **Variante**: `interactive?: boolean` (quando o card inteiro é clicável — ganha `hover`/`pressed` e `elevation-1` sutil no hover; card puramente informativo nunca reage ao hover).
- **API conceitual**:

```
<Card interactive onClick={openDetails}>
  <Card.Header title="Rota da Manhã" action={<IconButton icon={MoreVertical} label="Mais opções" />} />
  <Card.Body>...</Card.Body>
</Card>
```

### 4.14 MapCard

- **Camada**: organismo · `organisms/MapCard/` (compõe `Card` + o mapa embutido, Dossiê 24 §11)
- **Anatomia**: `Card` com `Card.Body` ocupado por um mapa em miniatura (altura fixa, ~180px), não interativo por padrão (toque abre o mapa em tela cheia — evita conflito de gesto de rolagem da página vs. pan do mapa, problema clássico de mapas embutidos em listas roláveis) → overlay com nome da rota/veículo sobre o canto inferior.
- **API conceitual**: `center: LatLng`, `markers: MapMarker[]`, `onExpand: () => void` (abre mapa em tela cheia), `isInteractive?: boolean` (raro, apenas em telas dedicadas de detalhe).

### 4.15 GpsCard

- **Camada**: organismo · `organisms/GpsCard/` (compõe `Card` + `Badge` + `Typography` — dados textuais de rastreamento, sem o mapa em si, complementar ao MapCard)
- **Anatomia**: ícone de veículo → velocidade atual (`Mono Data`) → "atualizado há Xs" (`Caption`, `Text Muted`, vira `Warning` quando o limiar de atraso do Dossiê 18 `GPS-06` é excedido) → Badge de status (`Em rota`/`Parado`/`Atrasado`/`Offline`).
- **API conceitual**: `speedKmh: number`, `lastUpdateAt: Date`, `status: "onRoute" | "stopped" | "delayed" | "offline"`.

### 4.16 VehicleCard

- **Camada**: organismo · `organisms/VehicleCard/` (compõe `Card` + `Avatar`/ícone de veículo + `Badge` + `Mono Data` para placa)
- **Anatomia**: foto/ícone do veículo → modelo + placa (`Mono Data`, Dossiê 24 §4.4.2) → capacidade (X/Y lugares) → Badge de status de documentação (`Em dia`/`A vencer`/`Vencido`, Dossiê 15 `VEI-*`).

### 4.17 StudentCard

- **Camada**: organismo · `organisms/StudentCard/` (compõe `Card` + `Avatar` + `Badge`)
- **Anatomia**: Avatar do aluno → nome + escola/turma (`Body Small`/`Caption`) → Badge de status do dia (`Aguardando`/`Embarcado`/`Desembarcado`/`Ausente`, Dossiê 16 `EMB-*`/`DESEMB-*`).

### 4.18 DriverCard

- **Camada**: organismo · `organisms/DriverCard/` (compõe `Card` + `Avatar` + `Badge` de verificação, Dossiê 24 §2.2 "Airbnb")
- **Anatomia**: Avatar (foto real priorizada) → nome → selo "Verificado" (ícone de escudo, `Success`) quando documentação/antecedentes aprovados → avaliação (estrelas, quando aplicável) → Badge de disponibilidade.

### 4.19 RouteCard

- **Camada**: organismo · `organisms/RouteCard/` (compõe `Card` + `Badge` + ícone de turno)
- **Anatomia**: nome da rota → turno (Manhã/Tarde, ícone sol/lua) → contagem de alunos → Badge de status operacional do dia (`No horário`/`Atrasada`/`Não iniciada`).

### 4.20 CompanyCard

- **Camada**: organismo · `organisms/CompanyCard/` (compõe `Card` + `Avatar` tipo logo + `Badge`)
- **Anatomia**: logo/inicial da empresa → nome fantasia/razão social → contagem de veículos/motoristas ativos → Badge de plano/status de assinatura (visão Admin Rotta, Dossiê 21 `ADM-*`).

### 4.21 SchoolCard

- **Camada**: organismo · `organisms/SchoolCard/` (compõe `Card` + `Avatar` + endereço)
- **Anatomia**: nome da escola → endereço (`Caption`) → contagem de alunos vinculados → Badge de status de integração/convênio.

### 4.22 ProfileCard

- **Camada**: organismo · `organisms/ProfileCard/` (compõe `Card` + `Avatar` grande + ações)
- **Anatomia**: Avatar `lg`/`xl` → nome + papel (Motorista/Responsável/Gestor/Escola) → dados de contato → botões de ação (editar, mensagem) — usado no topo de qualquer tela de perfil/detalhe de pessoa.

### 4.23 NotificationCard

- **Camada**: organismo · `organisms/NotificationCard/` (compõe `Card` + ícone semântico + `Typography` + estado de lido/não lido)
- **Anatomia**: ícone por tipo de notificação (embarque/atraso/documento/sistema, Dossiê 17 `NOTIF-*`) → título + corpo (`Body Small`) → timestamp relativo (`Caption`) → indicador de não lida (ponto `Primary` à esquerda, removido ao abrir).
- **API conceitual**: `type`, `title`, `body`, `timestamp`, `isRead: boolean`, `onClick`/`onPress` (marca como lida e navega ao contexto, ex. abre a viagem correspondente).

### 4.24 ChartCard

- **Camada**: organismo · `organisms/ChartCard/` (compõe `Card` + biblioteca de gráfico — a escolha da lib de charting é uma decisão de implementação de `packages/ui`, não deste dossiê; a interface deste componente é agnóstica à lib escolhida)
- **Anatomia**: `Card.Header` (título + seletor de período opcional) → área de gráfico (linha/barra/pizza, sempre em tons de `Primary`/`Neutral`, nunca uma paleta multicolorida decorativa — reforça Dossiê 24 §2.1 "nunca excesso de cores") → legenda compacta abaixo.
- **Estados**: `loading` (Skeleton `rect` no lugar do gráfico) / `empty` (EmptyState compacto, "Sem dados suficientes para este período") / `loaded`.

---

## 5. Mapeamento consolidado: token → componentes que o consomem (amostra de rastreabilidade)

Tabela de verificação cruzada — usada para garantir que nenhum componente introduz um valor fora do Dossiê 24 (Seção 4):

| Token (Dossiê 24)                             | Consumido por (exemplos)                                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Primary` / `Primary Hover` / `Primary Muted` | Button, FAB, Switch (on), Chip (selected), Select.Option (selected), indicador de Tabs                                                 |
| `Danger`                                      | Button (`variant=danger`), Alert/Banner/Toast (`variant=danger`), Input (`hasError`), Dialog (`isDanger`), Badge (documentos vencidos) |
| `elevation-2`                                 | Select.Options, DatePicker/TimePicker popover, Tooltip, FAB                                                                            |
| `elevation-3`                                 | Modal, Drawer, Dialog                                                                                                                  |
| `z-toast` / `z-tooltip`                       | Toast / Tooltip (respectivamente — Tooltip é sempre o nível mais alto)                                                                 |
| `transition-transform`                        | Button (press), FAB (press), Accordion (chevron/altura), Toast (entrada/saída), ProgressBar (preenchimento)                            |
| `Mono Data`                                   | GpsCard (velocidade), VehicleCard (placa), Table (colunas numéricas/CPF/CNPJ)                                                          |
| `opacity-subtle`                              | Skeleton (pulso), Table (zebra opcional), ChartCard (grid do gráfico)                                                                  |

---

## 6. Lista consolidada final de componentes

| #   | Componente                | Camada    | Compound?           | Web | Native                                |
| --- | ------------------------- | --------- | ------------------- | --- | ------------------------------------- |
| 1   | Button                    | Átomo     | Não                 | ✅  | ✅                                    |
| 2   | IconButton                | Átomo     | Não                 | ✅  | ✅                                    |
| 3   | FAB                       | Átomo     | Não                 | ✅  | ✅                                    |
| 4   | Input                     | Átomo     | Não                 | ✅  | ✅                                    |
| 5   | Checkbox                  | Átomo     | Não                 | ✅  | ✅                                    |
| 6   | Radio                     | Átomo     | Não                 | ✅  | ✅                                    |
| 7   | Switch                    | Átomo     | Não                 | ✅  | ✅                                    |
| 8   | Avatar                    | Átomo     | Não                 | ✅  | ✅                                    |
| 9   | Badge                     | Átomo     | Não                 | ✅  | ✅                                    |
| 10  | Chip                      | Átomo     | Não                 | ✅  | ✅                                    |
| 11  | Divider                   | Átomo     | Não                 | ✅  | ✅                                    |
| 12  | Spinner (Loading)         | Átomo     | Não                 | ✅  | ✅                                    |
| 13  | Skeleton                  | Átomo     | Não                 | ✅  | ✅                                    |
| 14  | Typography                | Átomo     | Não                 | ✅  | ✅                                    |
| 15  | PasswordInput             | Molécula  | Não                 | ✅  | ✅                                    |
| 16  | OtpInput                  | Molécula  | Não                 | ✅  | ✅                                    |
| 17  | Textarea                  | Molécula  | Não                 | ✅  | ✅                                    |
| 18  | SearchInput               | Molécula  | Não                 | ✅  | ✅                                    |
| 19  | FormField                 | Molécula  | Não                 | ✅  | ✅                                    |
| 20  | Autocomplete              | Molécula  | Não                 | ✅  | ✅                                    |
| 21  | Pagination                | Molécula  | Não                 | ✅  | Uso raro (infinite scroll preferido)  |
| 22  | ProgressBar               | Molécula  | Não                 | ✅  | ✅                                    |
| 23  | EmptyState                | Molécula  | Não                 | ✅  | ✅                                    |
| 24  | ErrorState                | Molécula  | Não                 | ✅  | ✅                                    |
| 25  | OfflineState              | Molécula  | Não                 | ✅  | ✅                                    |
| 26  | Alert                     | Molécula  | Não                 | ✅  | ✅                                    |
| 27  | Banner                    | Molécula  | Não                 | ✅  | ✅                                    |
| 28  | Toast (inclui "Snackbar") | Molécula  | Não                 | ✅  | ✅                                    |
| 29  | StatisticCard             | Molécula  | Não                 | ✅  | ✅                                    |
| 30  | Select                    | Organismo | **Sim**             | ✅  | ✅                                    |
| 31  | Tabs                      | Organismo | **Sim**             | ✅  | ✅                                    |
| 32  | Accordion                 | Organismo | **Sim**             | ✅  | ✅                                    |
| 33  | Stepper                   | Organismo | Não                 | ✅  | ✅                                    |
| 34  | Table                     | Organismo | **Sim**             | ✅  | Uso raro (Card empilhado preferido)   |
| 35  | Modal                     | Organismo | **Sim**             | ✅  | ✅                                    |
| 36  | Drawer                    | Organismo | **Sim**             | ✅  | ✅                                    |
| 37  | Dialog                    | Organismo | Não (props diretas) | ✅  | ✅                                    |
| 38  | Tooltip                   | Organismo | Não                 | ✅  | Uso moderado                          |
| 39  | Calendar                  | Organismo | Não                 | ✅  | ✅ (casos de intervalo)               |
| 40  | DatePicker                | Organismo | Não                 | ✅  | ✅ (delega ao nativo quando possível) |
| 41  | TimePicker                | Organismo | Não                 | ✅  | ✅ (delega ao nativo quando possível) |
| 42  | Card                      | Organismo | **Sim**             | ✅  | ✅                                    |
| 43  | MapCard                   | Organismo | Não                 | ✅  | ✅                                    |
| 44  | GpsCard                   | Organismo | Não                 | ✅  | ✅                                    |
| 45  | VehicleCard               | Organismo | Não                 | ✅  | ✅                                    |
| 46  | StudentCard               | Organismo | Não                 | ✅  | ✅                                    |
| 47  | DriverCard                | Organismo | Não                 | ✅  | ✅                                    |
| 48  | RouteCard                 | Organismo | Não                 | ✅  | ✅                                    |
| 49  | CompanyCard               | Organismo | Não                 | ✅  | ✅                                    |
| 50  | SchoolCard                | Organismo | Não                 | ✅  | ✅                                    |
| 51  | ProfileCard               | Organismo | Não                 | ✅  | ✅                                    |
| 52  | NotificationCard          | Organismo | Não                 | ✅  | ✅                                    |
| 53  | ChartCard                 | Organismo | Não                 | ✅  | ✅                                    |

**53 componentes** cobrem integralmente a lista solicitada (incluindo a unificação deliberada de Snackbar+Toast, Seção 3.14, e a adição justificada de `FormField` como suporte indispensável de acessibilidade de formulários, Seção 3.5).

---

## 7. Fechamento — regra de autoridade

Este dossiê, junto ao Dossiê 24, é **definitivo e vinculante**: toda tela nova da Rotta (Landing Page, Dashboard Web, Painel Administrativo, App Android, App iOS) é composta **exclusivamente** a partir dos 53 componentes acima e dos tokens do Dossiê 24. A implementação de código correspondente vive em `packages/ui/src/web` e `packages/ui/src/native`, seguindo exatamente a estrutura de pastas e nomenclatura da Seção 12.3/12.4 do Dossiê 24. Qualquer necessidade não coberta por este catálogo exige, primeiro, revisitar a Seção 12.5 do Dossiê 24 ("isso é uma variante ou um componente novo?") antes de qualquer código ser escrito — e, se for genuinamente um componente novo, a atualização deste dossiê no mesmo Pull Request que o introduz.
