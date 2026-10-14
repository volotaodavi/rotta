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

## 8. O número que faltava, agora da fonte: a conta Asaas da Rotta

A primeira versão desta análise dizia que as taxas da Asaas eram o
único número ausente e que eu não as inventaria. Elas foram obtidas
depois, da fonte certa: a **API da Asaas, consultada com a chave de
produção da própria Rotta** em 14/10/2026 (`GET /v3/myAccount/fees`).
Não é tabela de blog nem de página comercial: é o que a conta
`54.623.584 DAVI RIBEIRO VOLOTAO DA SILVA` paga hoje.

Diferença prática que vale registrar antes dos números: `docs.asaas.com`
e `api.asaas.com` **respondem deste ambiente**. `docs.lytex.com.br` e
`api.lytex.com.br` não. Isso não é detalhe de infraestrutura, é a
diferença entre uma integração que pode ser escrita e uma que está
parada desde agosto.

### Comparação linha a linha

| Serviço                    | Asaas (conta real)                        | Lytex (taxa incentivada)                       | Quem ganha                   |
| -------------------------- | ----------------------------------------- | ---------------------------------------------- | ---------------------------- |
| **Mensalidade da conta**   | **R$ 0,00, não existe**                   | R$ 0,00 **só se bater a meta**, senão R$ 99,90 | **Asaas**                    |
| **Tarifa de split**        | **nenhuma linha na tabela**               | **1% (mín. R$ 0,10, máx. R$ 1,00)**            | **Asaas**                    |
| PIX recebido               | **100 grátis por mês**, depois R$ 1,99    | R$ 1,85 desde o primeiro                       | **Asaas** até 100/mês        |
| Boleto                     | R$ 1,99                                   | R$ 1,85                                        | Lytex por R$ 0,14            |
| Cartão 1x                  | 2,99% + R$ 0,49                           | 3,39%                                          | **Asaas** acima de R$ 122,50 |
| Cartão até 6x              | 3,49% + R$ 0,49                           | 3,89%                                          | **Asaas**                    |
| Cartão até 12x             | 3,99% + R$ 0,49                           | 4,29%                                          | **Asaas**                    |
| Criação de subconta        | R$ 12,90                                  | R$ 10,00                                       | Lytex por R$ 2,90, uma vez   |
| **Manutenção de subconta** | **não existe**                            | R$ 2,00/mês                                    | **Asaas**                    |
| Saque / transferência      | **30 grátis por mês**, depois PIX R$ 2,00 | R$ 6,20 do 6º em diante; subconta R$ 2,80      | **Asaas**                    |
| Nota fiscal                | R$ 0,49                                   | R$ 0,99                                        | **Asaas**                    |
| Negativação                | R$ 9,90                                   | R$ 11,99                                       | **Asaas**                    |
| Consulta de crédito        | R$ 16,99                                  | R$ 17,90                                       | **Asaas**                    |
| WhatsApp                   | R$ 0,55                                   | R$ 0,59                                        | **Asaas**                    |
| SMS                        | R$ 0,50                                   | R$ 0,25                                        | Lytex                        |

A Lytex ganha em três linhas: boleto por R$ 0,14, SMS por R$ 0,25, e
criação de subconta por R$ 2,90 uma única vez. Perde em todo o resto.

### O que isso faz com a conta

**Cenário exato da meta da Lytex: 120 liquidações PIX por mês, 8
transportadoras com subconta.**

|                        | Asaas                                    | Lytex                         |
| ---------------------- | ---------------------------------------- | ----------------------------- |
| Liquidações            | 100 grátis + 20 × R$ 1,99 = **R$ 39,80** | 120 × R$ 1,85 = **R$ 222,00** |
| Tarifa de split        | **R$ 0,00**                              | 120 × R$ 1,00 = **R$ 120,00** |
| Manutenção de subconta | **R$ 0,00**                              | 8 × R$ 2,00 = **R$ 16,00**    |
| Saques                 | dentro dos 30 grátis = **R$ 0,00**       | 8 × R$ 2,80 = **R$ 22,40**    |
| **Custo mensal**       | **R$ 39,80**                             | **R$ 380,40**                 |

**A Asaas sai 9,6 vezes mais barata no cenário exato que o contrato da
Lytex pede. Diferença de R$ 340,60 por mês, R$ 4.087,20 por ano.**

**Cenário conservador**, supondo que a isenção de 100 PIX/mês não valha
para cobrança com QR dinâmico (há indício disso em material comercial
da Asaas, e é a única ressalva real desta seção):

