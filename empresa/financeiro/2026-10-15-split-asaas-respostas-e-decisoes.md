# Split e conta escrow no Asaas: o que foi respondido e o que falta decidir

Registro de 15/10/2026. Fonte: resposta de Isadora, do time de
Integrações do Asaas, ao e-mail enviado pelo fundador em 15/10/2026,
mais a documentação pública que ela indicou como válida.

Este arquivo existe porque a frente passou a ter resposta oficial e
deixou de ser especulação. Três cargos consomem ele: o CTO, pelo escopo
técnico e de segurança; o CFO, pelo custo e pelo ciclo de caixa; e o
CEO, pela decisão de sequência. Nenhum número aqui é estimado: o que
não foi medido está escrito como não medido.

## 1. O modelo que a Rotta quer operar

A família paga a mensalidade do transporte dentro do aplicativo da
Rotta. O valor é liquidado e repassado ao prestador (transportadora PJ,
MEI ou autônomo), e a Rotta retém uma taxa de intermediação sobre cada
liquidação, que compõe receita variável. A mensalidade de software que
a transportadora paga hoje à Rotta permanece inalterada e é
independente disso.

Decisão do fundador em 14/10/2026: cartão de crédito recorrente é o
meio principal, ao lado de Pix e boleto. O motivo está registrado:
mensalidade de família é serviço de retenção, e sem cartão em arquivo a
cobrança depende de ação mensal do responsável, com inadimplência por
atrito maior que o risco que se evitaria recusando o meio.

## 2. A inversão da arquitetura, que é o achado principal

A custódia segue a conta que **cria** a cobrança, e a conta pai não tem
custódia. Em consequência:

- Se a **Rotta** cria a cobrança com split para o prestador, o valor
  cai na conta dele imediatamente. Não existe retenção, e a exposição
  da conta pai em chargeback fica integral.
- Para haver retenção, a cobrança precisa ser criada pela **subconta do
  prestador**, com a custódia ativa nela e split para a Rotta. Nesse
  caso todos os valores, inclusive o split da Rotta, seguem o prazo de
  custódia daquela subconta.

A página de split com custódia da documentação está desatualizada nesse
ponto, segundo a própria Isadora, e está sendo corrigida. Vale o que
está em `https://docs.asaas.com/docs/introducao-conta-escrow`.

### Três consequências

**O emissor da cobrança passa a ser a transportadora, não a Rotta.** A
experiência de produto que se quer continua possível: a família paga
dentro do app da Rotta e a Rotta retém a taxa. O que muda é quem figura
como emissor. Quem aparece no extrato da família não foi confirmado, e
é uma das perguntas que o Asaas remeteu ao comercial. Risco de produto
associado: descrição desconhecida em extrato é causa comum de
contestação, ou seja, a arquitetura que protege de chargeback pode
aumentar a incidência dele se a família não reconhecer o nome.

**A receita da Rotta também fica retida.** O split segue o mesmo prazo
de custódia. Proteção contra chargeback e ciclo de caixa da Rotta são a
mesma alavanca girando em sentidos opostos. O prazo é configurável por
subconta pelo campo `daysToExpire`, sem necessidade de liberação prévia
do Asaas, e a plataforma pode liberar manualmente antes do prazo.
Desligar a custódia encerra todas as garantias e libera os valores.

**A Rotta passa a precisar da chave de API de cada subconta**, porque é
com ela que a cobrança e a tokenização do cartão daquela subconta são
criadas.

## 3. Custo que ninguém havia mencionado

A documentação de conta escrow registra **cobrança recorrente para cada
subconta com custódia ativa**, debitada da conta principal ou da
subconta, à escolha da plataforma. Isso não contradiz formalmente o
"sem adesão e sem mensalidade, cobrança só na liquidação" que a área de
contas informou, porque é tarifa de recurso e não mensalidade de
plataforma, mas o efeito no custo da Rotta é o mesmo: **custo que
escala com número de subcontas, independente de volume transacionado.**

