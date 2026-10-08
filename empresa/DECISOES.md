# Decisões da diretoria

Histórico. Bloco novo sempre no topo. Nada aqui é reescrito nem
apagado: é a memória da companhia entre disparos, e é por isso que um
diretor que acorda sem contexto nenhum consegue continuar de onde a
companhia parou.

## 2026-10-08 — CTO: a Central de Notificações não abria, e o motivo era 26 contra 45

**Relato do fundador:** "ao quererem entrar nas notificações, aparece
erro".

**O que era:** o `enum NotificationEventType` no `schema.prisma` tem 45
valores. Os mapas de ícone, cor e rótulo das telas de notificação
tinham 26. A Central do app fazia `NOTIFICATION_TYPE_ICON[tipo]` e
usava o resultado como componente, então uma notificação de qualquer um
dos 19 tipos ausentes virava `<undefined />` e derrubava a tela com
"Element type is invalid: expected a string (for built-in components) or
a class/function (for composite components) but got: undefined".

É o MESMO erro que o plantão registrou em 07/10/2026 às 21:50, duas
vezes em doze segundos. Entre os 19 que faltavam estão
`CADASTRO_CONCLUIDO` e `IDENTIDADE_APROVADA`: bastava criar uma conta
para a Central ficar inabrível.

**Por que o compilador não pegou:** a união `NotificationEventType` do
`packages/api-client` também declarava 26 valores. Um
`Record<NotificationEventType, ...>` de 26 chaves estava, para o
TypeScript, completo. Pior: o arquivo carregava uma nota admitindo a
defasagem e chamando-a de inofensiva, dizendo que "uma notificação de
tipo desconhecido continua aparecendo na Central, só não cai em nenhum
filtro de categoria". Essa frase estava errada, e foi ela que fez o
adiamento parecer seguro.

**Por que não havia teste:** `lucide-react-native` publica ESM e
resolve para `.mjs` pela condição `react-native`; o transform do
`jest-expo` só casa `\.[jt]sx?$`. Nada que importasse
`@rotta/icons/native` podia ser testado, e é embaixo desse barrel que
os mapas vivem. A lacuna não foi descuido: era impossível escrever o
teste que teria pegado.

**Fiz, na ordem da causa:** completei a união para os 45 valores, que
transformou cada mapa incompleto em erro de compilação (o `tsc` apontou
sete, em mobile e web); preenchi os sete; troquei o acesso direto por
`iconeDoTipo`/`tomDoTipo`/`rotuloDoTipo` com saída garantida, porque a
API sobe sozinha e o aplicativo instalado não, e compilador nenhum
alcança um binário já na mão do usuário; abri o caminho do Jest para o
lucide via `moduleNameMapper` para o build CommonJS.

**Diferença entre os dois apps, para o registro:** no mobile o mapa
guarda o COMPONENTE e `<undefined />` derruba a árvore. Na web ele
guarda um ELEMENTO já construído, e elemento `undefined` o React só não
desenha: lá o efeito era círculo vazio e linha sem o nome do tipo,
degradação silenciosa e não queda. Os dois foram consertados.

**Prova:** o teste de integração monta a `CentralScreen` de verdade com
uma notificação de tipo desconhecido. Revertendo a tela ao acesso
direto, ele falha com a mensagem literal do crash de produção;
restaurado o conserto, passa. `notification-event-type.spec.ts` tranca
a união contra o `schema.prisma`, para a próxima adição ao enum quebrar
um teste em vez de uma tela. Mobile 95/95, api-client 7/7, `tsc` limpo
nos dois apps, `next build` verde.

**Preciso do fundador:** instalar um build novo do app para o conserto
chegar ao celular. Fundir ou recusar o PR #3 e o PR #4.

## 2026-10-08 — CTO: o crash que chegou sem nome, e o token dos quatro

**O que o plantão achou:** com o token de leitura finalmente no lugar,
`GET /v1/client-errors/plantao?horas=168` parou de responder zero e
mostrou um crash real: `app: MOBILE`, "Element type is invalid:
expected a string (for built-in components) or a class/function (for
composite components) but got: undefined", duas vezes em doze
segundos, em 07/10/2026 às 21:50. Antes disso a janela de 168 horas
vinha vazia, numa semana em que o app não abria para ninguém.

**Por que ele não dava para consertar:** o relatório tinha doze quadros
de pilha, todos de dentro do reconciliador do React, nenhum do produto,
em endereço de bytecode Hermes (`index.android.bundle:1:345165`). E
`buildId` vazio. Dava para saber que algo quebrou, não o quê nem em
qual build.

**Investigação, com o que foi descartado:** o grafo de 327 módulos que
o app carrega na partida não tem nenhum ciclo de import (Tarjan sobre
os imports de valor, ignorando `import type`); não existe variante por
plataforma (`.native.`/`.android.`/`.web.`) que o `tsc` não veja; não
existe `React.lazy` nem import dinâmico; `@maplibre/maplibre-react-native`
10.4.2 exporta de fato os seis nomes que `packages/maps` importa
(`Camera`, `Callout`, `LineLayer`, `MapView`, `PointAnnotation`,
`ShapeSource`); `tsc --noEmit` passa. O `.aab` instalado é bytecode
Hermes, então os deslocamentos da pilha não viram nome de função sem o
disassembler.

**Fiz:** o conserto é no instrumento, não um chute no defeito.
`AppErrorBoundary` passou a usar o segundo argumento de
`componentDidCatch`, que é exatamente o que nomeia a tela quebrada e
sobrevive à minificação, e a mandar a identidade do build
(`apps/mobile/src/lib/identidade-do-build.ts`, `version` +
`versionCode`). `apps/web` já fazia isso desde 03/09/2026
(`section-error-boundary.tsx`); o app tinha ficado de fora, e o preço
foi um crash de produção não diagnosticável. Quatro testes novos em
`app-error-boundary.spec.tsx`; os dois que importam falham no código
anterior e passam no consertado. Mobile 91/91.

**Também fiz:** `DIRETORIA_READ_SECRET` chegou ao CEO, ao CTO e ao CFO,
que rodavam sem ele (só o CMO tinha). As três escalas foram recriadas,
porque o texto de uma escala presa a uma sessão não pode ser editado de
fora dela. Cada uma agora confere se o endpoint respondeu 200 de
verdade antes de encerrar em branco, e cruza com
`/v1/plataforma/pulso/diretoria`: zero erro com a plataforma em
movimento é suspeita, não boa notícia. O CFO ganhou a régua de cobrança
(`/v1/cobranca/pendencias` e `/v1/cobranca/cobrar`) e o CEO ganhou as
quatro leituras juntas, que é o cruzamento que só ele faz.

**Errei:** escrevi `/v1/plataforma/pulso` nos três prompts primeiro, e
essa rota exige sessão de Admin (a da diretoria termina em
`/diretoria`). Peguei no teste e corrigi antes de qualquer turno rodar
com ela. E ao apagar a escala antiga do CTO apaguei junto a sessão que
ela havia criado às 08:22 de hoje, perdendo o relatório daquele turno.

**Preciso do fundador:** fundir ou recusar o PR #3 (CTO, testes do Audit
Engine) e o PR #4 (CMO). O crash do mobile só fica identificado quando
um build com este conserto estiver instalado: o próximo relatório dirá
a tela e o build.

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
