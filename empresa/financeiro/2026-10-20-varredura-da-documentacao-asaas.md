# Varredura da documentação do Asaas, página por página

**Pedido do fundador em 20/10/2026**, com o índice da documentação em
mão. CTO.

O mapa completo da documentação está em `docs.asaas.com/llms.txt`, que
indexa cada seção. Foram lidas 25 páginas, escolhidas pelas que podiam
(a) invalidar algo que já está no ar, (b) responder uma das sete
perguntas abertas do comercial, ou (c) destravar o passo 4.

**Resultado em uma linha:** três defeitos reais no que foi entregue hoje
de manhã, um limite de produção que ninguém sabia que existia, e duas
das sete perguntas do e-mail respondidas sem precisar do comercial.

---

## 1. Três defeitos reais, encontrados e corrigidos

### 1.1 A chave da subconta era lida no lugar errado

**O achado.** O guia de criação de subconta diz, em texto, que "a
resposta contém `apiKey` e `walletId`". O schema da referência da mesma
API (`AccountSaveResponseDTO`) **não tem `apiKey` no topo**: tem
`accessToken`, um objeto, com `apiKey` dentro. A própria referência avisa
para conferir a resposta real antes de confiar.

**Por que era grave.** O código lia só o topo. Se a resposta real for a
do schema, a Rotta gravaria `null`, a subconta nasceria sem poder emitir
cobrança, a custódia ficaria indisponível, e ninguém saberia por quê — a
chave só é exibida uma vez.

**Correção.** Lê os dois lugares, com a forma aninhada ganhando. Dois
testes guardam cada forma e um terceiro guarda a precedência.

**O que também aprendi, e muda o que eu disse antes:** a perda **não** é
definitiva. Existe `POST /v3/accounts/{id}/accessTokens`, que cria uma
chave nova para a subconta. Eu havia escrito "perdeu, não tem segunda
chance", e isso estava errado. O que não se recupera é o **valor** de uma
chave já criada: "Uma chave já criada não pode ter seu valor
recuperado." A ressalva importante é que esses endpoints "ficam
bloqueados por padrão até que o acesso seja habilitado na interface web",
e esse acesso **expira em 2 horas**. É saída de emergência, não rotina.

### 1.2 O link de envio de documentos nunca ia aparecer

**O achado.** `onboardingUrl` **não existe** na resposta de
`POST /v3/accounts` — não está no schema. Ele vive em
`GET /v3/myAccount/documents`, consultado **com a chave da subconta**, e
a documentação pede pelo menos **15 segundos** depois da criação.

**Por que era grave.** O código lia `subconta.onboardingUrl` na criação.
O campo vinha sempre vazio, então o botão "enviar os documentos" jamais
apareceria para transportadora nenhuma — e é justamente o único momento
em que ela precisa ver o Asaas.

**Correção.** O link passa a ser buscado de verdade, no endpoint certo, e
gravado na primeira leitura da tela.

### 1.3 `companyType` não era enviado

**O achado.** O Asaas aceita quatro valores — `MEI`, `LIMITED`,
`INDIVIDUAL`, `ASSOCIATION` — e **somente quando o titular é pessoa
jurídica**.

**Correção.** Mapa de `CompanyType` da Rotta para o do Asaas.
`AUTONOMO` manda `undefined`, porque é CPF e o campo não se aplica.
`COOPERATIVA` vai como `ASSOCIATION`; `SOCIEDADE_SIMPLES` e `OUTRO` vão
como `LIMITED`, que é o mais próximo.

### 1.4 De brinde: nove campos obrigatórios, não um

O guia destaca só `incomeValue`. O schema marca **nove**: `name`,
`email`, `cpfCnpj`, `mobilePhone`, `incomeValue`, `address`,
`addressNumber`, `province`, `postalCode`.

A Rotta já tem os nove — oito do cadastro da transportadora e o
faturamento do formulário. Os tipos foram apertados para obrigatórios, de
modo que faltar um deles seja erro de compilação aqui, e não um 400 do
Asaas no meio da criação.

