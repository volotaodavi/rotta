# O protocolo de um disparo

Vale para os quatro cargos. A carta do cargo diz O QUE fazer; este
arquivo diz COMO um disparo começa, trabalha e termina.

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
