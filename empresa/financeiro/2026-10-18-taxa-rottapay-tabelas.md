# Taxa do RottaPay por meio de pagamento

**Pedido do fundador em 18/10/2026.** A versão anterior deste arquivo
modelava tudo como se fosse Pix, e por isso errava: no cartão o custo do
Asaas sozinho passa de 2%, e a mesma taxa não se sustenta. **A taxa da
Rotta muda conforme o meio**, como em qualquer adquirente. CFO e CMO.

---

## 1. Custo do Asaas e faixa de mercado

| Meio            | Custo Asaas     | Faixa das adquirentes  |
| --------------- | --------------- | ---------------------- |
| Pix             | R$ 1,99 fixo    | grátis a 0,99%         |
| Boleto          | R$ 1,99 fixo    | R$ 2,00 a R$ 4,00 fixo |
| Débito          | R$ 0,35 + 1,89% | 0,75% a 1,99%          |
| Crédito à vista | R$ 0,49 + 1,99% | 2,69% a 4,86%          |
| Crédito 2 a 6x  | R$ 0,49 + 2,49% | acima de 4%            |
| Crédito 7 a 12x | R$ 0,49 + 2,99% | acima de 4%            |

Adquirentes por pesquisa pública de 17/10/2026, **não medida por nós**.
Asaas pela tabela pública, valor cheio, sem a promoção de três meses.

---

## 2. Quadro de taxas por meio

Mensalidade de R$ 300.

| Meio                |   Asaas |      Rotta solo |    Total |   % total | Mercado       | Veredito                                          |
| ------------------- | ------: | --------------: | -------: | --------: | ------------- | ------------------------------------------------- |
| **Pix**             | R$ 1,99 | 1,29% = R$ 3,84 |  R$ 5,83 | **1,94%** | 0 a 0,99%     | acima do Pix de maquininha, abaixo de todo cartão |
| **Boleto**          | R$ 1,99 | 1,29% = R$ 3,84 |  R$ 5,83 | **1,94%** | R$ 2 a R$ 4   | competitivo                                       |
| Débito              | R$ 6,02 | 0,49% = R$ 1,44 |  R$ 7,46 | **2,49%** | 0,75% a 1,99% | acima do mercado mesmo com a taxa mínima          |
| **Crédito à vista** | R$ 6,46 | 0,99% = R$ 2,91 |  R$ 9,37 | **3,12%** | 2,69% a 4,86% | dentro, na mediana                                |
| Crédito 6x          | R$ 7,96 | 0,49% = R$ 1,43 |  R$ 9,39 | **3,13%** | acima de 4%   | dentro                                            |
| Crédito 12x         | R$ 9,46 | 0,49% = R$ 1,42 | R$ 10,88 | **3,63%** | acima de 4%   | dentro                                            |

**O débito não entra.** Pela tabela do Asaas ele custa 2,00% de saída,
contra um mercado que vai de 0,75% a 1,99%. Mesmo com a taxa da Rotta no
mínimo o total fica acima do teto do mercado, e débito não serve para
cobrança recorrente de aplicativo.

### Total pago pelo transportador, por ticket

| Mensalidade | Pix e boleto (1,29%) | Crédito à vista (0,99%) | Crédito 12x (0,49%) |
| ----------: | -------------------: | ----------------------: | ------------------: |
|      R$ 150 |                2,60% |                   3,28% |               4,27% |
|      R$ 250 |                2,08% |                   3,17% |               3,86% |
|      R$ 300 |                1,94% |                   3,12% |               3,63% |
|      R$ 500 |                1,68% |                   3,06% |               4,05% |
|      R$ 660 |                1,59% |                   3,03% |               3,96% |

### O que a Rotta recebe

| Mensalidade | Pix e boleto | Crédito à vista | Crédito 12x |
| ----------: | -----------: | --------------: | ----------: |
|      R$ 150 |      R$ 1,91 |         R$ 1,45 |     R$ 0,71 |
|      R$ 300 |      R$ 3,84 |         R$ 2,91 |     R$ 1,42 |
|      R$ 500 |      R$ 6,42 |         R$ 4,85 |     R$ 2,37 |
|      R$ 660 |      R$ 8,49 |         R$ 6,41 |     R$ 3,13 |

Mínimo da nossa fatia: R$ 1,99 em Pix e boleto, R$ 0,99 no cartão.

---

## 3. Comparativo

Van de 15 famílias, R$ 300, faturamento de R$ 4.500 por mês.

| Opção                        |         % |       Por mês | Quem cobra a família |
| ---------------------------- | --------: | ------------: | -------------------- |
| Pix pessoal                  |     0,00% |       R$ 0,00 | ela                  |
| Maquininha, débito mínimo    |     0,75% |      R$ 33,75 | ela                  |
| **Rotta no Pix**             | **1,94%** |  **R$ 87,45** | a Rotta              |
| Maquininha, débito máximo    |     1,99% |      R$ 89,55 | ela                  |
| Maquininha, crédito mínimo   |     2,69% |     R$ 121,05 | ela                  |
| **Rotta no crédito à vista** | **3,12%** | **R$ 140,55** | a Rotta              |
| Maquininha, crédito máximo   |     4,86% |     R$ 218,70 | ela                  |

Somando a mensalidade da plataforma (R$ 39,90, o preço em vigor):
**R$ 127,35 no Pix, 2,83%** e **R$ 180,45 no crédito, 4,01%**.

---

## 4. Planejamento financeiro

Mensalidade de R$ 300, mix de **80% Pix e boleto, 20% crédito à vista**,
que é a distribuição esperada com o Pix como meio padrão do app. Média
de **R$ 3,65 por fatura**.

