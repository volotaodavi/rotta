# Fórmulas da companhia

Toda métrica que um diretor, um painel ou um relatório usar está
definida aqui, como conta explícita sobre colunas que existem de
verdade no `apps/api/prisma/schema.prisma`.

**A regra é simples: número que aparece em qualquer lugar e não está
neste arquivo nasceu do nada.** Quem escrever um relatório com uma
métrica que não está aqui tem duas saídas honestas: definir a métrica
aqui primeiro, ou escrever "não temos esse dado, e para ter precisa de
X".

Cada coluna citada abaixo foi conferida contra o schema em 16/10/2026.
Nenhuma foi inventada. Onde o dado não existe, está escrito que não
existe, e o que falta para existir.

## Como ler as fórmulas

- `Trip`, `Company`, `User` e os demais são modelos do Prisma, com o
  nome exato do schema.
- Os acessos ao banco rodam com `runWithTenantContext({ tenantId:
null, bypass: true })` quando a conta é da plataforma inteira, porque
  o banco isola por `companyId` e uma contagem global precisa atravessar
  esse isolamento de propósito. Contagem de UMA transportadora nunca usa
  bypass.
- `hoje` é o dia no fuso `America/Sao_Paulo`. Período sempre fechado em
  dias inteiros.
- Mediana, nunca média, em qualquer métrica de tempo. Uma ocorrência
  esquecida desloca a média e esconde o comportamento real.

## 1. Operação: a Rotta funcionou?

É o bloco mais importante, e o único que responde se o produto está
sendo usado. Em 06/10/2026 o aplicativo ficou inutilizável por uma
semana e o fundador descobriu por acidente: este bloco existe para isso
não repetir.

| Métrica                         | Fórmula                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `viagens_hoje`                  | `count(Trip where data = hoje)`                                                                       |
| `viagens_7d`                    | `count(Trip where data >= hoje - 6 dias)`                                                             |
| `viagens_finalizadas_7d`        | `count(Trip where status = FINALIZADA and data >= hoje - 6 dias)`                                     |
| `viagens_em_andamento`          | `count(Trip where status = EM_ANDAMENTO)`                                                             |
| `ultima_viagem`                 | `max(Trip.data)`                                                                                      |
| `dias_sem_viagem`               | `hoje - max(Trip.data)`, em dias inteiros                                                             |
| `transportadoras_com_viagem_7d` | `count(distinct Trip.companyId where data >= hoje - 6 dias)`                                          |
| `alunos_transportados_7d`       | `count(distinct TripStudentEvent.studentId where processadoEm >= agora - 7 dias and tipo = EMBARCOU)` |
| `posicoes_1h`                   | `count(TripPosition where capturadaEm >= agora - 1 hora)`                                             |
| `erros_de_cliente_24h`          | `count(ClientErrorReport where createdAt >= agora - 24 horas)`                                        |

Notas que mudam o resultado:

- `Trip.data` é `@db.Date`, o **dia operado**, e é sobre ele que vale a
  unicidade "uma viagem em andamento por rota por dia" (`GPS-01`). Não
  confundir com `iniciadaEm`, que é timestamp. Contagem de viagem por
  dia usa `data`; tempo de viagem usa `iniciadaEm` e `finalizadaEm`.
- `tipo = EMBARCOU` em `alunos_transportados_7d` é deliberado. O enum
  `TripStudentEventType` tem `EMBARCOU`, `AUSENTE` e `DESEMBARCOU`:
  contar os três contaria o mesmo aluno duas vezes e contaria ausência
  como transporte.
- `posicoes_1h` é o sinal mais vivo que existe, porque só aparece quando
  há uma van andando com criança dentro. Já é calculado em
  `PulsoService`.

## 2. Cadastro e funil

| Métrica                      | Fórmula                                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `transportadoras_total`      | `count(Company)`                                                                                                           |
| `transportadoras_por_status` | `count(Company) group by status`, com os cinco valores de `CompanyStatus`: TRIAL, ATIVO, SUSPENSO, CANCELADO, INADIMPLENTE |
| `transportadoras_pagantes`   | `count(Company where status = ATIVO)`                                                                                      |
| `trials_vencidos`            | `count(Company where status = TRIAL and trialExpiraEm < agora)`                                                            |
| `usuarios_total`             | `count(User)`                                                                                                              |
| `usuarios_novos_30d`         | `count(User where createdAt >= agora - 30 dias)`                                                                           |
| `alunos_total`               | `count(Student)`                                                                                                           |
| `alunos_novos_30d`           | `count(Student where createdAt >= agora - 30 dias)`                                                                        |

