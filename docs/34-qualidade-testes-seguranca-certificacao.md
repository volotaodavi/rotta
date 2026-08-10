# Dossiê 34 — Qualidade, Testes, Segurança e Certificação (Prompt 24)

> Origem: sexto "Prompt" da sequência — auditoria de prontidão para
> produção (banco/backend/frontend/APIs/dashboard/landing/mobile/OSM/
> IA/INEP/AbacatePay/FCM/Authentique/login/GPS/push), suíte de testes
> completa (unit/integração/E2E/regressão/smoke/snapshot), teste de
> carga até 1M usuários, matriz de teste mobile, casos-limite de GPS,
> teste de IA, fluxos por persona, acessibilidade WCAG 2.2 AA,
> Lighthouse ≥95, teste de segurança (SQLi/XSS/CSRF/força bruta/rate-
> limit/headers/JWT/sessões/uploads/permissões), verificação LGPD e um
> relatório final go/no-go — **evoluir, nunca reconstruir**.

Este Dossiê tem sobreposição real com os Dossiês 32 (segurança) e 33
(infra) — em vez de repetir o que já foi auditado/corrigido lá, este
documento referencia e completa o que ainda faltava: inventário real de
cobertura de teste, infraestrutura de teste de componente (inexistente
até agora), Lighthouse CI, teste de carga, e o veredito final.

## 1. Inventário real de testes (levantado agora, não suposto)