|                  | Asaas                         | Lytex         |
| ---------------- | ----------------------------- | ------------- |
| **Custo mensal** | 120 × R$ 1,99 = **R$ 238,80** | **R$ 380,40** |

Mesmo no pior caso para a Asaas, ela continua **R$ 141,60/mês mais
barata**. A conclusão não depende da isenção.

### Correção da seção 5.2

A conta da seção 5.2, que dava prejuízo de R$ 7,65 por transportadora,
usava as tarifas da **Lytex**, porque era o contrato em análise. Com as
tarifas reais da Asaas ela se inverte:

| Por transportadora, 15 famílias por PIX | Lytex        | Asaas         |
| --------------------------------------- | ------------ | ------------- |
| Custo mensal                            | R$ 47,55     | **R$ 4,98**   |
| Receita (assinatura)                    | R$ 39,90     | R$ 39,90      |
| **Resultado**                           | **−R$ 7,65** | **+R$ 34,92** |

**Pela Asaas, o split fecha no preço que a Rotta já cobra hoje**, sem
precisar de preço novo. A afirmação da seção 5.2 de que "o split
precisa de preço próprio" vale para a Lytex, e não vale para a Asaas.
Fica registrado como correção, não como ajuste de redação.

### A ressalva honesta

A ausência de tarifa de split está apoiada em duas evidências: não
existe linha de split na tabela de taxas da conta, e a documentação do
split diz que o cálculo incide sobre o `netValue`, ou seja, sobre o
valor já líquido das taxas da cobrança. Nenhuma das duas é uma
declaração explícita de "split é grátis". **Antes de depender disso em
contrato com transportadora, confirmar com o suporte da Asaas por
escrito.**

## 9. Recomendação

**Não assinar o aditivo da Lytex, e usar o split da Asaas.**

A recomendação mudou de "não assinar ainda" para "não assinar" quando
as taxas reais da Asaas entraram na conta (seção 8). O argumento é
simples e não depende de projeção:

1. O principal benefício do aditivo é a isenção da mensalidade de
   R$ 99,90. **Na Asaas não existe mensalidade nenhuma**, então esse
   benefício vale zero em comparação.
2. A Lytex cobra **1% por valor splitado**. A Asaas não tem essa linha.
   No volume da meta, são R$ 120,00/mês de diferença só aí.
3. A Asaas é mais barata em quase todas as linhas, e **9,6 vezes mais
   barata no cenário exato que a meta da Lytex exige**.
4. A integração da Asaas **já existe e funciona** em produção, com
   quinze métodos implementados. A da Lytex está parada desde agosto
   porque a documentação é inalcançável, e continua inalcançável hoje.
5. Assinar o aditivo ligaria o relógio de 3 meses da cláusula 2.2 para
   um provedor que a Rotta não vai usar.

O que ainda vale do raciocínio anterior: a exposição da cláusula 3.2
seria pequena (R$ 300 a R$ 470), então o risco de ter assinado não é
grave. Se já assinou, rescinda com os 30 dias da cláusula 5.1.a, sem
pressa e sem multa prevista.

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
3. ~~Puxar as taxas da Asaas~~ **feito**, seção 8.
4. **Validar a arquitetura de subconta com um contador** (seção 5.1).
   Continua valendo, e agora com a Asaas: o `walletId` de cada
   transportadora é o que mantém o dinheiro das famílias fora do
   faturamento do MEI.
5. **Confirmar por escrito com o suporte da Asaas** que não há tarifa
   de split (ressalva da seção 8).
6. **Implementar o split na integração que já existe**, em
   `AsaasClientService`. Ver seção 11.

---

## 11. Como implementar, concretamente

Não é projeto novo. A Asaas já está integrada e em produção
(`apps/api/src/modules/billing/asaas-client.service.ts`, quinze métodos
reais). O split entra como campo na criação de cobrança, não como
provedor novo.

O que a documentação da Asaas exige, e que já foi lido:

1. **Cada transportadora precisa de uma conta Asaas** e a Rotta precisa
   do `walletId` dela. Caminho: criar subconta pela API (R$ 12,90, uma
   vez por transportadora) e guardar o `walletId` em `Company`.
2. **O split vai no corpo da cobrança**, como lista de repasses. Cada
   repasse é `fixedValue` ou `percentualValue` (sobre o `netValue`), e
   os dois podem ser combinados.
3. **A soma dos splits não pode passar do `netValue`.** Se passar, o
   repasse é bloqueado e há 2 dias úteis para corrigir, senão é
   cancelado.
4. **Estorno da cobrança estorna os repasses.** Isso precisa estar
   refletido no ledger da carteira, que já existe
   (`wallet_transactions`).
5. Nunca informar o `walletId` da própria conta que cria a cobrança.

