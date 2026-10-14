# Aditivo Lytex, Plano Prime: vale a pena para a Rotta?

**Quem pediu:** o fundador, em 14/10/2026, enviando o PDF do aditivo e
pedindo análise criteriosa, caminho de implementação e divulgação.

**Resposta curta:** o aditivo em si é barato e de risco financeiro
pequeno. A meta que ele compra é **quinze vezes maior que a plataforma
inteira hoje**, e bater essa meta, com o preço atual da Rotta, dá
prejuízo em vez de lucro. Recomendo **não assinar ainda**, e a razão
não é o contrato: é que falta a coisa que viria antes dele.

---

## 1. O que o documento é, exatamente

Não é um "contrato de split payment". É um **aditivo de condições
comerciais** ao Termo de Uso da Lytex, que concede taxas personalizadas
do Plano Prime. O split aparece nele como uma linha de tabela
("Cobrança por valor splitado"), entre outras dezesseis.

| Item        | Valor                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------ |
| Contraparte | LYTEX INSTITUIÇÃO DE PAGAMENTO LTDA, CNPJ 34.778.583/0001-06                                                       |
| Cliente     | 54.623.584 DAVI RIBEIRO VOLOTAO DA SILVA, CNPJ 54.623.584/0001-80                                                  |
| Natureza    | Aditivo ao Termo de Uso, não o contrato principal (cl. 4.5)                                                        |
| Vigência    | Indeterminada, rescisão com 30 dias (cl. 5.1.a)                                                                    |
| Foro        | Comarca de Ipatinga/MG (cl. 6.3)                                                                                   |
| Assinatura  | Pelo PDF recebido, **ainda não assinado**: há o carimbo da Autentique mas nenhuma página de certificado em seguida |

Vale notar quem é o cliente: **o CNPJ do fundador**, não uma pessoa
jurídica "Rotta". Isso tem consequência na seção 5.

---

## 2. O incentivo é quase todo nominal

Esta é a primeira coisa que salta ao comparar as duas colunas do Anexo
I. Em **13 das 17 linhas, a taxa incentivada é idêntica à taxa
padrão.** Não há desconto nenhum em cartão, nota fiscal, Serasa,
subconta, saque de subconta, split, e-mail, SMS ou WhatsApp.

O que de fato muda:

| Serviço              | Padrão                      | Incentivo    | Ganho real                    |
| -------------------- | --------------------------- | ------------ | ----------------------------- |
| Liquidação de boleto | R$ 1,89                     | R$ 1,85      | R$ 0,04 por liquidação        |
| Liquidação de PIX    | 0,99% com mínimo de R$ 1,89 | R$ 1,85 fixo | Depende do ticket, ver abaixo |
| **Valor mensal**     | **R$ 99,90**                | **R$ 0,00**  | **R$ 1.198,80 por ano**       |

O ganho do PIX merece a conta, porque é o único que escala: a taxa
padrão é percentual e a incentivada é fixa, então o desconto cresce com
o ticket. No ponto de equilíbrio, 0,99% do ticket iguala R$ 1,85 quando
o ticket é **R$ 186,87**. Abaixo disso o mínimo de R$ 1,89 manda e o
ganho é de R$ 0,04. Acima disso o ganho é real:

| Ticket    | Taxa padrão      | Taxa incentivada | Ganho   |
| --------- | ---------------- | ---------------- | ------- |
| R$ 150,00 | R$ 1,89 (mínimo) | R$ 1,85          | R$ 0,04 |
| R$ 300,00 | R$ 2,97          | R$ 1,85          | R$ 1,12 |
| R$ 500,00 | R$ 4,95          | R$ 1,85          | R$ 3,10 |

**Conclusão parcial:** o valor do aditivo está concentrado na isenção
da mensalidade (R$ 1.198,80/ano) e no PIX de ticket alto. Tudo o mais
é a tabela padrão com outro nome.

---

## 3. A meta, contra o tamanho real da Rotta

A cláusula 2.2 dá **3 meses** a contar da assinatura para atingir as
metas do Anexo I. As metas são:

- **120 liquidações de boleto por mês**
- **120 liquidações de PIX por mês**

