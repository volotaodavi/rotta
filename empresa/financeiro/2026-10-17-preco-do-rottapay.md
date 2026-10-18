# O preço do RottaPay: percentual competitivo, cobrado no split

**Pedido do fundador em 17/10/2026,** em duas partes. Primeiro a
objeção: os transportadores preferem maquininha ou Pix pessoal, com
taxa menor ou zero, e o preço tem que ser atrativo o bastante para ele
ficar, sem prejuízo para nenhum dos dois lados. Depois a forma:
**percentual, com a Rotta pegando a fatia no split, depois da
liquidação do Asaas.** CFO e CMO.

Este documento **substitui a recomendação de take rate** de
`2026-10-14-dinamica-do-split-caixa-e-risco.md` e **a versão anterior
deste arquivo**, que propunha taxa fixa. O resto do documento de 14/10
continua valendo: a dinâmica do caixa, o risco de garantidora e o teto
do MEI não mudam.

---

## 1. Duas correções, e a segunda é do fundador

**A primeira é do número.** A conta de 14/10 comparou o take rate com a
inadimplência que a transportadora já perde. Por essa régua, 5% fecha.
O que ela não comparou foi o preço com **o que o concorrente cobra**, e
é essa a comparação que a transportadora faz: ela não está decidindo
entre a Rotta e a inadimplência, está decidindo entre a Rotta e a chave
Pix que já está no bolso dela.

Somando o plano, 5% dá **R$ 263,41 por mês** numa van de 15 famílias, ou
**5,85% do faturamento dela**, quase o dobro da maquininha mais cara da
pesquisa. Está fora da faixa de mercado.

**A segunda correção é da forma, e ela é do fundador.** A versão
anterior deste documento concluiu que percentual era a forma errada e
propôs taxa fixa de R$ 3,90. Estava errada por um motivo aritmético:
**ela fazia a Rotta absorver a taxa do Asaas inteira num preço baixo
demais**, sobrando R$ 1,91 por fatura. O percentual sobre o valor
liquidado, cobrado no split, entrega **mais que o dobro disso** e
continua abaixo de qualquer maquininha de crédito. Não era preciso
escolher entre ser competitivo e ganhar.

| Modelo                              | O que a transportadora paga (R$ 300) | O que sobra para a Rotta |
| ----------------------------------- | -----------------------------------: | -----------------------: |
| 5% (proposta de 14/10)              |                                4,97% |                 R$ 14,90 |
| Fixo de R$ 3,90 (versão anterior)   |                                1,30% |                  R$ 1,91 |
| **1,99% no split (este documento)** |                            **1,99%** |              **R$ 3,98** |

---

## 2. O mecanismo: a Rotta pega depois que o Asaas liquida

A gerente de contas confirmou por escrito em 14/10 (resposta 5): **no
split percentual, a taxa do Asaas é descontada antes da divisão.** Ou
seja, o que se divide é o valor já liquidado.

O caminho de uma mensalidade de R$ 300:

| Etapa                                                  |         Valor |
| ------------------------------------------------------ | ------------: |
| A família paga                                         |     R$ 300,00 |
| Taxa do Asaas, descontada na liquidação                |       R$ 1,99 |
| Valor liquidado, que é o que o split divide            |     R$ 298,01 |
| Fatia da Rotta no split (`percentualValue` de 1,3355%) |       R$ 3,98 |
| **Cai na conta da transportadora**                     | **R$ 294,03** |

A transportadora deixou de receber R$ 5,97 dos R$ 300, ou seja,
**exatamente 1,99%.** A taxa do banco está dentro desse número, e quem
a absorve somos nós.

Três propriedades que isso dá, e que a taxa fixa não dava:

1. **A Rotta ganha mais quando a transportadora ganha mais.** Ticket de
   R$ 660 rende R$ 11,14 em vez de R$ 3,98. É o alinhamento que o
   percentual tem e o fixo não.
2. **Nada sai do nosso bolso antes.** A fatia já vem descontada do que
   o Asaas liquidou. Não existe cobrança separada, boleto para a
   transportadora, nem saldo a recuperar.
3. **É um número só para ela.** "1,99% por mensalidade recebida, taxa do
   banco inclusa" é uma frase completa, comparável linha a linha com a
   tabela de qualquer maquininha.

---

## 3. Contra o que a Rotta compete

### O concorrente real é o zero

Pix na chave pessoal de pessoa física **não tem taxa.** É o único número
certo desta seção, e toda proposta de preço da Rotta começa perdendo
para ele. Fingir o contrário é o jeito mais rápido de montar uma tabela
que não vende.

