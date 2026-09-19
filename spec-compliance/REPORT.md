# Conformidade especificação × código — Autenticação e Rotas/GPS

**Escopo:** 20 requisitos — 12 de Autenticação (`docs/15`) e 8 de Rotas/GPS (`docs/18`).
**Commit auditado:** `121790b` (18/09/2026 20:48 UTC)
**Código lido:** `apps/api/src`, `apps/mobile/src`, `apps/web/src`, `packages/`
**Nenhuma linha de código foi alterada.** Este diretório contém apenas documentação.

## Nota sobre o pedido original

O pedido veio com comandos do **Codex** (`codex plugin add spec-to-code-compliance@trailofbits`).
Três coisas impediram a execução literal, verificadas antes de tentar:

| Verificação        | Resultado                                                |
| ------------------ | -------------------------------------------------------- |
| `command -v codex` | não instalado (este ambiente é Claude Code)              |
| `SPEC.md` na raiz  | não existe                                               |
| `./src` na raiz    | não existe — é monorepo (`apps/*/src`, `packages/*/src`) |

O plugin também não está no catálogo da conta. A auditoria foi feita manualmente
contra a especificação que **existe** no repositório: `docs/15` e `docs/18`.

## Placar

> **Atualizado em 19/09/2026.** O placar original desta auditoria (18/09) era
> 13 conformes, 4 parciais e 3 ausentes. Os consertos foram feitos e estão no
> ar; o registro do estado original ficou preservado em cada Lacuna abaixo,
> porque um relatório que apaga o que encontrou não serve para nada.

| Veredito    | Qtd | Requisitos                                                                                                 |
| ----------- | --: | ---------------------------------------------------------------------------------------------------------- |
| ✅ Conforme |  19 | AUTH-01 a AUTH-07, RN-AUTH-02, RN-AUTH-03, RN-AUTH-04, RN-AUTH-05, ROT-05, ROT-07, GPS-01 a GPS-06, EMB-01 |
| ❌ Ausente  |   1 | RN-AUTH-01                                                                                                 |

Conformidade plena em **19 de 20** (95%). A única pendência é RN-AUTH-01
(dispositivo novo sempre exige verificação completa), deixada de fora
deliberadamente: exige um cadastro de dispositivos confiáveis que não existe em
lugar nenhum do produto, e é a menos urgente das sete — nenhuma criança fica
sem rastreamento por causa dela.

### O que mudou desde a auditoria

| ID              | Conserto                                                                                 | Commit                 |
| --------------- | ---------------------------------------------------------------------------------------- | ---------------------- |
| GPS-06          | Coerência decidida no SERVIDOR (`gps-coerencia.util.ts`), não mais perguntada ao cliente | `fix(api)` 18/09       |
| RN-AUTH-02      | Bloqueio progressivo de verdade (`lockout.util.ts`, 15 min dobrando até 24 h)            | `fix(api)` 18/09       |
| GPS-04 / GPS-05 | Fila offline em JSONL no app + lote idempotente no servidor                              | `feat(mobile)` 19/09   |
| RN-AUTH-05      | Sair com viagem em andamento pergunta antes                                              | `feat(mobile)` 19/09   |
| EMB-01          | Encerrar avisa quem ficou sem desembarque registrado, pelo nome                          | `feat(mobile)` 19/09   |
| ROT-07          | Regra de ordem/direção das paradas unificada em `@rotta/api-client` (eram três cópias)   | `refactor(repo)` 19/09 |

---

## Matriz de alinhamento

### Autenticação — `docs/15-especificacao-funcional-autenticacao.md`