Agora o tamanho da Rotta, medido no banco de produção em 14/10/2026,
não estimado:

| Medida                                       | Valor                     |
| -------------------------------------------- | ------------------------- |
| Transportadoras cadastradas                  | 8                         |
| Transportadoras **pagando**                  | 1                         |
| Transportadoras em teste                     | 7                         |
| **Alunos cadastrados na plataforma inteira** | **8**                     |
| Contratos responsável ↔ transportadora       | 5                         |
| Valor desses contratos                       | **R$ 0,00 em todos os 5** |
| Contratos assinados pelas duas partes        | **0**                     |
| Carteiras criadas (Rotta Pay)                | 1                         |
| Transações de carteira                       | **0**                     |

Assinatura da Rotta: **R$ 39,90/mês** por transportadora
(`ROTTA_SUBSCRIPTION_PRICE_CENTS = 3990`).

Com isso, duas leituras:

1. **Se a Rotta cobrar só as próprias assinaturas**, cada
   transportadora gera 1 liquidação por mês. Com as 8 pagando seriam 8
   liquidações/mês: **6,7% da meta.** Com a realidade de hoje, 1
   pagante, é **0,8%**.
2. **Para chegar a 120 liquidações/mês** seria preciso que ~120
   famílias pagassem a mensalidade do transporte pela plataforma. Hoje
   existem 8 alunos cadastrados no total. A meta é **quinze vezes a
   base inteira de alunos**, e o fluxo que a geraria não existe: os 5
   contratos estão com valor zero e sem assinatura.

A meta não é ambiciosa, é de outra ordem de grandeza.

---

## 4. A cláusula 3.2, e por que ela desmente a 3.1

A 3.1 soa generosa: não bater a meta "não implicará, automaticamente,
na perda das taxas incentivadas". A 3.2 diz o que acontece de verdade:

> "a LYTEX reserva-se o direito de realizar a **compensação
> retroativa**, mediante a cobrança da diferença entre as taxas padrão
> e as taxas incentivadas sobre os volumes efetivamente transacionados"

Ou seja: o incentivo não é desconto, é adiantamento condicionado. E
quem apura é a própria Lytex (3.3).

**Quanto isso custa, em reais.** Dois cenários de 3 meses:

| Cenário                               | Liquidações em 3 meses | Diferença por liquidação | Retroativo        |
| ------------------------------------- | ---------------------- | ------------------------ | ----------------- |
| Rotta como está (1 assinatura/mês)    | 3                      | R$ 0,04 a R$ 1,12        | R$ 0,12 a R$ 3,36 |
| Rotta com 50 PIX/mês de ticket R$ 300 | 150                    | R$ 1,12                  | R$ 168,00         |

Some a mensalidade, se a Lytex entender que ela cabe no 3.2 (o texto
fala em "volumes efetivamente transacionados", o que **argumentavelmente
não cobre** uma mensalidade fixa, mas a redação é ambígua e a apuração é
deles): 3 × R$ 99,90 = **R$ 299,70**.

**Exposição total realista: entre R$ 300 e R$ 470.** Em valor absoluto,
é pequena. **O risco financeiro direto não é motivo para recusar este
contrato.** O motivo é outro, e está na próxima seção.

---

## 5. O que realmente está sendo comprado: uma mudança de modelo

Bater a meta exige que a Rotta deixe de ser só um software de assinatura
e passe a ser o **trilho de pagamento** entre a família e a
transportadora. Isso não é uma configuração, é outro negócio. Três
consequências que o contrato não menciona e que precisam estar na mesa:

### 5.1. O dinheiro é de terceiros, e isso tem arquitetura certa

O dinheiro da família pertence à transportadora, não à Rotta. O desenho
do contrato já prevê o caminho correto: **subconta por transportadora**
(R$ 10,00 de criação, R$ 2,00/mês de manutenção, R$ 2,80 por saque). O
valor cai na subconta da transportadora, e a Rotta retém apenas a sua
parte pelo split.

Isso importa porque o cliente do contrato é o **CNPJ do MEI do
fundador**. Feito pela subconta, o dinheiro das famílias **não transita
pelo faturamento do MEI**, e o enquadramento fica preservado. Feito
errado, com o dinheiro caindo na conta da Rotta e sendo repassado
depois, vira receita do MEI e pode estourar o teto.

