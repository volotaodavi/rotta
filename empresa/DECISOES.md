# Decisões da diretoria

Histórico. Bloco novo sempre no topo. Nada aqui é reescrito nem
apagado: é a memória da companhia entre disparos, e é por isso que um
diretor que acorda sem contexto nenhum consegue continuar de onde a
companhia parou.

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
