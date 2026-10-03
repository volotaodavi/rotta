# O calendário da companhia

Decisão do fundador (03/10/2026): a diretoria trabalha em horário
comercial, de segunda a sexta, e não trabalha em feriado nacional.

**Esta é a primeira coisa que um turno confere, antes de abrir qualquer
outro arquivo.** Um turno que cai fora do calendário termina ali mesmo,
com uma linha de relatório, sem abrir Pull Request e sem escrever em
`DECISOES.md`. Custa quase nada, e é assim que o calendário é
respeitado de verdade em vez de ficar escrito e ignorado.

## Horário comercial

- **Início: 09:00** de Brasília. Nenhum turno começa antes disso, e é
  por isso que os agendamentos estão entre 09:07 e 09:13.
- **Limite: 18:00** de Brasília. Se o relógio passar das 18:00 com o
  trabalho em andamento, o turno **para onde está**: empurra a branch
  com o que já existe, abre o Pull Request mesmo incompleto marcando no
  título que está incompleto, registra em `DECISOES.md` o que faltou, e
  encerra. Trabalho dentro de um container que vai ser descartado não
  vale nada; meio trabalho empurrado vale.
- Fora do horário, não se começa nada. Se um turno disparar fora da
  janela por qualquer motivo, ele encerra na hora.

## Dias

- **Segunda a sexta.** Sábado e domingo a companhia não trabalha.
- **Feriado nacional não se trabalha.** A lista está abaixo. Carnaval e
  Corpus Christi são ponto facultativo e não feriado, e entram na
  lista do mesmo jeito: o país para, e a diretoria para com ele.
- Feriado municipal e estadual não entram. São do Rio de Janeiro e de
  cada cidade, mudam demais, e o fundador pode mandar parar num dia
  específico com uma `ORDEM DO FUNDADOR` quando quiser.

## Feriados nacionais

Datas já conferidas por cálculo (a Páscoa de 2026 é 05/04 e a de 2027 é
28/03; Carnaval, Sexta-feira Santa e Corpus Christi derivam dela).

### 2026

| Data  | Dia     | O que é                    |
| ----- | ------- | -------------------------- |
| 01/01 | quinta  | Confraternização Universal |
| 16/02 | segunda | Carnaval                   |
| 17/02 | terça   | Carnaval                   |
| 03/04 | sexta   | Sexta-feira Santa          |
| 21/04 | terça   | Tiradentes                 |
| 01/05 | sexta   | Dia do Trabalho            |
| 04/06 | quinta  | Corpus Christi             |
| 07/09 | segunda | Independência              |
| 12/10 | segunda | Nossa Senhora Aparecida    |
| 02/11 | segunda | Finados                    |
| 15/11 | domingo | Proclamação da República   |
| 20/11 | sexta   | Consciência Negra          |
| 25/12 | sexta   | Natal                      |

### 2027

| Data  | Dia     | O que é                    |
| ----- | ------- | -------------------------- |
| 01/01 | sexta   | Confraternização Universal |
| 08/02 | segunda | Carnaval                   |
| 09/02 | terça   | Carnaval                   |
| 26/03 | sexta   | Sexta-feira Santa          |
| 21/04 | quarta  | Tiradentes                 |
| 01/05 | sábado  | Dia do Trabalho            |
| 27/05 | quinta  | Corpus Christi             |
| 07/09 | terça   | Independência              |
| 12/10 | terça   | Nossa Senhora Aparecida    |
| 02/11 | terça   | Finados                    |
| 15/11 | segunda | Proclamação da República   |
| 20/11 | sábado  | Consciência Negra          |
| 25/12 | sábado  | Natal                      |

Quando 2027 estiver acabando, o primeiro turno que notar a lista
vencida acrescenta o ano seguinte, calculando a Páscoa, e registra isso
em `DECISOES.md`. Não é tarefa de ninguém em particular: é de quem vir
primeiro.

## Como o turno confere

A data e a hora de Brasília, do próprio sistema, nunca de memória:

```sh
TZ=America/Sao_Paulo date "+%Y-%m-%d %H:%M %u"
```

O último número é o dia da semana (1 segunda, 7 domingo). Com ele e com
a tabela acima dá para decidir em um passo se o turno acontece.