| ID         | Requisito                                          | Veredito   | Evidência                                                                                                                                                                        |
| ---------- | -------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-01    | Cadastro self-service                              | ✅         | `auth.controller.ts:65,72,80` (`register/empresa`, `register/pessoal`, `register/autonomo`); `auth.service.ts:192,269`                                                           |
| AUTH-02    | Login                                              | ✅         | `auth.controller.ts:87`; `auth.service.ts:360`                                                                                                                                   |
| AUTH-03    | Recuperação de senha                               | ✅         | `auth.controller.ts:173`; `password-reset-notifier.service.ts`                                                                                                                   |
| AUTH-04    | Primeiro acesso (resgate de convite)               | ✅         | `invites.controller.ts:89` (`redeemInvite`); `invites.service.ts:41`                                                                                                             |
| AUTH-05    | Logout                                             | ✅         | `auth.controller.ts:159,161`; `auth.service.ts:779`                                                                                                                              |
| AUTH-06    | Sessões / dispositivos conectados                  | ✅         | `auth.service.ts:789` (`listSessions`), `:802` (`revokeSession`); `session-response.dto.ts:6`, `login.dto.ts:35` (`deviceName`)                                                  |
| AUTH-07    | Troca de senha autenticado                         | ✅         | `auth.service.ts:819`; `auth.controller.ts:206`                                                                                                                                  |
| RN-AUTH-01 | Dispositivo novo sempre exige verificação completa | ❌         | **Nenhuma ocorrência.** Ver Lacuna 1                                                                                                                                             |
| RN-AUTH-02 | 5 tentativas em 15 min → bloqueio progressivo      | ✅ (18/09) | `users/lockout.util.ts` — 15 min dobrando até o teto de 24 h. Ver Lacuna 4                                                                                                       |
| RN-AUTH-03 | Resposta genérica, nunca enumera contas            | ✅         | `auth.controller.ts:173`: "Se este e-mail existir em nossa base…"; `auth.service.ts:375` usa `GENERIC_LOGIN_ERROR` tanto para identificador inexistente quanto para senha errada |
| RN-AUTH-04 | Redefinir senha revoga **todas** as sessões        | ✅         | `auth.service.ts:855` (`resetPassword`) → `:867` `revokeAllForUser(resetToken.userId)`, sem `exceptId`                                                                           |
| RN-AUTH-05 | Logout com viagem em andamento exige confirmação   | ✅ (19/09) | `use-sair-com-viagem.ts`. Estado no dia da auditoria: nenhuma ocorrência. Ver Lacuna 2                                                                                           |

### Rotas / GPS — `docs/18-especificacao-funcional-rotas-gps-embarque-desembarque.md`

| ID     | Requisito                     | Veredito   | Evidência                                                                                                                                   |
| ------ | ----------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| ROT-05 | Substituição de motorista     | ✅         | `trips.service.ts:658` (`substituirMotorista`); `trips.controller.ts:149`. Irmãos existem: `substituirVeiculo:715`, `substituirMonitor:762` |
| ROT-07 | Sequência de paradas e alunos | ✅ (19/09) | `@rotta/api-client` → `src/rules/paradas.ts`. Estado no dia da auditoria: três cópias da mesma regra. Ver Lacuna 5                          |
| GPS-01 | Início da viagem              | ✅         | `trips.service.ts:358` (`start`); `trips.controller.ts:48` (`@Post()`). Status `EM_ANDAMENTO` em `prisma-trip.repository.ts:39,59,81`       |
| GPS-02 | Fim da viagem                 | ✅         | `trips.service.ts:502` (`finish`); `trips.controller.ts:106`. Também `pause:542`, `resume:566`, `cancel:607`                                |
| GPS-03 | Atualização em tempo real     | ✅         | `use-gps.ts:16` (`GPS_LIVE_POLL_INTERVAL_MS = 3_000`), aplicado em `:31,:47`; ingestão em `trips.service.ts:836`; mapa da frota em `:1714`  |
| GPS-04 | Modo offline                  | ✅ (19/09) | `features/driver/fila-gps/`. Estado no dia da auditoria: não implementado. Ver Lacuna 3                                                     |
| GPS-05 | Reconexão (envio do buffer)   | ✅ (19/09) | `fila-gps.ts#drenar` + `ingestPositionsBatch` idempotente. Estado no dia da auditoria: não implementado. Ver Lacuna 3                       |
| GPS-06 | Precisão do GPS               | ✅ (18/09) | `trips/gps-coerencia.util.ts` — decisão no servidor, aplicada em `ingestPosition` e no lote. Ver Lacuna 6                                   |
| EMB-01 | Checklist de embarque         | ✅ (19/09) | `features/driver/encerramento/` — aviso nominal ao encerrar; registro por aluno em `use-driver-trip.ts:145`. Ver Lacuna 7                   |

---

## Lacunas

### Lacuna 1 — RN-AUTH-01: dispositivo confiável não existe ❌

A regra exige que um dispositivo novo sempre passe por verificação completa,
independentemente de configuração de "dispositivo confiável" de outro aparelho.

