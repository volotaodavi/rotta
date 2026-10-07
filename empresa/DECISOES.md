# Decisões da diretoria

Histórico. Bloco novo sempre no topo. Nada aqui é reescrito nem
apagado: é a memória da companhia entre disparos, e é por isso que um
diretor que acorda sem contexto nenhum consegue continuar de onde a
companhia parou.

## 2026-10-07 — CMO: funil parado, anúncio sem base para otimizar

**Fiz:** li `GET /v1/marketing/funil`: idêntico a 05/10 (3 checkouts, 3
abandonados, 0 pagos, `pagosVindosDeAnuncio` 0, `comprasNaoEnviadas` 0).
Campanhas: 502, falta `META_ADS_ACCESS_TOKEN` com `ads_read` ou
`META_AD_ACCOUNT_ID`. O PR do turno de 05/10 já foi fundido.

**Entreguei:** `marketing/2026-10-07-anuncios-o-que-o-dado-sustenta.md`,
com o que dá e o que não dá para fazer em anúncio com este dado. Recado
ao CFO mantido e atualizado.

**Decidi sozinho:** não mexer em `apps/web` neste turno. O número não
mudou, então não há nova perda para atacar, e instrumentar
`cadastro_iniciado` agora daria métrica enviesada (dispara antes do
aceite de cookies e é descartado).

**Preciso do fundador:** as duas variáveis do Meta no Render e token da
API de Conversões com escrita. O segredo de leitura foi usado só na
sessão, nunca gravado.

## 2026-10-05 — CMO: funil lido, checkout de `/planos/assinar` reescrito

**Fiz:** com o segredo de leitura entregue pelo fundador neste turno,
li `GET /v1/marketing/funil`: 3 checkouts iniciados, 3 abandonados, 0
pagos; 6 transportadoras em teste, 1 pagando; `pagosVindosDeAnuncio` 0;
`comprasNaoEnviadas` 0. `GET /v1/marketing/campanhas` respondeu 502
(falta `META_ADS_ACCESS_TOKEN` com `ads_read` ou `META_AD_ACCOUNT_ID`).
Análise completa em `marketing/2026-10-05-funil.md`.

**Mudei no site:** `apps/web/src/app/(marketing)/planos/assinar/page.tsx`
agora diz, antes do formulário, o reembolso automático em 48 horas, o
teste grátis sem cartão e o que acontece depois de pagar; ajuda dos
campos de contato reescrita. Teste novo em `page.spec.tsx`. Preço,
plano e promessa não mudaram.

**Decidi sozinho:** atacar o checkout porque é onde o número mostra a
perda (3 de 3). Amostra pequena: é direção, não prova.

**Não fiz:** nenhum número de campanha, porque o Meta recusou a leitura.
Nada publicado em lugar nenhum.

**Preciso do fundador:** as duas variáveis do Meta no Render; fundir ou
recusar o PR #2. O segredo de leitura foi usado só na sessão e não foi
gravado no repositório.

## 2026-10-05 — CMO: funil cego, análise não escrita

**Fiz:** o turno pediu a análise de funil. Confirmei o ambiente:
`DIRETORIA_READ_SECRET` e `RENDER_API_KEY` ausentes na sessão. Chamei
`GET https://rotta-vt7i.onrender.com/v1/marketing/funil` e a resposta foi
HTTP 401. Pela carta do cargo, parei ali: não escrevi
`empresa/marketing/AAAA-MM-DD-funil.md` e não mexi em `apps/web`, porque
nenhuma das quatro perguntas (onde o cadastro morre, receita vinda de
anúncio, compras não enviadas ao Meta, o que mudar nas páginas) tem
número para ancorar.

**Entreguei:** o recado do CMO para o CFO em `BACKLOG.md` (teto de custo
por transportadora nova), e o pedido ao fundador para colocar a variável
no ambiente do CMO.

**Decidi sozinho:** não abrir frente de texto de página no escuro, mesmo
com o turno fora de calendário. O item "Onde o cadastro morre" continua
aberto no backlog.

