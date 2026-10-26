# O que depende de você para o setor público rodar 100%

Data: 26/10/2026. Branch: `claude/rotta-platform-design-gr0xzq`.

Este documento tem um escopo estreito de propósito: **só o que eu não
consigo fazer de dentro daqui**. Código, teste, migração, documentação e
desenho de tela ficam comigo. O que está listado abaixo exige cartão,
assinatura, CNPJ, contrato, acesso físico a um ônibus ou uma decisão
comercial. Nenhuma dessas coisas um agente resolve, e fingir o contrário
é o que faz a demonstração falhar na frente da prefeitura.

Cada item diz: **o que é**, **por que só você**, **o que fazer** e **o
que acontece se não for feito**. A ordem é de bloqueio, não de
importância: o item 1 bloqueia a demonstração inteira, o item 11 só
bloqueia o faturamento.

Regra que vale para todos: **nenhum segredo passa por esta conversa.**
Nem chave, nem token, nem senha. Você cadastra o valor direto na
interface do fornecedor ou do Render. Eu digo o nome da variável, você
põe o valor. O repositório é público.

---

## 1. Comprar os rastreadores

**O que é.** O aparelho que vai embaixo do painel do ônibus e manda a
posição. O modelo que a auditoria do doc 48 escolheu é o **Teltonika
FMC130**.

**Por que só você.** É compra. Precisa de CNPJ, cotação e nota.

**O que fazer.**

1. Pedir cotação de **3 unidades** primeiro, não 70. Três resolve o
   piloto: um ônibus rodando, um de reserva e um na bancada para teste.
2. Na cotação, exigir por escrito do fornecedor:
   - **Número de homologação Anatel do modelo exato** que ele vai
     entregar. Não do fabricante, não de um modelo parecido. Do modelo.
   - Confirmação de que é **4G com Cat-M1 ou Cat-1**, não 2G/3G.
   - Manual de instalação e o endereço/porta que o aparelho usa para
     enviar (vamos apontar para o nosso receptor).
3. Guardar a nota e o número de homologação. A prefeitura pode pedir.

**Por que a exigência da Anatel não é burocracia nossa.** O Ato
14430/2024 da Anatel vedou a homologação de aparelho que só fala 2G/3G
desde **06/04/2025**. Aparelho sem homologação válida é aparelho que a
prefeitura pode glosar no contrato. Não existe data oficial de
desligamento do 2G, mas comprar hoje um aparelho que já não pode ser
homologado é comprar um passivo.

**Se não for feito.** Não há demonstração. O resto deste documento não
importa.

---

## 2. Contratar os chips M2M

**O que é.** O cartão SIM que vai dentro do rastreador. Não é plano de
celular comum: é plano **M2M/IoT**, feito para pouco dado e muitos anos.

**Por que só você.** Contrato com a operadora, no CNPJ.

**O que fazer.**

1. Contratar na mesma quantidade de aparelhos do item 1.
2. Pedir à operadora o **APN, usuário e senha** do plano. Esses três
   valores vão configurados no aparelho, não no nosso sistema.
3. Pedir franquia mensal por chip. A conta de referência: uma posição a
   cada 30 segundos, 6 horas por dia útil, dá por volta de 1 MB por mês
   por ônibus. Qualquer plano M2M de 5 MB sobra.

**Se não for feito.** O aparelho liga, pisca e não manda nada. É o modo
de falha mais caro, porque parece defeito do rastreador.

---

## 3. Um ônibus, um instalador e meia manhã

**O que é.** A instalação física do primeiro aparelho, com alguém que já
instalou rastreador antes.

**Por que só você.** Depende da transportadora liberar o veículo e de
alguém encostar na fiação do ônibus. Não é coisa que se faça por
chamada de vídeo.

**O que fazer.**

1. Combinar com a transportadora um ônibus parado por meia manhã.
2. Exigir do instalador: **ignição ligada em entrada dedicada**, não
   derivada da chave geral. É a ignição que abre e fecha a viagem no
   nosso sistema. Se ela vier errada, a viagem abre quando o motorista
   liga o rádio.
3. Anotar o **IMEI** do aparelho e o **número de frota** do ônibus
   (`01.0867`, por exemplo) no mesmo papel, na hora. Esse par é o que a
   Rotta cadastra. Trocar os dois é o erro mais comum e o mais difícil
   de achar depois.

**Se não for feito.** Dá para testar com simulador, e eu já testei
assim. Mas você não pode prometer à prefeitura algo que nunca andou num
ônibus de verdade.

---

## 4. A máquina que recebe as posições (Traccar)

