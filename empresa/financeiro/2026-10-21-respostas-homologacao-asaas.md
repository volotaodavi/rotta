# Respostas ao questionário de homologação BaaS do Asaas

**Recebido em 21/10/2026**, pelo chat do suporte, depois de o comercial não
responder por e-mail. São sete perguntas que o Asaas usa para definir o perfil
de subcontas e orientar a homologação.

**Quem responde: o fundador.** Nenhum diretor fala com gente de fora. O texto
abaixo está pronto para colar.

Cada resposta foi conferida no código em 21/10/2026. Onde a resposta depende de
decisão comercial, está marcado.

---

## O que conferir antes de enviar

**A pergunta 3 revela a intenção de taxa.** A tabela aprovada (Pix e boleto
1,29%, crédito à vista 0,99%, parcelado 0,49%) está no código com todos os
valores em zero hoje. Dizer o número ao Asaas é decisão sua: informa o perfil
corretamente, e ao mesmo tempo revela a margem pretendida a um fornecedor que
também tarifa. A alternativa honesta é responder o **mecanismo** (split, por
meio de pagamento) sem a tabela. As duas versões estão abaixo.

---

## Texto para colar

> Olá, tudo bem? Obrigado pelo retorno e pela clareza sobre o modelo BaaS.
>
> Somos a Rotta do Brasil Tecnologia e Soluções de Transportes, CNPJ
> 54.623.584/0001-80 — pessoa jurídica, cadastro aprovado, e já usamos o Asaas
> em produção para a cobrança da nossa própria assinatura. Respondo abaixo item
> por item.
>
> **1. Sistema próprio integrado à API?**
>
> Sim. Temos plataforma própria (aplicativo para famílias e motoristas, painel
> web para transportadoras e painel administrativo) e a integração com a API do
> Asaas já está em produção: hoje cobramos a assinatura mensal da própria Rotta
> das transportadoras por Pix, cartão e boleto, com webhook configurado e em
> operação.
>
> **2. Deseja criar subcontas?**
>
> Sim. A criação via `POST /v3/accounts` já está implementada e testada no nosso
> lado, incluindo o acompanhamento de situação cadastral pelos eventos
> `ACCOUNT_STATUS_*` e a consulta a `GET /v3/myAccount/status`. **Nenhuma
> subconta foi criada em produção ainda** — estamos aguardando exatamente esta
> orientação de homologação antes de abrir a primeira.
>
> **3. Irá cobrar taxa ou comissão? De que forma?**
>
> Sim, por **split de pagamentos**, com percentual definido por meio de
> pagamento e configurável por transportadora. Hoje todos os percentuais estão
> em zero: a receita atual da Rotta é a assinatura da plataforma, não comissão
> sobre a mensalidade que a família paga ao transportador.
>
> **4. A jornada do cliente final será integralmente no seu sistema?**
>
> Integralmente no nosso sistema, com uma única exceção, que é justamente o
> motivo de procurarmos vocês: o **envio de documentos**. Hoje dependemos do
> `onboardingUrl` devolvido por `GET /v3/myAccount/documents`, o que leva o
> transportador para o ambiente do Asaas no meio do cadastro.
>
> Todo o resto acontece dentro da Rotta: o formulário de abertura da conta (que
> pede um campo, porque os outros nove dados obrigatórios já estão no cadastro
> que validamos na entrada da transportadora), o acompanhamento do status, a
> emissão das cobranças e a conciliação.
>
> Gostaríamos de entender como viabilizar o envio de documentos também pela
> API, para que o transportador não precise sair da nossa plataforma.
>
> **5. Será necessário possuir as chaves de API das subcontas?**
>
> Sim, e por uma razão arquitetural específica: a documentação de Conta Escrow
> indica que apenas as subcontas com o recurso habilitado têm seus recebimentos
> submetidos ao fluxo de retenção. Para que a custódia exista, a cobrança precisa
> ser criada **com a chave da subconta**, não com a da conta principal.
>
> Sobre a guarda dessas chaves, já implementado: cifradas em repouso com
> AES-256-GCM, com chave de criptografia dedicada e separada das demais chaves da
> aplicação; nunca gravadas em log; nunca devolvidas em resposta de API; e com
> registro de auditoria a cada uso, identificando a operação que motivou o
> acesso.
>
> **6. As subcontas poderão criar cobranças ou realizar transferências?**
>
> **Cobranças: sim**, é o objetivo central do projeto — a transportadora emite a
> cobrança da mensalidade do transporte escolar em nome próprio, com split para
> a Rotta.
>
> **Transferências: não.** Nenhuma transferência é realizada com chave de
> subconta na nossa plataforma. O único `POST /v3/transfers` do sistema usa a
> chave da conta principal e é operação restrita ao administrador da Rotta sobre
> a própria conta.
>
> **7. Titularidade das subcontas?**
>
> **De cada cliente final, com CPF/CNPJ distintos.** Não são filiais nem
> unidades do nosso CNPJ. Cada subconta pertence a uma transportadora
> independente, e atendemos todas as formas: transportador autônomo (CPF), MEI,
> sociedade limitada, cooperativa e sociedade simples.
>
> Para contexto da operação: transporte escolar, mensalidade média na casa de R$
> 660,00 por aluno, pagamento recorrente mensal da família para a
> transportadora.
>
> Com isso, três pedidos:
>
> 1. **Como solicitamos a homologação regulatória?** Quais documentos, qual o
>    prazo estimado e qual área conduz o processo. Hoje é o que trava a abertura
>    da primeira subconta em produção, por causa dos limites do Período de
>    Avaliação.
> 2. **A liberação do envio de documentos pela API** (item 4), que é o único
>    ponto em que o transportador ainda precisa sair da nossa plataforma.
> 3. **O valor e o ciclo da tarifa recorrente da Conta Escrow**, que a
>    documentação confirma existir mas não publica. Precisamos dele para decidir
>    quem paga a tarifa (`isFeePayer`).
>
> Fico à disposição.
>
> Davi
> Rotta do Brasil Tecnologia e Soluções de Transportes
> CNPJ 54.623.584/0001-80

