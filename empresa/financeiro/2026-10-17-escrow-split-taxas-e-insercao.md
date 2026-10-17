# Escrow, split e as nossas taxas: o plano, com os números

**Pedido do fundador em 17/10/2026:** planejamento financeiro da cobrança
com escrow e split, as taxas da Asaas, como inserir as taxas da Rotta e
como isso reflete. Entregue pelo **CTO** e pelo **CMO**, cada um na parte
que é dele, com uma seção conjunta onde as duas partes se contradizem e a
contradição precisa ser decidida.

Este documento continua três que já existem e não repete o que eles já
resolveram:

- `2026-10-14-dinamica-do-split-caixa-e-risco.md` (CFO): o caminho do
  dinheiro, o risco de garantidora, o teto do MEI.
- `2026-10-15-split-asaas-respostas-e-decisoes.md`: o que a Asaas
  respondeu por escrito, incluindo a inversão de quem cria a cobrança.
- `2026-10-14-split-atrai-ou-afasta.md` (CMO): quem compra, quem não
  compra, e o que nunca dizer.

**Nada aqui é estimado sem rótulo.** Taxa da Asaas vem da tabela pública
deles; regra de split vem das respostas por escrito de 14 e 15/10; número
de clientes vem do banco; ticket de R$ 300 é premissa declarada, porque
os contratos existentes estão em R$ 0,00.

---

## 1. O que mudou desde 16/10: isto deixou de ser plano

Até 16/10 a cobrança da família não existia no banco. A tela de
Pagamentos do responsável estava desenhada e vazia, e qualquer conta
sobre take rate era conversa sobre algo que não tinha onde ser gravado.

Na madrugada de 17/10 entrou a estrutura (commit `e416628`):

| O que entrou                                 | Onde                                | Para que serve nesta frente                                                              |
| -------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `ContractInvoice`                            | banco, com RLS por empresa          | a fatura mensal da família, uma por contrato por competência, valor congelado na emissão |
| `CompanyPaymentAccount`                      | banco, uma linha por transportadora | para onde vai o dinheiro, e **a nossa taxa**, no campo `taxaDaPlataformaBps`             |
| `asaasWalletId`                              | em `CompanyPaymentAccount`          | o destino do split. Vazio hoje, porque depende da subconta                               |
| `repasseDiretoAoTransportador`               | em cada fatura                      | registra se aquele pagamento foi por split ou passou pela nossa conta                    |
| `taxaDoProvedorCentavos` e `repasseCentavos` | em cada fatura                      | quanto a Asaas retém e quanto sobra, por fatura, auditável                               |

Ou seja: **a taxa da Rotta já tem onde morar, por transportadora, e está
em zero.** Ligar a cobrança não é mais um projeto de banco de dados, é
uma decisão de preço mais a subconta da Asaas.

---

## 2. As taxas da Asaas, e como elas realmente incidem

Tabela pública da Asaas, consultada em 17/10/2026. O que está "por três
meses" é promoção de entrada: toda conta deste documento usa o valor
cheio, nunca o promocional.

| Meio de pagamento           | Taxa                                                                               | Observação                                                        |
| --------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Pix recebido**            | **R$ 1,99** por cobrança                                                           | R$ 0,99 nos 3 primeiros meses                                     |
| **Boleto**                  | **R$ 1,99** por cobrança                                                           | R$ 0,99 nos 3 primeiros meses                                     |
| Cartão de débito            | R$ 0,35 + 1,89%                                                                    |                                                                   |
| Cartão de crédito à vista   | R$ 0,49 + 1,99%                                                                    |                                                                   |
| Crédito 2 a 6 parcelas      | R$ 0,49 + 2,49%                                                                    |                                                                   |
| Crédito 7 a 12 parcelas     | R$ 0,49 + 2,99%                                                                    |                                                                   |
| Crédito 13 a 21 parcelas    | R$ 0,49 + 3,29%                                                                    |                                                                   |
| Antecipação de recebível    | crédito à vista a partir de 2% ao mês; parcelado 2,49% ao mês; boleto 5,79% ao mês | receita da Asaas, não nossa                                       |
| Transferência Pix de saída  | 30 gratuitas por mês                                                               | acima disso, não está público                                     |
| **Split de pagamentos**     | **sem tarifa própria**                                                             | o custo é a taxa do meio de pagamento                             |
| **Conta escrow (custódia)** | **tarifa recorrente por subconta com custódia ativa**                              | **valor não é público.** Pergunta aberta ao comercial desde 15/10 |

### A regra que muda toda a aritmética