Fato medido em 14/10/2026: das 8 transportadoras cadastradas, 7 estão
em TRIAL e 1 ativa; 10 viagens em toda a história da plataforma, a
última em 28/08/2026. Ou seja, hoje a maior parte das subcontas com
custódia ativa seria custo sem contrapartida. O valor da tarifa não é
público e está na lista de perguntas ao comercial.

## 4. O que foi respondido e está resolvido

- **Split de assinatura** vale para todas as cobranças geradas pela
  assinatura; aceita `fixedValue` em conjunto com `percentualValue`,
  o que garante piso por transação; e alteração passa a valer das
  próximas cobranças em diante.
- **Onboarding de subconta** pode ser integralmente por API, com a
  prova de vida feita pela `onboardingUrl` e análise em até 2 dias
  úteis.
- **Sandbox** permite testar subconta, split, custódia e tokenização.

## 5. A notícia ruim: escopo PCI DSS

**Não existe SDK mobile nem tokenização pelo front.** O token do cartão
é gerado pelo backend da plataforma, fica vinculado ao cliente e deve
ser criado com a chave da subconta que vai cobrar.

Consequência direta: o número do cartão da família transita pelo
servidor da Rotta, o que coloca a Rotta em escopo PCI DSS. Não é
formalidade: é controle de ambiente, segregação, auditoria e
responsabilidade legal sobre dado de cartão de terceiro. Somado à
necessidade de guardar a chave de API de cada subconta, concentra no
mesmo servidor dado de cartão e autoridade de cobrança sobre contas de
terceiros.

**Alternativa a avaliar:** checkout hospedado do Asaas, aberto em
webview dentro do aplicativo. O cartão não toca no servidor da Rotta e
o escopo PCI sai da mão da plataforma. O preço é abrir uma página web
dentro do app, o que contraria a diretriz de 14/10/2026 de jornada
exclusivamente nativa. Essa diretriz passa a ter custo explícito, e a
decisão de abrir exceção é do fundador.

## 6. Retentativa de cartão: duas restrições de produto

- A retentativa acontece por **até 2 dias** depois do vencimento, e
  cada recusa dispara `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`.
  Dois dias é janela curta: a tela de atualizar cartão e a notificação
  ao responsável precisam existir **antes** da primeira cobrança no
  cartão, não depois.
- **Recusa de cartão não é testável no sandbox**, porque lá toda
  cobrança é aprovada. O caminho de recusa iria para produção sem teste
  de ponta a ponta. Mitigação honesta: disparar o payload do webhook de
  recusa contra o nosso próprio endpoint em teste, e fazer uma cobrança
  real de valor baixo antes de liberar para qualquer cliente.

## 7. O que continua em aberto

O time de Integrações remeteu ao comercial (`contato@asaas.com.br`,
0800 009 0037) as perguntas que decidem se a frente é segura:

1. Quem responde no chargeback quando a subconta não tem saldo, e qual
   é a ordem de cobrança entre saldo da subconta, garantia retida e
   conta pai.
2. O que elimina, e não apenas reduz, a exposição da conta pai como
   garantidora.
3. Existência e valor da tarifa recorrente por subconta com custódia.
4. Quem figura como recebedor no extrato e na nota fiscal perante a
   família.
5. Franquia de Pix gratuitos em assinatura com QR dinâmico.
6. Homologação do white label.
7. Existência de checkout hospedado compatível com assinatura e split,
   que mantenha a Rotta fora do escopo PCI.

Conclusão de 15/10/2026: **a integração é tecnicamente viável e está
clara. O que não está resolvido é se ela é segura, e isso é contrato e
risco, não código.** O escopo não diminuiu com a resposta, ficou nítido
e maior.

## 8. Decisões que são do fundador, não de diretor

- Enviar o e-mail ao comercial do Asaas. Nenhum diretor fala com gente
  de fora.
- Abrir ou não a exceção de webview para captura de cartão, pesando
  jornada nativa contra escopo PCI.
- Autorizar ou não a guarda da chave de API de subconta de terceiro no
  banco da Rotta, e sob quais controles.
- Decidir a sequência: se esta frente abre antes ou depois das métricas
  de operação (8 alunos, 10 viagens, última em 28/08/2026, 1 cliente
  pagante).