**Preciso do fundador:** `DIRETORIA_READ_SECRET` no ambiente da sessão do
CMO, mesmo valor do Render. Valor nunca pelo chat.

## 2026-10-05 — CEO

**Fiz:** organizei a primeira semana. Marquei `[prioridade]` em um item por cargo no backlog e limpei o que já estava feito ou desatualizado.
**Por que isso e não outra coisa:** o fio da semana é "quem pagou e não chegou". O backlog já registra pré-cadastro pago sem conta e conta criada sem cadastro terminado: dinheiro e família reais parados no funil. Ver isso de lados diferentes rende mais que quatro assuntos soltos.

- CFO: quantificar os pré-cadastros pagos sem conta (quantos, quanto dinheiro, completar ou devolver). Só com dado da fonte.
- CMO: onde o cadastro morre (texto, campo ou passo faltando). Cruza com o número do CFO, sem inventar taxa.
- CTO: começar a auditoria dos agentes de IA pelo que toca dinheiro ou segurança. Fora disso, o plantão de erro segue como manda a carta.
- CEO: escrever o que falta para vender a uma transportadora grande sem o fundador ao lado, no próximo turno.

**Decidi sozinho:**

- Tirei do backlog o travessão da API (feito em 36da054) e a organização da primeira semana (esta). Reduzi o item de testes ao `packages/ui`, porque o `apps/admin` já ganhou o primeiro teste em da467bd.
- Não marquei o item do Vitest com ícone nem os de turno e escala: o primeiro é infraestrutura sem dor atual, e os dois últimos são pendências antigas que ninguém detalhou.
- Nenhum PR de diretor estava aberto nem aguardando resposta, então não houve fila para cobrar. Também não há entrega anterior de ninguém para avaliar: é a primeira semana.

**Preciso do fundador:** nada trava a semana. Os itens da seção "Só o fundador pode fazer" seguem valendo. Dois deles mudam o que a semana consegue: `DIRETORIA_READ_SECRET` (sem ele o plantão do CTO acorda cego) e o Pixel do Meta na Vercel (sem ele o CMO não mede nada).

**Verificado:** calendário conferido pelo relógio do sistema (segunda, 08:08 de Brasília), `MODO: NORMAL`, sem ordem do fundador. Li o backlog e `DECISOES.md` inteiros e o `git log`. Conferi com `grep` que a limpeza de travessão cobre a API. Não rodei teste: o turno só mexe em documentos.
**Descobri:** nada novo para o backlog.

## 2026-10-05 — FUNDAÇÃO (correção)

**Fiz:** troquei a montagem da diretoria. Cada cargo agora tem uma
sessão própria e permanente, criada com o repositório da Rotta
anexado, e a Routine do cargo acorda ESSA sessão em vez de abrir uma
sessão nova a cada turno.

**Por que isso e não outra coisa:** a montagem anterior não funcionava,
e levou três turnos para ficar claro. Dois turnos do CTO terminaram em
28 e 60 segundos sem entregar nada. A documentação do ambiente explica:
os repositórios de uma sessão são escolhidos quando ela começa, e uma
sessão aberta por agendamento nasce com a lista vazia. Os dois turnos
acordaram num container sem o código da Rotta e sem credencial para
empurrar nada, leram o que tinham, escreveram um recado curto e
encerraram. Não era o prompt, não era permissão, não era o agendador.

**Decidi sozinho:**

- Sessão permanente por cargo, em vez de sessão nova por turno. Além de
  resolver o repositório, isso dá memória ao diretor entre turnos, o
  que baratea cada turno seguinte.
- Modelo fixado em Sonnet nas quatro sessões. O turno de teste que
  finalmente teve repositório rodou em Opus por herança e consumiu US$
  2,95 em cinco minutos, contra US$ 0,13 e US$ 0,16 dos dois turnos
  vazios. Trabalho de diretoria não justifica o modelo mais caro.
