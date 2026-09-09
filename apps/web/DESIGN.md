---
name: Rotta — Site & Painel da Transportadora
description: Plataforma de gestão de transporte escolar — escura por padrão, azul como única cor de marca, profundidade por tom de superfície.
colors:
  primary: "#3B6EF6"
  primary-hover: "#5A8CFF"
  primary-muted: "#1B2B4D"
  secondary: "#E5E8EC"
  success: "#22C55E"
  warning: "#F5A623"
  danger: "#EF4444"
  info: "#22D3EE"
  background: "#0B0F14"
  surface: "#12161D"
  surface-elevated: "#1A2029"
  card: "#151A22"
  border: "#232A35"
  border-strong: "#333C4A"
  text: "#F5F7FA"
  text-muted: "#9AA4B2"
  neutral-100: "#1C212B"
  neutral-300: "#2A313D"
  neutral-500: "#5C6673"
  neutral-700: "#9AA4B2"
  neutral-900: "#F5F7FA"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: "48px"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "40px"
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
  16: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Rotta — Site & Painel da Transportadora

## Overview

**Creative North Star: "A Torre de Controle"**

Rotta parece uma torre de controle noturna de tráfego: fundo quase preto-azulado por padrão, telas de operação calmas onde nada compete por atenção sem motivo. A marca se restringe deliberadamente a azul + preto + branco + cinza, com as quatro cores semânticas (sucesso/aviso/perigo/informação) reservadas exclusivamente a significado de estado — nunca decoração. Hierarquia visual nasce de peso e tamanho tipográfico (uma família só, Inter, do site ao app), nunca de cor.

Apesar do fundo escuro e do rigor da paleta, o azul principal é tratado como vivo e caloroso, não frio/institucional — é o elemento que puxa o olho num painel deliberadamente monocromático, e por isso aparece com moderação (a raridade é o ponto). Profundidade vem quase inteiramente da progressão de tom `background → surface → surfaceElevated → card`, nunca de sombra pesada — cards no estado padrão são planos; sombra só reforça camadas de verdade flutuantes (modal, dropdown, popover).

**Key Characteristics:**

- Escuro por padrão (`#0B0F14`), tema claro como preferência explícita do usuário, nunca o padrão.
- Azul único como cor de marca; verde/âmbar/vermelho/ciano só para estado, nunca decoração.
- Sem sombra em cards no estado padrão — profundidade por tom de superfície.
- Uma família tipográfica (Inter) do marketing ao painel autenticado.
- Micro-interação tátil: botões encolhem levemente (`scale(0.98)`) ao serem pressionados.

## Colors

Paleta quase monocromática (azul + preto/branco/cinza) com quatro acentos semânticos estritos.

### Primary

- **Azul Elétrico** (`#3B6EF6` escuro / `#2F5FE0` claro): única cor de marca — CTA primário, links, foco de campo, elementos ativos. Usado com moderação deliberada; nunca em blocos decorativos grandes.

### Neutral

- **Grafite Profundo** (`#0B0F14`): fundo base do app (tema escuro, padrão da plataforma).
- **Ardósia** (`#12161D` → `#1A2029` → `#151A22`): progressão `surface` → `surfaceElevated` → `card`, a principal fonte de profundidade visual.
- **Névoa** (`#F5F7FA`): texto principal sobre fundo escuro.
- **Cinza-Aço** (`#9AA4B2`): texto secundário/muted, bordas.

### Named Rules

**The Brand Restraint Rule.** A marca é só azul + preto/branco/cinza. Qualquer outra cor em tela precisa carregar significado semântico (sucesso/aviso/perigo/informação) — nunca decoração pura.

**The Flat Card Rule.** Cards no estado padrão nunca têm sombra. Sombra só existe em camadas realmente flutuantes (modal, dropdown, popover) — profundidade normal vem do tom de superfície.

## Typography

**Display/Body Font:** Inter (com fallback `system-ui, sans-serif`)

**Character:** Uma família só, do marketing ao dado tabular — a marca precisa parecer idêntica em navegador, painel e app. Hierarquia é construída inteiramente por peso e tamanho, nunca por cor.

### Hierarchy

- **Display** (700, 40px, 48px): hero da landing page, títulos de maior destaque.
- **Headline** (700, 32px, 40px): título de página/seção.
- **Title** (600, 24px, 32px): título de card/bloco.
- **Subtitle** (600, 20px, 28px): subtítulo de seção.
- **Body** (400, 16px, 24px): texto corrido padrão.
- **Body Small** (400, 14px, 20px): texto secundário.
- **Caption** (400, 12px, 16px): legendas, metadados.
- **Overline** (600, 11px, 16px, +0.6px, uppercase): rótulo de categoria/etapa.
- **Mono Data** (500, 14px, 20px, tabular-nums): placas, CPF/CNPJ, horários — único caso fora da escala oficial de 8 níveis.