**Esta distinção é contábil e eu não substituo contador.** Fica
registrada como o ponto a validar com um, antes de qualquer
implementação: é a diferença entre uma arquitetura segura e um problema
fiscal.

### 5.2. Com o preço de hoje, bater a meta dá prejuízo

A conta, por transportadora, supondo 15 famílias pagando por PIX
(ticket de R$ 300, a transportadora recebendo 90%):

| Item                            | Cálculo                                  | Valor        |
| ------------------------------- | ---------------------------------------- | ------------ |
| Liquidação PIX                  | 15 × R$ 1,85                             | R$ 27,75     |
| Cobrança por valor splitado     | 15 × R$ 1,00 (1% de R$ 270 bate no teto) | R$ 15,00     |
| Manutenção de subconta          | 1 × R$ 2,00                              | R$ 2,00      |
| Saque da subconta               | 1 × R$ 2,80                              | R$ 2,80      |
| **Custo mensal**                |                                          | **R$ 47,55** |
| **Receita mensal (assinatura)** |                                          | **R$ 39,90** |
| **Resultado**                   |                                          | **−R$ 7,65** |

E no cenário em que a meta É batida, com 8 transportadoras e 120
famílias:

| Item                                 | Valor             |
| ------------------------------------ | ----------------- |
| Custo em tarifas                     | R$ 380,40/mês     |
| Receita de assinatura (8 × R$ 39,90) | R$ 319,20/mês     |
| **Resultado**                        | **−R$ 61,20/mês** |

**Este é o número que decide a questão.** Do jeito que a Rotta cobra
hoje, atingir a meta da Lytex faz a empresa perder mais dinheiro, não
menos. O split não é uma economia: é um serviço novo, com custo
próprio, e precisa ter preço próprio.

### 5.3. Com preço próprio, vira um negócio de verdade

Projeção, e está rotulada como projeção. Premissa: a Rotta cobra 3%
sobre a mensalidade intermediada, em vez de absorver a tarifa.

| Item             | Cálculo           | Valor             |
| ---------------- | ----------------- | ----------------- |
| Receita de split | 120 × R$ 300 × 3% | R$ 1.080,00/mês   |
| Custo em tarifas | da tabela acima   | R$ 380,40/mês     |
| **Margem**       |                   | **R$ 699,60/mês** |

Comparado com os R$ 39,90/mês de receita confirmada hoje, é outra
empresa. Mas depende de 120 famílias pagando pela plataforma, e hoje
são 8 alunos cadastrados com contratos de valor zero. **A projeção é
direção, não previsão.**

---

## 6. Riscos contratuais que ficam registrados

| Cláusula | O que diz                                                                          | Por que importa                                                                                                    |
| -------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 4.1      | A Lytex pode alterar as taxas incentivadas **unilateralmente, a qualquer momento** | A isenção de R$ 99,90/mês não é garantida por prazo nenhum                                                         |
| 5.1.b    | A Lytex pode rescindir **a qualquer tempo** por risco ou compliance                | Se a Rotta for o trilho de pagamento, perder o provedor de uma hora para outra para a operação das transportadoras |
| 6.2      | Cessão proibida sem autorização prévia                                             | Quando a Rotta deixar de ser MEI e virar empresa, o contrato **não vai junto**: tem que ser renegociado            |
| 6.3      | Foro de Ipatinga/MG                                                                | A Rotta é de Maricá/RJ. Qualquer disputa custa viagem e advogado em outro estado                                   |
| 1.4      | Negociar taxa implica adesão automática ao Plano Prime                             | Não dá para pegar a taxa sem entrar no plano                                                                       |

Nenhum desses é impeditivo isolado. Juntos, dizem que o lado forte da
relação é a Lytex, e que o que foi concedido pode ser retirado.

---

## 7. O que já existe de Lytex dentro da Rotta

Achado que muda o enquadramento da decisão: **a Lytex já é a provedora
escolhida da Rotta Pay**, decidida no Dossiê 26, e já está meio
construída.

- `apps/api/src/modules/wallet/rotta-pay-provider.service.ts` existe e
  nomeia a Lytex como parceira.