O que a Rotta pode fazer são duas coisas: **ser pequena o bastante para
não doer**, e **substituir trabalho que hoje é feito à mão.** A
maquininha cobra quem está na frente dela; ela não lembra a família no
dia 5, não avisa quem não pagou, não gera o comprovante do mês.

### A maquininha, pela pesquisa pública

Números de sites comparadores consultados em 17/10/2026. **Não são
medidos por nós**, variam por faturamento, plano e promoção, e as
próprias fontes divergem. Entram como faixa de mercado.

| Meio               | Faixa encontrada  |
| ------------------ | ----------------- |
| Pix na maquininha  | de grátis a 0,99% |
| Débito             | 0,75% a 1,99%     |
| Crédito à vista    | 2,69% a 4,86%     |
| Prazo para receber | na hora a D+30    |

A faixa que interessa é a do **crédito**, porque mensalidade é cobrança
recorrente e não venda de balcão: **2,69% a 4,86%.**

---

## 4. O número: 1,99%, com a taxa do banco inclusa

> **1,99% por mensalidade recebida, com a taxa do banco já inclusa.
> Mínimo de R$ 2,90. Se a família não pagar, você não paga nada.**

**1,99% não é um número escolhido por ser redondo.** É o teto da faixa
do débito e fica abaixo de **todo** crédito de maquininha da pesquisa,
inclusive do mais barato, que exige faturamento acima de R$ 80 mil por
mês para ser oferecido.

### Onde cada candidato cai

| Taxa anunciada | Rotta por fatura de R$ 300 | Fica abaixo do crédito?           | Equilíbrio (abaixo some a margem) |
| -------------: | -------------------------: | --------------------------------- | --------------------------------: |
|          0,99% |                    R$ 0,98 | sim, com folga                    |                            R$ 201 |
|          1,49% |                    R$ 2,48 | sim, com folga                    |                            R$ 134 |
|      **1,99%** |                **R$ 3,98** | **sim, por 0,70 ponto**           |                        **R$ 100** |
|          2,49% |                    R$ 5,48 | por 0,20 ponto, que ninguém sente |                             R$ 80 |

**2,49% é o limite técnico e não serve**, porque empata com a
maquininha e empate não tira cliente de lugar nenhum. **0,99% dá
R$ 0,98 por fatura**, que não paga a operação. 1,99% é onde a
competitividade e a margem se encontram.

### Por que existe um mínimo de R$ 2,90

Porque a taxa do Asaas é fixa em R$ 1,99 e a nossa é percentual. Abaixo
de **R$ 100 de mensalidade**, 1,99% não cobre nem a taxa do banco, e a
Rotta passa a pagar para receber o dinheiro da família. O mínimo de
R$ 2,90 protege esse caso e só começa a valer abaixo de R$ 146 de
mensalidade, que é fora da faixa normal do transporte escolar.

### O ganho da Rotta sobe com o ticket

| Mensalidade | Transportadora paga (1,99%) | **Rotta recebe** |
| ----------: | --------------------------: | ---------------: |
|      R$ 150 |                     R$ 2,99 |          R$ 1,00 |
|      R$ 250 |                     R$ 4,98 |          R$ 2,99 |
|      R$ 300 |                     R$ 5,97 |          R$ 3,98 |
|      R$ 400 |                     R$ 7,96 |          R$ 5,97 |
|      R$ 500 |                     R$ 9,95 |          R$ 7,96 |
|      R$ 660 |                    R$ 13,13 |         R$ 11,14 |

---

## 5. O que a transportadora paga, lado a lado

Van de 15 famílias, mensalidade de R$ 300, faturamento de R$ 4.500 por
mês. Plano da Rotta a R$ 19,90 (ver seção 9).

| Opção                                      |       Por mês | % do faturamento dela | Ela faz a cobrança?      |
| ------------------------------------------ | ------------: | --------------------: | ------------------------ |
| Pix pessoal                                |       R$ 0,00 |                 0,00% | sim, uma família por vez |
| Maquininha, débito 1,37%                   |      R$ 61,65 |                 1,37% | sim, uma família por vez |
| **Rotta, 1,99% + plano**                   | **R$ 109,45** |             **2,43%** | **não**                  |
| Maquininha, crédito 2,69%                  |     R$ 121,05 |                 2,69% | sim, uma família por vez |
| Maquininha, crédito 3,15%                  |     R$ 141,75 |                 3,15% | sim, uma família por vez |
| Proposta de 14/10 (5% + plano de R$ 39,90) |     R$ 263,41 |                 5,85% | não                      |

