# A dinâmica financeira do split: o que entra no caixa, e o que pode sair

**Pedido do fundador em 14/10/2026,** depois das respostas da gerente de
contas da Asaas: análise concreta da dinâmica financeira, o que vai para
o caixa, e como fazer.

**A frase que resume:** o modelo funciona e o caixa fecha. Mas a
resposta 3 da Nathália acrescentou um risco que não estava em nenhuma
conta anterior, e ele decide **qual meio de pagamento a Rotta aceita.**

---

## 1. O caminho de um pagamento, passo a passo

Mensalidade de R$ 300, take de 5%, repasse percentual.

| Etapa                                       |        Valor |
| ------------------------------------------- | -----------: |
| A família paga                              |    R$ 300,00 |
| Taxa da Asaas, descontada ANTES da divisão  |      R$ 1,99 |
| Valor líquido (`netValue`)                  |    R$ 298,01 |
| Vai para a carteira da transportadora (95%) |    R$ 283,11 |
| **Fica no caixa da Rotta**                  | **R$ 14,90** |

Três fatos que a Nathália confirmou e que sustentam esse desenho:

- **O split acompanha a recorrência** (resposta 2). Configurado uma vez
  na assinatura, a Asaas reaplica todo mês sozinha.
- **No percentual, a taxa é descontada antes do repasse** (resposta 5).
  Ou seja, ela é rateada: a Rotta paga 5% da tarifa e a transportadora
  95%. Por isso o take efetivo sai 4,97% em vez de 5,00%.
- **No valor fixo ela não soube confirmar a regra.** Isso fecha a
  questão: **usamos percentual**, e não por preferência, por ser o único
  caminho com regra confirmada por escrito.

### A incógnita que sobrou

A resposta 4 foi "não localizei na base a confirmação sobre os 100 Pix
gratuitos para assinatura com QR dinâmico".

Isso vale dinheiro: é a diferença entre taxa zero e R$ 1,99 por
cobrança. **Toda conta deste documento usa o cenário conservador**, com
taxa em toda cobrança. Se a isenção valer, o caixa é um pouco melhor que
o projetado. Nunca o contrário.

---

## 2. Quanto entra no caixa, por mês

Cenário conservador, ticket de R$ 300.

|        Famílias pagando |     Take 3% |     Take 5% |     Take 8% |
| ----------------------: | ----------: | ----------: | ----------: |
| 15 (uma transportadora) |   R$ 134,10 |   R$ 223,51 |   R$ 357,61 |
|                      50 |   R$ 447,01 |   R$ 745,03 | R$ 1.192,04 |
|      120 (as 8 de hoje) | R$ 1.072,84 | R$ 1.788,06 | R$ 2.860,90 |
|                     281 | R$ 2.512,22 | R$ 4.187,04 | R$ 6.699,26 |

Receita confirmada hoje: **R$ 39,90/mês**. Uma única transportadora com
15 famílias, a 5%, já rende cinco vezes isso.

---

## 3. O risco novo, e ele é o centro deste documento

Resposta 3 da Nathália, na íntegra:

> "Em estorno total, o split também é estornado para todas as contas que
> receberam. Sobre chargeback depois de saque, a base confirma que **a
> conta principal pode responder como garantidora em situações de saldo
> negativo da subconta.** Então esse risco precisa ser considerado no
> desenho da operação."

Traduzindo para o caixa da Rotta: **se uma família estorna depois que a
transportadora já sacou, o rombo é da Rotta.** A subconta fica negativa
e a conta principal cobre.

### O tamanho do buraco

| Take |   Um estorno de R$ 300 apaga |    Famílias para repor |
| ---: | ---------------------------: | ---------------------: |
|   3% | 33,3 mensalidades de receita | 33 famílias por um mês |
|   5% | 20,0 mensalidades de receita | 20 famílias por um mês |
|   8% | 12,5 mensalidades de receita | 12 famílias por um mês |

**Um único estorno de R$ 300 apaga o take de 20 famílias.** Com as 8
transportadoras atuais somando 120 famílias, seis estornos no mês zeram
a receita do mês inteiro.

