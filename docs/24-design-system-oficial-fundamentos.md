# Dossiê 24 — Design System Oficial da Rotta: Identidade, Tokens e Fundamentos

> **Este é o Design System Oficial da Rotta.** Junto ao Dossiê 25 (Catálogo Completo de Componentes), é a fonte única de verdade da interface em toda a plataforma — Landing Page, Dashboard Web, Painel Administrativo, App Android e App iOS. **Nenhum componente, cor, espaçamento, fonte ou animação pode ser criado fora do que está definido aqui.** Este dossiê consolida, formaliza e estende os fundamentos já estabelecidos no Dossiê 10 (Design System — fundamentos iniciais) e implementados em código em `packages/theme`; onde há conflito, **este documento prevalece** e o código é atualizado para segui-lo (ver Seção 13).

---

## 1. Preâmbulo: o que este documento é e não é

Este é um documento de **contrato de interface**, não uma galeria de inspiração. Cada valor aqui (um hexadecimal, um número de pixel, uma duração de animação) é uma decisão tomada, testada contra os princípios da Seção 2, e vinculante. Um desenvolvedor implementando qualquer tela da Rotta — web, Android ou iOS — deve conseguir montar a interface inteira consultando apenas este dossiê e o Dossiê 25, sem precisar adivinhar nem inventar um valor novo.

A organização de código correspondente já existe em `packages/theme` (tokens) e `packages/ui` (componentes, organizados em `web/` e `native/` — ver Seção 13.3). Este documento é a especificação; o código é a implementação. Os dois são mantidos em sincronia — qualquer mudança de token passa primeiro por uma atualização deste documento.

---

## 2. Identidade de marca → decisões de design

A marca Rotta é construída sobre seis conceitos. Cada um se traduz em uma regra de design concreta e verificável — nunca um adjetivo solto sem consequência prática:

| Conceito         | Tradução em decisão de design                                                                                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Segurança**    | Toda ação irreversível ou crítica exige confirmação explícita (nunca um gesto ambíguo); contraste de texto sempre AA ou superior; estados de erro nunca são sutis — usam cor, ícone e texto simultaneamente (nunca um único sinal).                                                               |
| **Mobilidade**   | Toda decisão de UI é validada primeiro no viewport de 375px (Seção 8) antes do desktop; componentes leves, sem dependência de bibliotecas pesadas; área de toque mínima de 44×44px em qualquer superfície tocável.                                                                                |
| **Tecnologia**   | Tipografia Inter (Seção 4.4), ícones lineares consistentes (Seção 6), tema escuro como padrão de marca (Seção 5) — a mesma linguagem visual de produtos de tecnologia de referência (Linear, Vercel, Stripe), nunca a estética de um sistema de gestão legado.                                    |
| **Confiança**    | Consistência absoluta: o mesmo componente sempre parece e se comporta da mesma forma em qualquer tela; nenhuma surpresa visual; a paleta é deliberadamente restrita (Seção 2.1 do briefing: "azul apenas para destaque") para que o usuário nunca precise decodificar um significado novo de cor. |
| **Simplicidade** | Muito espaço negativo (escala de espaçamento generosa, Seção 4.2); no máximo uma ação primária por tela; hierarquia construída por tipografia, nunca por decoração.                                                                                                                               |
| **Inteligência** | Estados vazios e de erro sempre orientam o próximo passo (nunca um beco sem saída); feedback de toda ação em menos de 150ms percebido (Seção 10); dados densos apresentados com clareza tabular (fontes com números tabulares, Seção 4.4).                                                        |

### 2.1 O que nunca fazemos (regras negativas, tão importantes quanto as positivas)

- Nunca mais de uma cor de destaque simultânea em uma tela (o azul primário nunca compete consigo mesmo).
- Nunca sombra dramática — profundidade vem de diferença de tom entre camadas (Seção 4.5), sombra é reforço sutil, não o mecanismo primário.
- Nunca decoração sem função — todo ícone, toda cor, todo espaçamento carrega significado.
- Nunca uma tela com mais de 7±2 elementos de decisão simultâneos (limite cognitivo clássico) — se uma tela precisa de mais, ela é duas telas.

### 2.2 O que aprendemos de cada referência

| Referência            | O que extraímos, especificamente                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Uber**              | Uma tela = um estado = uma verdade. O mapa em tempo real nunca compete com texto por atenção.                                                           |
| **Stripe**            | Densidade de dado com clareza — tabelas e números complexos sem parecer complicado; números tabulares e monoespaçados para dado financeiro/operacional. |
| **Airbnb**            | Confiança via prova social e fotografia real (perfil de motorista com foto e selo verificado, Dossiê 10 §1).                                            |
| **Google** (Material) | Sistema de elevação por camadas como linguagem de profundidade, adaptado aqui para ser mais sutil (Seção 4.5).                                          |
| **Apple** (HIG)       | Restrição deliberada — cada tela tem um propósito único; respeito rigoroso às convenções nativas de navegação por plataforma (Seção 12.4).              |
| **Notion**            | Hierarquia por tipografia (peso/tamanho), nunca por cor ou borda decorativa.                                                                            |
| **Linear**            | Velocidade percebida — toda interação responde instantaneamente; atalhos de teclado; paleta quase monocromática com uma única cor de destaque.          |
| **Vercel**            | Tema escuro como identidade primária da marca, não uma opção secundária; tipografia geométrica de altíssima legibilidade em telas.                      |

---

## 3. Tokens — visão geral

Todo valor visual do produto é um token nomeado, nunca um valor solto no código de uma tela. Os tokens vivem em `packages/theme` (Dossiê 22 §5.2), organizados nas onze categorias abaixo. Cada categoria tem uma função clara e não se sobrepõe às demais.