**Mesmo com o plano somado, a Rotta fica abaixo do crédito mais barato
da pesquisa**, e nas três linhas de maquininha a transportadora continua
fazendo a cobrança sozinha.

### Contra o zero, a conta é outra

| Situação na van de 15 famílias  | Valor em jogo |
| ------------------------------- | ------------: |
| Uma família atrasa um mês       |     R$ 300,00 |
| Duas famílias atrasam um mês    |     R$ 600,00 |
| **Custo total da Rotta no mês** | **R$ 109,45** |

**Uma única mensalidade recuperada paga quase três meses de Rotta.**
É a frase da venda, e a transportadora confere no próprio extrato.

---

## 6. O que a Rotta ganha

| Famílias pagando (R$ 300) | **1,99% no split** | Fixo de R$ 3,90 | 5% de 14/10 |
| ------------------------: | -----------------: | --------------: | ----------: |
|                        10 |           R$ 39,80 |        R$ 19,10 |   R$ 149,00 |
|                        15 |           R$ 59,70 |        R$ 28,65 |   R$ 223,51 |
|                        25 |           R$ 99,50 |        R$ 47,75 |   R$ 372,51 |
|                        40 |          R$ 159,20 |        R$ 76,40 |   R$ 596,02 |

Receita confirmada hoje: **R$ 39,90 por mês**, de uma transportadora
pagante. **Uma transportadora de 15 famílias a 1,99% já rende mais que
toda a receita atual da companhia.**

A 1,99%, o teto do MEI (R$ 6.750 por mês) chega com **1.131 famílias**,
contra 453 no modelo de 5%.

### O que se abre mão, dito sem maquiagem

1,99% rende **3,7 vezes menos por transportadora** que os 5% de 14/10.
A defesa é a mesma de antes, e continua valendo: **3,7 vezes mais de
zero continua sendo zero.** Em 14/10 havia 8 transportadoras
cadastradas, 7 em trial e 1 pagante, 10 viagens em toda a história da
plataforma e a última em 28/08/2026. Os 5 contratos existentes estão em
R$ 0,00. Nenhuma família pagou uma mensalidade pela Rotta até hoje.

---

## 7. O número que vai no campo (CFO, com o CTO)

A taxa anunciada é sobre o **bruto**; o split do Asaas incide sobre o
**líquido**. Então o `percentualValue` enviado ao Asaas não é 1,99%:
é o percentual que faz a dedução total da transportadora fechar em
1,99% do bruto.

```
percentualValue = 1 − (1 − 0,0199) × M / (M − 1,99)
```

| Mensalidade | `percentualValue` no split | Transportadora recebe | Rotta recebe |
| ----------: | -------------------------: | --------------------: | -----------: |
|      R$ 150 |                    0,6723% |    R$ 147,01 (98,01%) |      R$ 1,00 |
|      R$ 300 |                    1,3355% |    R$ 294,03 (98,01%) |      R$ 3,98 |
|      R$ 660 |                    1,6936% |    R$ 646,87 (98,01%) |     R$ 11,14 |

A conta é feita **uma vez por contrato**, na criação da assinatura,
porque a mensalidade é fixa no contrato. `taxaDaPlataformaBps` guarda a
**política** (199 pontos-base); o `percentualValue` é derivado dela e da
mensalidade daquele contrato. Nenhum dos dois é digitado à mão.

**O que precisa ser conferido em sandbox antes de o preço valer:** que o
split percentual incide sobre o líquido e não sobre o bruto. É o que a
resposta de 14/10 diz, e é uma tarde de teste para confirmar por conta
própria. Se incidir sobre o bruto, o `percentualValue` passa a ser
1,99% direto e a transportadora absorve a taxa do banco, o que muda a
frase de venda e precisa ser dito a ela antes de assinar.

---

## 8. Cartão continua fora, agora por três motivos

O custo do Asaas no crédito à vista é **R$ 0,49 + 1,99%**. Numa
mensalidade de R$ 300 isso é R$ 6,46, **mais do que os R$ 5,97 que a
transportadora pagaria no total a 1,99%**. Com cartão, o preço anunciado
não cobre nem a taxa do provedor.

Some a isso os dois motivos que já estavam na mesa: o chargeback que a
conta principal garante, e o escopo PCI DSS. Se o cartão entrar algum
dia, ele entra com a taxa do provedor repassada e dita na assinatura,
nunca descoberta no extrato.

---

## 9. O plano mensal desce para R$ 19,90

