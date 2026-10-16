# Movimentações executadas

A memória de dinheiro da companhia. **Consultado ANTES de pagar, não
depois.**

Um diretor acorda sem lembrar do turno anterior. Numa rotina mensal como
a Guia DAS-MEI, isso significa que o erro mais provável não é pagar
errado, é **pagar duas vezes a mesma competência**. Este arquivo é o que
impede, e por isso a ordem dos passos não é detalhe: consulta, confere
que a competência não está aqui, paga, registra na mesma sessão.

## Como registrar

Uma linha por movimentação, sem exceção, e a chave é a combinação
`competência + tipo + destino`. Se essa combinação já existe na tabela,
**não se paga de novo**: o turno encerra o assunto e escreve no
relatório que já estava pago.

| Data | Competência | Tipo | Destino | Valor | Comprovante | Turno |
| ---- | ----------- | ---- | ------- | ----- | ----------- | ----- |

Nenhuma movimentação executada até hoje. A tabela está com o cabeçalho e
sem linha porque é isso que é verdade: as travas da seção "O CFO e o
dinheiro" em `../FUNDADOR.md` ainda não foram todas cumpridas, e
enquanto não forem, esta tabela fica vazia.

## Se uma movimentação falhar

Registra do mesmo jeito, com o valor e a palavra `FALHOU` no
comprovante, e o motivo no relatório do turno. Movimentação que falhou e
não ficou escrita é a maneira mais rápida de o turno seguinte tentar de
novo sem saber que já tentou, ou de ninguém nunca descobrir que a guia
venceu.
