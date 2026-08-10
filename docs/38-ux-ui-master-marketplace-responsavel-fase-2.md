# Dossiê 38 — UX/UI Master do Marketplace da Rotta (Responsável) — Fase 2

> Continuação direta do Dossiê 37: fecha os gaps registrados em seu §4
> que eram genuinamente construíveis com o schema existente — perfil
> institucional mais completo (equipe, escolas atendidas, tempo de
> atuação, tempo médio de resposta) e a Home Estado 2 (painel
> operacional) — sem substituir nenhuma funcionalidade existente.

## 1. Método

Mesma disciplina da Fase 1: auditoria antes de implementar. Do §4 do
Dossiê 37, dividido em dois grupos:

- **Genuinamente construível agora**, com relações que já existem no
  `schema.prisma` (`SchoolCompanyLink`, `Membership`+`User`,
  `TransportRequest.createdAt/updatedAt`, `Company.createdAt`) — é o
  que esta Fase 2 entrega.
- **Fora de escopo por decisão deliberada** (não por falta de tempo) —
  reafirmado no §4 abaixo, com o motivo concreto de cada item.

## 2. Backend — três consultas novas, todas restritas ao dado público

`TransporterRepository` (`apps/api/src/modules/marketplace/repositories`)
ganhou três métodos, implementados com o mesmo padrão de bypass já
documentado na interface (leitura pública, sem tenant):

- `listActiveSchoolsForCompany(companyId, limit)` — `SchoolCompanyLink`
  com `desvinculadoEm: null` (vínculo ativo), devolvendo só `id`/
  `nomeOficial` da escola.
