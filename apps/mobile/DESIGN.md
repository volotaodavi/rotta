---
name: Rotta Mobile
description: App único pra Motorista, Monitor, Responsável e Admin Rotta reduzido — mesmo design system do site/painel, com identidade exclusiva pro Modo Operacional.
colors:
  primary: "#3B6EF6"
  primary-hover: "#5A8CFF"
  primary-muted: "#1B2B4D"
  success: "#22C55E"
  warning: "#F5A623"
  danger: "#EF4444"
  info: "#22D3EE"
  background: "#0B0F14"
  surface: "#12161D"
  surface-elevated: "#1A2029"
  card: "#151A22"
  border: "#232A35"
  text: "#F5F7FA"
  text-muted: "#9AA4B2"
  monitor-accent: "#8B5CF6"
  driver-primary: "#4C86FF"
  driver-primary-hover: "#6B9CFF"
  driver-background: "#0B0F14"
  driver-success: "#22C55E"
  driver-danger: "#EF4444"
typography:
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: "32px"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.6px"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  6: "24px"
  8: "32px"
  12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    height: "48px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Rotta Mobile

## Overview

**Creative North Star: "A Torre de Controle"**

Mesmo sistema visual do `apps/web`/`apps/admin` (mesmos tokens, `packages/theme`) — escuro por padrão, azul único como marca, profundidade por tom de superfície, Inter em tudo. O app troca inteiramente de navegação por papel (Motorista, Monitor, Responsável, Admin reduzido), mas a linguagem visual de base é uma só, pra marca parecer idêntica em qualquer papel/tela.

A única exceção deliberada é o **Modo Operacional** (telas de Motorista/Monitor durante a viagem em si): usa uma paleta `driver*` própria (azul mais claro pra contraste em sol forte, verde/vermelho vivos pra confirmação/perigo de embarque), pedida explicitamente pelo usuário com valores hex exatos ("IDENTIDADE") — nunca aproximar. Essa identidade fica isolada nessas telas; Responsável e Admin reduzido nunca a herdam.

**Key Characteristics:**

- Um app, quatro papéis, uma linguagem visual — navegação muda, tokens de base não.
- Modo Operacional (Motorista/Monitor) tem paleta `driver*` exclusiva, com valores exatos do usuário.
- Componente de assinatura: `SlideToAction` — confirmação por arrasto, nunca por toque simples, pra ações que não podem disparar sem querer.
- PIN/biometria são atalhos opcionais de reentrada — nunca obrigatórios, nunca substituem a senha de verdade.
- Nenhum gráfico/histórico mostra dado fabricado — sempre real ou estado vazio honesto.

## Colors

Mesma paleta quase monocromática do resto da plataforma, mais a paleta `driver*` isolada do Modo Operacional.

### Primary

- **Azul Elétrico** (`#3B6EF6`): cor de marca em todo o app fora do Modo Operacional — CTA, foco, estado ativo, botão "Entrar" do acesso rápido.

### Signature: Paleta do Modo Operacional (`driver*`)

- **Azul Estrada** (`driverPrimary` `#4C86FF`): ação primária durante a viagem (iniciar/retomar) — mais claro que o azul padrão pra legibilidade em tela sob sol.
- **Verde Embarque** (`driverSuccess` `#22C55E`): confirmação de embarque/desembarque.
- **Vermelho Parada** (`driverDanger` `#EF4444`): ações de risco/encerramento (ex. thumb do `SlideToAction` ao finalizar viagem).
- **Roxo Monitor** (`monitorAccent` `#8B5CF6`): único acento fora de azul/verde/vermelho/âmbar/ciano da marca — exclusivo das telas do Monitor, pra diferenciar visualmente do Motorista (azul) e Responsável (verde) nas 3 telas onde os três papéis aparecem lado a lado.

### Named Rules

**The Driver Isolation Rule.** A paleta `driver*` só existe nas telas de Modo Operacional (Motorista/Monitor executando viagem). Nunca vaza pra Responsável, Admin reduzido, ou qualquer tela fora desse contexto.