E o prazo é longo: chargeback de cartão pode voltar **meses depois**,
quando o dinheiro já saiu havia muito tempo.

### A saída, e ela é simples

O risco não é igual em todo meio de pagamento:

| Meio                  | Risco de estorno                                      |
| --------------------- | ----------------------------------------------------- |
| **PIX**               | Irrevogável. Só devolução por fraude comprovada (MED) |
| **Boleto**            | O pagador não tem como estornar                       |
| **Cartão de crédito** | Chargeback por até 540 dias, decidido pela bandeira   |

**Recomendação: o split aceita PIX e boleto, e não aceita cartão de
crédito.** Com isso a exposição de garantidora cai para perto de zero,
sem reserva, sem seguro, sem travar o repasse da transportadora.

Isso custa alguma coisa? Custa: a família perde a opção de parcelar. Mas
veja o que se compra com isso. Aceitar cartão significa a Rotta, com a
conta de um MEI, garantindo o risco de chargeback de 8 transportadoras e
120 famílias, para ganhar R$ 14,90 por mensalidade. **A conta não fecha
de jeito nenhum**: um chargeback custa vinte mensalidades.

Se um dia o cartão for mesmo necessário, o caminho é segurar o repasse
daquela cobrança por um prazo, e aí sim a Conta Escrow passa a ter
função real. Hoje não tem.

---

## 4. Até onde dá para crescer antes de sair do MEI

Teto de R$ 6.750/mês, cenário conservador.

| Take | Famílias | Transportadoras de 15 alunos |
| ---: | -------: | ---------------------------: |
|   3% |      755 |                          ~50 |
|   5% |      453 |                          ~30 |
|   8% |      283 |                          ~19 |

A 5%, a Rotta sai do MEI com **cerca de 30 transportadoras**. É longe do
tamanho de hoje (8) e perto o bastante para já ser horizonte de
planejamento, não surpresa.

Continua de pé, e é de contador: **o MEI pode intermediar pagamento de
terceiros?** O CNAE precisa permitir. Isso se responde antes da primeira
família pagar, não depois.

---

## 5. Recomendação do CFO

| Decisão                                         | Recomendação                                | Por quê                                                                              |
| ----------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------ |
| Take rate, contrato que a transportadora trouxe | **5%**                                      | A conta de inadimplência fecha para ela a 5% e aperta a 8%                           |
| Take rate, contrato originado pela Rotta        | **15%**                                     | Aí a Rotta trouxe o cliente, e é o único lugar onde take de marketplace se justifica |
| Tipo de split                                   | **Percentual**                              | Única regra confirmada por escrito, e rateia a tarifa                                |
| Meios aceitos no split                          | **PIX e boleto. Cartão não**                | Elimina a exposição de garantidora                                                   |
| Assinatura de R$ 39,90                          | **Baixar para R$ 19,90 e manter como piso** | Protege o caixa no mês em que a transportadora não cobra pela plataforma             |
| Conta Escrow                                    | **Não agora**                               | Só faria sentido junto com cartão, que também não entra                              |

### O que ainda falta e não é meu

1. **Validação do white label** pelo time responsável da Asaas. A
   Nathália confirmou que é o modelo certo e que porte mínimo depende de
   outra área.
2. **Confirmação oficial dos 100 PIX gratuitos** para assinatura com QR
   dinâmico. É R$ 1,99 por cobrança em jogo.
3. **Parecer do contador** sobre MEI intermediando pagamento.
4. **Contrato com valor.** Os 5 contratos existentes estão em R$ 0,00 e
   sem assinatura. Nada acima acontece sem isso.

---

_Números tirados das taxas reais da conta Asaas da Rotta, do preço em
`ROTTA_SUBSCRIPTION_PRICE_CENTS` e das respostas da gerente de contas em
14/10/2026. Cenário conservador em toda projeção. O ticket de R$ 300 é
premissa, porque os contratos atuais estão zerados._