---

## 2. O limite que ninguém sabia que existia

**Período de Avaliação Regulatória.** Começa automaticamente quando a
primeira subconta é criada **em produção**, e enquanto ele vale:

| Limite                  | Valor                    |
| ----------------------- | ------------------------ |
| Subcontas por conta-pai | **10**                   |
| Cobranças por subconta  | **R$ 2.000,00**          |
| Duração                 | até **60 dias corridos** |

**O que acontece ao bater o limite:** não dá para criar subconta nova; a
subconta que chegou a R$ 2.000,00 não emite mais cobrança; **assinaturas
existentes são canceladas automaticamente**; links de pagamento da
subconta são desativados. Cobrança emitida antes do bloqueio continua
pagável. Transferência para subconta bloqueada é recusada, inclusive por
split.

Cobrança apagada antes do pagamento devolve limite. Cobrança **estornada
não devolve**.

**Por que isto importa muito para a Rotta.** São 8 transportadoras
cadastradas. Dez subcontas é o teto, e R$ 2.000,00 por subconta é pouco:
a mensalidade de referência é R$ 660,00, ou seja **três famílias** e a
subconta trava. Ligar isto para todo mundo de uma vez levaria a base
inteira a um bloqueio em semanas.

**O que destrava:** pedir a homologação, que pode ser solicitada a
qualquer momento, sem esperar os 60 dias nem bater limite. Aprovada, os
limites deixam de valer.

**Em sandbox** o período vem ligado por padrão mas **pode ser
desligado** na própria conta de sandbox. É o que permite testar o passo 5
sem gastar o período de produção.

→ Isto virou uma pergunta nova no e-mail ao comercial, e muda o passo 6.

---

## 3. Duas das sete perguntas, respondidas sem o comercial

### Pergunta 7 (PCI DSS): respondida, e há saída

A página de PCI-DSS é explícita sobre os formatos:

| Formato                                         | Efeito no escopo                         |
| ----------------------------------------------- | ---------------------------------------- |
| Checkout Asaas, Fatura Asaas, Link de Pagamento | "Pode reduzir o escopo da sua empresa"   |
| API Asaas (dado passa pelo nosso back end)      | "Sua infraestrutura permanece no escopo" |
| Tokenização no servidor                         | permanece no escopo                      |

O Asaas tem PCI DSS nível 1, e a página avisa que isso "não certifica
automaticamente os sistemas ou a infraestrutura da empresa que realiza a
integração".

**A saída concreta é o Asaas Checkout:** `POST /v3/checkouts`, com
`billingTypes` (`PIX`, `CREDIT_CARD`), `chargeTypes` (`DETACHED`,
`INSTALLMENT`, **`RECURRENT`**), `callback` com `successUrl`/`cancelUrl`/
`expiredUrl`, e **`splits`** — ou seja, assinatura e split juntos, numa
página hospedada por eles. O pagador vai para
`https://asaas.com/checkoutSession/show?id=...`.

Uma proibição explícita, que vale conferir contra o nosso código: dado
sensível de autenticação (CVV, trilha, PIN) "não podem ser armazenados
após a autorização, mesmo que estejam criptografados".

**O que ainda não está escrito** é se o cartão é digitado na página deles
nesse fluxo. A página do checkout não afirma. Continua valendo perguntar,
mas a frente deixou de estar travada.

### Pergunta 2 (tarifa da custódia): confirmada como não pública

A página da tarifa confirma a mecânica e **não publica o valor**, que
fica em `asaas.com/config/index?tab=fees`, visível só para usuário
autorizado da conta. O que ela diz:

- cobrança **mensal, por subconta** com a funcionalidade habilitada;
- primeira cobrança **no dia seguinte** à habilitação;
- `isFeePayer: true` joga na própria subconta; ausente ou `false`,
  **na conta principal**;
- "Subcontas sem a Conta Escrow habilitada não geram essa mensalidade."