Pré-requisito de produto que continua sendo o verdadeiro gargalo:
`Contract.valorMensalidadeCentavos` está **0 nos 5 contratos**, e
nenhum foi assinado. Sem valor no contrato não existe o que dividir.

E fica a pergunta aberta para o CTO decidir: a Rotta Pay foi desenhada
no Dossiê 26 em cima da Lytex. Se o split vai pela Asaas, o
`RottaPayProviderService` precisa ser reapontado, ou a carteira passa a
ser só ledger interno enquanto o dinheiro anda pela Asaas. São dois
desenhos diferentes e a escolha é técnica, não financeira.

## 12. Split ou Conta Escrow: a pergunta tem armadilha

O fundador perguntou qual das duas é mais vantajosa. **Não são
alternativas, são coisas diferentes que podem ser usadas juntas ou
separadas.**

- **Split** decide **para quem** o dinheiro vai, no momento em que a
  cobrança é paga. A família paga R$ 300, a transportadora recebe a
  parte dela e a Rotta retém a sua, automaticamente.
- **Conta Escrow** decide **quando** o dinheiro recebido pela subconta
  fica disponível. O recebimento acontece, mas o valor fica retido por
  um prazo (`daysToExpire`) ou até uma liberação manual
  (`POST /v3/escrow/{id}/finish`, que é imediata e irreversível).

Dá para ter split sem escrow, escrow sem split, ou os dois. Perguntar
qual é melhor é como perguntar se o volante é melhor que o freio.

### Para a Rotta, a resposta é split agora, escrow não agora

**Três razões, e a primeira não é de custo.**

**1. O escrow inverte a promessa do produto.** Transportadora escolar
vive de caixa apertado. A peça que o CMO preparou diz "receba sem
correr atrás". Com escrow, ela passa a dizer "receba depois". Hoje a
transportadora recebe das famílias direto, no dia, por PIX ou dinheiro.
Oferecer uma plataforma que segura o dinheiro dela por X dias é dar um
motivo para **não** usar a Rotta.

**2. O serviço é contínuo, não é um evento.** Escrow foi desenhado para
marketplace com entrega: segura até o produto chegar, libera. Transporte
escolar é entregue toda manhã e toda tarde, o mês inteiro. Não existe o
momento "entrega concluída" contra o qual liberar. Seria preciso
inventar um critério arbitrário, e critério arbitrário sobre o dinheiro
dos outros é exatamente o que gera disputa.

**3. O custo traz de volta o que acabamos de evitar.** A tarifa da
Conta Escrow não está na tabela de taxas da conta da Rotta (consultada
em 14/10/2026), porque o recurso não está habilitado. A documentação
manda consultar o painel. A referência que encontrei, **de artigo da
central de ajuda e não confirmada na conta**, é de **R$ 99,90 na conta
principal mais R$ 9,90 por mês por subconta habilitada**.

Se esse número estiver certo, com 8 transportadoras:

|                                         | Valor             |
| --------------------------------------- | ----------------- |
| Conta principal                         | R$ 99,90/mês      |
| 8 subcontas × R$ 9,90                   | R$ 79,20/mês      |
| **Total**                               | **R$ 179,10/mês** |
| Receita se as 8 pagassem (8 × R$ 39,90) | R$ 319,20/mês     |
| **Fatia da receita**                    | **56%**           |

Contra a receita confirmada de hoje, que é **R$ 39,90/mês**, o escrow
sozinho custaria **4,5 vezes tudo o que entra**. É a mesma mensalidade
de R$ 99,90 que fez a gente recusar o aditivo da Lytex, com outro nome.

### Onde o escrow seria certo, mais tarde

Existe um caso real, e vale ficar registrado para não ser esquecido: **o
primeiro pagamento de um contrato novo vindo do marketplace.** Uma
família contrata pela Rotta uma transportadora que ela não conhece e
paga o primeiro mês antes de a van passar pela primeira vez. Segurar
**esse** pagamento até a primeira viagem acontecer de verdade é proteção
honesta, e é uma das poucas coisas que justificam a Rotta existir como
intermediária em vez de ser só um aplicativo.

Mas é recurso para quando o marketplace tiver volume, e tem que ser
escopado ao **primeiro pagamento de contrato novo**, nunca a toda
mensalidade. E só vale a pena quando a receita suportar a mensalidade da
funcionalidade.

### Pendência

Confirmar a tarifa real da Conta Escrow no painel
(`asaas.com/config/index?tab=fees`) antes de usar o número acima em
qualquer decisão. Ele veio de artigo de ajuda de terceiro, não da conta.

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
