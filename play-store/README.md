# Ficha da Play Store: o que subir, e em que ordem

Gerado por `scripts/play-store-assets.py`. **Escolha uma pasta** e suba
ela inteira; não misture as duas.

| Pasta      | Modelo                                                   |
| ---------- | -------------------------------------------------------- |
| `faixa/`   | manchete à esquerda, cartão sangrando, rota ligando tudo |
| `moldura/` | aparelho inteiro, com a barra de abas à mostra           |

As capturas saem em **2160x3840**, que é 4K UHD em retrato e o maior
tamanho que a Play Console aceita. Para gerar também a versão de
1080x1920, que é a que a Google recomenda, rode com `ambos`:

```
python3 scripts/play-store-assets.py play-store ambos ambos
```

Ela cai em `faixa-1080/` e `moldura-1080/`. É o mesmo desenho, só com
metade dos pixels.

---

## Ordem de upload

O Play Console mostra as capturas **na ordem em que você as arrasta**, e
os três primeiros são os que aparecem sem ninguém tocar em nada. Suba na
ordem do nome do arquivo:

| Ordem | Arquivo       | Chamada                   | De quem é a tela |
| ----: | ------------- | ------------------------- | ---------------- |
|     1 | `frame-1.png` | Veja a van ao vivo        | Responsável      |
|     2 | `frame-2.png` | Chega às 07:12            | Responsável      |
|     3 | `frame-3.png` | Embarcou. Desembarcou.    | Responsável      |
|     4 | `frame-4.png` | A mensalidade pelo app    | Responsável      |
|     5 | `frame-5.png` | O motorista só dirige     | Motorista        |
|     6 | `frame-6.png` | Checklist antes de sair   | Motorista        |
|     7 | `frame-7.png` | A frota inteira na tela   | Transportadora   |
|     8 | `frame-8.png` | O caixa da transportadora | Transportadora   |

E o banner, que vai no campo separado:

| Campo              | Arquivo               | Tamanho  |
| ------------------ | --------------------- | -------- |
| Gráfico de recurso | `feature-graphic.png` | 1024x500 |

O banner **não** acompanha o 4K: a Play Console exige 1024x500 exatos, e
2048x1000 é recusado.

`contato.png` **não sobe.** É a folha de conferência, com tudo junto.

### Por que são exatamente oito

A Play Console aceita no máximo 8 capturas por tipo de aparelho. Eram
nove com um fecho de marca no fim; ele saiu, porque não mostra o produto
e o gráfico de recurso já faz esse papel no topo da ficha.

Se a cobrança da família não estiver ligada no dia da publicação, tire o
`frame-4.png` e suba sete. Mostrar tela que não funciona é o caminho mais
rápido para avaliação de uma estrela.

---

## Conferência das regras

O script confere sozinho a cada execução e termina com erro se alguma
peça sair da regra. O que ele checa, contra a página de ajuda da Play
Console lida em 19/10/2026:

| Regra                                     | O que entregamos       |
| ----------------------------------------- | ---------------------- |
| No máximo 8 capturas por tipo de aparelho | 8                      |
| JPEG ou PNG de 24 bits, **sem alfa**      | PNG RGB, sem alfa      |
| Menor lado ≥ 320 px, maior lado ≤ 3840 px | 2160 e 3840            |
| Maior lado ≤ **o dobro** do menor         | 3840 = 1,78x de 2160   |
| Recomendado: 9:16 retrato, pelo menos 4   | 9:16, oito capturas    |
| Gráfico de recurso 1024x500               | 1024x500               |
| Tamanho de arquivo                        | nenhum passa de 3,5 MB |

Para repetir a conferência:

```
python3 scripts/play-store-assets.py play-store
```

### Sobre HDR

A ficha da loja **não tem HDR**. A Play Console documenta exatamente
dois formatos para captura, "JPEG ou PNG de 24 bits (sem alfa)", e não
descreve suporte a Ultra HDR nem a mapa de ganho. As peças são sRGB de 8
bits por canal, que é o que a loja exibe.

Fabricar um mapa de ganho a partir de um desenho que nasceu em SDR não
acrescentaria faixa dinâmica nenhuma: inventaria brilho que o original
não tem. O que dá para entregar de verdade é resolução, e ela está no
teto do que a loja aceita.

---

## O que estas peças não são

São **reconstrução fiel do app, não captura de aparelho**: cada medida e
cor vem do código em `packages/ui`, `packages/theme` e `apps/mobile`.
Antes de publicar, instale a 1.4.0 e confira que as telas batem. Se
divergirem, quem está errado é a peça.

Os nomes e endereços são de teste. Nenhum dado de criança real, em
nenhum quadro.

O raciocínio de cada escolha está em
`empresa/marketing/2026-10-19-play-store-destaques.md`.