- `LYTEX_CLIENT_ID` e `LYTEX_CLIENT_SECRET` já estão configurados.
- A integração **não está implementada**, e o próprio código diz o
  porquê: o ambiente de desenvolvimento nunca teve acesso de rede a
  `docs.lytex.com.br`, então o contrato real da API (URL base,
  autenticação, **formato do split**) nunca pôde ser confirmado.
- **Conferido hoje, 14/10/2026:** `docs.lytex.com.br` e
  `api.lytex.com.br` continuam inalcançáveis deste ambiente (resposta
  vazia, HTTP 000). `lytex.com.br` responde normalmente. O impedimento
  de agosto é o mesmo de hoje.

A cobrança de assinatura da Rotta, em produção, é pela **Asaas**, não
pela Lytex. Então assinar este aditivo hoje compra desconto num
provedor pelo qual a Rotta ainda não transaciona nada.

---

## 8. O número que falta, e que eu não vou inventar

**As taxas vigentes da Asaas.** Sem elas não existe comparação honesta,
e elas não estão em lugar nenhum do repositório. A fonte é o painel da
Asaas, em Configurações, Taxas e tarifas.

O que precisa ser comparado, linha a linha: liquidação de PIX,
liquidação de boleto, mensalidade da conta, e se a Asaas cobra por
split (ela tem split nativo). **Enquanto esse número não existir, a
frase "a Lytex é mais barata" é um palpite, e eu não assino palpite.**

---

## 9. Recomendação

**Não assinar ainda.** Não porque o contrato seja ruim: ele é barato,
e a exposição máxima se a meta falhar está entre R$ 300 e R$ 470.

Não assinar porque **o relógio de 3 meses começa a correr na
assinatura** (cl. 2.2), e hoje a Rotta não tem nem o primeiro
ingrediente do fluxo que geraria as liquidações: os contratos entre
responsável e transportadora existem com **valor zero e sem
assinatura**. Assinar agora é queimar o prazo construindo o produto.

A ordem certa é esta:

1. **Decidir o modelo.** A Rotta quer ser trilho de pagamento, ou
   software de assinatura? São negócios diferentes, com preços
   diferentes. A seção 5.2 mostra que fazer os dois com o preço de hoje
   dá prejuízo.
2. **Fazer o contrato ter valor.** Enquanto `valorMensalidadeCentavos`
   for 0 nos 5 contratos, não existe split possível. Isso é trabalho de
   produto, não de finanças, e é o verdadeiro pré-requisito.
3. **Puxar as taxas da Asaas** e comparar (seção 8).
4. **Validar a arquitetura de subconta com um contador** (seção 5.1).
5. **Só então assinar**, e negociando uma coisa: que o prazo de 3 meses
   conte a partir da **primeira transação**, não da assinatura. É um
   pedido razoável e é o que protege contra o cenário da cláusula 3.2.

Se o fundador decidir assinar mesmo assim, por causa da isenção da
mensalidade, a decisão é defensável: R$ 1.198,80/ano de economia contra
uma exposição de até R$ 470. Mas aí o pedido do item 5 vira
obrigatório, e tem que ser por escrito.

---

## 10. Sobre divulgar isso imediatamente

O fundador pediu divulgação imediata, e o CMO precisa ouvir isto do CFO
antes de escrever qualquer peça: **não há o que divulgar.**

O split não está implementado, o provedor não está integrado, os
contratos têm valor zero, e a documentação da API continua inalcançável.
Anunciar pagamento dividido hoje seria prometer uma função que não
existe, numa plataforma que transporta criança, onde a única coisa que
vende o produto é confiança.

O material está preparado e pronto em
`empresa/marketing/2026-10-14-split-payment-material.md`, com a frase
honesta que pode ser dita **no dia em que a primeira transação dividida
acontecer de verdade**, e não antes.

---

_Análise feita a partir do PDF do aditivo, do schema e do código do
produto, e de consulta somente leitura ao banco de produção em
14/10/2026. Projeções estão rotuladas como projeção, com a premissa ao
lado. A questão do enquadramento do MEI é contábil e exige um contador:
este documento a levanta, não a resolve._