→ A decisão de `isFeePayer` segue parada no valor, como já estava. O
fundador pode olhar o valor na página de tarifas da própria conta.

---

## 4. Conta escrow: a mecânica completa, que faltava

A arquitetura que já está no código se confirmou, e ganhou detalhe:

- **Cada conta recebedora segue a própria configuração.** O
  `daysToExpire` "pertence à configuração da Conta Escrow da subconta",
  não da cobrança. Dinheiro da mesma cobrança pode liberar em datas
  diferentes para recebedores diferentes.
- **O que não é repassado fica com quem criou a cobrança.** É o que faz o
  modelo `emissorDaCobranca = SUBCONTA` funcionar.
- **Liquidação e disponibilidade são eventos distintos.**
  `PAYMENT_SPLIT_DONE` confirma a liquidação de um split; não significa
  que o valor pode ser movido.
- **Consultar a garantia:** `GET /v3/payments/{id}/escrow`, **com a chave
  da subconta**, onde `{id}` é o id da COBRANÇA. Traz `expirationDate` e
  o id da garantia.
- **Liberar na mão:** `POST /v3/escrow/{id}/finish`, onde `{id}` é o id da
  GARANTIA, não da cobrança. É definitivo: "A liberação manual encerra
  imediatamente a garantia." Garantia encerrada não reativa.
- **Desligar a custódia encerra todas as garantias daquela subconta de
  uma vez.**
- **Não existe webhook de mudança de garantia.** Para saber se liberou,
  tem que consultar. Isso é uma limitação real para conciliação, e
  precisa de uma rotina quando a custódia entrar.