| Categoria   | Arquivo em `packages/theme/src/tokens/` | Resolve o quê                                                              |
| ----------- | --------------------------------------- | -------------------------------------------------------------------------- |
| Colors      | `colors.ts`                             | Toda cor de fundo, texto, borda e estado semântico                         |
| Spacing     | `spacing.ts`                            | Todo espaçamento (padding, margin, gap)                                    |
| Radius      | `radius.ts`                             | Todo raio de borda                                                         |
| Typography  | `typography.ts`                         | Toda combinação de tamanho/peso/altura de linha de texto                   |
| Elevation   | `elevation.ts`                          | Toda percepção de profundidade/camada                                      |
| Border      | `border.ts`                             | Toda espessura de borda                                                    |
| Motion      | `motion.ts`                             | Toda duração e curva de animação                                           |
| Opacity     | `opacity.ts`                            | Toda transparência (overlay, disabled, scrim)                              |
| Breakpoints | `breakpoints.ts`                        | Todo ponto de quebra responsivo                                            |
| Z-index     | `z-index.ts`                            | Toda ordem de empilhamento visual                                          |
| Transitions | `transitions.ts`                        | Combinações prontas de propriedade+duração+curva para os casos mais comuns |

---

## 4. Tokens em detalhe

### 4.1 Colors — a paleta completa (15 categorias)

Reafirmando a filosofia do Dossiê 10 §6.1: a marca se restringe a azul, preto, branco e cinza, com exceção deliberada e mínima das cores semânticas de estado. A tabela abaixo é a paleta **completa e oficial**, incluindo as categorias adicionais pedidas nesta rodada (Secondary, Info, Neutral, Card, Disabled, Placeholder, Muted), que estendem — nunca contradizem — os tokens já implementados em código.

| Token                | Dark                                              | Light                                             | Uso                                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary**          | `#3B6EF6`                                         | `#2F5FE0`                                         | Exclusivamente destaque: ação principal, link, ícone ativo, marca. Nunca em blocos grandes de conteúdo.                                                                                                          |
| **Primary Hover**    | `#5A8CFF`                                         | `#1E4BC7`                                         | Estado de hover/pressed do Primary.                                                                                                                                                                              |
| **Primary Muted**    | `#1B2B4D`                                         | `#E8EEFF`                                         | Fundo sutil de item ativo/selecionado (nunca o Primary sólido como fundo de área extensa).                                                                                                                       |
| **Secondary**        | `#E5E8EC`                                         | `#4B5563`                                         | Ações de segunda prioridade — neutro, nunca azul, para não competir com o Primary.                                                                                                                               |
| **Success**          | `#22C55E`                                         | `#16A34A`                                         | Confirmação, conclusão, documento em dia, rota no horário.                                                                                                                                                       |
| **Danger**           | `#EF4444`                                         | `#DC2626`                                         | Erro, bloqueio, ocorrência grave, exclusão, SOS.                                                                                                                                                                 |
| **Warning**          | `#F5A623`                                         | `#D97706`                                         | Atenção não crítica — atraso, vencimento próximo, ação pendente.                                                                                                                                                 |
| **Info**             | `#22D3EE`                                         | `#0891B2`                                         | Mensagens informativas neutras (dica, aviso não urgente) — deliberadamente um ciano, nunca o mesmo tom do Primary, para que "informação" e "ação principal" nunca se confundam visualmente.                      |
| **Neutral** (escala) | `neutral-100` `#1C212B` → `neutral-900` `#F5F7FA` | `neutral-100` `#F7F8FA` → `neutral-900` `#0B0F14` | Escala de 5 degraus (100/300/500/700/900) para necessidades de UI que não se encaixam em `text`/`surface` (ex. ícone inativo, divisor sutil). Ver Seção 4.1.1.                                                   |
| **Background**       | `#0B0F14`                                         | `#FFFFFF`                                         | Fundo base de toda a aplicação.                                                                                                                                                                                  |
| **Surface**          | `#12161D`                                         | `#F7F8FA`                                         | Painéis, sidebar, cabeçalho de tabela, superfícies estruturais.                                                                                                                                                  |
| **Card**             | `#151A22`                                         | `#FFFFFF` (com `Border`)                          | Contêiner de conteúdo discreto (Seção "Card" do Dossiê 25) — hoje muito próximo de `Surface`, mantido como token semântico próprio para permitir diferenciação futura sem quebrar contrato de nenhum componente. |
| **Border**           | `#232A35`                                         | `#E5E8EC`                                         | Divisor sutil padrão.                                                                                                                                                                                            |
| **Border Strong**    | `#333C4A`                                         | `#C7CDD6`                                         | Borda de campo em foco, separador de maior ênfase.                                                                                                                                                               |
| **Disabled**         | fundo `#1C212B` / texto `#5C6673`                 | fundo `#F1F2F4` / texto `#A6ACB5`                 | Estado desabilitado de qualquer componente interativo.                                                                                                                                                           |
| **Placeholder**      | `#6B7484`                                         | `#9CA3AF`                                         | Texto de espaço reservado em inputs — deliberadamente mais dessaturado que `Text Muted`, nunca confundível com dado real preenchido.                                                                             |
| **Text**             | `#F5F7FA`                                         | `#0B0F14`                                         | Texto principal.                                                                                                                                                                                                 |
| **Text Muted**       | `#9AA4B2`                                         | `#6B7280`                                         | Texto secundário, metadado, legenda.                                                                                                                                                                             |
| **Muted** (fundo)    | `#161B24`                                         | `#F1F2F4`                                         | Fundo neutro sutil para realce não semântico (ex. linha de tabela em hover, fundo de bloco de código) — distinto de `Primary Muted` (que carrega significado de "selecionado/ativo").                            |

#### 4.1.1 A escala Neutral

Uma escala numerada de 5 degraus, usada quando nenhum dos tokens semânticos acima resolve a necessidade (ex. um ícone "meio apagado" que não é bem `Text Muted` nem `Disabled`):

| Degrau        | Dark      | Light     |
| ------------- | --------- | --------- |
| `neutral-100` | `#1C212B` | `#F7F8FA` |
| `neutral-300` | `#2A313D` | `#E5E8EC` |
| `neutral-500` | `#5C6673` | `#9CA3AF` |
| `neutral-700` | `#9AA4B2` | `#4B5563` |
| `neutral-900` | `#F5F7FA` | `#0B0F14` |

