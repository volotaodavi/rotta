---
name: Rotta Mobile
description: App único pra Motorista, Monitor, Responsável, Gestor e Admin Rotta reduzido — claro, azul-marinho na tinta, Plus Jakarta Sans na letra, com identidade exclusiva pro Modo Operacional.
colors:
  primary: "#1769FF"
  primary-hover: "#0954DC"
  primary-muted: "#EDF4FF"
  brand-deep: "#0A3B85"
  brand-band: "#1180FE"
  on-brand-muted: "#A9C6F5"
  success: "#0FA36B"
  success-muted: "#E8F9F1"
  warning: "#D98C0E"
  warning-muted: "#FFF4E4"
  danger: "#E5484D"
  danger-muted: "#FFE6E6"
  info: "#1769FF"
  background: "#FFFFFF"
  surface: "#F2F4F8"
  card: "#FFFFFF"
  border: "#E6ECF5"
  hairline: "#F0F3F8"
  text: "#0F2748"
  text-muted: "#8794A5"
  monitor-accent: "#8B5CF6"
  driver-primary: "#1769FF"
  driver-background: "#F6F8FB"
  driver-success: "#18A957"
  driver-danger: "#E53935"
typography:
  headline:
    fontFamily: "PlusJakartaSans_700Bold"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "28px"
  title:
    fontFamily: "PlusJakartaSans_700Bold"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: "24px"
  section:
    fontFamily: "PlusJakartaSans_700Bold"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: "22px"
  body:
    fontFamily: "PlusJakartaSans_400Regular"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "PlusJakartaSans_600SemiBold"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "16px"
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
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.lg}"
    height: "52px"
    fontWeight: 700
  card:
    backgroundColor: "{colors.card}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.lg}"
    padding: "16px"
    shadow: "0 4px 14px rgba(10, 44, 99, 0.07)"
---

# Design System: Rotta Mobile

## Overview

**Norte criativo: "O conceito do fundador, ao pé da letra"**

Em 16/10/2026 o fundador olhou o app depois de duas levas de redesenho
e disse, três vezes, que ele estava "com cara de IA". Estava. Este
documento descreve o sistema que saiu daí, e ele não foi inventado:
**cada valor abaixo foi amostrado pixel a pixel das duas imagens de
conceito que ele aprovou**, com Pillow, contando a cor mais frequente
de cada região.

O que mudou não foi gosto, foram quatro camadas que o app nunca tinha
escolhido:

1. **Letra.** O app nunca carregou fonte nenhuma: todo texto era Roboto
   no Android e SF Pro no iOS. Um aplicativo inteiro na fonte padrão do
   sistema se parece com todo aplicativo que nunca escolheu uma letra.
2. **Tinta.** Era preto neutro (`#0B0F14`). No conceito, todo texto é
   azul-marinho.
3. **Profundidade.** Cartão se separava do fundo por borda cinza de um
   ponto. No conceito, por sombra macia e azulada.
4. **Moldura.** Barra de abas e cabeçalho eram os padrões do React
   Navigation, usados exatamente como vieram.

**Características:**

- Um app, cinco papéis, uma linguagem visual.
- Sempre claro. O tema escuro continua existindo em `@rotta/theme`, mas
  nenhuma tela chega nele: o conceito aprovado é inteiramente claro.
- Modo Operacional (Motorista/Monitor em viagem) tem paleta `driver*`
  própria, com valores exatos dados pelo fundador.
- Componente de assinatura: `SlideToAction`.
- Nenhum gráfico ou contador mostra dado fabricado — sempre real ou
  estado vazio honesto.

## Colors

### Primary

**Azul Rotta** (`#1769FF`): o mesmo valor que o fundador deu como
IDENTIDADE em 31/08/2026. Os três azuis amostrados do conceito (botão
`#1284FF`, ícone `#0A63FD`, pílula `#0570FC`) cercam esse número — o
conceito não trouxe azul novo, trouxe o azul da marca aplicado ao app
inteiro.

### Tinta e apoio

- `text` **#0F2748**: azul-marinho, nunca preto. É a diferença entre
  uma tela que parece template e uma tela que parece da Rotta.
- `text-muted` **#8794A5**: amostrado do subtítulo do próprio conceito.

### A área de conta

- `brand-deep` **#0A3B85**: o topo azul profundo que sangra até a barra
  de status na Carteira e no painel do Gestor.
- `brand-band` **#1180FE**: a faixa de saldo desenhada sobre ele.
- `on-brand-muted` **#A9C6F5**: texto secundário sobre esse azul.
  `text-muted` ali some, porque foi calculado para fundo claro.

### Named Rules

**The Driver Isolation Rule.** A paleta `driver*` só existe nas telas
de Modo Operacional. Nunca vaza para Responsável, Gestor ou Admin.