Hoje é R$ 39,90 (`ROTTA_SUBSCRIPTION_PRICE_CENTS`). A recomendação de
14/10 de baixá-lo continua: ele é o **único recebimento garantido** da
Rotta, porque a fatia do split só existe se a família pagar.

A R$ 19,90, a van de 15 famílias paga 2,43% do faturamento dela. A
R$ 39,90, paga 2,88%, e encosta no crédito da maquininha. **Os R$ 20 de
diferença no plano custam quase meio ponto na comparação que decide a
venda.**

---

## 10. Como isso se vende (CMO)

**A frase de abertura continua não sendo o preço:**

> Pare de correr atrás de mensalidade.

**O preço entra inteiro na segunda pergunta:** "1,99% por mensalidade
recebida, com a taxa do banco já inclusa, e se a família não pagar você
não paga nada."

**Os três pontos, na ordem que a objeção pede:**

1. O dinheiro cai na sua conta, não na nossa.
2. Você paga só pelo que entrou.
3. A família paga sozinha, todo mês, no mesmo dia.

### O que nunca dizer

As quatro proibições de 14/10 continuam: nada de "taxa zero", nada de
citar o provedor, nada de "garantimos o seu recebimento", e o
percentual nunca aparece sozinho numa peça sem a comparação ao lado.

**A quinta, nova:** **nunca comparar a Rotta com o Pix pessoal pelo
preço.** Perdemos sempre, porque o outro lado é zero. A comparação certa
é com o que ela perde hoje, e com o número dela: uma mensalidade
atrasada é R$ 300; o mês inteiro de Rotta é R$ 109,45.

**A sexta:** **sempre dizer "taxa do banco inclusa".** Quem vem de
maquininha está acostumado a descobrir tarifa escondida no extrato, e
essa frase é a diferença entre um preço e uma desconfiança.

### O teste, com a pergunta corrigida

> Se a família pagasse a mensalidade pelo app, o dinheiro caísse na sua
> conta e custasse 1,99% com a taxa do banco inclusa, você usaria?

São 8 transportadoras cadastradas. **Oito conversas valem mais que este
documento inteiro**, e de quem disser não é preciso anotar a palavra
exata.

---

## 11. O que o fundador decide

| Decisão                         | Recomendação de CFO e CMO                                                |
| ------------------------------- | ------------------------------------------------------------------------ |
| Forma de cobrar                 | **Percentual, cobrado no split sobre o valor liquidado**                 |
| Taxa                            | **1,99% do bruto, com a taxa do Asaas inclusa**                          |
| Mínimo por fatura               | **R$ 2,90**, que só morde abaixo de R$ 146 de mensalidade                |
| Quem absorve a taxa do provedor | **A Rotta.** É o que torna "1,99%" uma frase verdadeira                  |
| Meios aceitos                   | **Pix e boleto.** Cartão não cabe no preço                               |
| Plano mensal                    | **R$ 19,90**, como piso garantido                                        |
| Contrato originado pela Rotta   | **Fica para depois.** Take de marketplace só com base que já transaciona |

Nada disso vale antes de: o teste de sandbox da seção 7, a liberação do
white label pelo comercial do Asaas, o parecer do contador sobre MEI
intermediar pagamento de terceiro, e contrato com valor diferente de
R$ 0,00.

---

## 12. O que não medimos

| Não sabemos                                | Impede                                    | Para saber precisa de                                          |
| ------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------- |
| Custo de infraestrutura por mês            | saber quantas faturas pagam a operação    | somar as faturas de Render, Vercel, Supabase e Asaas de um mês |
| Se o split incide sobre líquido ou bruto   | pôr o número certo no `percentualValue`   | teste em sandbox                                               |
| Tarifa recorrente de custódia por subconta | precificar o cartão algum dia             | resposta do comercial do Asaas                                 |
| Inadimplência real das famílias            | provar a promessa de venda com dado nosso | a primeira safra de faturas                                    |
| Ticket médio real                          | tudo acima é premissa                     | contratos com valor. Os 5 existentes estão em R$ 0,00          |

As taxas de maquininha vieram de sites comparadores públicos, vários com
link de afiliado, e as fontes divergem entre si. Entram como faixa de
mercado. **A confirmação é uma simulação oficial com o volume real**, e
ela não foi feita.

---

_17/10/2026. CFO e CMO. Taxas do Asaas pela tabela pública consultada
nesta data; regra do split percentual pela resposta por escrito de
14/10; faixa de maquininha por pesquisa pública, declarada como não
medida. Contagem de clientes, contratos e viagens pelo banco de
produção. Mensalidade de R$ 300 e van de 15 famílias declaradas como
premissa, porque os contratos existentes estão zerados._
