# Integração escrow e split: o passo a passo

**Pedido do fundador em 20/10/2026.** CTO, com o CFO nas decisões de
preço e risco.

A primeira fatia de código está no ar (commit `4e9c52d`). Este documento
é o que falta, em ordem, com quem faz cada coisa e o que trava o quê.

---

## Passo 1. O e-mail ao comercial do Asaas

**Quem faz: o fundador.** Nenhum diretor fala com gente de fora.

**Por que é o primeiro:** das sete perguntas abertas, uma trava
implementação e não apenas decisão. A liberação do white label não é
self-service, e foi o próprio time de Integrações que confirmou isso em
16/10/2026. Sem ela, o transportador recebe e-mail do Asaas e sobe
documento no site deles, bem no momento do cadastro.

Para: `contato@asaas.com.br`
Telefone, se preferir: 0800 009 0037

### Assunto

> Rotta do Brasil (CNPJ 54.623.584/0001-80): white label de subconta,
> conta escrow e split

### Corpo

> Bom dia.
>
> Somos a Rotta do Brasil Tecnologia e Soluções de Transportes, CNPJ
> 54.623.584/0001-80, e já usamos o Asaas em produção para a cobrança da
> nossa própria assinatura.
>
> Estamos construindo o repasse das mensalidades do transporte escolar:
> a família paga dentro do nosso aplicativo e o valor vai para a
> transportadora, com a nossa taxa retida no split. O time de
> Integrações já respondeu a parte técnica, e restaram sete pontos que
> dependem de vocês e que decidem se abrimos a frente.
>
> **1. White label de subconta.** Fomos informados em 16/10 que a
> liberação não é self-service e segue com o comercial. Como solicitamos
> e qual é o prazo? Hoje é o único item que trava a implementação.
>
> **2. Tarifa da conta escrow.** A documentação diz que existe cobrança
> recorrente por subconta com a funcionalidade habilitada, mas não
> publica o valor. Qual é, e qual o ciclo?
>
> **3. Chargeback com subconta sem saldo.** Quando a subconta não tem
> saldo, qual é a ordem de cobrança entre saldo da subconta, valor
> retido em custódia e conta principal? Em que momento a conta principal
> é acionada?
>
> **4. Exposição da conta principal.** O que elimina, e não apenas
> reduz, a responsabilidade da conta principal como garantidora?
>
> **5. Quem aparece para a família.** Com a cobrança criada pela
> subconta, qual nome figura no extrato do pagador e na nota fiscal? É o
> da subconta, o da conta principal, ou é configurável?
>
> **6. Pix em assinatura com QR dinâmico.** Existe franquia de Pix
> gratuitos? A partir de qual volume passa a ser tarifado?
>
> **7. Checkout hospedado.** Existe checkout hospedado compatível com
> assinatura e split, que mantenha o número do cartão fora do nosso
> servidor? Hoje a tokenização é feita pelo backend da plataforma, o que
> nos coloca em escopo PCI DSS, e gostaríamos de avaliar a alternativa.
>
> Fico à disposição.
>
> Davi
> Rotta do Brasil Tecnologia e Soluções de Transportes
> rottabr.com.br

### O que cada resposta destrava

| Pergunta | Destrava                                                   |
| -------: | ---------------------------------------------------------- |
|        1 | O cadastro inteiro dentro da Rotta, e a custódia           |
|        2 | A decisão de `isFeePayer` (hoje parada por falta do valor) |
|     3, 4 | Se a frente é segura, e com qual reserva                   |
|        5 | Risco de contestação por nome desconhecido no extrato      |
|        6 | O custo real do Pix recorrente                             |
|        7 | Se dá para sair do escopo PCI sem abrir webview            |

---

## Passo 2. As três variáveis no Render

**Quem faz: o fundador.** Pelo painel do Render, nunca por mensagem.

| Variável                        | O que é                                                    |
| ------------------------------- | ---------------------------------------------------------- |
| `ASAAS_SUBCONTA_ENCRYPTION_KEY` | 32 bytes em base64, gerada com `openssl rand -base64 32`   |
| `ASAAS_ROTTA_WALLET_ID`         | O `walletId` da própria Rotta, no painel do Asaas          |
| `ASAAS_BASE_URL`                | Para testar em sandbox: `https://api-sandbox.asaas.com/v3` |

A primeira é o que cifra a chave de cada subconta. Sem ela, a criação de
subconta falha com erro claro, em vez de guardar chave de terceiro em
texto puro. A segunda só é usada quando a subconta emite a cobrança: é
para onde vai a nossa taxa.