| Transportadoras | Famílias |       Split | Mensalidades |       Total/mês |    Total/ano |
| --------------: | -------: | ----------: | -----------: | --------------: | -----------: |
|               1 |       15 |    R$ 54,81 |     R$ 39,90 |    **R$ 94,71** |  R$ 1.136,52 |
|               5 |       75 |   R$ 274,05 |    R$ 199,50 |   **R$ 473,55** |  R$ 5.682,60 |
|              10 |      150 |   R$ 548,10 |    R$ 399,00 |   **R$ 947,10** | R$ 11.365,20 |
|              30 |      450 | R$ 1.644,30 |  R$ 1.197,00 | **R$ 2.841,30** | R$ 34.095,60 |
|              60 |      900 | R$ 3.288,60 |  R$ 2.394,00 | **R$ 5.682,60** | R$ 68.191,20 |

### Sensibilidade ao mix

Quanto mais cartão, menos sobra para a Rotta, porque o Asaas fica com a
diferença. Com 450 famílias e 30 transportadoras:

| Mix                  | Por fatura |   Split/mês | Com mensalidades |
| -------------------- | ---------: | ----------: | ---------------: |
| 100% Pix             |    R$ 3,84 | R$ 1.728,00 |      R$ 2.925,00 |
| 80% Pix, 20% crédito |    R$ 3,65 | R$ 1.644,30 |      R$ 2.841,30 |
| 50% Pix, 50% crédito |    R$ 3,38 | R$ 1.518,75 |      R$ 2.715,75 |
| 100% crédito         |    R$ 2,91 | R$ 1.309,50 |      R$ 2.506,50 |

**Entre o melhor e o pior mix há R$ 418,50 por mês.** É o argumento para
o Pix nascer como meio padrão da tela, com o cartão como escolha
explícita da família.

Receita confirmada hoje: **R$ 39,90 por mês**, uma transportadora
pagante, nenhuma família pagando.

---

## 5. Crédito recorrente: é viável, com três condições

Confirmado por escrito pelo time de Integrações do Asaas (14 e
15/10/2026), e não por suposição nossa.

| Pergunta                          | Resposta                                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| A assinatura aceita cartão?       | **Sim.** `POST /subscriptions` com `creditCard` e `creditCardHolderInfo`, ciclo `MONTHLY`, renovação nativa |
| O split acompanha a recorrência?  | **Sim.** Configurado uma vez, o Asaas reaplica em toda cobrança gerada pela assinatura                      |
| Precisa de job de reemissão?      | **Não.** A renovação é da própria assinatura                                                                |
| Dá para alterar o split depois?   | **Sim**, valendo das próximas cobranças em diante                                                           |
| Onde o cartão é tokenizado?       | **No nosso backend.** Não existe SDK mobile nem tokenização pelo front                                      |
| Quanto tempo de retentativa?      | **Até 2 dias** após o vencimento, com evento a cada recusa                                                  |
| Dá para testar recusa no sandbox? | **Não.** Lá toda cobrança é aprovada                                                                        |

### As três condições, e o custo de cada uma

| Condição                      | O que custa                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Escopo PCI DSS**            | O número do cartão passa pelo nosso servidor. A alternativa é o checkout hospedado em webview, que tira a Rotta do escopo e contraria a diretriz de jornada nativa |
| **Chave de API por subconta** | A tokenização usa a chave da subconta que vai cobrar, então a Rotta guarda chave de terceiro no próprio banco                                                      |
| **Chargeback**                | Volta em até 540 dias, e a conta principal responde se a subconta estiver negativa. Custódia reduz, não elimina                                                    |

### Custo e taxa

Cada cobrança da assinatura é uma cobrança à vista, então vale a mesma
linha do quadro da seção 2.

| Item                              | Valor (mensalidade de R$ 300) |
| --------------------------------- | ----------------------------: |
| Custo Asaas por cobrança          |                       R$ 6,46 |
| Rotta solo (0,99%)                |                       R$ 2,91 |
| **Total pago pelo transportador** |           **R$ 9,37 (3,12%)** |
| Rotta por ano, por família        |                      R$ 34,92 |

### A tela que precisa existir antes

A retentativa dura **2 dias**. Cartão vencido ou sem limite vira
inadimplência em 48 horas, sem ninguém perceber. Então a tela de
atualizar cartão e o aviso ao responsável precisam estar prontos
**antes** da primeira cobrança no cartão, e o caminho de recusa precisa
ser testado disparando o payload do webhook contra o nosso próprio
endpoint, porque o sandbox não recusa.

---

## 6. Decisão

| Item                      | Recomendação                                       |
| ------------------------- | -------------------------------------------------- |
| Pix e boleto              | **1,29%** da Rotta, mínimo de R$ 1,99              |
| Crédito à vista           | **0,99%** da Rotta, mínimo de R$ 0,99              |
| Crédito parcelado         | **0,49%**, e só se o fundador aceitar o chargeback |
| Débito                    | **não oferecer**                                   |
| Meio padrão na tela       | **Pix**                                            |
| Incidência                | sobre o valor liquidado, no split                  |
| Mensalidade da plataforma | **R$ 39,90**, o preço em vigor                     |
| Campo no banco            | `taxaDaPlataformaBps` por meio: 129 / 99 / 49      |

**Pendente:** teste em sandbox confirmando que o split incide sobre o
líquido; liberação do white label; parecer do contador sobre MEI
intermediar pagamento; contrato com valor diferente de R$ 0,00. O cartão
ainda carrega o chargeback que a conta principal garante e o escopo PCI
DSS, que são decisões do fundador.

---

_18/10/2026. CFO e CMO. Asaas pela tabela pública; adquirentes por
pesquisa pública declarada como não medida; clientes e contratos pelo
banco de produção; mensalidade de R$ 300 e mix de meios declarados como
premissa._