O endpoint que configura **todas** as subcontas de uma vez existe mesmo
(`POST /v3/accounts/escrow`, "aplica como padrão a todas as subcontas
existentes e às futuras"). Segue deliberadamente fora do nosso cliente
HTTP: com tarifa mensal por subconta ligada, ligar tudo seria pagar por
base parada.

---

## 5. Webhooks: o que a nossa integração ainda não faz

### 5.1 Fila pausada — risco de produção

- A fila de uma configuração é interrompida após **15 falhas
  consecutivas**.
- **Só HTTP 200 conta como entrega.** 201, 204, 3xx, 4xx, 5xx, timeout e
  falha de conexão são falha. 3xx é falha porque o Asaas não segue
  redirecionamento.
- Enquanto pausada, os eventos continuam sendo gerados e guardados, mas
  nada é entregue.
- **Evento guardado por mais de 14 dias é apagado para sempre.**

**O risco concreto:** a fila é por configuração, e a nossa é uma só. Um
defeito que faça o nosso endpoint responder 500 quinze vezes para
qualquer evento pausaria **tudo**, inclusive a confirmação de pagamento
da assinatura da própria Rotta. O endpoint hoje responde 200 no caminho
feliz, mas uma exceção no processamento vira 500 — que é o
comportamento certo pela documentação ("responda 200 somente após
confirmar a persistência"), e exatamente por isso o monitoramento disso
não é opcional.

### 5.2 Idempotência pelo `id` do evento

Entrega é **at least once**. A recomendação é guardar o `id` do evento
(ex. `evt_05b708...&368604920`) com restrição de unicidade, e responder
200 só depois de persistir.

Hoje a Rotta não tem essa tabela: a idempotência vem de cada caminho ser
idempotente por estado (fatura já paga não é reprocessada; situação igual
não é regravada). Funciona, mas não é o desenho documentado, e não cobre
um caminho novo que alguém escreva sem lembrar disso.

### 5.3 Eventos de cobrança que a Rotta ignora

Dos 30 eventos documentados, a Rotta trata hoje `PAYMENT_CONFIRMED`,
`PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_DELETED`,
`PAYMENT_REFUNDED` e `PAYMENT_CHARGEBACK_REQUESTED`.

Os quatro de split foram tratados agora:

| Evento                                    | O que significa                                 |
| ----------------------------------------- | ----------------------------------------------- |
| `PAYMENT_SPLIT_DONE`                      | um split liquidou                               |
| `PAYMENT_SPLIT_CANCELLED`                 | um split foi cancelado                          |
| `PAYMENT_SPLIT_DIVERGENCE_BLOCK`          | **repasse bloqueado, 2 dias úteis p/ corrigir** |
| `PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED` | bloqueio encerrado                              |

O bloqueio por divergência acontece quando o split configurado passa do
valor líquido no recebimento ou na antecipação. Sem correção em 2 dias
úteis, os splits são cancelados e o valor fica na conta de quem criou a
cobrança. Até hoje de manhã isso caía em log de depuração; agora é aviso,
com o prazo escrito na mensagem.

Ficam conhecidos e ainda sem tratamento, para quando fizerem sentido:
`PAYMENT_PARTIALLY_REFUNDED`, `PAYMENT_CHARGEBACK_DISPUTE`,
`PAYMENT_AWAITING_CHARGEBACK_REVERSAL`, `PAYMENT_AUTHORIZED`,
`PAYMENT_AWAITING_RISK_ANALYSIS` e os de negativação.

Para assinatura existem `SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK` e
`SUBSCRIPTION_SPLIT_DIVERGENCE_BLOCK_FINISHED`, que importam no passo 4:
uma assinatura bloqueada **para de gerar cobrança**.

### 5.4 IPs oficiais de produção

`52.67.12.206`, `18.230.8.159`, `54.94.136.112`, `54.94.183.101`. O
sandbox pode ter outros, não listados.

Hoje o nosso guarda confere o token no header, que é o mecanismo que a
documentação deles oferece. Conferir IP também é defesa em
profundidade — e, se entrar, precisa ser configurável, porque lista de
IP de terceiro muda sem avisar.

---

## 6. Split: o que falta para o passo 4

| Onde            | Como                                                               |
| --------------- | ------------------------------------------------------------------ |
| Cobrança avulsa | array `split` na criação; alterar com `PUT /v3/lean/payments/{id}` |
| Assinatura      | array `split` na criação; alterar com `PUT /v3/subscriptions/{id}` |
| Parcelamento    | `fixedValue` por parcela, ou `totalFixedValue` no total            |

Detalhes que mudam o código:

- **Na assinatura o split é molde, não retroativo.** Vale para as
  cobranças que a recorrência gerar dali para frente; as já geradas
  mantêm o split antigo. Para mudar uma existente, altera a cobrança.
- **Omitir `split` no `PUT` mantém; mandar `null` ou `[]` desliga.** São
  três comportamentos onde seria fácil supor dois.
- **Apagar a cobrança apaga o split.** Se ela for restaurada e paga, o
  split não roda — tem que configurar de novo.
- **No parcelamento, `percentualValue` incide no líquido de CADA
  parcela**, não no total. Para repassar um valor total fechado,
  `totalFixedValue`, e a diferença de arredondamento vai para a última
  parcela.
- **Fixo e percentual podem conviver, e nenhum tem prioridade.** Os dois
  são validados contra o líquido disponível, então a soma pode estourar:
  com líquido de R$ 98,00, um fixo de R$ 50,00 somado a 50% (R$ 49,00) dá
  R$ 99,00 e não processa. Só percentual, a soma não passa de 100%.
- **Cobrança usada como garantia em operação de crédito não executa
  split.**
- **Estorno estorna os repasses** (`status` do split vira `REFUNDED`).

A conta da Rotta é só percentual, o que evita a classe de erro mais
perigosa daí. Mas o teto de 100% e a divergência precisam de teste no
passo 5.

---

## 7. Pix e cobrança: o que ficou confirmado

- **QR dinâmico:** `GET /v3/payments/{id}/pixQrCode` devolve
  `encodedImage` (base64), `payload` (copia e cola) e `expirationDate`.
  Expira **12 meses** depois do vencimento da cobrança, e é pagável uma
  vez só.
- **Sem chave Pix cadastrada na conta**, o QR fica amarrado a instituição
  parceira e é pagável só até 23:59 do mesmo dia — e **essa opção vai ser
  descontinuada**, com 30 dias de aviso. Vale conferir que a conta da
  Rotta tem chave Pix cadastrada.
- **Franquia de Pix:** a página não menciona franquia nem tarifa. A
  pergunta 6 do e-mail segue de pé.
- **Chargeback:** `chargeback.status` tem `REQUESTED`, `IN_DISPUTE`,
  `DISPUTE_LOST`, `REVERSED`, `DONE`; `chargeback.reason` tem 32 valores.
  A orientação é guardar os dois **exatamente como recebidos** e traduzir
  só na tela: "Não traduza nem altere os valores dos enums no código." A
  página **não** diz o que acontece com o dinheiro nem se ele é debitado
  na hora — a pergunta 3 do e-mail segue de pé, e é a mais importante
  delas.

---

## 8. Fluxo de aprovação da subconta, agora completo

1. `POST /v3/accounts`.
2. Esperar **pelo menos 15 segundos**.
3. `GET /v3/myAccount/documents`, com a chave da subconta.
4. Documento **com** `onboardingUrl`: manda a pessoa para o link. Envio
   pela API "será rejeitado".
   Documento **sem** `onboardingUrl`: `POST /v3/myAccount/documents/{id}`.
5. Acompanhar por webhook de situação da conta, ou
   `GET /v3/myAccount/status` para consulta pontual.
6. Aprovada quando `general` é `APPROVED`.

A análise leva **até 48 horas**. A prova de vida por selfie é aprovada em
até 5 minutos em cerca de 90% dos casos. Documento reprovado gera um
**link novo**. Documento extra pedido pelo Asaas vem como grupo com
`type: CUSTOM` e a explicação em `description`.

O modelo sem BaaS é diferente, e é provavelmente o nosso hoje: o titular
recebe **e-mail de ativação do Asaas** para definir senha e envia os
documentos na interface deles. O formato BaaS "precisa estar previamente
alinhado e implantado pelo seu gerente de contas" — é o mesmo que o time
de Integrações chamou de white label em 16/10. Em sandbox, pede-se
liberação ao suporte.

**Consequência prática:** até o BaaS estar ligado, o transportador vai
receber um e-mail do Asaas. A tela da Rotta precisa dizer isso, em vez de
a pessoa achar que é golpe.

---

## 9. O que mudou no plano

**Passo 1, o e-mail ao comercial:** entram duas perguntas novas, e uma
sai.

- **Nova, e virou a mais urgente:** homologação para sair do Período de
  Avaliação. Como solicitar, o que é exigido, qual o prazo. Com 10
  subcontas e R$ 2.000,00 por subconta, o teto chega antes de a frente
  ficar de pé.
- **Nova:** o Asaas Checkout (`POST /v3/checkouts`) mantém o cartão fora
  do nosso servidor? A documentação de PCI diz que "pode reduzir o
  escopo", e a do checkout não confirma onde o cartão é digitado.
- **Sai a pergunta 2** como pergunta de valor: a tarifa está na página de
  tarifas da própria conta. Fica só confirmar o ciclo, que a
  documentação já diz ser mensal por subconta.

**Passo 6, ligar uma por vez:** ganha um motivo técnico além do
prudencial. Não é só que ligar tudo custa tarifa: é que a base inteira
bate o teto de R$ 2.000,00 por subconta em poucas semanas, e assinatura
que bate o teto **é cancelada automaticamente**.

**Novo passo, meu:** tabela de eventos de webhook recebidos, com o `id`
do Asaas como chave única, e monitoramento de fila pausada. Hoje a
idempotência existe por estado em cada caminho, o que funciona, mas 15
respostas não-200 seguidas pausam a entrega de **tudo**, por 14 dias,
e depois o evento é apagado.

---

_20/10/2026. CTO. Páginas conferidas em `docs.asaas.com` nesta data,
via o índice de `llms.txt`. Onde guia e referência divergem, o texto diz
qual é qual — e o código passou a aceitar as duas formas._