**Nenhuma delas deve aparecer em conversa, commit ou captura de tela.**

---

## Passo 3. Onboarding da subconta, de ponta a ponta — FEITO

**Quem fez: eu**, em 20/10/2026. Não dependia do comercial.

| O que                                                          | Onde                                               |
| -------------------------------------------------------------- | -------------------------------------------------- |
| `POST /family-billing/conta-de-recebimento/subconta`           | A transportadora abre a própria conta              |
| `POST /family-billing/admin/companies/:id/subconta`            | O fundador abre pela transportadora                |
| `GET /family-billing/admin/companies/:id/conta-de-recebimento` | O estado de uma transportadora, pelo painel        |
| Tela no painel da transportadora                               | `/mensalidades`                                    |
| Tela no app nativo                                             | Rotta Pay, acima do "a receber"                    |
| Aba no painel do Admin                                         | Empresa, aba "Recebimento"                         |
| Webhook `ACCOUNT_STATUS_*`                                     | O estado muda sozinho, por `accountStatus.general` |

### O formulário tem um campo, e não doze

`POST /v3/accounts` aceita nome, documento, e-mail, telefone, endereço e
faturamento. Onze desses doze já estão no cadastro da transportadora,
conferidos na Receita quando ela entrou: a subconta nasce com a razão
social, o CNPJ e o endereço que a Rotta já tem. O formulário pede só o
faturamento mensal, que é o único obrigatório do Asaas e o único que a
Rotta nunca coletou. E-mail e celular do financeiro entram como opção,
porque o financeiro costuma ser outra pessoa.

### Três decisões que estão no código, não na cabeça de ninguém

1. **A segunda subconta é recusada**, com a razão na mensagem. A chave de
   API só aparece na resposta da criação e não há endpoint para pedir de
   novo: criar a segunda deixaria a primeira órfã no Asaas, possivelmente
   já com saldo, sem desfazer. A API recusa antes de chamar o Asaas, e
   nenhuma das três telas oferece o botão.
2. **A conta nasce `EM_ANALISE`, nunca `ATIVA`.** Dizer "ativa" na
   criação seria prometer recebimento que ainda não existe.
3. **O estado vem de `accountStatus.general`**, e não do nome do evento.
   Os dezoito eventos `ACCOUNT_STATUS_*` carregam o mesmo objeto
   completo, e reagir a cada etapa (documento, dados comerciais, conta
   bancária) faria o estado oscilar: a conta ficaria "recusada" por falta
   de um documento e voltaria a "em análise" no evento seguinte.
   `PENDING` e `AWAITING_APPROVAL` caem no mesmo `EM_ANALISE`, porque num
   cadastro que a Rotta preencheu inteiro não há ação do transportador
   que os distinga.

**Resultado:** a transportadora entra pela Rotta e recebe split. O único
momento em que ela vê o Asaas é o envio de documento, e isso só sai com
o passo 1.

### Os eventos de situação da conta: FEITO

O fundador marcou os eventos de situação da conta no webhook que já
existe, em 20/10/2026. O estado da conta passa a andar sozinho.

Além dele, a conta também sai de "em análise" pela consulta
`GET /v3/myAccount/status`, feita na leitura da tela — é a rede de
segurança para o dia em que a fila de webhook estiver pausada, que a
documentação diz acontecer depois de 15 respostas não-200 seguidas.

### O formulário mostra o que a Rotta já sabe

Pedido do fundador em 20/10/2026: "como os transportadores já fizeram o
cadastro na Rotta, poderia pedir apenas as informações que faltam?".

Era já o caso — o formulário pede um campo —, mas da tela isso não
aparecia: um formulário de um campo parece incompleto, e a pessoa não
tinha como saber que o CNPJ e o endereço dela já estavam indo. Agora os
nove campos obrigatórios vão escritos na tela, com de onde saem, e quem
confere decide se corrige o cadastro antes de abrir.

### Quem não tem conta vê um convite, não um campo solto

Mesmo pedido, segunda parte: "quem não tem conta no Asaas, aparece o quê
antes das funcionalidades do Rotta Pay?".

No app nativo, o cartão da conta de recebimento passa a vir **acima dos
atalhos do Rotta Pay** enquanto não houver subconta, com o que muda em
três linhas, o cadastro que será usado e o campo que falta. Com a conta
aberta, ele desce para baixo dos atalhos e volta a ser estado, não
convite — descrever o presente como promessa é ruído.

