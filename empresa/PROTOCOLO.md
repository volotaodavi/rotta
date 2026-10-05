# O protocolo de um disparo

Vale para os quatro cargos. A carta do cargo diz O QUE fazer; este
arquivo diz COMO um disparo começa, trabalha e termina.

## 0. O orçamento do turno

O recurso mais escasso da companhia não é tempo de máquina, é o limite
semanal do plano do fundador: cada turno gasta do mesmo limite que ele
usa para trabalhar. Um turno que se perde procurando custa várias
vezes um turno disciplinado, e entrega menos.

Regras de gasto, valendo para todo cargo:

1. **Calendário primeiro, `MODO:` depois.** `CALENDARIO.md` diz se
   hoje é dia de trabalho (segunda a sexta, 08:00 às 16:00 de Brasília,
   sem feriado nacional); fora disso o turno encerra na hora. Dentro do
   calendário, o `MODO:` de `FUNDADOR.md` manda: PAUSA encerra o turno,
   ECONOMIA faz a versão mínima útil. As duas conferências são as
   primeiras coisas do turno, antes de abrir qualquer outro arquivo.
2. **Leia pouco antes de escolher.** Só os arquivos do passo 1. De
   `DECISOES.md`, só o começo (`head -80`), que já é o mais recente.
   Nunca leia um arquivo grande inteiro para "entender o contexto":
   use `grep` com o que você procura, ou `Read` com faixa de linhas.
3. **Decida rápido.** Se depois de uns quinze passos de ferramenta você
   ainda não escolheu o trabalho, pare de procurar e pegue o menor
   item do backlog da sua área. Investigar sem entregar é o jeito mais
   caro de não fazer nada.
4. **Subagente só com frente de verdade.** Um subagente começa sem
   contexto e precisa redescobrir tudo: é o item mais caro à disposição
   do turno. No máximo um por turno, e nunca para tarefa que você faz
   direto.
5. **Teste focado, saída cortada.** Durante o trabalho, rode só o
   arquivo de teste do que você tocou. A suíte completa, quando fizer
   falta, roda uma vez no fim, e sempre com a saída cortada
   (`| tail -20`): despejar a saída inteira de 113 suítes no contexto
   é gasto puro.
6. **Entrega pequena de propósito.** Um PR que o fundador revisa em dez
   minutos vale mais que um que ele adia por uma semana. Trabalho que
   não cabe assim vira plano dividido no backlog.
7. **Relatório curto.** Três a seis linhas. Não repita no relatório o
   que já está no PR e em `DECISOES.md`.
8. **Nada que o turno anterior já fez.** É para isso que `DECISOES.md`
   existe. Refazer trabalho é o desperdício mais burro possível.

## 1. Entender onde a companhia parou (antes de qualquer coisa)

1. `empresa/FUNDADOR.md`, inteiro. Se existir um bloco
   `## ORDEM DO FUNDADOR`, aquilo é a tarefa deste disparo, acima do
   backlog.
2. `empresa/cargos/<seu-cargo>.md`.
3. `empresa/BACKLOG.md`.
4. Os três blocos mais recentes de `empresa/DECISOES.md`, para não
   refazer o que já foi feito nem contradizer decisão recente.
5. `git log --oneline -15`, para ver o que mudou no código desde o
   último disparo.

## 1.5 Antes de pegar trabalho novo, cuide do que você já entregou

Um turno que abre o quinto Pull Request enquanto os quatro anteriores
esperam resposta não está trabalhando, está empilhando. Então, toda vez,
antes de escolher qualquer coisa:

```sh
gh api "repos/volotaodavi/rotta/pulls?state=all&per_page=20" --jq \
  '.[] | select(.head.ref | startswith("empresa/<seu-cargo>/")) | {n:.number, estado:.state, merged:.merged_at}'
```

O que fazer com o que aparecer:

- **Fundido:** o fundador aprovou. Acabou, não mexa mais nisso.
- **Aberto com comentário ou revisão pedindo mudança:** esta é a tarefa
  do turno, acima do backlog e acima de qualquer ideia nova. Leia o que
  foi pedido (`gh api repos/volotaodavi/rotta/pulls/<n>/reviews` e
  `.../issues/<n>/comments`), conserte na MESMA branch e empurre: o PR
  se atualiza sozinho. Responda no PR o que mudou.
- **Fechado sem fundir:** o fundador reprovou. Leia o motivo, se houver.
  Com motivo, refaça do jeito certo quando ainda fizer sentido. Sem
  motivo, trate como "não era para ser feito": tire do backlog e
  registre em `DECISOES.md` que foi reprovado, com a sua leitura do
  porquê. Não reabra o mesmo PR nem abra outro igual.
- **Aberto e sem resposta:** deixe quieto e vá para outro assunto. Nunca
  abra um segundo PR sobre o mesmo tema enquanto o primeiro estiver
  aberto.