### Named Rules

**The Weight-Not-Color Rule.** Hierarquia visual é peso/tamanho tipográfico. Cor é reservada a significado semântico (ver Colors) — nunca use cor pra criar hierarquia de texto.

## Layout

Espaçamento em múltiplos de 4px (`4, 8, 12, 16, 24, 32, 48, 64, 96`) — nunca um valor arbitrário escolhido ad-hoc por tela. Painel autenticado (`apps/web` dashboard) e marketing (`apps/web` landing) compartilham os mesmos tokens de cor/tipografia/espaçamento via `packages/theme`/`packages/ui`, mas a landing pode respirar mais (mais espaço em branco, hero maior); o painel prioriza densidade operacional.

## Elevation & Depth

Sistema majoritariamente plano por decisão de marca explícita ("nunca cards exagerados"). Profundidade normal vem da progressão de tom `background → surface → surfaceElevated → card`. Sombra é reforço sutil, reservado a camadas de verdade flutuantes.

### Shadow Vocabulary

- **Card** (`box-shadow: 0 1px 2px 0 rgba(0,0,0,0.24)`): reforço opcional (ex. card sobre outro card num layout de detalhe) — não é o padrão.
- **Dropdown** (`box-shadow: 0 4px 12px 0 rgba(0,0,0,0.32)`): menus, popovers.
- **Modal** (`box-shadow: 0 8px 24px 0 rgba(0,0,0,0.4)`): diálogos, modais.

### Named Rules

**The Flat-By-Default Rule.** Sombra nunca aparece em cards no estado de repouso. Ela só existe como resposta a uma camada genuinamente flutuante.

## Shapes

Cantos consistentemente arredondados, nunca retos: `sm` (6px, chips/badges pequenos), `md` (10px, botões/inputs/cards de conteúdo), `lg` (16px, cards de destaque), `xl` (24px, superfícies grandes/modais), `full` (9999px, pills/avatares/thumb de slide).

## Components

### Buttons

- **Shape:** cantos de 10px (`rounded-md`), nunca reto nem pill.
- **Primary:** fundo Azul Elétrico, texto branco, altura 40px (md)/32px (sm)/48px (lg), padding horizontal 16–24px.
- **Hover / Focus:** hover escurece levemente pra `#5A8CFF`(escuro)/`#1E4BC7`(claro); foco visível obrigatório (anel de 2px na cor primary, com offset); pressionar encolhe sutilmente (`scale(0.98)`) — feedback tátil sem exagero.
- **Secondary / Ghost / Danger:** Secondary usa fundo neutro claro/texto escuro; Ghost é transparente com texto azul; Danger usa fundo vermelho — reservado a ações destrutivas.

### Cards / Containers

- **Corner Style:** 16px (`rounded-lg`).
- **Background:** tom `card` (`#151A22` escuro / `#FFFFFF` claro) — nunca a mesma cor do fundo da página, sempre um passo acima na escala de superfície.
- **Shadow Strategy:** nenhuma no repouso (ver Elevation & Depth).
- **Internal Padding:** 24px.

### Inputs / Fields

- **Style:** borda 1px na cor `border`, fundo `surface`, cantos 10px.
- **Focus:** borda muda pra `primary` + anel de foco visível.
- **Error:** borda `danger`, mensagem de erro abaixo em `bodySmall`.

### Navigation

Sidebar (painel autenticado) com grupos por contexto, ícones Lucide, contagens ao vivo em badges quando relevante. Item ativo ganha fundo `primaryMuted` sutil + texto `primary` — nunca uma barra colorida agressiva.

## Do's and Don'ts

### Do:

- **Do** usar Azul Elétrico como única cor de marca — CTA primário, foco, links, estado ativo.
- **Do** construir hierarquia por peso/tamanho de Inter, nunca por cor.
- **Do** manter cards planos no repouso; sombra só em camadas flutuantes de verdade.
- **Do** basear qualquer espaçamento novo na escala de 4px.

### Don't:

- **Don't** introduzir uma cor de marca nova fora de azul/preto/branco/cinza.
- **Don't** usar sucesso/aviso/perigo/informação como decoração — são reservadas a estado semântico.
- **Don't** adicionar sombra pesada/dramática em card de estado padrão.
- **Don't** misturar família tipográfica — é Inter em toda a plataforma, sem exceção.