A tela também avisa, **antes** de a pessoa tocar no botão, que ela pode
receber um e-mail do provedor pedindo documento e selfie. Enquanto o
BaaS não estiver ligado, esse e-mail vai chegar, e quem não foi avisado
acha que é golpe.

---

## Passo 4. A cobrança da família, de verdade — FEITO

**Quem fez: eu**, em 21/10/2026, a partir do pedido do fundador: o
transportador (ou o Admin ajudando) liga a cobrança dos responsáveis que
já estão cadastrados, e **o responsável não precisa de conta** — ele paga
por link. Quem precisa de conta é só o transportador.

O passo estava descrito errado neste plano. Não faltava "levar o split
para os outros meios": o split já cobria todos eles (`percentualDaRotta`
tem Pix, boleto e crédito). O que faltava eram os **meios** e a
**recorrência**.

| O que                                                | Onde                                    |
| ---------------------------------------------------- | --------------------------------------- |
| `POST family-billing/contracts/:id/assinatura`       | A transportadora liga a cobrança mensal |
| `POST family-billing/admin/contracts/:id/assinatura` | O fundador liga pela transportadora     |
| `GET family-billing/contracts`                       | A lista, com o estado de cada contrato  |
| `POST family-billing/invoices/:id/pagamento-boleto`  | O boleto, que não existia               |
| `PUT family-billing/admin/companies/:id/recebimento` | Taxa, emissor e custódia                |
| Tela em `/mensalidades`                              | Um botão por família                    |
| Webhook `PAYMENT_CREATED`                            | Liga a cobrança gerada à fatura do mês  |
| Tabela `asaas_webhook_events`                        | Idempotência pelo `id` do evento        |

### O CPF era o bloqueio real, e ninguém sabia