- As quatro Routines antigas foram apagadas e refeitas. Apagar uma
  Routine apaga as sessões que ela criou, então as duas sessões de
  teste vazias do CTO foram embora junto; a que importa, a que teve
  repositório e provou o diagnóstico, foi criada à mão e continua lá.

**Preciso do fundador:** nada agora. O primeiro turno de verdade é o
CEO, segunda 08:07.

**Verificado:** o turno de teste com repositório anexado leu 142 mil
tokens de contexto e produziu 25 mil tokens de saída (contra 1,3 mil
dos turnos sem repositório), ou seja, trabalhou de verdade. Ele não
chegou a abrir o PR porque esbarrou no limite semanal do plano do
fundador, que zerou no domingo às 21h de Brasília. Esse limite é o
motivo de a cadência ser de cinco turnos por semana e de existir a
linha `MODO:`.

**Descobri:** uma Routine amarrada a uma sessão permanente não aceita
notificação por e-mail (o servidor recusa; e-mail só existe para
Routine que abre sessão nova a cada disparo). Então o aviso de fim de
turno passa a ser o Pull Request e a tela Diretoria do Admin, que
mostra quantos estão esperando merge. Se o fundador quiser o e-mail de
volta, dá para criar um boletim semanal separado, que lê o repositório
público e resume a semana.

## 2026-10-03 — FUNDAÇÃO

**Fiz:** criei a diretoria da Rotta, a pedido do fundador: CEO, CTO,
CMO e CFO, cada um com uma Routine própria que abre uma sessão sozinha
no horário dele, sem ninguém mandar prompt.

**Por que isso e não outra coisa:** o fundador pediu agentes que
trabalhem de verdade, sem ele mandar. O que separa isso de um chat é
uma coisa só, um agendador que dispara a sessão. Tudo o mais (carta de
cargo, backlog, log) existe para que o agente que acorda saiba onde a
companhia parou em vez de inventar uma empresa nova a cada disparo.

**Decidi sozinho:**

- O comportamento da diretoria vive no repositório, não no texto das
  Routines. O prompt agendado é curto e só manda ler `FUNDADOR.md`,
  `PROTOCOLO.md` e a carta do cargo. Mudar o que um diretor faz passa a
  ser editar um arquivo e dar commit, não mexer em agendador.
- Departamento é subagente dentro da sessão do chefe, não uma sessão
  por funcionário. Uma sessão por funcionário custaria várias vezes
  mais e entregaria o mesmo.
- Toda entrega sai como Pull Request em branch própria. A branch padrão
  deste repositório é a que a Vercel e o Render publicam: um diretor
  empurrando ali estaria publicando na plataforma que famílias e
  motoristas usam.
- `FUNDADOR.md` vence qualquer carta de cargo, e o bloco
  `## ORDEM DO FUNDADOR` naquele arquivo vira a tarefa do próximo
  disparo, acima do backlog. É o mecanismo da palavra final sem
  depender de o fundador estar presente.

**Preciso do fundador:**

- Fundir (ou recusar) os Pull Requests. Nenhum diretor funde nada.
- Decidir se quer mais cadência depois de ver as primeiras entregas. A
  cadência começa enxuta, 7 disparos por semana, porque cada disparo
  consome o mesmo limite de plano que ele usa para trabalhar.
- Os três itens da seção "Só o fundador pode fazer" do backlog.

**Verificado:** as quatro Routines criadas e listadas no agendador, com
horário e prompt conferidos. O primeiro disparo real do CTO foi
executado à mão para provar a corrente inteira: a Routine abriu sessão
sozinha, com o repositório clonado, leu as cartas e trabalhou.

**Descobri:** quatro limites que não existem por preguiça de montagem,
e sim por falta de credencial, e que o fundador precisa conhecer para
não esperar o que não vai acontecer. O CFO não move dinheiro. O CMO não
publica nada. O CEO não assina nem contrata. Nenhum deles fala com
pessoa de fora. Tudo isso para no fundador, de propósito.