---

## Versão alternativa da pergunta 3, sem revelar a tabela

Se preferir não informar os percentuais a um fornecedor que também tarifa,
troque a resposta 3 por:

> **3. Irá cobrar taxa ou comissão? De que forma?**
>
> Sim, por **split de pagamentos**, com percentual definido por meio de
> pagamento e configurável por transportadora. A tabela está em definição
> comercial e hoje opera em zero: a receita atual da Rotta é a assinatura da
> plataforma, não comissão sobre a mensalidade da família.

A diferença é só a frase final. O mecanismo, que é o que o Asaas precisa para
classificar o perfil, continua declarado.

---

## O que esta resposta confirma, do nosso lado

A mensagem deles fecha duas dúvidas que estavam abertas desde 16/10:

1. **O modelo é BaaS, e segue regra do Banco Central.** Eles afirmam que cada
   conta pertence ao próprio usuário final e que o **Asaas é a instituição
   responsável pelos serviços financeiros**. Isso é exatamente o que separa o
   nosso papel de instituição de pagamento — e sustenta a leitura da Lei
   12.865/2013 registrada em `empresa/juridico/2026-10-21-mapa-legal-da-rotta.md`,
   seção 8: no modelo de split, a Rotta é usuária de arranjo de terceiro, não
   instituidora.
2. **Subconta exige conta PJ com cadastro 100% aprovado.** A Rotta é PJ e está
   aprovada, então não há impedimento de elegibilidade.

Referência que eles indicaram: `https://blog.asaas.com/regulamentacao-baas/`.

---

_21/10/2026. CTO. Respostas conferidas no código: integração em produção
(`AsaasClientService`), criação de subconta (`AsaasSubcontasService`), split por
meio (`montarSplit`/`percentualDaRotta`, hoje em zero por padrão de migration),
guarda de chave (`SecretCipherService`, AES-256-GCM, finalidade
`subconta-asaas`), e ausência de transferência por subconta (`createTransfer`
não aceita `accessToken`; único chamador é `createAdminTransfer`)._
