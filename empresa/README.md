# A diretoria da Rotta

Quatro agentes de IA trabalham nesta companhia em cargos de diretoria:
CEO, CTO, CMO e CFO. Cada um acorda sozinho, no horário dele, sem
ninguém mandar prompt.

Quem manda é o fundador. Ver `FUNDADOR.md`, que vale acima de qualquer
carta de cargo.

## Como isso funciona de verdade

O que faz um agente trabalhar sem ninguém pedir é uma **Routine**: um
agendamento no servidor da Anthropic que guarda um prompt e um horário.
No horário, ela abre uma sessão nova do Claude Code sozinha, com este
repositório clonado, e essa sessão executa a carta do cargo. Não
depende do computador do fundador estar ligado, nem de ninguém estar
olhando.

Cada Routine guarda um prompt curto que manda ler três arquivos: este,
o `FUNDADOR.md` e a carta do próprio cargo. **Todo o comportamento da
diretoria vive neste repositório, não dentro do agendamento.** Isso é
deliberado: mudar o que um diretor faz é editar um arquivo de texto
aqui e dar commit, não mexer em configuração de agendador.

## Cadência atual

| Cargo | Quando acorda (horário de Brasília) |
| ----- | ----------------------------------- |
| CEO   | segunda, 08:47                      |
| CTO   | todo dia, 08:51                     |
| CMO   | quarta, 08:53                       |
| CFO   | sexta, 08:49                        |

São 7 disparos por semana, de propósito. Cada disparo é uma sessão de
verdade e consome o limite do plano do fundador, o mesmo limite que ele
usa para trabalhar. Subir a cadência é fácil e custa; descer é igual.
Ver "Como o fundador muda as coisas" abaixo.

## O que sai de cada disparo

Sempre as mesmas quatro coisas, nesta ordem:

1. Um **Pull Request** com o trabalho, numa branch própria
   (`empresa/<cargo>/<assunto>`).
2. Um bloco novo no topo de `DECISOES.md`, dentro do mesmo PR: o que
   fez, por quê, o que decidiu sozinho e o que precisa do fundador.
3. `BACKLOG.md` atualizado no mesmo PR: o que saiu, o que entrou.
4. Um resumo por e-mail para o fundador quando a sessão termina.

**Nada é fundido sem o fundador.** O merge é dele, sempre. Um diretor
que empurrasse direto para a branch padrão estaria publicando na
plataforma que famílias e motoristas usam, porque essa branch é a que
a Vercel e o Render publicam.

## Como o fundador muda as coisas

- **Dar uma ordem para o próximo disparo:** escrever um bloco
  `## ORDEM DO FUNDADOR` no topo de `FUNDADOR.md`. O próximo diretor a
  acordar trata aquilo como a tarefa dele, acima do backlog.
- **Mudar o que um cargo faz:** editar `cargos/<cargo>.md`.
- **Mudar a fila de trabalho:** editar `BACKLOG.md`.
- **Mudar horário ou parar tudo:** pedir ao Claude numa sessão normal.
  As Routines se chamam "Diretoria Rotta: CEO", "... CTO", "... CMO" e
  "... CFO". Desligar uma não apaga nada, e religar é uma linha.
- **Interromper um diretor no meio:** responder na sessão dele, pela
  lista de sessões do app. A palavra do fundador vence a tarefa em
  andamento.

## Departamentos

Cada diretor abre os próprios subordinados dentro da sessão dele
(subagentes), em vez de cada funcionário ser uma sessão separada. Um
time de agentes paralelos custaria várias vezes mais e entregaria o
mesmo. Quem são os subordinados de cada cargo está na carta do cargo.

## Os arquivos

| Arquivo         | Para que serve                                        |
| --------------- | ----------------------------------------------------- |
| `FUNDADOR.md`   | A palavra final. Lido antes de tudo, em todo disparo. |
| `BACKLOG.md`    | A fila da companhia. Qualquer diretor pode mexer.     |
| `DECISOES.md`   | Histórico. Só cresce, nunca é reescrito.              |
| `cargos/ceo.md` | Estratégia, prioridade entre as áreas, cobrança.      |
| `cargos/cto.md` | Produto, código, qualidade, dívida técnica.           |
| `cargos/cmo.md` | Aquisição, mensagem, conteúdo, conversão.             |
| `cargos/cfo.md` | Caixa, preço, inadimplência, custo.                   |
