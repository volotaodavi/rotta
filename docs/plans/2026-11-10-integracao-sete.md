# Plano — Integração Rotta × SETE (FNDE)

Especificação: [`docs/52-integracao-sete.md`](../52-integracao-sete.md).
Branch: `feat/integracao-sete`.

## A ordem, e por que ela

A migração vem primeiro porque os conversores leem campos que ainda não
existem (`Route.acesso*`, `Vehicle.origemFrota`). Escrever o conversor antes
obrigaria a escrevê-lo duas vezes.

Os conversores vêm antes do endpoint porque são lógica pura: entram objetos,
saem objetos, sem banco e sem rede. É onde mora toda a regra difícil (turno,
mediana, projeção, simplificação) e é o único lugar onde um teste roda em
milissegundos. O endpoint é casca.

A tela vem por último porque ela só mostra o que a API devolve.

## 1. Migração Prisma

- `Route`: `acessoPorteira`, `acessoMataBurro`, `acessoColchete`,
  `acessoAtoleiro`, `acessoPonteRustica` — `Boolean @default(false)`.
- `Vehicle`: `origemFrota VehicleOwnership?` com
  `enum VehicleOwnership { PROPRIO_MUNICIPIO, TERCEIRIZADO }`.
- `User`: **nada**. Decisão de 10/11/2026 (`RN-SETE-13`).
- Nome da migração em português, no padrão do repositório.

Revisão de banco (à mão, já que a skill `ecc:database-reviewer` não existe
nesta sessão): conferir que todo campo novo é opcional ou tem default, que
nenhum índice novo é necessário (nenhum dos campos é filtro de consulta) e que
a migração roda num banco vazio.

## 2. Contratos compartilhados

`shared/contracts/sete.ts`: os tipos de saída (`SeteRota`, `SeteVeiculo`,
`SeteMotorista`, `SeteMonitor`, `SeteAluno`, as ligações, `SetePacote`,
`SetePendencia`), para a API e o web usarem os mesmos.

Os enums do SETE entram como constantes nomeadas, nunca números soltos no meio
do código: `SETE_TURNO.MATUTINO = 1` é legível, `1` não é.

## 3. Conversores (TDD)

`apps/api/src/modules/sete/mappers/` e `.../geo/`.

Escrever o teste primeiro, em cada caso:

| Caso                                                  | Por que é o caso que importa                   |
| ----------------------------------------------------- | ---------------------------------------------- |
| `INTEGRAL` vira matutino **e** vespertino             | é o único turno que liga dois campos           |
| `PERSONALIZADO` deriva dos horários das paradas       | não existe no SETE; tem de virar alguma coisa  |
| mediana de horários com número par de viagens         | mediana de par é a média dos dois do meio      |
| sem viagem finalizada, cai para `horarioPrevisto`     | `RN-SETE-07`                                   |
| `shape` descarta `simuladoSuspeito` e precisão > 100m | `RN-SETE-08`                                   |
| projeção WGS84 → EPSG:3857                            | `RN-SETE-05`; errado, põe a rota no oceano     |
| Douglas-Peucker com tolerância de ~15 m               | shape de 2.000 pontos não entra num campo JSON |
| motorista com CNH vencida                             | vira pendência, não some do pacote             |
| aluno sem coordenada                                  | exporta sem a coordenada, não quebra           |
| **nenhum campo sensível na saída**                    | `RN-SETE-04`; o teste varre o pacote inteiro   |

## 4. Exportação

`GET /sete/exportacao?formato=json|csv&codigoIbge=` e `GET /sete/pendencias`,
com `@Roles(Role.EMPRESA, Role.GESTOR, Role.ADMIN_ROTTA)` e guarda de tag
`LICITADA`.

Repositório próprio (`SeteRepository`), sempre `withTenant`. O módulo reaproveita
os repositórios que já existem em vez de reimplementar consulta.

E2E: isolamento entre empresas, `403` sem a tag, e o conteúdo do zip.

## 5. Cliente da API (desligado)

`SeteApiClient`, `SETE_SYNC_ENABLED=false` por padrão. Só teste com mock.

## 6. Tela

Cartão "SETE / FNDE" no painel da empresa; os cinco campos de acesso na edição
de rota; "Origem da frota" na edição de veículo. Componentes de `@rotta/ui`.

## Revisões, feitas à mão

As skills `ecc:security-reviewer`, `pr-review-toolkit:review-pr` e
`superpowers:verification-before-completion` não existem nesta sessão. O
trabalho delas é feito explicitamente:

- **Segurança/LGPD**: varredura de campo sensível na saída (teste), conferência
  de `companyId` em toda consulta do módulo, e revisão do que entra no
  `AuditLog`.
- **Verificação antes de concluir**: `lint`, `typecheck`, `test` e `test:e2e`
  rodados e colados no PR, com o que falhou dito por extenso.