`POST /v3/customers` exige **`name` e `cpfCnpj`**, e só eles
(`CustomerSaveRequestDTO`, conferido na referência em 21/10/2026). E
desde 14/09/2026 a Rotta **não coleta CPF de responsável**, por decisão
do fundador ("para os responsáveis não pegamos esses dados, apenas o
nome e telefone").

Ou seja: nenhuma família podia ser cobrada, por nenhum caminho. O
documento agora é coletado no momento da cobrança, por quem o tem em
mãos, e fica guardado — com recusa clara quando já pertence a outra
conta. A tela pede o CPF só nas famílias em que ele falta.

### A cobrança nasce 40 dias antes do vencimento

O FAQ de assinaturas diz que cada cobrança da recorrência é criada **40
dias antes** do vencimento, configurável para 14 ou 7. Duas
consequências:

1. Quem liga a cobrança à fatura precisa saber **criar** a fatura do mês,
   e não só achar uma que exista.
2. O limite do Período de Avaliação conta cobrança **criada**, não paga.
   Com 40 dias de antecedência, o teto por subconta é consumido antes de
   a família pagar qualquer coisa.

### Três defeitos corrigidos de passagem

1. **`confirmarPagamento` e `registrarEstorno` escreviam com `update`**,
   e quem os chama é o webhook, que entra por rota `@Public()` e por isso
   não tem contexto de tenant. A política de RLS de `contract_invoices`
   (`FORCE ROW LEVEL SECURITY`) seria falsa para toda linha: a escrita
   levantaria erro, o webhook responderia 500, e **quinze respostas
   não-200 seguidas pausam a fila inteira** — inclusive a cobrança da
   assinatura da própria Rotta. Nunca disparou porque nenhuma fatura de
   família foi gerada ainda (contratos em R$ 0,00), e dispararia no
   primeiro pagamento real.
2. **`montarSplit` era chamado com `"PIX"` fixo** na criação da
   cobrança. Como a taxa é por meio, um boleto sairia com o percentual do
   Pix.
3. **Taxa, emissor e custódia eram campos somente lidos.** Nasciam no
   padrão da migration e nenhum endpoint os escrevia;
   `configurarCustodia` existia e não tinha chamador. O passo 6 abaixo
   não podia ser executado pelo painel, só com SQL direto no banco.

---

## Passo 5. Teste em sandbox, de ponta a ponta

**Quem faz: eu, com a chave do passo 2.**

| O que testar                            | Por que importa                                      |
| --------------------------------------- | ---------------------------------------------------- |
| Criar subconta e capturar a chave       | É a operação que não tem segunda chance              |
| Cobrança com split, pela Rotta          | Confirma a divisão e **sobre qual valor ela incide** |
| Cobrança com split, pela subconta       | O modelo com custódia                                |
| Ligar e desligar custódia numa subconta | Confirma `daysToExpire` e a tarifa                   |
| Webhook de pagamento com split          | Confirma o que chega para conciliar                  |

**O que o sandbox não testa:** recusa de cartão, porque lá toda cobrança
é aprovada. O caminho de recusa vai para produção sem teste de ponta a
ponta, a menos que a gente dispare o payload do webhook contra o nosso
próprio endpoint. É o que recomendo, mais uma cobrança real de valor
baixo antes de liberar para qualquer cliente.

---

## Passo 6. Ligar, uma transportadora por vez

**Quem decide: o fundador.** Desde 21/10/2026 os quatro passos abaixo
têm rota no painel, e nenhum precisa de SQL.

1. Escolher **uma** transportadora, de preferência a que já é pagante.
2. Criar a subconta dela e conferir o split numa cobrança real de valor
   baixo.
3. Ligar as taxas só nessa, por `PUT admin/companies/:id/recebimento`.
4. Com o white label liberado, virar `emissorDaCobranca` para `SUBCONTA`
   e ligar a custódia **só nela**, pela mesma rota. Ela recusa virar o
   emissor sem a chave da subconta guardada ou com a conta ainda em
   análise, e recusa ligar custódia com o emissor na Rotta — a retenção
   segue a conta que recebe, então custódia com emissor `ROTTA` não
   reteria nada e passaria a cobrar a tarifa recorrente por nada.
5. Só depois repetir nas outras.

**Nunca o endpoint que liga custódia em todas de uma vez.** Em
14/10/2026, de 8 transportadoras cadastradas, 7 não transacionavam. A
custódia tem tarifa recorrente por subconta ligada: ligar tudo seria
pagar, ou cobrar delas, por base parada.

---

## O que ainda é decisão do fundador, e não minha

| Decisão                                           | Travada por                         |
| ------------------------------------------------- | ----------------------------------- |
| `isFeePayer`: quem paga a tarifa de custódia      | O valor da tarifa (pergunta 2)      |
| Abrir exceção de webview para captura de cartão   | Pesar jornada nativa contra PCI DSS |
| Quando ligar a cobrança da família de verdade     | Hoje contrato está a R$ 0,00        |
| Se esta frente vem antes das métricas de operação | 8 alunos, 10 viagens, 1 pagante     |

---

## Resumo da ordem

```
1. E-mail ao comercial         fundador   destrava tudo
2. Variáveis no Render         fundador   destrava o passo 5
3. Onboarding da subconta      eu         FEITO em 20/10
3b. Eventos de conta no        fundador   FEITO em 20/10
    webhook do Asaas
4. A cobrança da família       eu         FEITO em 21/10
5. Teste em sandbox            eu         depende do 2
6. Ligar, uma por vez          fundador   depende de 1, 4, 5
```

**Todo o código da minha parte está no ar.** O que falta é seu, e nesta
ordem:

1. **A homologação regulatória**, que é a mais urgente de tudo. São 10
   subcontas por conta-pai e **R$ 2.000,00 por subconta** (não R$ 2.000
   no total: o limite é individual). Com mensalidade de R$ 660, são três
   cobranças por transportadora antes de travar — e o limite conta
   cobrança **criada**, não paga. Pode ser pedida a qualquer momento, sem
   esperar os 60 dias. Ver `2026-10-20-varredura-da-documentacao-asaas.md`,
   seção 2.
2. **As duas variáveis no Render** (`ASAAS_SUBCONTA_ENCRYPTION_KEY` e
   `ASAAS_ROTTA_WALLET_ID`). Sem a primeira, abrir conta de recebimento é
   recusado com mensagem clara, e nada é criado.
3. **As variáveis de sandbox no ambiente da sessão**, para eu testar de
   ponta a ponta. Chave de sandbox, nunca de produção: a primeira
   subconta de teste em produção queima uma das 10 vagas e **inicia os 60
   dias**, e isso não desfaz.
4. **As outras seis perguntas do e-mail ao comercial**, que decidem
   `isFeePayer`, o risco de chargeback e a saída do escopo PCI.
5. **Ligar a cobrança de verdade**: os contratos estão todos em R$ 0,00,
   e a cobrança mensal é recusada com mensalidade zero — de propósito,
   porque cobrar R$ 0,00 de uma família todo mês não é cobrança.

---

_20/10/2026. CTO. Perguntas da seção 7 de
`2026-10-15-split-asaas-respostas-e-decisoes.md`. Tarifa de custódia e
regra de retenção conferidas na documentação pública de conta escrow em
20/10/2026. Métricas de base de 14/10/2026._