A taxa da Asaas é descontada **antes** da divisão do split, confirmado
por escrito pela gerente de contas em 14/10 (resposta 5). No split
percentual, portanto, **a tarifa é rateada entre nós e a
transportadora**, na mesma proporção do split.

Isso tem uma consequência que vale escrever porque é contraintuitiva e
porque eu mesmo errei ao estimar de cabeça antes de refazer a conta pela
regra: **no split percentual, o cartão não encarece a Rotta, encarece a
transportadora.** A nossa receita cai alguns centavos; a dela cai alguns
reais. Quem decide o meio de pagamento está decidindo o bolso dela, não o
nosso. Qualquer argumento de venda que diga o contrário é falso.

### Duas isenções que não entram na conta

- **Os 100 Pix gratuitos por mês** valem para Pix recebido por chave ou
  QR estático. Cobrança de fatura usa QR dinâmico, e a Asaas respondeu em
  14/10 que não localizou confirmação para assinatura com QR dinâmico.
  **Toda conta aqui usa R$ 1,99 em toda cobrança.** Se a isenção valer um
  dia, o caixa fica melhor que o projetado, nunca pior.
- **As 30 transferências Pix gratuitas** são de saída da conta. Importam
  no saque da transportadora, não na cobrança da família.

---

## 3. Onde a nossa taxa entra, tecnicamente (CTO)

Três decisões já estão tomadas pelo que a Asaas confirmou, e as três
estão implementadas ou têm lugar reservado.

**1. Percentual, não valor fixo.** A regra do percentual está confirmada
por escrito; a do valor fixo isolado não. `taxaDaPlataformaBps` guarda a
taxa em pontos-base (1% = 100 bps), por transportadora, hoje em `0`. Isso
vira o `percentualValue` do array `split` na criação da assinatura na
Asaas.

**2. Por transportadora, não global.** O CFO recomendou em 14/10 duas
taxas diferentes: **5% quando a transportadora traz o contrato** e **15%
quando a Rotta origina o cliente**. O campo é por transportadora
justamente para isso: as duas políticas convivem sem migração de banco e
sem código condicional.

**3. Piso por transação, quando confirmado.** A resposta de 15/10
registra que o split de assinatura aceita `fixedValue` junto com
`percentualValue`, o que garantiria piso por cobrança. A aritmética exata
dessa combinação **não foi testada por nós** e precisa de sandbox antes
de qualquer preço depender dela. Enquanto não for testada, o piso não
existe no plano.

### O que falta de código, em ordem

| Passo                                                                            | Depende de                                        | Tamanho                               |
| -------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------- |
| Criar subconta da transportadora por API, com prova de vida pela `onboardingUrl` | liberação do white label pelo comercial           | médio                                 |
| Guardar a chave de API da subconta                                               | autorização do fundador, mais controle de segredo | pequeno, mas é o passo de maior risco |
| Mandar o array `split` na criação da assinatura                                  | os dois acima                                     | pequeno, o campo já existe            |
| Ligar custódia por subconta (`POST /v3/accounts/{id}/escrow`)                    | decisão de `isFeePayer`                           | pequeno                               |
| Tela de atualizar cartão e aviso ao responsável                                  | só se o cartão entrar                             | médio                                 |

**Nunca usar o endpoint que liga custódia em todas as subcontas de uma
vez.** Isso já está escrito em 16/10 e repito porque é dinheiro: das 8
transportadoras cadastradas, 7 estão em trial e não transacionam. Ligar
tudo de uma vez gera tarifa recorrente sobre base inativa.

---

## 4. Quanto sobra para cada um

Premissa: mensalidade de **R$ 300**, take de **5%**, split percentual,
taxa da Asaas rateada antes da divisão.

| Meio            | Taxa Asaas |   Líquido | **Rotta (5%)** | **Transportadora** | Take efetivo |
| --------------- | ---------: | --------: | -------------: | -----------------: | -----------: |
| **Pix**         |    R$ 1,99 | R$ 298,01 |   **R$ 14,90** |      **R$ 283,11** |        4,97% |
| Boleto          |    R$ 1,99 | R$ 298,01 |       R$ 14,90 |          R$ 283,11 |        4,97% |
| Débito          |    R$ 6,02 | R$ 293,98 |       R$ 14,70 |          R$ 279,28 |        4,90% |
| Crédito à vista |    R$ 6,46 | R$ 293,54 |       R$ 14,68 |          R$ 278,86 |        4,89% |
| Crédito 12x     |    R$ 9,46 | R$ 290,54 |       R$ 14,53 |          R$ 276,01 |        4,84% |