## Typography

Mesma família (Inter) e mesma lógica de hierarquia por peso/tamanho do resto da plataforma — ver `apps/web/DESIGN.md` pra escala completa. Mobile usa as variantes `*Mobile` da escala (ex. `headlineMobile` 26px/32px em vez de `headline` 32px/40px web) pra caber melhor em tela pequena.

## Layout

Mesma escala de espaçamento em múltiplos de 4px do resto da plataforma. Telas operacionais (Modo Ação) priorizam alvos de toque grandes (mínimo 48px de altura) e pouco texto — motorista/monitor usam sob pressão de tempo, durante a viagem.

## Elevation & Depth

Mesmo princípio do resto da plataforma (profundidade por tom de superfície, sem sombra pesada em card padrão), com uma exceção nomeada: o cartão de mapa/bottom sheet do Motorista usa uma sombra discreta própria (`shadowOpacity 0.12`, `shadowRadius 20`) — pedido explícito do usuário ("sombras discretas") só pra esse componente, nunca generalizada pro resto do app.

### Named Rules

**The Discrete Map-Card Rule.** Só o cartão flutuante de mapa/bottom sheet do Modo Operacional recebe sombra própria e discreta; todo o resto do app segue a regra geral de "sem sombra em card padrão".

## Shapes

Mesma escala de raio do resto da plataforma (6/10/16/24/9999px). O `SlideToAction` é pill-shaped (`rounded: 9999px`, trilho de 56px de altura) com o "thumb" circular de 56px — forma reconhecível de "arrastar pra confirmar".

## Components

### Buttons

- **Shape:** 10px de raio (`rounded-md`), altura mínima 48px em telas operacionais (alvo de toque grande).
- **Primary:** fundo Azul Elétrico (ou `driverPrimary` em Modo Operacional), texto branco.

### Cards / Containers

- **Corner Style:** 16px.
- **Background:** tom `card`, sem sombra no repouso (exceto o cartão de mapa do Motorista, ver Elevation).

### Signature Component: SlideToAction

Botão de "deslizar para confirmar" (padrão apps de mobilidade) usado em toda ação que não pode disparar por engano — iniciar/encerrar viagem, confirmar embarque em lote. Trilho pill de 56px de altura, thumb circular de 56px com seta (`ChevronsRight`) ou spinner durante `isLoading`. Só confirma (`onComplete`) se o arrasto passar de **82% do percurso** antes de soltar — abaixo disso, volta sozinho ao início com uma animação de mola. Suporta `direction="left"` (inverte o sentido) e `danger` (thumb vira `driverDanger`, usado em "Encerrar viagem"). `completedLabel` opcional troca o texto assim que passa do limiar, como feedback imediato antes do estado de carregamento.

### Acesso Rápido (PIN / Biometria)

Cartão de identidade com e-mail mascarado + botão "Entrar" azul (cor de marca) + atalho de biometria (Face ID/Touch ID/impressão digital via `expo-local-authentication`, API única pras duas plataformas). Ambos PIN e biometria são opcionais e independentes — nunca span obrigatório, nunca substituem de vez a senha real.

## Do's and Don'ts

### Do:

- **Do** manter a paleta `driver*` restrita às telas de Modo Operacional (Motorista/Monitor em viagem).
- **Do** usar `SlideToAction` (não um botão de toque simples) pra qualquer ação irreversível/crítica de viagem.
- **Do** manter PIN e biometria como atalhos opcionais — a senha real sempre continua funcionando.
- **Do** mostrar sempre dado real ou estado vazio honesto em gráficos/históricos (ex. saldo do Admin) — nunca uma série fabricada.

### Don't:

- **Don't** deixar a paleta `driver*` vazar pra telas de Responsável ou Admin reduzido.
- **Don't** adicionar sombra genérica em card fora do cartão de mapa do Motorista.
- **Don't** tornar PIN ou biometria obrigatório, ou condicionar login a eles.
