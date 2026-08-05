# Dossiê 27 — Rotta Agenda (Calendário)

> Tarefa #101 do backlog. Especificação funcional em `docs/20-especificacao-funcional-documentos-agenda-suporte-admin-configuracoes.md` (`AGE-01` a `AGE-05`). Modelagem de dados em `docs/08-modelagem-de-dados-detalhada.md`, Seção 14.

## 1. O que existe nesta entrega

Uma entidade única, `EventoAgenda`, com um discriminador `tipo` (mesmo princípio de `Evento` no módulo Communication) — não uma tabela por tipo de evento. `AgendaModule` expõe CRUD completo para os tipos criados manualmente:

- `FERIADO` (`AGE-01`) — suprime a expectativa de rota naquele dia, sem desativar a rota estruturalmente.
- `RECESSO` — mesmo princípio de `FERIADO`, mas como período (`data` até `dataFim`).
- `EVENTO_ESCOLAR` (`AGE-02`) — ajusta a expectativa (ex. horário) de um dia específico, sem alterar a configuração permanente da rota.
- `AUSENCIA_PLANEJADA` (`AGE-03`) — férias/licença de motorista ou monitor. Motorista/Monitor só podem criar a **própria** ausência (`entidadeId` é sempre forçado para `actor.sub`, nunca aceito do cliente); Empresa/Gestor podem criar para qualquer um.
- `MANUTENCAO_VEICULO` — janela de manutenção programada de um veículo.

Regras de validação aplicadas em `AgendaService`:

- Um evento com `geradoAutomaticamente = true` nunca pode ser editado/removido manualmente (`BadRequestException` explícita) — essa flag é reservada para os tipos automáticos descritos abaixo, que ainda não são gerados por nenhum processo real (ver Seção 2).
- `AUSENCIA_PLANEJADA` não pode ter `data` retroativa.
- `FERIADO`/`RECESSO`/`EVENTO_ESCOLAR`/`MANUTENCAO_VEICULO` não podem ser cadastrados com `data` mais de 7 dias no passado — evita mascarar uma ausência de operação real não reportada (critério explícito de `AGE-01`).
- `dataFim`, quando informado, nunca pode ser anterior a `data`.

## 2. O que NÃO existe nesta entrega (honesto, não omitido)

Dois tipos de evento existem no enum `EventoAgendaTipo` e são **rejeitados explicitamente** por `AgendaService.create` (nunca fabricados como se já funcionassem):

- **`VENCIMENTO_CNH` / `VENCIMENTO_SEGURO` / `VENCIMENTO_DOCUMENTO_GENERICO`** (Dossiê 8 §14.2) — a especificação pede que esses vencimentos, cuja fonte de verdade é `data_validade` em `Motorista`/`Veiculo`/`Documento`, apareçam também como entradas de calendário. Isso exigiria um job assíncrono (ou uma leitura sob demanda, calculada, sem persistir) varrendo essas validades — nenhum dos dois existe ainda. Implementar isso é o próximo passo natural deste módulo.
- **`TROCA_DE_ROTA_PONTUAL`** (`AGE-04`/`AGE-05`) — a especificação pede que toda substituição de motorista/veículo (`RoutesService.update`, substituição permanente; `TripsService.substituirMotorista`/`substituirVeiculo`, substituição pontual — tarefa #102, já implementada) apareça projetada na Agenda. A lógica de substituição em si já existe e funciona; falta só a integração cross-módulo que cria o `EventoAgenda` correspondente quando ela acontece. Não implementado aqui para não expandir o escopo desta tarefa para dentro do módulo Trips/Routes outra vez.

Quando qualquer um desses dois itens for implementado, a única mudança necessária em `AgendaService` é permitir que o módulo de origem (Documents/Vehicles para vencimentos, Routes/Trips para trocas) crie o evento internamente com `geradoAutomaticamente: true` — a validação de "nunca editável manualmente" já está pronta para esse caso.

## 3. RBAC

| Ação                                 | Papéis                                                     |
| ------------------------------------ | ---------------------------------------------------------- |
| Criar (qualquer tipo permitido)      | `ADMIN_ROTTA`, `EMPRESA`, `GESTOR`                         |
| Criar a própria `AUSENCIA_PLANEJADA` | + `MOTORISTA`, `MONITOR`                                   |
| Listar / ver detalhe                 | `ADMIN_ROTTA`, `EMPRESA`, `GESTOR`, `MOTORISTA`, `MONITOR` |
| Editar / remover                     | `ADMIN_ROTTA`, `EMPRESA`, `GESTOR`                         |

## 4. Auditoria

`AgendaService` registra `CREATED`/`UPDATED`/`DELETED` via `AuditLogService.record`, best-effort (nunca bloqueia a ação principal se a auditoria falhar) — mesmo padrão de `RoutesService`/`TripsService`.