A família paga **R$ 300,00 em todos os casos.** Isso é decisão de
posicionamento, não consequência técnica, e está na seção 8.

### Receita mensal da Rotta, por número de famílias pagando

Pix, ticket de R$ 300, cenário conservador.

|                       Famílias pagando |     Take 3% |     **Take 5%** |      Take 8% |
| -------------------------------------: | ----------: | --------------: | -----------: |
|                15 (uma transportadora) |   R$ 134,10 |   **R$ 223,51** |    R$ 357,61 |
|                                     50 |   R$ 447,01 |   **R$ 745,03** |  R$ 1.192,04 |
| 120 (as 8 de hoje, se todas operassem) | R$ 1.072,84 | **R$ 1.788,06** |  R$ 2.860,90 |
|                 453 (teto do MEI a 5%) | R$ 4.049,96 | **R$ 6.749,93** | R$ 10.799,88 |

**Receita confirmada hoje: R$ 39,90 por mês**, de uma transportadora
pagante. Uma única transportadora com 15 famílias a 5% rende cinco vezes
isso. A 5%, o teto do MEI (R$ 6.750 por mês) é atingido com 453
famílias, ou aproximadamente 30 transportadoras de 15 alunos.

### Sensibilidade ao ticket

Take de 5%, Pix. O que muda é o peso relativo da tarifa fixa.

| Mensalidade | Taxa Asaas sobre o bruto | Rotta por fatura |
| ----------: | -----------------------: | ---------------: |
|      R$ 150 |                    1,33% |          R$ 7,40 |
|      R$ 250 |                    0,80% |         R$ 12,40 |
|      R$ 300 |                    0,66% |         R$ 14,90 |
|      R$ 500 |                    0,40% |         R$ 24,90 |
|      R$ 660 |                    0,30% |         R$ 32,90 |

Em ticket baixo a tarifa fixa come uma fatia grande. É aí que o piso por
transação da seção 3 passaria a valer, e é por isso que confirmá-lo em
sandbox vale mais que um décimo de ponto de take.

---

## 5. A custódia reduz o risco, e não elimina (CTO)

O risco que o CFO levantou em 14/10 está confirmado por escrito: em saldo
negativo da subconta, **a conta principal pode responder como
garantidora**. Traduzido: se a família estorna depois de a transportadora
sacar, o rombo é da Rotta.

|   Take |       Um estorno de R$ 300 apaga | Famílias para repor |
| -----: | -------------------------------: | ------------------: |
|     3% |     33,6 mensalidades de receita |       33 por um mês |
| **5%** | **20,1 mensalidades de receita** |   **20 por um mês** |
|     8% |     12,6 mensalidades de receita |       12 por um mês |

A conta escrow retém o valor por `daysToExpire` dias e serve exatamente
para cobrir esse buraco. **Mas ela não fecha o buraco, e este é o achado
desta seção:** chargeback de cartão pode voltar em até 540 dias, e
nenhuma custódia vai ser configurada para 540 dias, porque isso
significaria a transportadora receber dezoito meses depois. Qualquer
prazo praticável deixa exposição residual.

| Prazo de custódia | Cobre                                     | Deixa descoberto |
| ----------------- | ----------------------------------------- | ---------------- |
| 7 dias            | contestação imediata                      | de 8 a 540 dias  |
| 30 dias           | a maior parte das contestações de serviço | de 31 a 540 dias |
| 90 dias           | quase tudo que é operacional              | de 91 a 540 dias |