**O que é.** O Traccar é um servidor livre, licença Apache 2.0, que fala
o protocolo de mais de 2.000 modelos de rastreador e traduz para JSON.
Ele é a peça entre o aparelho e a nossa API. Sem ele, eu teria que
implementar o protocolo da Teltonika em binário, e isso é meses de
trabalho para reinventar algo que já existe e é gratuito.

Ele vai rodar em **modo encaminhador, sem banco de dados próprio**: ele
recebe, traduz e repassa para `POST /trackers/posicoes`. Quem guarda é o
nosso banco. Isso reduz muito o tamanho de máquina necessário.

**Por que só você.** Precisa de uma máquina com IP público, porta TCP
aberta e cartão de crédito. Eu não contrato servidor.

**O que fazer.**

1. Contratar uma VPS pequena. Referência de tamanho: **1 vCPU, 2 GB de
   RAM**. O fórum do Traccar relata 4 GB para 1.500 aparelhos, e não
   existe página oficial de dimensionamento, então 2 GB para 70 é folga
   confortável.
2. Exigir do provedor: **IP público fixo** e a possibilidade de abrir
   **uma porta TCP de entrada** (a Teltonika usa a 5027 no Traccar
   padrão). Muita hospedagem barata só abre 80 e 443. Essa não serve.
3. Me passar o IP e o usuário de acesso. A instalação e a configuração
   do encaminhamento eu faço.

**Se não for feito.** O aparelho tenta conectar e não acha ninguém. É o
único ponto da cadeia que não tem como eu simular de dentro do
repositório.

---

## 5. Decidir o plano do Render

**O que é.** Onde a API e o banco rodam hoje, no plano gratuito.

**Por que só você.** É assinatura.

**O número que decide.** Eu medi, não estimei. Cada posição ocupa **212
bytes** na tabela `trip_positions`. A varredura que apaga posição velha
roda uma vez por dia e apaga no máximo **50.000 linhas** por execução
(5.000 por lote, 10 lotes). A uma posição a cada 30 segundos, 6 horas
por dia útil, isso dá um **teto de 69 veículos**.

Setenta ônibus fica exatamente em cima do teto. Não é "provavelmente
aguenta": é o limite, e quem está no limite quebra no primeiro dia em
que a frota faz hora extra.

**O que fazer, e a ordem importa.**

- **Para o piloto (até 10 ônibus):** não faça nada. O gratuito aguenta,
  e eu já ajustei a janela de agendamento para `*/10 8-22 * * 1-5`, que
  mantém a API acordada das 05h às 19h50 em dias úteis gastando **330
  das 750 horas** da cota. Isso resolve o "ele dorme sempre": enquanto a
  operação acontece, ele não dorme.
- **Antes de assinar com 70 ônibus:** assinar o plano pago do banco. A
  partir daí a varredura deixa de ser o gargalo e eu subo a frequência
  de limpeza junto.

**Aviso sobre a cota gratuita.** São 750 horas de instância por mês
**por workspace**, e não acumulam. Quando acabam, **todo serviço
gratuito do workspace é suspenso até o dia 1º**. Por isso a janela não é
24 horas: 24/7 em mês de 31 dias consome 744 das 750, e qualquer
reinício derrubaria a plataforma inteira no dia 28.

**Se não for feito.** No piloto, nada. Com 70 ônibus, o banco enche e a
posição mais velha para de ser apagada, até o banco travar a escrita.

---

## 6. Cadastrar as variáveis de ambiente no Render

**O que é.** Os valores que a aplicação lê para falar com cada
fornecedor.

**Por que só você.** São segredos. Eu não devo vê-los e eles não podem
entrar no repositório, que é público.

**O que fazer.** Na interface do Render, em Environment, cadastrar:

| Variável                   | De onde vem o valor                                                                                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TRACKER_INGEST_SECRET`    | Você inventa. Uma senha longa e aleatória, usada só aqui. O mesmo valor vai no cabeçalho de encaminhamento do Traccar.                                           |
| `LYTEX_CLIENT_ID`          | Painel da Lytex, produção.                                                                                                                                       |
| `LYTEX_CLIENT_SECRET`      | Painel da Lytex, produção.                                                                                                                                       |
| `LYTEX_BASE_URL`           | `https://api-pay.lytex.com.br` para produção. Sem a variável, o código usa o sandbox de propósito: ambiente novo cobra em teste, não no dinheiro de uma família. |
| `LYTEX_WEBHOOK_TOKEN`      | Você inventa, e cadastra o mesmo valor no webhook do painel da Lytex.                                                                                            |
| `LYTEX_ROTTA_RECIPIENT_ID` | O `_recipientId` da própria Rotta na Lytex. Item 7.                                                                                                              |
| `QSTASH_TOKEN`             | Painel do Upstash.                                                                                                                                               |
| `API_PUBLIC_URL`           | A URL pública da API no Render.                                                                                                                                  |