**Regra de uso**: a escala Neutral é o último recurso, não o primeiro. Se um token semântico (Text, Border, Surface, Muted) resolve o caso, ele é sempre preferido — a escala Neutral existe para os 5% de casos de UI genuinamente sem significado semântico.

### 4.2 Spacing

Unidade base de 4px (Dossiê 10 §2.4, inalterado):

| Token      | Valor |
| ---------- | ----- |
| `space-0`  | 0px   |
| `space-1`  | 4px   |
| `space-2`  | 8px   |
| `space-3`  | 12px  |
| `space-4`  | 16px  |
| `space-6`  | 24px  |
| `space-8`  | 32px  |
| `space-12` | 48px  |
| `space-16` | 64px  |
| `space-24` | 96px  |

### 4.3 Radius

| Token         | Valor  | Uso                                        |
| ------------- | ------ | ------------------------------------------ |
| `radius-sm`   | 6px    | Badges, tags, checkboxes, inputs pequenos  |
| `radius-md`   | 10px   | Botões, inputs padrão, itens de lista      |
| `radius-lg`   | 16px   | Cards, modais, painéis flutuantes          |
| `radius-xl`   | 24px   | Blocos de destaque (hero, imagens grandes) |
| `radius-full` | 9999px | Avatares, pills, FAB                       |

### 4.4 Typography

#### 4.4.1 Escolha da fonte — Inter

**Decisão**: **Inter**, em toda a plataforma (web, Android, iOS) — nenhuma fonte de sistema nativa (SF Pro/Roboto) é usada, garantindo que a marca pareça idêntica em qualquer dispositivo.

**Justificativa comparativa**:

| Critério                                                               | Inter                                              | SF Pro (Apple)                                      | Roboto (Android)                                            | Fontes pagas (Söhne/GT America)                   |
| ---------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------- |
| Licença                                                                | Open-source (SIL), uso livre e ilimitado           | Restrita à Apple, não pode ser usada em Android/Web | Open-source, mas...                                         | Paga por licença/uso, custo recorrente em escala  |
| Desenhada para telas pequenas                                          | Sim — x-height alto, ótima legibilidade em 12-14px | Sim                                                 | Parcial — mais genérica, associação visual "Android padrão" | Varia                                             |
| Números tabulares (crítico para dashboards densos, Seção 2.2 "Stripe") | Sim, nativo                                        | Sim                                                 | Limitado                                                    | Varia                                             |
| Fonte variável (1 arquivo, todos os pesos, footprint pequeno)          | Sim                                                | Sim (apenas Apple)                                  | Não nativamente                                             | Raramente                                         |
| Cobertura de acentuação em português                                   | Completa                                           | Completa                                            | Completa                                                    | Varia                                             |
| Consistência de marca entre iOS/Android/Web                            | Total (mesma fonte nos três)                       | Só resolve iOS                                      | Só resolve Android                                          | Total, mas com custo                              |
| Uso por produtos de referência (Seção 2.2)                             | Padrão de fato em produtos "Linear-like"           | —                                                   | —                                                           | Stripe usa Söhne (paga); não replicável sem custo |

Inter vence por ser a única opção que é simultaneamente gratuita, desenhada para tela, com números tabulares nativos, e capaz de garantir **identidade visual idêntica** nas três plataformas — o requisito mais alinhado ao conceito de marca "Confiança" (Seção 2: "o mesmo componente sempre parece igual").

#### 4.4.2 Escala tipográfica oficial

Nomenclatura oficial (substituindo a nomenclatura genérica `h1`/`h2`/`h3` usada na primeira versão do Dossiê 10 — ver nota de migração na Seção 13.1):

| Token                                                     | Tamanho / Altura de linha | Peso                                      | Uso                                                                      |
| --------------------------------------------------------- | ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| **Display**                                               | 40 / 48px (mobile: 32/40) | 700                                       | Hero da Landing Page, número de destaque em KPI muito grande             |
| **Headline**                                              | 32 / 40px (mobile: 26/32) | 700                                       | Título de tela principal (ex. "Dashboard", "Alunos")                     |
| **Title**                                                 | 24 / 32px                 | 600                                       | Título de seção dentro de uma tela                                       |
| **Subtitle**                                              | 20 / 28px                 | 600                                       | Título de card/bloco, cabeçalho de modal                                 |
| **Body**                                                  | 16 / 24px                 | 400                                       | Texto de leitura confortável, descrições importantes                     |
| **Body Small**                                            | 14 / 20px                 | 400                                       | Texto padrão de interface densa (tabelas, formulários, listas)           |
| **Caption**                                               | 12 / 16px                 | 400                                       | Metadados, timestamps, textos auxiliares                                 |
| **Overline**                                              | 11 / 16px                 | 600, uppercase, `letter-spacing: 0.6px`   | Rótulo de categoria/eyebrow acima de um título (ex. "ROTA · MANHÃ")      |
| **Button**                                                | 14 / 20px                 | 600, `letter-spacing: 0.2px`              | Texto de botão, tab, chip acionável                                      |
| **Mono Data** _(utilitário, fora da escala oficial de 8)_ | 14 / 20px                 | 500, `font-variant-numeric: tabular-nums` | Placas, CPF/CNPJ, horários — qualquer dado que precise alinhar em coluna |

**Regra de hierarquia** (Dossiê 10 §3.3, reafirmada): a hierarquia visual é construída por esta escala (tamanho/peso), nunca por cor.

### 4.5 Elevation

Sistema de 4 níveis (Dossiê 10 §9.3, formalizado): a profundidade vem primariamente da progressão tonal `Background → Surface → Card → Surface Elevated`, nunca de sombra pesada.

| Nível                    | Uso                                      | Sombra (web)                 | Native (iOS shadow / Android elevation) |
| ------------------------ | ---------------------------------------- | ---------------------------- | --------------------------------------- |
| `elevation-0` (none)     | Estado padrão de qualquer card/painel    | nenhuma                      | nenhuma                                 |
| `elevation-1` (card)     | Reforço sutil opcional (card sobre card) | `0 1px 2px rgba(0,0,0,.24)`  | shadowRadius 2 / elevation 1            |
| `elevation-2` (dropdown) | Menus, popovers                          | `0 4px 12px rgba(0,0,0,.32)` | shadowRadius 12 / elevation 4           |
| `elevation-3` (modal)    | Modais, dialogs, drawers                 | `0 8px 24px rgba(0,0,0,.4)`  | shadowRadius 24 / elevation 8           |