Então a pergunta aberta número 2 enviada ao comercial ("o que elimina, e
não apenas reduz, a exposição da conta pai") já tem uma resposta a que
dá para chegar por raciocínio: **custódia não elimina.** O que elimina é
não aceitar o meio de pagamento que permite chargeback.

Isso coloca a decisão onde ela é: **aceitar cartão é escolher um risco,
não resolver um problema técnico.** E a decisão de 14/10 do fundador foi
que o cartão é o meio principal, contra a recomendação do CFO do mesmo
dia. Esta seção não reabre a decisão; ela coloca o número residual ao
lado dela, que é o que faltava.

### E tem o custo que escala por subconta

A tarifa recorrente de custódia é por subconta ativa, e o campo
`isFeePayer` decide quem paga: a Rotta ou a transportadora. Com 7 das 8
transportadoras em trial, ligar custódia em todas e deixar `isFeePayer`
na subconta significa mandar cobrança para quem nunca recebeu um real
pela Rotta. Deixar na conta pai significa a Rotta pagando por subconta
parada.

**Recomendação do CTO: custódia só na subconta que já está recebendo, uma
a uma.** O valor da tarifa segue não sendo público, e sem ele não existe
projeção de custo desta frente, só a ordem de grandeza do risco que ela
cobre.

---

## 6. A contradição central, e ela é de marketing (CMO)

O CMO escreveu em 14/10 que a objeção mais fácil de responder é o medo de
demorar para receber, e que a resposta é boa:

> "Hoje o dinheiro cai na mão dela no dia. Essa é a objeção mais fácil de
> responder, e a resposta é boa: com PIX, cai na conta dela no mesmo dia."

E o segundo dos três pontos de venda é: **"o dinheiro cai na conta dela,
não na nossa."**

**A custódia quebra as duas frases.** Com custódia ativa, o dinheiro
fica retido por `daysToExpire` dias antes de chegar à transportadora. A
melhor resposta que o marketing tinha deixa de ser verdade, e a regra da
casa é que não se diz o que não é verdade.

Não é um detalhe de copy. É o seguinte: **a proteção que o cartão exige
custa justamente o argumento que vende.** Para um mercado que hoje recebe
Pix na hora, na chave pessoal, "cai em 30 dias" não é um ajuste de
expectativa, é a objeção central voltando maior.

### As três saídas, e o que cada uma custa

| Saída                             | O que a transportadora ouve                | O que custa                                                                     |
| --------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| **A. Pix e boleto, sem custódia** | "cai na sua conta no mesmo dia"            | a família não parcela, e o cartão em arquivo não existe                         |
| **B. Custódia só no cartão**      | "no Pix cai na hora; no cartão, em X dias" | depende de a custódia ser seletiva por meio de pagamento, **o que não sabemos** |
| **C. Custódia em tudo**           | "cai em X dias"                            | perde o melhor argumento de venda com o perfil que mais compra                  |

A saída B é a que o produto quer e **é uma pergunta técnica aberta**: a
custódia é configurada por subconta, com um prazo por subconta, e não
está documentado se dá para aplicá-la a um meio de pagamento e não a
outro. Se não der, a arquitetura viável é mais feia (duas subcontas por
transportadora, ou o cartão passando por caminho separado) e precisa
entrar na conta antes de prometer qualquer coisa.

**Essa pergunta vai para a mesma lista do comercial, e ela é de produto,
não de preço.** Enquanto não houver resposta, a comunicação só pode
sustentar a saída A.

---

## 7. Como isso reflete, nas três pontas

### Na transportadora

Recebe **R$ 283,11** de uma mensalidade de R$ 300 no Pix, com take de 5%.
São 94,4% do bruto, contra 100% recebidos hoje na chave pessoal, menos o
que ela perde de inadimplência e menos o tempo dela cobrando no WhatsApp.
O argumento não é "é barato", é a comparação: dois atrasados crônicos numa
van de 15 famílias são R$ 600 em risco por mês, e o take de 5% custa
R$ 225.

Ganha também o que não é dinheiro e vende melhor do que desconto:
extrato organizado para provar renda, e a fatura com `taxaDoProvedorCentavos`
e `repasseCentavos` gravados, ou seja, ela vê exatamente quanto a Asaas
retém e quanto a Rotta retém, por fatura. Intermediação sem extrato é
onde a desconfiança nasce.

### Na família

Paga **R$ 300,00**, o mesmo que paga hoje. Nenhuma taxa é repassada a
ela, em nenhum meio de pagamento. Isso é decisão de posicionamento e vale
escrever como regra: a família que compara "R$ 300 no Pix do motorista"
com "R$ 310 no app" não migra, e a migração dela é o que faz a frente
existir.

O que ela ganha: comprovante, histórico e alguém para recorrer. O terceiro
só pode ser dito **se o canal de reclamação existir de fato**, e hoje
existe: chamados estão abertos para responsável, e desde 17/10 também para
motorista e monitor.

### Na Rotta

Sai de **R$ 39,90 por mês** para **R$ 223,51 por mês** com uma única
transportadora de 15 famílias a 5%. É a diferença entre uma receita que
não paga nada e uma receita que começa a pagar infraestrutura.

Com custódia, essa receita também fica retida, porque o split da Rotta
segue o mesmo prazo da subconta. Em valor absoluto hoje isso é pequeno;
em 453 famílias não é.

---

## 8. O que o marketing pode dizer sobre preço, e o que não (CMO)

As regras de 14/10 continuam valendo e ganham duas.

**Continua proibido:**

- "Taxa zero" ou "sem taxas". Existe take rate.
- O percentual isolado na peça, sem a conta de inadimplência ao lado.
- O nome do provedor de pagamento.
- "Garantimos o seu recebimento." Não garantimos.

**Novo, por causa deste documento:**

- **Nunca prometer prazo de repasse sem saber se a custódia está ligada
  naquela subconta.** "Cai no mesmo dia" é verdade sem custódia e mentira
  com custódia, e a configuração é por subconta, ou seja, pode variar
  entre dois clientes.
- **Nunca dizer que o cartão é sem custo para a transportadora.** No
  split percentual, o cartão de crédito custa a ela R$ 4,25 mais por
  mensalidade de R$ 300 que o Pix, e 12 parcelas custam R$ 7,10 mais.
  Quem escolhe o meio é a família; quem paga a diferença é a
  transportadora. Se o cartão entrar, isso precisa estar dito antes de
  ela assinar, não descoberto no extrato.

**O teste que continua pendente, e vale mais que este documento inteiro:**
falar com as 8 transportadoras cadastradas, uma por uma, com uma pergunta
só, e anotar a palavra exata de quem disser não.

---

## 9. A sequência, com o que destrava cada fase

| Fase               | O que entra                                                        | Destrava com                                                                                 | Risco de estorno                            |
| ------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **0. Feito**       | fatura mensal, Pix da família, repasse pelo Rotta Pay, take em 0   | nada, está no ar                                                                             | nenhum, o dinheiro passa pela nossa conta   |
| **1. Take ligado** | subconta, split percentual, Pix e boleto, sem custódia             | white label pelo comercial, preço pelo fundador, contrato com valor                          | perto de zero                               |
| **2. Cartão**      | cartão recorrente, custódia por subconta, tela de atualizar cartão | decisão de PCI (checkout hospedado ou servidor nosso), custódia seletiva, tarifa de custódia | residual entre o fim da custódia e 540 dias |
| **3. Originação**  | take de 15% em cliente trazido pela Rotta                          | fase 1 funcionando e marketing publicado                                                     | igual à fase 1                              |

**O que trava a fase 1 não é código.** É, em ordem: a liberação do white
label pelo comercial da Asaas, o número do take rate pelo fundador, o
parecer do contador sobre MEI intermediar pagamento de terceiro, e
contrato com valor diferente de R$ 0,00. Os cinco contratos existentes
estão zerados.

---

## 10. O que é do fundador, e não de diretor

1. **O take rate.** 5% e 15% são recomendação do CFO de 14/10, não
   decisão. O campo está em zero esperando o número.
2. **Aceitar cartão.** Decidido em 14/10 pelo cartão como meio principal,
   contra a recomendação do CFO. A seção 5 acrescenta o número do risco
   residual que faltava a essa decisão.
3. **`isFeePayer`**: quem paga a tarifa de custódia. É preço.
4. **Captura de cartão**: checkout hospedado em webview, que contraria a
   diretriz de jornada nativa, ou cartão passando pelo nosso servidor,
   que nos coloca em escopo PCI DSS.
5. **Guardar a chave de API de subconta de terceiro** no nosso banco, e
   sob quais controles.
6. **Falar com o comercial da Asaas.** Nenhum diretor fala com gente de
   fora.

---

## 11. O que não medimos, e o que precisa para medir

Honestidade de fonte, porque metade das decisões acima depende de número
que não temos:

| Não sabemos                                                 | Para saber precisa de                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------ |
| Valor da tarifa recorrente de custódia por subconta         | resposta do comercial da Asaas                                     |
| Se a custódia pode ser seletiva por meio de pagamento       | resposta do comercial, e teste em sandbox                          |
| Se os 100 Pix gratuitos valem em assinatura com QR dinâmico | resposta do comercial. Vale R$ 1,99 por cobrança                   |
| Quem figura como recebedor no extrato da família            | resposta do comercial. É causa comum de contestação                |
| A aritmética de `fixedValue` junto com `percentualValue`    | teste em sandbox, antes de qualquer piso entrar no preço           |
| Inadimplência real das famílias                             | nenhuma mensalidade foi cobrada ainda. Só se mede depois da fase 1 |
| Ticket médio real                                           | os contratos estão em R$ 0,00. R$ 300 é premissa, não medida       |

---

_17/10/2026. CTO e CMO. Taxas da Asaas pela tabela pública consultada
nesta data; regras de split pelas respostas por escrito de 14 e 15/10;
contagem de clientes e contratos pelo banco de produção; ticket de R$ 300
declarado como premissa em toda projeção._