Isso custa uma chamada e evita o pior desperdício possível, que é
trabalhar de novo no que já foi recusado ou duplicar o que já está
esperando.

## 2. Escolher UMA coisa

Uma só, a de maior valor que caiba na sua autoridade e num Pull
Request revisável. Dois trabalhos meia-boca valem menos que um
terminado.

A ordem de preferência, quando nada manda o contrário:

1. Ordem do fundador.
2. Item do backlog marcado como prioridade pelo CEO.
3. Algo que você descobriu e que é claramente mais urgente que o
   backlog (quebrado em produção, risco de dado, risco de dinheiro).
   Nesse caso, registre em `DECISOES.md` por que furou a fila.
4. O item mais valioso do backlog dentro da sua área.

Se o melhor trabalho do disparo for de outra área, não invada: escreva
o item no backlog endereçado àquele cargo e pegue o seu melhor item.

## 3. Trabalhar

- Branch nova, sempre: `empresa/<cargo>/<assunto-curto>`, saindo da
  branch padrão atualizada.
- Nunca empurrar para a branch padrão. Nunca fundir nada.
- Use os subordinados da sua carta (subagentes) quando o trabalho tiver
  frentes de verdade. Não abra subagente para tarefa que você faz
  direto: cada um custa.
- **Funcionário sob demanda.** Quando o trabalho pedir um especialista
  que a sua carta não tem, crie: um subagente com a instrução que
  aquela tarefa exige (um que só varre log, um que só revisa texto
  legal, um que só compara preço de provedor). Diga no relatório que
  criou e para quê. Se ele servir numa segunda vez, acrescente-o ao
  departamento na sua carta, no mesmo PR: aí ele deixa de ser
  improviso e vira cargo.
- **Precisa de outro diretor?** Não invada a área dele e não espere.
  Escreva o pedido em `BACKLOG.md`, na seção "Pedidos entre diretores",
  no formato `- [ ] (CARGO) de: SEU-CARGO — o que você precisa e por
quê`. O diretor endereçado trata aquilo como item da própria área no
  turno seguinte.
- Mudança em código vem com teste e com verificação rodada de verdade
  (typecheck, teste, lint; e `next build` quando mexer em tela do
  Next). Teste quebrado não vira PR.
- Nenhuma análise com número inventado. Sem dado, o entregável é "o que
  precisa existir para medir isso".

## 4. Fechar

No mesmo Pull Request, três coisas:

1. O trabalho.
2. `empresa/DECISOES.md` com um bloco NOVO no topo, neste formato:

```
## AAAA-MM-DD — <CARGO>

**Fiz:** uma ou duas frases, concretas.
**Por que isso e não outra coisa:** a razão da escolha.
**Decidi sozinho:** o que foi decisão sua, para o fundador saber.
**Preciso do fundador:** o que trava sem ele, ou "nada".
**Verificado:** os comandos que você rodou e o resultado real.
**Descobri:** o que entrou no backlog por causa deste disparo.
```

3. `empresa/BACKLOG.md` atualizado: o item concluído sai, o que você
   descobriu entra, com o cargo responsável.

O corpo do PR explica o problema antes da solução, em português, e diz
o que o fundador precisa olhar com atenção na revisão.

### Como abrir o Pull Request

A sessão de um disparo roda sem conector nenhum, então as ferramentas
`mcp__github__*` não existem ali. O caminho é o cliente embutido:

```sh
git push -u origin empresa/<cargo>/<assunto>
gh api repos/volotaodavi/rotta/pulls -f title="..." -f head="empresa/<cargo>/<assunto>" -f base="<branch-padrao>" -f body="..."
```

A branch padrão é a que `git ls-remote --symref origin HEAD` devolve,
nunca um nome decorado. Se o `gh api` falhar, empurre a branch de
qualquer forma e diga no relatório que o PR ficou para o fundador
abrir: trabalho empurrado sem PR é recuperável, trabalho perdido no
container não é, porque o container é descartado quando a sessão
termina.

## 5. Terminar a sessão com um relatório curto

A última mensagem da sessão é o que chega ao e-mail do fundador. Três
a seis linhas: o que foi feito, o link do PR, e o que precisa dele. Se
o disparo não entregou nada, diga isso e por quê. Silêncio e enrolação
são piores que uma falha declarada.

## Quando parar e não entregar

Pare, registre em `DECISOES.md` (num PR só com esse registro) e avise
no relatório, quando:

- A tarefa exige segredo, dinheiro, contato externo ou merge.
- A tarefa é decisão do fundador (ver `FUNDADOR.md`).
- Você não conseguiu reproduzir o problema e qualquer conserto seria
  chute.
- O trabalho certo é grande demais para um PR: deixe o plano no
  backlog, dividido em partes revisáveis.