### 4.6 Border (espessura)

Nova categoria de token — não confundir com a **cor** de borda (Seção 4.1). Define a **espessura**:

| Token             | Valor                                                | Uso                                                                                                      |
| ----------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `border-hairline` | 1px (0.5px físico em telas @2x/@3x quando suportado) | Divisores discretos, borda padrão de card                                                                |
| `border-thin`     | 1px                                                  | Borda padrão de input, borda de badge                                                                    |
| `border-medium`   | 2px                                                  | Anel de foco (acessibilidade, Seção 9), borda de estado ativo                                            |
| `border-thick`    | 4px                                                  | Barra lateral de alerta (Dossiê 10 §9.7), indicador de seleção forte — uso raro, deliberadamente incomum |

### 4.7 Motion (duração e curva)

Reafirmando o Dossiê 11 §8 e Dossiê 22 §5.2, formalizado como token de primeira classe:

| Token               | Valor                                                 |
| ------------------- | ----------------------------------------------------- |
| `duration-instant`  | 0ms                                                   |
| `duration-fast`     | 100ms                                                 |
| `duration-base`     | 150ms                                                 |
| `duration-moderate` | 200ms                                                 |
| `duration-slow`     | 250ms                                                 |
| `duration-emphasis` | 300ms (teto — nenhuma animação de UI ultrapassa isso) |
| `easing-standard`   | `cubic-bezier(0.2, 0, 0, 1)`                          |
| `easing-decelerate` | `cubic-bezier(0, 0, 0, 1)`                            |
| `easing-accelerate` | `cubic-bezier(0.3, 0, 1, 1)`                          |

### 4.8 Opacity

Nova categoria de token:

| Token                     | Valor | Uso                                                                                    |
| ------------------------- | ----- | -------------------------------------------------------------------------------------- |
| `opacity-disabled`        | 0.4   | Componente desabilitado (aplicado sobre o token `Disabled` quando necessário reforçar) |
| `opacity-hover-overlay`   | 0.08  | Camada de overlay branco/preto sobre um elemento em hover                              |
| `opacity-pressed-overlay` | 0.12  | Camada de overlay em estado pressed                                                    |
| `opacity-subtle`          | 0.06  | Fundo quase imperceptível (ex. faixa zebrada muito sutil, quando usada)                |
| `opacity-scrim`           | 0.6   | Overlay escuro atrás de modal/drawer                                                   |
| `opacity-strong`          | 0.87  | Texto de alto contraste sobre imagem/mapa                                              |

### 4.9 Breakpoints

Formalizando o Dossiê 10 §2.2 como token:

| Token   | Largura mínima | Dispositivo típico            |
| ------- | -------------- | ----------------------------- |
| `bp-xs` | 0px            | Celulares compactos           |
| `bp-sm` | 480px          | Celulares padrão              |
| `bp-md` | 768px          | Tablets (retrato)             |
| `bp-lg` | 1024px         | Tablets (paisagem), notebooks |
| `bp-xl` | 1440px         | Desktops e monitores grandes  |

### 4.10 Z-index

Nova categoria — escala única para toda sobreposição visual, evitando a prática comum de "z-index: 9999" ad-hoc:

| Token        | Valor | Uso                                                         |
| ------------ | ----- | ----------------------------------------------------------- |
| `z-base`     | 0     | Conteúdo normal de página                                   |
| `z-dropdown` | 1000  | Menus suspensos, select expandido                           |
| `z-sticky`   | 1100  | Cabeçalho/sidebar fixos ao rolar                            |
| `z-overlay`  | 1200  | Scrim de fundo de modal/drawer                              |
| `z-modal`    | 1300  | Modal, dialog, drawer                                       |
| `z-popover`  | 1400  | Popover, date picker flutuante                              |
| `z-toast`    | 1500  | Toast/snackbar                                              |
| `z-tooltip`  | 1600  | Tooltip (sempre o nível mais alto — nunca coberto por nada) |

### 4.11 Transitions (presets compostos)

Combinações prontas de propriedade + duração + curva para os padrões mais recorrentes — nenhum componente declara `transition`/`Animated.timing` com valores soltos, sempre um destes presets:

| Token                  | Composição                                                                  | Uso típico                                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transition-color`     | `color/background-color/border-color` + `duration-base` + `easing-standard` | Hover de botão, mudança de estado de campo                                                                                                                                          |
| `transition-transform` | `transform` + `duration-base` + `easing-standard`                           | Escala de press, expansão de accordion                                                                                                                                              |
| `transition-opacity`   | `opacity` + `duration-moderate` + `easing-standard`                         | Fade de toast, skeleton → conteúdo                                                                                                                                                  |
| `transition-shadow`    | `box-shadow/elevation` + `duration-base` + `easing-standard`                | Elevação ao abrir menu/popover                                                                                                                                                      |
| `transition-all-fast`  | `all` + `duration-fast` + `easing-standard`                                 | Reservado a casos onde múltiplas propriedades mudam juntas de forma simples (ex. badge de contagem) — uso deliberadamente raro, `all` é evitado por padrão por custo de performance |

---

## 5. Temas: Dark e Light

Reafirmando e fechando o Dossiê 10 §7:

- **Dark é o tema padrão de toda a plataforma**, em todas as superfícies (Landing, Dashboard, Painel Admin, Android, iOS) — não depende de `prefers-color-scheme` na primeira abertura. É a decisão de identidade de marca (Seção 2.2: "Vercel — tema escuro como identidade primária, não secundária").
- **Light é oferecido como preferência explícita do usuário**, persistida por conta (não por dispositivo), pelos motivos já documentados: legibilidade sob luz solar direta (relevante sobretudo ao app do Motorista) e preferência de ambiente de escritório tradicional (Gestor/Admin).
- **Nunca um terceiro tema** ("auto" seguindo o sistema operacional) é o padrão de fábrica — o usuário escolhe ativamente; o sistema operacional só é consultado como sugestão inicial opcional, nunca como fonte de verdade contínua.
- **Paridade total de funcionalidade entre os dois temas** — nenhuma tela ou componente existe apenas em um tema; todo componente do Dossiê 25 é especificado e testado nos dois.

---

## 6. Ícones

### 6.1 Biblioteca

**Lucide** (fork moderno e ativamente mantido do Feather Icons) — mesma decisão do Dossiê 10 §4, reafirmada e detalhada:

- **Por que Lucide e não Material Symbols/Font Awesome**: traço consistente (todos os ícones desenhados na mesma grade e espessura, ao contrário de bibliotecas que misturam estilos), licença permissiva (ISC, gratuita), disponível nativamente como componentes React (`lucide-react`) e React Native (`lucide-react-native`) a partir do mesmo conjunto de SVGs — garantindo que o ícone de "sino de notificação" seja **pixel-a-pixel idêntico** entre web e app, requisito direto do conceito de marca "Confiança".
- **Por que não Material Symbols (Google)**: embora completo, seu peso visual e proporção são desenhados para a linguagem Material, que não corresponde à estética minimalista/Linear-like que a Rotta persegue; misturar dois sistemas de ícone (Lucide + Material) quebraria a consistência de traço.

### 6.2 Padrão de uso

| Atributo                                  | Valor                                                                                                                                                                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Espessura de traço (`stroke-width`)       | 1.5px no painel web/admin (telas densas, muitos ícones simultâneos); 2px no app mobile (visto a maior distância, precisa de mais peso)                                                                                                             |
| Tamanhos padronizados                     | 16px (inline em texto/badge), 20px (padrão em botões e itens de lista), 24px (navegação principal, cabeçalhos de seção), 32px+ (ilustração de empty state)                                                                                         |
| Cor                                       | Sempre um token de `Colors` (Seção 4.1) — nunca uma cor solta; por padrão herda `currentColor` do texto adjacente                                                                                                                                  |
| Área de toque mínima                      | 44×44px (mobile) / 32×32px (web), mesmo quando o ícone visual é menor (Seção 2, "Mobilidade")                                                                                                                                                      |
| Espaçamento entre ícone e texto adjacente | `space-2` (8px) como padrão; `space-1` (4px) em componentes compactos (badge, chip)                                                                                                                                                                |
| Ícone sem rótulo textual                  | Permitido apenas para os 6 significados universalmente reconhecidos: voltar, fechar, buscar, mais opções (kebab/overflow), menu, adicionar (+). Qualquer outro ícone é sempre acompanhado de texto ou `aria-label`/`accessibilityLabel` (Seção 9). |

---

## 7. Grid

| Contexto                      | Colunas    | Gutter | Margem lateral                          | Largura máxima de conteúdo |
| ----------------------------- | ---------- | ------ | --------------------------------------- | -------------------------- |
| **Mobile** (`bp-xs`/`bp-sm`)  | 4 colunas  | 16px   | 16px                                    | 100%                       |
| **Tablet** (`bp-md`)          | 8 colunas  | 20px   | 24px                                    | 100%                       |
| **Desktop** (`bp-lg`/`bp-xl`) | 12 colunas | 24px   | 32px (`bp-lg`) / centralizado (`bp-xl`) | 1280–1440px de conteúdo    |

**Regra de ouro** (Dossiê 10 §2.3, reafirmada): o painel web nunca usa a largura total da tela em monitores grandes — conteúdo centralizado, nunca esticado até a borda de um monitor ultrawide.

---

## 8. Responsividade — comportamento por largura exata

| Largura       | Classe                                                           | Comportamento definido                                                                                                                                                                                                     |
| ------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **320px**     | Piso mínimo suportado (iPhone SE 1ª geração, Android de entrada) | Grid de 4 colunas com gutter reduzido para 12px (exceção à regra de 16px, only neste piso mínimo); nenhum componente pode quebrar layout abaixo disso — testado como o "pior caso" antes de qualquer release do app mobile |
| **375px**     | Viewport de referência para design mobile (iPhone padrão)        | Todo desenho de tela mobile é feito **primeiro** para esta largura (Seção 2, "Mobilidade")                                                                                                                                 |
| **390–414px** | iPhone Pro / Android grande                                      | Mesmo layout de 375px, aproveitando o espaço extra apenas para respiro adicional (`space-4`→`space-6` em margens), nunca para adicionar mais elementos                                                                     |
| **768px**     | Tablet retrato / breakpoint `bp-md`                              | Grid de 8 colunas; painel web passa a exibir sidebar colapsada (ícones apenas); listas que eram "1 item por linha" no mobile passam a 2 colunas quando fizer sentido (ex. grid de cards de KPI)                            |
| **1024px**    | Tablet paisagem / notebook pequeno / breakpoint `bp-lg`          | Sidebar expandida (ícone + rótulo); tabelas ganham colunas adicionais antes ocultas                                                                                                                                        |
| **1280px**    | Desktop padrão                                                   | Largura de conteúdo alcança o máximo confortável (1280px); nenhuma mudança estrutural adicional além de mais espaço de respiro                                                                                             |
| **1440px**    | Desktop grande / breakpoint `bp-xl`                              | Conteúdo permanece centralizado em ~1280–1440px (Seção 7); o excedente é margem lateral, nunca conteúdo esticado                                                                                                           |
| **1920px**    | Monitor Full HD                                                  | Idêntico a 1440px em termos de layout de conteúdo — a plataforma **nunca** usa a tela inteira em monitores muito grandes, mantendo a densidade de leitura confortável                                                      |

---

## 9. Acessibilidade (WCAG 2.1 AA)

Reafirmando e fechando o Dossiê 10 §10 com metas mensuráveis:

| Requisito                                       | Meta concreta                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Contraste de texto**                          | Mínimo 4.5:1 para texto padrão (`Body`, `Body Small`, `Caption`); mínimo 3:1 para texto grande (`Headline`+) — todos os pares token de texto/fundo da Seção 4.1 já calibrados para atender isso nos dois temas                                                                                        |
| **Contraste de componente não textual**         | Mínimo 3:1 para bordas de input, ícones funcionais e indicadores de estado contra o fundo adjacente                                                                                                                                                                                                   |
| **Cor nunca como único portador de informação** | Todo estado semântico (sucesso/erro/alerta) sempre acompanhado de ícone e/ou texto                                                                                                                                                                                                                    |
| **Área de toque**                               | Mínimo 44×44px (mobile, referência Apple HIG/Material), 32×32px (web)                                                                                                                                                                                                                                 |
| **Foco visível**                                | Anel de foco de `border-medium` (2px) na cor `Primary`, em **todo** elemento focável, com ordem de tabulação lógica seguindo a ordem visual da tela                                                                                                                                                   |
| **Navegação por teclado (web)**                 | 100% dos fluxos operáveis sem mouse — Tab/Shift+Tab, Enter/Espaço para ativar, Esc para fechar modais/drawers, setas para navegar em listas/menus                                                                                                                                                     |
| **Leitores de tela**                            | Toda imagem/ícone funcional com texto alternativo (`alt`/`aria-label` no web, `accessibilityLabel` no RN); hierarquia semântica de cabeçalhos (`h1`→`h2`→`h3` no web, `accessibilityRole="header"` no RN) correspondente à hierarquia tipográfica real (Seção 4.4), nunca escolhida por efeito visual |
| **Tamanho de fonte ajustável**                  | Respeita a configuração de escala de fonte do sistema operacional (Dynamic Type/iOS, escala de fonte/Android) sem quebrar layout, testado até o nível "grande" de acessibilidade                                                                                                                      |
| **Redução de movimento**                        | Toda animação (Seção 4.7/10) verifica `prefers-reduced-motion` (web) / `AccessibilityInfo.isReduceMotionEnabled` (RN) e substitui transição por mudança instantânea de estado quando ativo                                                                                                            |
| **Linguagem simples**                           | Todo texto de interface no nível de leitura mais simples possível — validado contra a persona "Seu Anderson" (Dossiê 1 §5.1), nunca contra o usuário mais letrado digitalmente do time                                                                                                                |

---

## 10. Animações e microinterações

Reafirmando o catálogo do Dossiê 11 §8, agora categorizado pelos gatilhos pedidos nesta rodada, todos usando exclusivamente os tokens da Seção 4.7/4.11 (nunca um valor solto):

| Categoria                               | Componente/situação                                | Especificação                                                                                                                                                                                                                                                                                                                |
| --------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hover** (web only — RN não tem hover) | Botão, item de lista, link                         | `transition-color`; leve clareamento/escurecimento de fundo (nunca troca de matiz)                                                                                                                                                                                                                                           |
| **Press**                               | Botão, card acionável, item de lista (mobile)      | Escala 0.98 via `transition-transform` (`duration-fast`) + feedback tátil nativo (`Haptics.impactAsync` leve no RN)                                                                                                                                                                                                          |
| **Loading**                             | Botão em carregamento, tela inicial                | Spinner (`transition-opacity` no fade-in do spinner) substituindo o texto sem redimensionar o componente; Skeleton com pulso de opacidade em loop suave (`duration-slow`, `easing-standard`, alternando `opacity-subtle`↔1)                                                                                                  |
| **Success**                             | Checklist de embarque confirmado, formulário salvo | Ícone de check com pequena escala de entrada (de 0.8 a 1.0, `duration-base`, `easing-decelerate`) + cor `Success`                                                                                                                                                                                                            |
| **Error**                               | Campo de formulário inválido                       | _Shake_ horizontal de ±2px em 2 ciclos (`duration-moderate`) + borda muda para `Danger` simultaneamente (nunca só uma das duas pistas)                                                                                                                                                                                       |
| **Navigation**                          | Troca de tela (mobile), abertura de rota (web)     | Mobile: transição nativa da plataforma (slide horizontal iOS, fade+slight-up Android) — nunca uma transição customizada que rompa a expectativa do sistema operacional; Web: sem transição de página cheia (Next.js App Router troca conteúdo instantaneamente), apenas `transition-opacity` sutil no conteúdo novo entrando |

**Regra de performance**: nenhuma animação anima propriedades que disparam _layout reflow_ (`width`, `height`, `top`, `left`) — apenas `transform` e `opacity`, garantindo 60fps mesmo em dispositivos de entrada (reforça o conceito de marca "Mobilidade").

---

## 11. Mapas

Aprofundando o Dossiê 9 §2.6 e Dossiê 22 §5.11 do ponto de vista de especificação visual (o "look" do mapa, não a escolha de fornecedor, já decidida):

### 11.1 Estilo base do mapa

Mapbox customizado no tema escuro da marca (Dossiê 10 §6): terreno em tons de `neutral-100`/`neutral-300`, vias em `neutral-500`, rótulos de rua em `Text Muted`, água (quando visível) em um tom de `Primary Muted` — nunca o estilo padrão colorido de um mapa genérico. Tema claro do mapa espelha a mesma lógica com os tokens de tema claro correspondentes.

### 11.2 Marcadores (pins)

| Tipo de marcador                                          | Aparência                                                                                                                                                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Veículo em rota**                                       | Ícone customizado (van/ônibus, conforme `tipo` do veículo) em círculo sólido `Primary`, com seta de direção (`heading`) sobreposta, girando suavemente conforme o veículo se move (nunca "pulando" entre ângulos — interpolação de rotação) |
| **Veículo atrasado**                                      | Mesmo pin, círculo `Warning` em vez de `Primary`                                                                                                                                                                                            |
| **Ponto de parada (aluno)**                               | Pin pequeno neutro (`neutral-500`), com o avatar/inicial do aluno quando o zoom permite                                                                                                                                                     |
| **Escola**                                                | Pin distinto (ícone de instituição) em `Secondary`, maior que os pins de parada, sempre visível independente do zoom                                                                                                                        |
| **Posição do próprio usuário** (Responsável acompanhando) | Ponto azul pulsante padrão (convenção universal de "você está aqui", nunca customizado a ponto de confundir)                                                                                                                                |

### 11.3 Clusters

Em zooms afastados (visão do Gestor com muitos veículos simultâneos, Dossiê 11 §2.1), marcadores próximos agrupam-se em um **cluster numérico** — círculo `Primary Muted` com o número de veículos naquele agrupamento em `Text`, texto `Button` (peso 600). Ao tocar/clicar, o mapa dá zoom automático para desagrupar (nunca abre uma lista separada — a interação é sempre espacial).

### 11.4 Rotas e trajetos

- **Rota planejada** (o trajeto configurado, Dossiê 18 `ROT-07`): linha tracejada fina em `Border Strong`, sempre visível atrás do trajeto real quando ambos aparecem juntos (ex. tela de detalhe de rota no painel do Gestor).
- **Trajeto real percorrido** (histórico de GPS, Dossiê 8 §11): linha sólida em `Primary`, espessura `border-medium` (2px), desenhada progressivamente (nunca aparece tudo de uma vez) ao reproduzir um histórico de viagem.
- **Segmento com atraso detectado**: trecho da linha em `Warning` em vez de `Primary`, para localizar visualmente onde o atraso começou.

### 11.5 GPS — indicadores de qualidade de sinal

Conforme Dossiê 18 `GPS-06`: quando a posição está desatualizada além de um limiar, o pin do veículo ganha um leve efeito de opacidade reduzida (`opacity-subtle` sobre o ícone, nunca removido do mapa) e um rótulo textual flutuante "atualizado há Xmin" — nunca apenas a ausência de atualização sem explicação (Dossiê 8 §6.6).

### 11.6 Componente `Map Card` e `GPS Card`

Especificados em detalhe no Dossiê 25 — são os componentes de UI que embutem o mapa dentro do sistema de cards do produto (ex. um card compacto de mapa dentro do dashboard, distinto do mapa em tela cheia).

---

## 12. Componentização — estratégia, estrutura de pastas e nomenclatura

### 12.1 Estratégia escolhida: Atomic Design (estrutura) + Compound Components (API de componente complexo)

Duas decisões complementares, cada uma resolvendo um problema diferente:

1. **Atomic Design** para a **organização física** dos arquivos (já adotado em `packages/ui`, Dossiê 22 §5.1) — `atoms/` → `molecules/` → `organisms/`. Resolve "onde este arquivo mora e por que".
2. **Compound Components** para a **API pública** de qualquer componente com múltiplas partes internas relacionadas (ex. `Tabs`, `Accordion`, `Select`, `Card`) — resolve "como o consumidor do componente o utiliza sem precisar conhecer sua implementação interna".

**Por que não Feature-Based para os componentes de UI**: Feature-Based (organizar por domínio de produto — "rotas", "alunos") é a estratégia correta para as **telas e a lógica de aplicação** (Dossiê 23 §1.1, pasta `features/` de cada app) — mas os componentes deste Design System são, por definição, **agnósticos de domínio** (um `Button` não pertence a "rotas" nem a "alunos"). Aplicar Feature-Based ao Design System duplicaria componentes idênticos em múltiplas features. As duas estratégias coexistem em camadas diferentes do mesmo produto: Atomic Design dentro de `packages/ui`, Feature-Based dentro de cada `apps/*/src/features`.

**Por que Compound Components para complexidade de API**: um componente como `Select` tem partes relacionadas (gatilho, lista, opção, grupo). A alternativa (uma única API com dezenas de props booleanas do tipo `showX`, `renderY`) fica ilegível rapidamente. Com Compound Components, o consumidor compõe visualmente a estrutura (`<Select><Select.Trigger/><Select.Options><Select.Option/></Select.Options></Select>`), e o componente pai gerencia o estado compartilhado internamente (via Context, React e React Native suportam o mesmo padrão identicamente) — mesma abordagem usada por Radix (base do nosso `packages/ui/web`, Dossiê 9 §2.1) e por bibliotecas de referência do mercado (Reach UI, Headless UI).

### 12.2 Quando usar Compound Components (regra de decisão)

| Situação                                                                                                                                     | Padrão de API                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Componente com estado interno simples, sem partes múltiplas (`Button`, `Badge`, `Avatar`, `Divider`)                                         | Props diretas — nunca Compound Components para algo simples (evita complexidade desnecessária) |
| Componente com múltiplas partes relacionadas que compartilham estado (`Tabs`, `Accordion`, `Select`, `Card` com header/body/footer, `Modal`) | Compound Components obrigatório                                                                |
| Componente com uma única responsabilidade mas configuração rica (`Input`, `Table`)                                                           | Props diretas, mas com objetos de configuração tipados quando o número de props ultrapassar ~8 |

### 12.3 Estrutura de pastas oficial (`packages/ui`)

Reafirma e detalha o Dossiê 22 §5.1, agora com a organização completa por camada atômica e o mapeamento de cada componente do Dossiê 25 à sua camada:

```
packages/ui/src/
├── web/                          # Implementação Next.js/React (Tailwind + Radix)
│   ├── tokens/                     # Re-exportação tipada de @rotta/theme para uso em CSS-in-JS quando necessário
│   ├── atoms/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.types.ts
│   │   │   ├── Button.stories.tsx     # Storybook (apps/docs, Dossiê 22 §4.7)
│   │   │   └── index.ts
│   │   ├── IconButton/
│   │   ├── Input/
│   │   ├── Checkbox/
│   │   ├── Radio/
│   │   ├── Switch/
│   │   ├── Avatar/
│   │   ├── Badge/
│   │   ├── Chip/
│   │   ├── Divider/
│   │   ├── Spinner/
│   │   ├── Skeleton/
│   │   └── Typography/              # Componentes de texto: Display/Headline/Title/.../Overline
│   ├── molecules/
│   │   ├── PasswordInput/
│   │   ├── OtpInput/
│   │   ├── Textarea/
│   │   ├── SearchInput/
│   │   ├── FormField/                 # label + input + helper/erro (compõe qualquer atom de input)
│   │   ├── Autocomplete/
│   │   ├── Pagination/
│   │   ├── ProgressBar/
│   │   ├── EmptyState/
│   │   ├── ErrorState/
│   │   ├── OfflineState/
│   │   ├── Alert/
│   │   ├── Banner/
│   │   ├── Toast/
│   │   └── StatisticCard/
│   ├── organisms/
│   │   ├── Select/                    # Compound: Select.Trigger, Select.Options, Select.Option
│   │   ├── Tabs/                       # Compound: Tabs.List, Tabs.Tab, Tabs.Panel
│   │   ├── Accordion/                  # Compound: Accordion.Item, Accordion.Trigger, Accordion.Content
│   │   ├── Stepper/
│   │   ├── Table/                       # Compound: Table.Header, Table.Row, Table.Cell
│   │   ├── Modal/                        # Compound: Modal.Header, Modal.Body, Modal.Footer
│   │   ├── Drawer/
│   │   ├── Dialog/
│   │   ├── Tooltip/
│   │   ├── Calendar/
│   │   ├── DatePicker/
│   │   ├── TimePicker/
│   │   ├── Card/                          # Compound: Card.Header, Card.Body, Card.Footer (base de todos os *Card)
│   │   ├── MapCard/
│   │   ├── GpsCard/
│   │   ├── VehicleCard/
│   │   ├── StudentCard/
│   │   ├── DriverCard/
│   │   ├── RouteCard/
│   │   ├── CompanyCard/
│   │   ├── SchoolCard/
│   │   ├── ProfileCard/
│   │   ├── NotificationCard/
│   │   └── ChartCard/
│   └── index.ts                            # Barrel — unica porta de entrada consumida pelos apps
│
└── native/                          # Implementação React Native (NativeWind) — MESMA nomenclatura, MESMA API publica
    ├── atoms/ ...                     # espelha 1:1 a estrutura de web/
    ├── molecules/ ...
    └── organisms/ ...
```

**Regra inegociável**: a estrutura de `native/` espelha exatamente a de `web/` — mesmo nome de componente, mesma API pública (props), para que qualquer desenvolvedor que conheça o `Button` do web já saiba usar o `Button` do native sem consultar documentação adicional (Dossiê 9, aposta de "código compartilhado").

### 12.4 Convenções de nomenclatura

| Elemento                             | Convenção                                                                                                    | Exemplo                                                                                                                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Componente                           | `PascalCase`, nome substantivo, nunca abreviado                                                              | `VehicleCard`, não `VehCard` ou `VCard`                                                                                                                                                                           |
| Sub-componente de Compound Component | `Componente.Parte`, `PascalCase`                                                                             | `Tabs.Panel`, `Card.Footer`                                                                                                                                                                                       |
| Arquivo de componente                | Mesmo nome do componente + extensão                                                                          | `Button.tsx`, `Button.types.ts`                                                                                                                                                                                   |
| Prop de variante visual              | `variant`, valores em `camelCase` curto                                                                      | `variant="primary"`, nunca `variant="btn-primary-solid"`                                                                                                                                                          |
| Prop de tamanho                      | `size`, valores `sm`/`md`/`lg` (nunca `small`/`medium`/`large` por extenso, para consistência com os tokens) | `size="md"`                                                                                                                                                                                                       |
| Prop de estado booleano              | Prefixo `is`/`has` quando aplicável                                                                          | `isLoading`, `isDisabled`, `hasError`                                                                                                                                                                             |
| Handler de evento                    | Prefixo `on` + verbo no infinitivo implícito                                                                 | `onPress` (RN, convenção nativa), `onClick` (web, convenção nativa) — **nunca unificamos os dois nomes entre plataformas**, pois cada um segue a convenção nativa esperada por quem já conhece aquele ecossistema |
| Token consumido em código            | `camelCase` espelhando o `kebab-case` da documentação                                                        | Doc: `radius-lg` → código: `theme.radius.lg`                                                                                                                                                                      |

### 12.5 Regra de criação de componente novo

Nenhum componente é criado sem antes verificar exaustivamente a lista do Dossiê 25. Se uma tela precisa de uma variação (ex. um botão "só com ícone e mais compacto"), a pergunta correta é "isso é uma nova `variant`/`size` de um componente já existente, ou genuinamente um componente novo?" — na esmagadora maioria dos casos, é uma variante. Um componente novo só é criado quando nenhuma composição dos existentes resolve, e sua adição **atualiza obrigatoriamente este dossiê e o Dossiê 25 no mesmo Pull Request** (Dossiê 23 §16.1 — documentação viva, nunca retroativa).

---

## 13. Nota de sincronização com o código (`packages/theme`, `packages/ui`)

### 13.1 Migração de nomenclatura tipográfica

A implementação inicial em `packages/theme/src/tokens/typography.ts` (criada durante a fase de fundação do monorepo) usava a nomenclatura provisória `display/h1/h2/h3/bodyLg/body/caption/label`. Este dossiê a substitui pela nomenclatura oficial da Seção 4.4.2 (`display/headline/title/subtitle/body/bodySmall/caption/overline/button`). O código é atualizado para refletir exatamente esta seção (ver commit associado a este dossiê) — a partir de agora, `h1`/`h2`/`h3`/`label` não são mais nomes válidos em nenhum novo código.

### 13.2 Novos arquivos de token

`border.ts`, `opacity.ts`, `breakpoints.ts`, `z-index.ts` e `transitions.ts` (Seções 4.6/4.8/4.9/4.10/4.11) são novos arquivos adicionados a `packages/theme/src/tokens/`, seguindo exatamente os valores desta especificação — nenhum valor é "aproximado", o código usa os números literais desta seção.

### 13.3 Componentes ainda não implementados

Este dossiê e o Dossiê 25 são a **especificação completa** dos componentes — a implementação de código de cada um (os arquivos `.tsx` dentro de `packages/ui/src/web` e `src/native`) acontece de forma incremental, começando pelos átomos mais reutilizados (`Button`, `Input`, `Card`, `Avatar`, `Badge`) assim que a primeira tela real de produto for implementada (Dossiê 15, módulo `auth`). A estrutura de pastas da Seção 12.3 já está refletida em `packages/ui/README.md`.
