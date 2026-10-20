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

### Falta uma coisa, e é do fundador

No painel do Asaas, marcar os eventos de **situação da conta** no webhook
que já existe (`https://api.rottabr.com.br/v1/webhooks/asaas`). Sem isso
o endpoint está pronto e nunca é chamado, e o estado da conta fica
parado em "em análise" até alguém conferir na mão. Nenhum valor novo
precisa ser gerado: é a mesma URL e o mesmo token.

---

## Passo 4. Split nos outros meios

**Quem faz: eu.** Hoje o split só entra na cobrança Pix da família.

Falta levar para a cobrança avulsa, para a assinatura (o split vale para
todas as cobranças que ela gera) e para o boleto. A conta por meio já
está pronta: Pix e boleto 1,29%, crédito à vista 0,99%, parcelado 0,49%,
débito fora.

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

**Quem decide: o fundador.**

1. Escolher **uma** transportadora, de preferência a que já é pagante.
2. Criar a subconta dela e conferir o split numa cobrança real de valor
   baixo.
3. Ligar as taxas (`taxaPixBps` e companhia) só nessa.
4. Com o white label liberado, virar `emissorDaCobranca` para `SUBCONTA`
   e ligar a custódia **só nela**.
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
1. E-mail ao comercial        fundador   destrava tudo
2. Variáveis no Render        fundador   destrava o passo 5
3. Onboarding da subconta     eu         FEITO em 20/10
3b. Eventos de conta no        fundador   um clique no painel do Asaas
    webhook do Asaas
4. Split nos outros meios     eu         independente, em andamento
5. Teste em sandbox           eu         depende do 2
6. Ligar, uma por vez         fundador   depende de 1, 3, 4, 5
```

O passo 4 eu sigo agora: não depende de ninguém.

---

_20/10/2026. CTO. Perguntas da seção 7 de
`2026-10-15-split-asaas-respostas-e-decisoes.md`. Tarifa de custódia e
regra de retenção conferidas na documentação pública de conta escrow em
20/10/2026. Métricas de base de 14/10/2026._