O funil da Rotta tem quatro degraus, e cada um é subconjunto do
anterior. Validar isso antes de desenhar qualquer coisa: se um degrau
tiver mais registros que o de cima, o erro é da consulta, não do
negócio.

1. `cadastrou` = `count(Company)`
2. `tem_aluno` = `count(distinct Company)` com ao menos um aluno
   vinculado por contrato
3. `fez_viagem` = `count(distinct Trip.companyId)`
4. `paga` = `count(Company where status = ATIVO)`

Conversão geral é `paga / cadastrou`. **Nunca** usar a taxa de um degrau
como se fosse a geral.

`Student` pertence ao responsável (`Student.responsavelId`), não à
transportadora: não existe `Student.companyId`. Qualquer métrica de
"alunos da transportadora" passa por contrato ou por viagem, nunca por
uma coluna direta. Escrever "alunos da transportadora X" sem atravessar
contrato é erro de modelagem, não atalho.

## 3. Dinheiro

| Métrica                      | Fórmula                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `receita_mensal_recorrente`  | `sum(Plan.priceCents) / 100` para cada `Company where status = ATIVO`, pela relação `Company.planId -> Plan` |
| `preco_do_plano`             | `Plan.priceCents / 100`, em reais                                                                            |
| `receita_por_transportadora` | `receita_mensal_recorrente / transportadoras_pagantes`                                                       |

O que **não** se consegue medir hoje, e o que falta para medir:

- **Inadimplência em reais.** Existe `CompanyStatus.INADIMPLENTE`, que é
  estado, não valor. Para ter valor é preciso somar cobrança vencida e
  não paga, o que depende de persistir o histórico de cobrança do Asaas,
  não só o status atual da empresa.
- **Custo por transportadora.** Não existe fonte: a Rotta não registra
  custo de infraestrutura nem de aquisição por cliente.
- **Receita de take rate sobre a mensalidade da família.** Não existe:
  a arquitetura de split foi analisada em 15/10/2026 e não foi
  implementada. Enquanto não existir, qualquer número de take rate é
  projeção, e se escreve rotulado como projeção, com a premissa ao lado.
- **Churn.** Existe `status = CANCELADO`, mas não existe a data do
  cancelamento como coluna própria, então não dá para dizer "cancelaram
  neste mês" sem olhar `AuditLog`.

## 4. Engenharia

Fonte é o próprio repositório, por `gh`, não o banco.

| Métrica                           | Fórmula                                 |
| --------------------------------- | --------------------------------------- |
| `prs_fundidos_7d` / `30d` / `90d` | PRs com `merged_at` dentro da janela    |
| `prs_abertos`                     | PRs com `state = open`                  |
| `tempo_de_ciclo_do_pr`            | **mediana** de `merged_at - created_at` |
| `itens_mais_antigos_abertos`      | os três com maior `hoje - created_at`   |

Regra de amostra pequena: **com menos de 10 PRs no período, escrever
isso em vez de mostrar a mediana.** Mediana de três amostras não é
mediana, é coincidência, e este é o painel que mais engana em equipe de
uma pessoa.

## 5. O que não tem fonte, e portanto não tem painel

Escrito aqui para ninguém montar vitrine vazia:

- **Suporte.** Não existe helpdesk, não existe ticket, não existe nota
  de satisfação. Nenhuma métrica de suporte é calculável hoje.
- **Marketing pago.** `pagosVindosDeAnuncio` é 0 e a leitura de campanha
  do Meta responde 502 por falta de `META_ADS_ACCESS_TOKEN` e
  `META_AD_ACCOUNT_ID` no ambiente da API. Custo por lead não é
  calculável enquanto não houver coluna de investimento vinda do Meta.
- **Satisfação do cliente.** Existe `RatingTargetType` no schema, mas
  avaliação só vira métrica com volume, e com 10 viagens na história
  qualquer média seria ruído.