**The Tinted State Rule.** Todo estado semântico tem um par: a cor
(`success`) e o fundo suave (`success-muted`). Nunca se pinta um fundo
com a cor do texto mais um sufixo de opacidade em hexadecimal — isso
produz uma mancha diferente em cada tema, e foi defeito real em dois
componentes.

## Typography

**Plus Jakarta Sans**, cinco pesos embutidos no app
(`@expo-google-fonts/plus-jakarta-sans`, licença SIL Open Font).
Geométrica de esqueleto humanista, altura de x grande, "a" de dois
andares — é a letra que o conceito desenha.

### Named Rules

**The Weight-Is-A-Family Rule.** No React Native com fonte própria, o
peso não é propriedade: cada peso É uma família registrada. Pedir 700
numa família que só tem o regular faz o Android desenhar um negrito
sintético, que é o borrão que denuncia app mal feito. Por isso todo
texto do app passa por `Texto`, que lê o `fontWeight` do estilo,
escolhe o arquivo certo e **remove o peso**.

`Texto` mora em `@rotta/ui/native`, e não no app, por um motivo
aprendido do jeito ruim: enquanto morava no app, a troca de letra
chegou às telas e não chegou a duas peças compartilhadas. `StatusPill`,
a etiqueta de estado que aparece em quase toda tela do produto, e o
`SlideToAction` ficaram desenhando na fonte do sistema dentro de telas
na fonte da marca. Nada avisou: texto sem fonte herda a do sistema em
silêncio. `src/components/texto.tsx` continua existindo como
reexporte, para o caminho de importação das telas não mudar.

Dentro do pacote a família é sempre **explícita**
(`fontFamily: fonteNativa(600)`), e o peso não entra; nas telas é o
contrário, escreve-se `fontWeight` e `Texto` deriva. Por isso a família
explícita vence a derivação: sem essa precedência, o reexporte teria
jogado todo rótulo em negrito do sistema de design para o regular, de
uma vez e em silêncio. Dois testes em `@rotta/ui` seguram as duas
pontas da regra.

## Elevation & Depth

`elevation.soft` — sombra de 14 de raio, deslocada 4 para baixo, na cor
`#0A2C63` a 7% de opacidade. Azul-marinho, nunca preto: preto sobre
fundo branco-azulado vira mancha cinza suja.

A borda continua existindo, quase apagada (`hairline`), só para segurar
o contorno em tela com brilho alto, onde a sombra some.

### Named Rules

**The Two-Line Rule.** `border` separa o cartão do fundo; `hairline`
separa itens DENTRO de um cartão. Usar o mesmo peso nos dois faz uma
lista parecer uma pilha de caixas.

## Components

### Botão primário

52 de altura, peso 700, raio 16. No conceito é a peça mais pesada da
tela. `forma="pilula"` existe para uma situação só: "Acompanhar no
mapa", no Início do Responsável.

### Cartão

Branco, raio 16, borda `hairline`, sombra `soft`, padding 16.

### Selo de ícone

Quadrado arredondado quando identifica um ASSUNTO (escola, veículo,
documento); círculo quando identifica uma PESSOA (avatar) ou uma
ESCOLHA (os cinco tipos de ocorrência). Manter a diferença é o que
deixa uma lista de coisas distinguível de uma lista de pessoas antes de
ler qualquer palavra.

### Barra de abas

Altura 64, linha fina no topo, rótulo na letra da marca em 11/600, e a
aba ativa com **selo azul preenchido atrás do ícone**. Cor sozinha é
sinal fraco de "você está aqui" numa fileira de cinco ícones pequenos,
e some para quem não distingue azul de cinza.

### Cabeçalho

Sem linha de sombra. O conceito separa cabeçalho de conteúdo por
espaço, não por um risco cinza atravessando a tela.

### Peças de `@rotta/ui/native`

`AccountHeader` + `ContentSheet` (o topo azul que sangra e a folha
branca subindo por cima), `BalanceCard`, `ActionGrid`, `InfoTile`,
`ListRow`, `MovementRow`, `PersonRow`, `SummaryCards`, `FilterTabs`,
`SectionHeader`, `EmptyState`, `StatusPill`, `Timeline`, `BottomSheet`,
`SlideToAction`.

## Do's and Don'ts

### Do

- **Do** passar todo texto por `Texto`.
- **Do** usar `EmptyState` sempre que uma lista pode estar vazia, com
  uma frase que ensina o próximo passo.
- **Do** mostrar o que não existe apagado, com o motivo à mostra, em
  vez de esconder ou deixar ativo e dar erro no toque.
- **Do** manter a paleta `driver*` restrita ao Modo Operacional.

### Don't

- **Don't** declarar `fontFamily` à mão numa tela.
- **Don't** pintar fundo com cor mais sufixo de opacidade.
- **Don't** usar `border` como divisória dentro de um cartão.
- **Don't** inventar número: dado que falta aparece como traço, nunca
  como zero.