- `listPublicTeamForCompany(companyId)` — `Membership` com
  `role in [motorista, monitor]` e `status: ATIVO`, devolvendo só
  `nome` (de `User`) e `papel` (o próprio `role`). **Nunca** CPF,
  telefone, e-mail ou qualquer outro campo de `User`/`Membership` —
  mesmo princípio já documentado na interface do repositório ("nunca
  expõe nada além do que o cartão/detalhe público precisa").
- `computeAverageResponseHours(companyId)` — média de
  `updatedAt - createdAt` (em horas) de todas as `TransportRequest`
  com status `APROVADA`/`RECUSADA` (as únicas que representam uma
  decisão tomada). `null` quando a empresa ainda não decidiu nenhuma
  solicitação — nunca um "0" ou um número inventado.

`atuandoDesde` não precisou de método novo — é `Company.createdAt`
(já carregado pelo `candidateInclude` existente), exposto pela
primeira vez.

`MarketplaceService.findByIdOrThrow` passou a buscar as três consultas
em paralelo (`Promise.all`, ao lado da já existente
`listRecentRatingsForCompany`) e repassar os resultados para
`toTransporterDetailResponseDto`. `TransporterDetailResponseDto` e
`TransporterDetail` (api-client) ganharam os quatro campos:
`atuandoDesde`, `escolasAtendidas`, `equipe`,
`tempoMedioRespostaHoras`.

## 3. Frontend — perfil institucional e Home Estado 2

### 3.1 Perfil do transportador — "Equipe" e "Escolas atendidas"

Dois novos blocos em `transportador-detalhes-screen.tsx`, cada um só
aparece quando há dado (nunca um bloco vazio "Nenhum(a)..."):
`equipe.map` mostra "Nome — Motorista/Monitor(a)";
`escolasAtendidas.map` mostra o nome oficial de cada escola. Bloco
"Quem somos" ganhou duas linhas novas: "Na Rotta há X anos/meses"
(a partir de `atuandoDesde`) e, quando não é `null`, "Responde
solicitações em média em X horas/dias".

**Decisão de honestidade de dado**: o texto é "**Na Rotta** há X
anos", nunca "**atuando** há X anos" — `Company.createdAt` é a data de
cadastro na plataforma, não o tempo real de operação da transportadora
antes de existir na Rotta (que a Rotta não tem como saber). Afirmar
"atuando há X anos" seria uma alegação falsa que a Rotta não pode
verificar.

**Decisão de segurança, não de escopo**: documentação pública
(documentos de motorista/veículo) continua fora, mesmo agora que
"Equipe" já existe — documento de motorista é dado sensível, nunca
exposto publicamente, independente do esforço de implementação.

### 3.2 DRY: `timeline-steps.ts` compartilhado

`buildSolicitacaoSteps`/`buildContratoSteps` (que calculam as etapas
reais da `Timeline` a partir de `TransportRequestStatus`/`Contract`)
foram extraídas de `transporte-inicio-screen.tsx` para
`apps/mobile/src/features/marketplace/timeline-steps.ts` — necessário
porque a Home Estado 2 (§3.3) passou a precisar exatamente da mesma
lógica; extrair evita duas cópias divergentes da mesma regra de
negócio. `AcompanhamentoSection` (card de acompanhamento GPS ao vivo)
passou de função privada a `export function` pelo mesmo motivo — é
reaproveitada, não duplicada.

### 3.3 Home Estado 2 — painel operacional na própria aba "Mapa"

O Dossiê 37 §4 registrou como fora de escopo "fundir as abas 'Mapa' e
'Transporte' numa única Home adaptativa", por ser uma mudança de
arquitetura de navegação genuína (deep-links, badge, histórico). Esta
Fase 2 entrega o mesmo resultado percebido pelo pilar 1 do Prompt ("o
mapa sempre será o protagonista, mesmo com transporte contratado") sem
essa mudança de navegação: o **conteúdo** da aba "Mapa" passou a se
adaptar ao estado real do Responsável
(`useResponsavelTransportState`, já existente e usado pelo rótulo
dinâmico da aba "Transporte"):

- `SEM_TRANSPORTE`/`CONTRATO_ENCERRADO` → comportamento da Fase 1
  intocado (busca-primeiro-pela-escola).
- `SOLICITACAO_PENDENTE`/`AGUARDANDO_CONTRATO`/`TRANSPORTE_ATIVO` → a
  aba "Mapa" mostra um resumo operacional (`MapaEstadoOperacional`,
  novo componente em `mapa-screen.tsx`): `Timeline` da solicitação ou
  do contrato (mesmas funções de `timeline-steps.ts` usadas pela aba
  "Transporte"), ou `AcompanhamentoSection` (mapa + GPS ao vivo) quando
  o transporte já está ativo — a mesma seção, não uma cópia. Um botão
  "Ver detalhes completos" navega para a aba "Transporte"
  (`navigation.getParent<BottomTabNavigationProp<ParentTabParamList>>()
?.navigate("Transporte")`, mesmo padrão de navegação cross-tab já
  usado por `solicitar-transporte-screen.tsx`).
- A checagem de estado roda **antes** do gate de localização (que só
  faz sentido para o fluxo de busca) — acompanhar um transporte já
  contratado não deveria ficar bloqueado atrás de uma permissão de
  localização que esse fluxo nem usa.

A aba "Transporte" continua exatamente como estava (nenhuma
funcionalidade removida ou duplicada) — ela é o destino de "detalhes
completos", a aba "Mapa" é o resumo que aparece primeiro.

## 4. Fora desta Fase 2 (reafirmado, não escondido)

Itens do Dossiê 37 §4 que continuam de fora, e por quê:

- **Galeria de fotos, FAQ** — nenhum modelo de dado existe hoje para
  nenhum dos dois; exigiriam schema novo (upload de mídia, conteúdo
  editorial), fora do escopo desta evolução de UX/UI.
- **Documentação pública** — decisão de segurança (ver §3.1), não
  muda com mais tempo disponível.
- **Fusão literal das abas "Mapa"/"Transporte" numa única rota** — a
  Home Estado 2 (§3.3) entrega o resultado percebido sem essa mudança
  de navegação; uma fusão literal continua sendo uma decisão de
  produto explícita, não assumida de lado aqui.
- **Câmera acompanhando o veículo, transições com continuidade visual
  (shared element), múltiplos snap-points do `BottomSheet`** —
  continuam exigindo `react-native-reanimated`/
  `react-native-gesture-handler` (Dossiê 37 §3.1); nenhuma mudança de
  decisão nesta Fase 2.
- **Responsividade tablet/desktop e auditoria de copy "cara de IA"
  pelo app inteiro** — não realizadas nesta entrega; sem simulador/
  dispositivo neste ambiente para verificação visual, e a auditoria de
  copy sistemática do app mobile continua pendente como item à parte
  (não é um problema introduzido por esta Fase 2 — os textos novos
  foram escritos com o mesmo cuidado das entregas anteriores).

## 5. Verificação

- `pnpm --filter @rotta/mobile run typecheck` — **passou** (0 erros).
- `apps/api`: `npx jest src/modules/marketplace --silent` — **58/58
  testes passando** (2 casos novos cobrindo `escolasAtendidas`/
  `equipe`/`tempoMedioRespostaHoras`, incluindo o caso `null` quando a
  empresa nunca decidiu nenhuma solicitação).
- `pnpm --filter @rotta/api-client run typecheck` — **passou** (0
  erros).
- `eslint --fix` escopado aos arquivos novos/editados — 0 erros; os
  2 mesmos avisos pré-existentes de estilo já registrados no Dossiê 37
  (`no-inline-styles`/`no-color-literals`), não introduzidos por esta
  entrega.
- `git status --short` conferido — só os arquivos desta entrega
  (backend do Marketplace, `packages/api-client`, três telas de
  `apps/mobile/src/features/marketplace`, `timeline-steps.ts` novo).
- Erros de TypeScript pré-existentes e não relacionados encontrados
  durante o `tsc --noEmit` completo (`auth.service.spec.ts`,
  `invites.service.spec.ts`, `companies.service.spec.ts`,
  `vehicles.service.spec.ts`, `tenant-isolation.e2e-spec.ts`) —
  confirmados via `git diff`/`git status` como não tocados por esta
  entrega, deixados de fora deliberadamente.
- Sem simulador/dispositivo neste ambiente — verificação visual real
  da Home Estado 2 (resumo operacional na aba "Mapa", transição entre
  estados) fica pendente de teste manual num build de desenvolvimento,
  mesma ressalva já registrada no Dossiê 37 §5.