**O que já está certo e não precisa de você.** `TRACKER_TIMEOUT_MINUTOS`
tem padrão 20 e está bom. Não mexa.

**Se não for feito.** Cada integração recusa a chamada com erro claro em
vez de fingir que funcionou. Ninguém vai descobrir tarde, mas também
nada funciona.

---

## 7. Falar com o comercial da Lytex

**O que é.** Três coisas que só o titular da conta consegue.

**Por que só você.** É a sua conta e o seu contrato.

**O que fazer.**

1. **Pedir o `_recipientId` da Rotta.** É o destino da nossa taxa quando
   a cobrança sai pela subconta da transportadora. Sem ele,
   `montarSplit` devolve vazio e o log diz exatamente o que aconteceu: a
   cobrança sai, o transportador recebe tudo, e a Rotta não retém nada.
   Nenhum centavo se perde, mas nenhum centavo chega.
2. **Pedir a liberação do split** (`splitAutorization`) na conta de
   produção.
3. **Tratar a retenção (`floatConfig`).** O suporte confirmou em
   22/10/2026 boleto D+2 e Pix D+0, mas **a API da Lytex não tem rota
   para escrever esse campo**. Ou seja: isso se resolve em conversa com
   eles, não em código. Se você quiser outro prazo, tem que ser
   negociado e configurado por eles.
4. **Cadastrar a URL do webhook** no painel, com o
   `LYTEX_WEBHOOK_TOKEN` do item 6.

**Uma coisa que eu preciso avisar, e não é confortável.** A Lytex **não
publica o formato do corpo do webhook** (não há `x-webhooks` no OpenAPI
deles). Eu escrevi o leitor para ser tolerante: ele aceita a fatura em
vários lugares do envelope e nunca quebra se vier um campo a mais. Mas a
primeira cobrança real em produção é o primeiro teste de verdade desse
trecho. Acompanhe a primeira, não a centésima.

**Se não for feito.** A família é cobrada, o dinheiro vai todo para a
transportadora, e a receita da Rotta no setor privado fica em zero.

---

## 8. O contrato e os dados reais de Maricá

**O que é.** Os números de frota, os nomes de linha e a lista de escolas
de verdade.

**Por que só você.** São documentos que a prefeitura entrega a quem tem
relação com ela.

**O que fazer.** Trazer:

1. **O edital ou o contrato** (você citou o 98/2026). Eu preciso dele
   para moldar o relatório de execução por competência, que é o que a
   prefeitura efetivamente cobra para pagar a fatura. Hoje esse relatório
   não existe, e sem o edital eu só posso inventar o formato, o que é
   pior que não ter.
2. **A lista de números de frota** no padrão real (`01.0867`,
   `02.0118`). O desenho do painel já usa esse padrão porque foi você
   quem me deu, mas os números são de exemplo.
3. **Os nomes das linhas e as escolas de cada uma.** Caxito, Ubatiba,
   Silvado, Inoã apareceram na conversa. Preciso da lista fechada, e de
   saber quando uma linha tem mais de uma rota dentro do mesmo bairro,
   porque o painel precisa distinguir "Caxito 1" de "Caxito 2".
4. **Quem é o despachante.** Nome e função. O painel é desenhado para
   uma pessoa específica trabalhando no meio de um telefonema, não para
   um perfil genérico. Meia hora de conversa com ele vale mais que uma
   semana de suposição minha.

**Se não for feito.** Eu construo em cima de dados de exemplo. Funciona
na demonstração e falha no primeiro dia real, que é o pior lugar
possível para falhar.

---

## 9. A decisão de preço da modalidade licitada

**O que é.** Quanto a Rotta cobra no setor público.

**Por que só você.** Preço, plano, desconto, isenção e taxa são decisão
de fundador. Não minha, e não de nenhum diretor.

**O problema concreto.** No privado o nosso modelo é split: a família
paga, e a nossa taxa sai de dentro daquele pagamento. **No setor público
isso não existe.** Quem paga é a prefeitura, por contrato, para a
transportadora licitada. Não há mensalidade de família para dividir,
então não há split de onde tirar taxa.

Ou seja: a modalidade que você quer vender não tem, hoje, como ser
cobrada pelo mecanismo que a plataforma usa. Isso não é um detalhe de
implementação, é a pergunta comercial da modalidade inteira.

