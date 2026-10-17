# Marca da Rotta

**As logos oficiais estão aqui. Não desenhe outra.**

Este arquivo existe porque a marca já estava no repositório e mesmo
assim um "R" foi desenhado à mão numa prévia, em outra fonte e com
outro recorte. Se você precisa do logotipo para qualquer coisa — tela,
prévia, apresentação, e-mail, ícone de loja — pegue daqui.

## Os dois arquivos

| Arquivo                | O que é                                                                                 | Quando usar                                                       |
| ---------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `rotta-marca-1024.png` | O símbolo: o "R" branco com o ponto azul claro sobre o azul da marca, em quadrado cheio | Ícone de app, favicon, avatar, qualquer lugar pequeno ou quadrado |
| `rotta-assinatura.jpg` | A assinatura horizontal: símbolo + "Rotta" em preto sobre branco                        | Cabeçalho, documento, apresentação, assinatura de e-mail          |

`rotta-marca.jpg` e `rotta-assinatura.jpg` são os originais como o
fundador entregou (17/10/2026). O `.png` de 1024 é a mesma arte sem a
compressão do JPEG, e é dele que todo tamanho derivado é gerado.

## Cores da marca

| Cor             | Valor     | Onde                                    |
| --------------- | --------- | --------------------------------------- |
| Azul Rotta      | `#1769FF` | O azul do produto (botão, link, acento) |
| Azul do símbolo | `#0139E1` | O fundo do quadrado da marca            |
| Azul do ponto   | `#0E98FD` | O ponto à esquerda do "R"               |
| Tinta           | `#0F2748` | Texto sobre fundo claro                 |

O `#0139E1` do quadrado é da marca e **não** é o azul da interface. O
azul do produto é o `#1769FF` (`packages/theme`), e os dois conviverem
é proposital: o símbolo é mais fechado para segurar o branco do "R".

## Onde cada tamanho é gerado

Nunca edite os arquivos derivados à mão: gere a partir do
`rotta-marca-1024.png`.

```
apps/web/public/brand/rotta-mark.png          1024  Open Graph, compartilhamento
apps/web/public/brand/rotta-mark-512.png       512  PWA, manifest
apps/web/public/brand/rotta-mark-192.png       192  favicon, apple-touch, notificação
apps/admin/public/brand/rotta-mark-512.png     512  painel interno
apps/mobile/assets/icon.png                   1024  ícone do app (fonte desta pasta)
```

Os `rotta-wordmark-{light,dark}.png` de `apps/web/public/brand` são a
assinatura horizontal recortada, com fundo transparente, para uso sobre
fundo claro e escuro. São os que o site já usa.

## O quadrado é cheio de propósito

A marca não leva canto arredondado embutido. Quem arredonda é o sistema
operacional (iOS e Android aplicam a própria máscara) e o navegador.
Até 17/10/2026 o site e o painel carregavam uma versão com gradiente,
canto arredondado e sombra assados na imagem, o que no iPhone saía com
o canto arredondado duas vezes, e não era a arte oficial.