Buscas feitas, todas sem resultado em `apps/api/src`, `apps/mobile/src`, `apps/web/src`:

```
dispositivo confiavel | dispositivoConfiavel | trustedDevice | knownDevice
```

Existe MFA (`mfa.service.ts`, rotas `mfa/setup` e `mfa/enable`) e existe registro de
sessão por dispositivo (`deviceName`), mas **nada correlaciona um dispositivo a uma
decisão de exigir ou dispensar verificação**. Na prática a regra não tem efeito: não há
o conceito de "dispositivo confiável" para contrastar com "dispositivo novo".

**Risco:** baixo hoje — como nada é dispensado, ninguém entra com menos verificação do
que deveria. A regra está ausente, não violada de forma perigosa.

### Lacuna 2 — RN-AUTH-05: logout durante viagem não pede confirmação ❌ → ✅ RESOLVIDA (19/09/2026)

A regra pede confirmação explícita ("Você tem uma viagem em andamento. Deseja mesmo
sair?") porque encerrar a sessão nesse contexto interrompe o rastreamento.

Busca feita em `apps/mobile/src` e `apps/web/src`:

```
viagem em andamento.*sair | deseja mesmo sair | sair com viagem
```

Nenhuma ocorrência. O logout é direto nos dois clientes.

**Risco:** operacional real. Um motorista que sai da conta no meio da rota interrompe o
GPS sem nenhum aviso, e os responsáveis param de ver o veículo sem explicação.

**Conserto (19/09/2026):** `apps/mobile/src/features/driver/hooks/use-sair-com-viagem.ts`.
Pergunta quando há viagem, consultando duas fontes — o rastreamento realmente ligado
(`getActiveTripId`) e a viagem de hoje no cache do React Query. Nenhuma das duas cobre
tudo sozinha: a primeira fica vazia para quem negou a permissão de localização, e a
segunda só existe se a tela da rota chegou a ser aberta na sessão. Avisa e confirma,
nunca bloqueia — trocar de conta no meio do dia (aparelho emprestado, escala trocada na
hora) é um uso legítimo. 7 testes.

### Lacuna 3 — GPS-04 e GPS-05: não existe fila offline ❌ → ✅ RESOLVIDA (19/09/2026)

Esta é a lacuna mais séria do escopo auditado.

A especificação (e o Dossiê 14 §1.7, citado no próprio código) descreve uma fila local que
garante que "nenhuma ação de campo dependa de conectividade". Três evidências mostram que
ela nunca foi construída:

1. **O pacote que deveria abrigá-la está vazio.** `packages/storage/src/index.ts` tem
   16 linhas, exporta `export {}` e diz textualmente:
   _"Uso previsto mais crítico (Dossiê 14, Seção 1.7): a fila local de eventos de
   GPS/checklist do app do motorista… Nenhuma lógica implementada ainda (fase de fundação)."_

2. **O endpoint de lote existe, mas ninguém o chama.** `ingestPositionsBatch` está em
   `packages/api-client/src/endpoints/trips.ts:247` e em `trips.service.ts:878` /
   `trips.controller.ts:194`. Busca por chamadas em `apps/mobile/src` e `apps/web/src`:
   nenhuma. O caminho de reenvio em lote foi construído no servidor e nunca ligado no app.

3. **Posição perdida é perdida para sempre.** Em
   `background-trip-location-task.ts:63-77`, o envio usa `Promise.allSettled` e o
   comentário assume que "o próximo lote tenta de novo naturalmente" — mas não há lote
   nenhum: cada posição é enviada uma vez, e a falha é descartada silenciosamente.

**Risco:** alto e cotidiano. Transporte escolar passa por túnel, viaduto e zona rural sem
sinal. Hoje, todo o trajeto sem cobertura desaparece do histórico — e o histórico é o que
prova para a família onde o veículo esteve.

**Conserto (19/09/2026):** `apps/mobile/src/features/driver/fila-gps/`. Arquivo
append-only em JSONL (`expo-file-system`, que o app já tinha — `expo-sqlite` seria mais
elegante, mas é módulo nativo novo, e trocar risco de build por elegância num app que
acabou de sair de uma indisponibilidade seria mau negócio). A inversão cabe numa linha:
antes era "envia, e se falhar perdeu"; agora é "enfileira sempre, e um drenador esvazia".
Só apaga o que o servidor confirmou. Vale para os DOIS caminhos de rastreamento — a task
de segundo plano e o fallback de primeiro plano, este último o de quem negou a permissão
"sempre".

Do lado do servidor, `ingestPositionsBatch` virou idempotente por `capturadaEm`: a fila só
apaga o que foi confirmado, então um lote entregue cuja resposta se perdeu na volta é
reenviado inteiro, e sem isso cada reenvio duplicaria o trajeto. Sem migration de
propósito — `@@unique` exigiria apagar duplicatas na partida do container, recriando o
problema de cold start recém-corrigido. O lote também passa pelo GPS-06 agora: se a
verificação de coerência só existisse no envio ao vivo, bastaria usar este endpoint para
contorná-la. 21 testes no app, 5 no servidor.

### Lacuna 4 — RN-AUTH-02: bloqueio sem janela deslizante e sem progressão ⚠️

O texto pede "5 tentativas **em um intervalo de 15 minutos**" e bloqueio "temporário
**progressivo**". O código (`users.service.ts:38,39,263`) implementa 5 tentativas
**consecutivas** e bloqueio **fixo** de 15 minutos.

A divergência é **deliberada e documentada** no próprio código (`users.service.ts:255-262`):
a janela deslizante exigiria guardar o timestamp de cada tentativa, e o contador é zerado a
cada bloqueio aplicado — "proteção equivalente na prática, sem tabela adicional".

Falta só a **progressão**: o segundo bloqueio dura os mesmos 15 minutos do primeiro.
Divergência real, mas de baixo impacto.

### Lacuna 5 — ROT-07: ordenação de paradas vive no cliente ⚠️ → ✅ RESOLVIDA (19/09/2026)

A inversão da ordem das paradas por sentido (Ida/Volta) está em
`apps/mobile/src/features/routes/stop-direction.ts` e no espelho
`apps/web/src/features/routes/stop-order.ts` — **duas implementações da mesma regra, nos
dois clientes**. O backend ordena em `trips.service.ts` (`listParadasPendentes`).

Não é violação: o comportamento existe e está correto. É risco de divergência — uma regra de
negócio replicada em três lugares tende a sair de sincronia.

**Conserto (19/09/2026):** a regra passou a morar em `@rotta/api-client`
(`src/rules/paradas.ts`), onde `RouteStop`, `RouteStudent` e `TripSentido` já são
definidos e de onde os três aplicativos de interface já dependem. Eram na verdade TRÊS
cópias, não duas (havia uma terceira em
`apps/web/src/app/(dashboard)/rotas/[id]/_components/stop-direction.ts`), e duas delas
eram idênticas caractere por caractere. No mobile sobrou só o que é dele: o tom do selo,
que depende do sistema de componentes de lá. 11 testes.

### Lacuna 6 — GPS-06: precisão é registrada, não aplicada ⚠️

`precisaoMetros` é enviado (`background-trip-location-task.ts:68`) e persistido, mas **não
encontrei nenhum ponto que descarte ou sinalize uma leitura imprecisa**. A especificação
trata precisão como critério de qualidade; o código trata como metadado.

Também vale registrar: `use-my-location.ts:48` usa `Accuracy.Low` com
`timeInterval: 30_000` e `distanceInterval: 50`. É adequado para "onde eu estou" na tela do
motorista, mas seria grosseiro demais para traçar o trajeto — que usa o caminho separado de
background.

### Lacuna 7 — EMB-01: checklist existe como evento, não como checklist ⚠️ → ✅ RESOLVIDA (19/09/2026)

Embarque e desembarque são registrados por aluno (`useAddStudentEvent`,
`inicio-screen.tsx:2036,2055`, backend em `trips.service.ts:933`) e há controle de pendentes
(`listStudentPendingLocations:1096`). O fluxo funciona.

O que não achei foi o **fechamento** do checklist: um passo que obrigue o motorista a
resolver todos os alunos pendentes antes de encerrar a viagem. `finish` (`trips.service.ts:502`)
não consulta pendências. Um aluno pode ficar sem registro de desembarque e a viagem encerra
assim mesmo.

**Conserto (19/09/2026):** `apps/mobile/src/features/driver/encerramento/`. Encerrar passa
pela conferência do checklist e lista quem ficou em aberto **pelo nome** — "2 alunos
pendentes" obrigaria o motorista a fechar o aviso e ir procurar quem são, e ele está
dirigindo. Separa "ainda a bordo" (embarcou, nunca desembarcou) de "sem registro nenhum".
`AUSENTE` encerra o assunto do aluno: cobrar desembarque de quem não veio seria alarme
falso, o tipo de aviso que ensina a pessoa a ignorar avisos.

Avisa, **não bloqueia** — e isso foi decisão, não omissão. Travar o encerramento obrigaria
o motorista a inventar um desembarque para poder terminar o dia: trocaria um dado faltando
por um dado FALSO, que é pior, porque um dado falso parece verdade. 13 testes.

---

## Buscas realizadas

Todas com `grep -rn` sobre `apps/api/src`, `apps/mobile/src`, `apps/web/src` e `packages/`,
excluindo `node_modules`, `__tests__` e `*.spec.*` salvo onde indicado.

| Requisito  | Padrão buscado                                                                           | Resultado                                |
| ---------- | ---------------------------------------------------------------------------------------- | ---------------------------------------- |
| AUTH-01    | `async register(Empresa\|Pessoal\|Autonomo)`, `@Post\("register`                         | 5 ocorrências                            |
| AUTH-02    | `async login\(`, `@Post\("login"\)`                                                      | 2 ocorrências                            |
| AUTH-03    | `forgot\|requestPasswordReset`, `Se este e-mail existir`                                 | 4 ocorrências                            |
| AUTH-04    | `primeiroAcesso\|firstAccess\|redeemInvite\|resgatar`                                    | 3 ocorrências                            |
| AUTH-05    | `async logout\(`, `@Post\("logout"\)`                                                    | 3 ocorrências                            |
| AUTH-06    | `listSessions\|revokeSession`, `deviceName`                                              | 6 ocorrências                            |
| AUTH-07    | `changePassword\|alterar-senha\|trocar-senha`                                            | 3 ocorrências                            |
| RN-AUTH-01 | `dispositivo confiavel\|dispositivoConfiavel\|trustedDevice\|knownDevice`                | **0**                                    |
| RN-AUTH-02 | `MAX_FAILED_LOGIN_ATTEMPTS\|LOCKOUT_DURATION_MS`                                         | 3 ocorrências                            |
| RN-AUTH-04 | `revokeAll\|revogar todas\|deleteManyByUser` + leitura de `resetPassword`                | 3 ocorrências                            |
| RN-AUTH-05 | `viagem em andamento.*sair\|deseja mesmo sair\|sair com viagem`                          | **0**                                    |
| ROT-05     | `substitui\|trocarMotorista\|reassign` + enumeração de `TripsService`                    | 3 métodos                                |
| ROT-07     | `ordem.*parada\|RouteStop\|reordenar\|paradaEmbarqueId`                                  | 3 ocorrências                            |
| GPS-01/02  | enumeração de `^  async \w+\(` em `trips.service.ts` e de rotas em `trips.controller.ts` | 23 métodos, 19 rotas                     |
| GPS-03     | `GPS_LIVE_POLL_INTERVAL_MS`                                                              | 3 ocorrências                            |
| GPS-04     | `offline\|fila\|queue.*position\|pendingPositions`                                       | só comentários; `packages/storage` vazio |
| GPS-05     | `positionsBatch\|ingestPositionsBatch\|flush`                                            | 1 no api-client, **0 chamadas nos apps** |
| GPS-06     | `accuracy\|precisao\|coords\.accuracy`                                                   | 3 ocorrências                            |
| EMB-01     | `checklist\|student-events\|addStudentEvent\|EMBARCOU`                                   | 4 ocorrências                            |

## Limites desta auditoria

Coisas que **não** foram feitas, para o relatório não parecer mais forte do que é:

- **Não houve execução.** Os vereditos vêm de leitura de código, não de testes de
  comportamento. "Existe o método" não é a mesma coisa que "a regra vale em produção".
- **Ausência de evidência não é prova de ausência.** Os vereditos ❌ dizem que os padrões
  buscados não aparecem. Uma implementação com nomes muito diferentes dos que busquei
  poderia ter escapado — embora nos três casos os indícios adicionais (pacote vazio,
  endpoint sem chamador) reforcem a conclusão.
- **Só 20 dos 135+ IDs.** `docs/16` (48 IDs) e `docs/17` (31 IDs) ficaram fora do escopo
  combinado.
- **Nenhum código foi alterado**, conforme pedido.