**O que fazer.** Decidir, entre outras possibilidades, se é:

- assinatura por ônibus rastreado por mês;
- assinatura fixa por contrato, independente da frota;
- valor por aluno transportado por mês;
- ou gratuito no piloto, com preço definido na renovação.

Qualquer uma dessas eu implemento. Nenhuma delas eu escolho.

**Se não for feito.** Dá para demonstrar e até rodar o piloto de graça.
Mas não há como faturar, e a modalidade fica um custo.

---

## 10. Quem é da empresa licitada, por escrito

**O que é.** A confirmação de que motorista **e monitor** são da empresa
licitada.

**Por que só você.** É informação contratual.

**O que fazer.** Confirmar por escrito, porque isso muda o código. Você
já me disse que o monitor é da empresa contratada e que deve ser tudo da
licitada, e eu vou implementar assim. Só preciso que isso esteja num
lugar que não seja uma mensagem de conversa, porque é o tipo de regra que
alguém vai questionar depois.

**O caso que me preocupa.** Você também mencionou que em alguns locais o
monitor é da escola. Se isso acontecer em um único ônibus do contrato, a
regra "tudo da licitada" quebra para aquele ônibus, e o despachante não
vai conseguir escalar ninguém naquela linha. Preciso saber se esse caso:

- não existe no contrato (então eu implemento a regra rígida), ou
- existe como exceção (então eu preciso de um caminho para ele, e é
  melhor saber agora que no dia da implantação).

**Se não for feito.** Eu implemento a regra rígida, que é o que você
pediu, e descobrimos a exceção na pior hora.

---

## 11. Três pendências legais que exigem a sua decisão

Estas vêm de auditoria anterior e continuam abertas. Não são de
infraestrutura, mas são suas.

1. **Lotação.** O cadastro de aluno (`addStudent`) não impede passar da
   capacidade do veículo. O CTB trata lotação de transporte escolar como
   infração. A regra técnica é trivial; o que preciso de você é a
   decisão: **bloquear o cadastro** ou **permitir e avisar**. No setor
   público, com remanejamento de ônibus no meio do mês, bloquear pode
   travar a operação do despachante.
2. **Autorização escolar.** Falta o tipo de documento
   `AUTORIZACAO_ESCOLAR` na lista de documentos do veículo. É o
   documento do art. 136 do CTB. Preciso saber se, no contrato de
   Maricá, quem emite é a prefeitura ou o DETRAN, porque isso muda quem
   anexa.
3. **Vistoria do art. 136.** Falta a lista de verificação de
   equipamento obrigatório. Posso montar a partir do texto legal, mas se
   a prefeitura usa um formulário próprio de vistoria, o dela vale mais
   que o meu. Se existir, me passe.

---

## O que não depende de você

Para ficar claro onde está a fronteira, e para você não gastar tempo com
o que já está feito ou é meu:

- A migração do split do Asaas para a Lytex está pronta e testada (127
  suítes, 1.618 testes, lint e typecheck verdes).
- A sugestão de rota pelo trajeto está implementada e testada com
  coordenadas reais de Ubatiba e Silvado. É o que responde "como um
  rastreador vai saber que o ônibus mudou de linha": pelo caminho que
  ele percorre, não pelo letreiro. **E ela nunca abre a viagem por
  dedução**: ela sugere, com o percentual de confiança visível, e o
  despachante confirma. Isso foi decisão de desenho, não limitação.
- O encerramento de viagem muda está implementado. Era um defeito:
  `minutosSemSinalParaEncerrar` estava configurado e documentado e
  nunca era lido.
- O painel do despachante existe em `/despachante` e já grava. O que
  falta nele é o mapa e a escala de motorista e monitor, e é isso que
  eu construo depois que você aprovar o desenho.
- Esconder o financeiro por modalidade já funciona por `exigeTag:
"PRIVADA"`, que é o que mantém `/mensalidades` e `/marketplace` fora
  da vista de empresa que só atende licitação.

---

## Se eu tivesse que escolher a ordem

Itens **1, 2, 3 e 4** nesta ordem, porque é a única sequência que
termina com um ônibus de verdade aparecendo no mapa. Dá para fazer em uma
semana e é o que você mostra para a prefeitura.

Os itens **6 e 7** em paralelo, porque não dependem de hardware.

O item **8** é o que decide se o que mostramos é a operação de Maricá ou
uma maquete bonita. Quanto mais cedo, melhor.

Os itens **5 e 9** só travam na hora de assinar contrato, não na hora de
demonstrar. Mas não chegue na assinatura sem o 9 resolvido.