| Camada                                         | Situação encontrada                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api` — unitário                          | **53 suítes / 497 testes, 100% passando** (Jest) — cobre todo módulo de negócio (30 módulos)                                                                                                                                                                                                                                                |
| `apps/api` — E2E                               | **13 specs** (`auth`, `companies`, `contracts`, `geo`, `marketplace`, `marketplace-pipeline`, `notifications`, `ratings`, `schools`, `students`, `tenant-isolation`, `transport-requests`, `vehicles`) contra Postgres real — cobre os fluxos ponta-a-ponta mais críticos (auth, isolamento multi-tenant, pipeline completo do Marketplace) |
| `apps/api` — módulos **sem** E2E dedicado      | `agenda`, `analytics`, `audit`, `authentique`, `backoffice`, `billing`, `dashboard`, `documents`, `drivers`, `gps`, `logs`, `monitors`, `parents`, `reports`, `routes`, `rotta-ai`, `settings`, `support`, `trips`, `users`, `wallet` — têm cobertura unitária (parte dos 497 testes), mas não um fluxo HTTP ponta-a-ponta próprio          |
| `apps/web`/`apps/admin`/`apps/mobile` — testes | **Zero antes desta entrega** — os três `package.json` tinham `"test": "echo ... nenhum teste ainda"` (já autodocumentado desde o Dossiê 23, Seção 10, como pendência conhecida, não uma surpresa)                                                                                                                                           |
| `packages/validators`                          | 4 arquivos de teste (CPF/CNPJ, placa, senha, telefone) — única cobertura de unidade fora do `apps/api`                                                                                                                                                                                                                                      |

**O achado mais significativo desta auditoria**: os três frontends
(web/admin/mobile) não tinham nenhuma infraestrutura de teste
configurada — nem um runner, nem um teste. O backend está solidamente
coberto; o frontend não tinha rede de segurança nenhuma contra
regressão (apesar de já ter passado repetidamente por `build`/
`typecheck` reais ao longo de toda a sessão — o que valida sintaxe e
tipos, não comportamento).

## 2. O que este Dossiê implementa

### 2.1 Infraestrutura de teste de componente — `apps/web`

Configurado **Vitest + Testing Library** (`apps/web/vitest.config.ts`,
`vitest.setup.ts`) — escolha sobre Jest porque o ambiente já é
Vite-like (Next.js 15) e o retrabalho de configuração é bem menor.
`pnpm --filter=@rotta/web test` agora roda de verdade (antes era só um
`echo`).

**Um teste real, não um placeholder**: `status-checker.spec.tsx` (3
casos) testa o componente `StatusChecker` criado no Dossiê 33 —
Operacional quando a API responde ok, Degradado por serviço específico
quando um item falha, Fora do ar quando o `fetch` rejeita. Prova que a
infraestrutura funciona de ponta a ponta (mock de `fetch`, resolução de
`@/config/env`, `cleanup()` entre testes), não é um teste vazio só para
ter um arquivo `.spec.tsx` no repositório.

**Escopo desta entrega, deliberadamente**: só `apps/web`. `apps/admin`
usa a mesma stack (Next.js 15) — replicar é mecânico (copiar
`vitest.config.ts`/`vitest.setup.ts`, trocar o script `test`,
adicionar as mesmas 5 dependências). `apps/mobile` (Expo/React Native)
precisa do preset `jest-expo` em vez de Vitest (Vitest não roda testes
React Native) — ferramenta diferente, mesmo princípio. Nenhum dos dois
foi replicado agora para não dobrar o escopo desta entrega só para
provar o mesmo padrão duas vezes a mais; ver §5 para o plano.

### 2.2 Lighthouse CI

`apps/web/lighthouserc.js` + novo job `lighthouse` em
`.github/workflows/ci.yml` — builda `apps/web`, sobe com `next start`,
roda Lighthouse contra `/`, `/faq`, `/planos`, `/status`.

**Limiares em modo "warn", não "error", deliberadamente**: nenhum
score real de Lighthouse desta aplicação foi medido em lugar nenhum
até hoje — travar o CI num número (`≥95`, como o Prompt 24 pede) sem
nunca ter confirmado esse número seria inventar um resultado, o oposto
da disciplina seguida em toda a Rotta. O job roda de verdade a cada
push (`continue-on-error: true`, não bloqueia merge) — a primeira
execução real em CI produz a baseline; documentar aqui os valores
medidos e então subir os limiares para "error" é o próximo passo
mecânico, não uma decisão em aberto.

**A11y**: apesar de citada em ambos, esta é uma verificação diferente
do que já existe — `jsx-a11y` (ESLint, `packages/config/eslint/next.js`)
já estava ativo em `apps/web`/`apps/admin` desde antes desta sessão
(comentário no próprio preset: "A11y é requisito de produto, não
apenas boa prática"), pega problema estático (ex. `<a>` sem `href`
válido); Lighthouse mede em cima do DOM renderizado (contraste de cor,
ordem de foco, ARIA computado) — as duas são complementares, nenhuma
substitui a outra.

### 2.3 Teste de carga — `apps/api/test/load/smoke.k6.js`

Script k6 (ferramenta externa, binário separado — mesma categoria de
"não instalável via npm" do EAS CLI) cobrindo os dois endpoints
públicos mais baratos de testar sem criar dado real: `GET /health/ready`
e `POST /auth/login` com credencial inválida (mede o custo real do
Argon2id, deliberadamente caro, sob carga concorrente).

**Nunca executado contra produção — nem vai ser, por padrão**:
`BASE_URL` aponta para `localhost` por padrão; um teste de carga é, do
ponto de vista do servidor, indistinguível de um ataque de negação de
serviço. Rodar isso contra `rotta-vt7i.onrender.com` sem avisar
explicitamente quem opera o serviço seria um uso irresponsável desta
ferramenta — o script tem um aviso em bloco de comentário no topo
exatamente sobre isso.

**Isto não é o teste "1M usuários/50M viagens" do Prompt 24** — esse
exige um ambiente dedicado (nunca produção), dados semeados em escala e
observação ativa durante o teste, nada disso existe hoje. O que existe
agora é a ferramenta pronta para rodar um teste real quando esse
ambiente existir — ver §5.

## 3. O que já estava coberto (referenciado, não repetido)

- **Segurança** (SQLi/XSS/CSRF/força bruta/rate-limit/headers/JWT/
  sessões/uploads/permissões, LGPD): Dossiê 32 (auditoria dedicada) +
  Dossiê 33 §1 (CSRF/XSS/SQLi explicados no contexto de infra). Nenhum
  achado novo nesta entrega — a auditoria de segurança já foi feita a
  fundo antes desta.
- **LGPD**: Dossiê 32 §2.5 (consentimento obrigatório) + Dossiê 33 §2.2
  (exportação de dados autoatendida) + Dossiê 33 §4 (direito ao
  esquecimento, conscientemente não implementado — decisão de
  produto/jurídica, não de código).
- **Casos-limite de GPS, teste de IA, fluxos por persona**: cobertos
  pelos testes unitários existentes por módulo (`geo`, `gps`,
  `rotta-ai`, `routes` — dentro dos 497 testes/53 suítes), não uma
  categoria à parte com sua própria auditoria nesta entrega.

## 4. Veredito — GO / NO-GO para produção

**GO condicional.** A plataforma está pronta para operar em produção
com uma ressalva clara: **backend maduro e testado, frontend com
build/typecheck confiáveis mas sem rede de segurança automatizada
própria ainda**. Nenhum bloqueador de segurança, LGPD ou arquitetura
foi encontrado nesta auditoria (os que existiam — Storage público
servindo dado pessoal — já foram corrigidos no Dossiê 32).

**Não é bloqueador de lançamento, mas é o item de maior risco
residual**: se um PR futuro quebrar visualmente ou funcionalmente uma
tela do `apps/web`/`apps/admin`/`apps/mobile`, nada no CI hoje pega
isso automaticamente (só `apps/web` tem 1 teste real, ainda). Mitigado
por: `typecheck` (pega erro de tipo), `build` (pega erro de build),
revisão humana antes do merge — mas não é a mesma garantia que 497
testes de comportamento dão ao backend.

### Punch list — priorizado, não tudo é bloqueador

| #   | Item                                                                               | Bloqueia lançamento?                                                                             |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | Rodar `lhci autorun` de verdade em CI e registrar a baseline real de Lighthouse    | Não — mas fazer isso é o próximo PR natural                                                      |
| 2   | Replicar infraestrutura de teste (Vitest) para `apps/admin`                        | Não — mecânico, baixo esforço                                                                    |
| 3   | Configurar `jest-expo` + 1 teste real em `apps/mobile`                             | Não — mesma categoria do item 2                                                                  |
| 4   | E2E dedicado para os 21 módulos sem cobertura própria (§1)                         | Não — priorizar por criticidade de negócio (billing/wallet primeiro, dado que envolvem dinheiro) |
| 5   | Teste de carga real contra ambiente dedicado (não produção) nos volumes-alvo       | Não para o lançamento inicial — sim antes de qualquer campanha de aquisição em massa             |
| 6   | Auditoria de acessibilidade manual (leitor de tela real, não só Lighthouse/ESLint) | Recomendado antes do lançamento público, não bloqueador técnico                                  |

## 5. Plano de evolução futura

| Item                                              | Gatilho                                            | Esforço estimado                                                 |
| ------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| Vitest em `apps/admin`                            | Prioridade de qualidade do time                    | Baixo — copiar o padrão de `apps/web`                            |
| `jest-expo` em `apps/mobile`                      | Idem                                               | Médio — RN Testing Library tem mais fricção que web              |
| Baseline real de Lighthouse + limiares em "error" | Primeira execução do job `lighthouse` em CI        | Baixo — só documentar o número medido                            |
| Teste de carga real (1M+ usuários)                | Antes de uma campanha de aquisição em massa        | Alto — exige ambiente dedicado, dados semeados, observação ativa |
| E2E dos 21 módulos sem cobertura própria          | Conforme cada módulo aproximar de uso real intenso | Médio, por módulo                                                |

## 6. Verificação

- `apps/api`: 53 suítes / 497 testes, 100% passando (inalterado — este
  Dossiê não mexeu no backend).
- `apps/web`: `pnpm test` — **1 arquivo / 3 testes, 100% passando**
  (0→3, infraestrutura nova).
- `pnpm turbo run typecheck build` — limpo em `@rotta/api`, `@rotta/web`.
- `.github/workflows/ci.yml` — YAML validado (`python3 -c "import yaml..."`),
  novo job `lighthouse` não bloqueia (`continue-on-error: true`).
