# Pagamento dividido: material pronto, publicação travada

**Pedido do fundador em 14/10/2026:** analisar o aditivo da Lytex e
"divulgar isso de forma imediata".

**O que o CMO responde:** o material está escrito e pronto abaixo. A
publicação está travada, e a trava não é minha opinião, é a conta do
CFO.

---

## Por que não publico hoje

Leia `empresa/financeiro/2026-10-14-split-payment-lytex.md` para a
análise inteira. O que trava a divulgação, em quatro fatos medidos no
banco de produção em 14/10/2026:

1. O split **não está implementado**. O
   `RottaPayProviderService` nomeia a Lytex, tem as credenciais, e o
   próprio código diz que o formato do split nunca pôde ser confirmado
   porque a documentação da API é inalcançável. Conferido hoje:
   continua inalcançável.
2. Os 5 contratos entre responsável e transportadora têm valor
   **R$ 0,00** e **nenhum** foi assinado pelas duas partes.
3. A carteira tem **0 transações**.
4. A cobrança de assinatura em produção é pela **Asaas**, não pela
   Lytex.

Anunciar pagamento dividido com esses quatro fatos no lugar é prometer
uma função que não existe. Numa plataforma que transporta criança, a
única coisa que vende o produto é confiança, e ela é a coisa mais cara
de recuperar depois de uma promessa que não se cumpre.

Existe um agravante específico do público. Transportadora escolar vive
de receber no dia certo. Uma peça dizendo "receba pela Rotta" que não
funciona não gera um cliente insatisfeito, gera um cliente que não
recebeu, e ele conta isso para as famílias dele.

**Isso não é "não vamos divulgar".** É "divulgamos no dia em que a
primeira transação dividida acontecer de verdade", e o material já está
pronto para esse dia.

---

## A única frase honesta, hoje

Se houver pressa de dizer alguma coisa já, existe uma afirmação que é
verdadeira hoje e não promete nada:

> A Rotta está construindo o recebimento direto: a família paga pelo
> app e o valor cai na conta da transportadora, sem a transportadora
> precisar cobrar de cada responsável no fim do mês.

O verbo é "está construindo". Isso pode ir num post de bastidor, nunca
numa página de produto nem numa campanha, porque página de produto
descreve o que existe.

---

## Material pronto para o dia do lançamento

### O que mudar na página de planos (`apps/web`)

Bloco novo, abaixo do preço, com o título e os três pontos:

**Título:** Receba sem correr atrás

**Corpo:**

- A família paga a mensalidade pelo app, no PIX ou no cartão.
- O valor cai direto na conta da transportadora, sem passar por
  ninguém.
- A Rotta mostra quem pagou e quem não pagou, sem você precisar
  perguntar.

**Por que esses três e não outros:** o problema real do transportador
escolar não é "aceitar cartão", é **a cobrança no fim do mês**, aluno
por aluno, pelo WhatsApp. O terceiro ponto é o que resolve isso, e é o
que a Rotta já sabe fazer hoje. Os dois primeiros dependem do split.

### Assunto de e-mail para a base em teste

> Agora a mensalidade cai na sua conta

Curto e factual. Sem "revolucionário", sem "inovador", sem exclamação.

### O que NÃO escrever

- "Taxa zero", "sem taxas", "grátis". A tarifa existe (R$ 1,85 por
  liquidação PIX mais a cobrança do split), e quem opera transporte
  sabe que toda maquininha cobra. Dizer que não cobra destrói a
  credibilidade do resto da página.
- "Parceria com a Lytex". O nome do provedor não é benefício para o
  cliente, é detalhe nosso. E a cláusula 4.1 deixa a Lytex alterar as
  condições quando quiser: amarrar a marca da Rotta à dela é assumir um
  risco sem ganho.
- Qualquer número de desconto ou economia. A conta do CFO mostra que,
  com o preço de hoje, o split **custa** mais do que a assinatura
  inteira. Até existir preço novo, não há economia para anunciar.

### O número a medir no dia seguinte

Quantos contratos saíram de **R$ 0,00** para um valor real. É esse o
sinal de que o split foi adotado, e não o número de cliques na página.
Hoje são 5 contratos, todos zerados: qualquer coisa acima disso é
progresso medível.

---

## Pedido ao CTO

Quando a primeira transação dividida liquidar de verdade em produção,
me avise pelo `BACKLOG.md`. É esse o gatilho da publicação, e eu não
publico antes dele.
