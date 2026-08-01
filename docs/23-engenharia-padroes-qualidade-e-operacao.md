# Dossiê 23 — Padrões de Engenharia, Qualidade e Operação do Monorepo

> Continuação direta do Dossiê 22. Aqui se definem as convenções internas de código (organização React, estado, consumo de API, rotas, tema, i18n, feature flags), a operação do repositório (variáveis de ambiente, logs, testes) e o ciclo de vida de contribuição (Git, commits, versionamento, CI/CD, qualidade, documentação viva) — o conjunto de decisões que precisa estar definido **antes** de dezenas de desenvolvedores começarem a commitar simultaneamente, para que nenhuma dessas escolhas seja feita ad-hoc, de forma inconsistente, PR a PR.

---

## 1. Estrutura interna de uma aplicação React (`apps/web`, `apps/admin`, `apps/mobile`)

### 1.1 Organização por _feature_, não por tipo de arquivo

A alternativa clássica de organizar por tipo (`components/`, `hooks/`, `services/` como pastas globais de topo, cada uma acumulando arquivos de todos os domínios de negócio misturados) foi descartada — em um produto com 24 módulos de domínio (Dossiê 13), uma pasta `hooks/` global viraria, em poucos meses, uma lista de 100+ arquivos sem nenhuma fronteira, o oposto do princípio de "fronteira de domínio clara" que rege toda esta documentação (Dossiê 12 §1.4).

**Decisão**: organização primária por **feature** (espelhando os mesmos domínios do backend — Dossiê 13), com pastas técnicas (`components/`, `hooks/`, `services/` etc.) existindo **dentro** de cada feature, e uma segunda camada, verdadeiramente compartilhada entre features, para o que não pertence a nenhum domínio específico.

```
apps/web/src/
├── app/                      # Rotas do Next.js App Router (Seção 4) — camada fina, delega a features/
├── features/
│   ├── auth/
│   │   ├── components/        # Componentes específicos deste domínio (ex. FormularioLoginOTP)
│   │   ├── hooks/               # Hooks específicos (ex. useLoginFlow)
│   │   ├── services/             # Chamadas de API específicas (via packages/api-client)
│   │   ├── stores/                 # Estado local do domínio, quando necessário
│   │   └── utils/                    # Utilitários específicos deste domínio
│   ├── routes/                # Feature "Rotas" (Dossiê 13, Módulo Routes)
│   ├── students/               # Feature "Alunos"
│   ├── drivers/                  # Feature "Motoristas"
│   ├── vehicles/                   # Feature "Veículos"
│   ├── trips/                        # Feature "Viagens"
│   ├── documents/                      # Feature "Documentos"
│   ├── dashboard/                        # Feature "Dashboard"
│   └── ... (uma pasta por módulo de domínio do Dossiê 13)
│
├── components/                # Composições de UI específicas deste app, mas cross-feature
│                                #  (ex. AppShell, Sidebar montada com os itens de menu deste app específico)
│                                #  — nunca componentes "de design system puro", que vivem em packages/ui
├── layouts/                   # Layouts de página (autenticado, público, wizard) — Dossiê 10 §12
├── providers/                  # Providers de contexto de nível de aplicação (tema, auth, query client)
├── stores/                      # Estado global verdadeiramente cross-feature (raro — a maioria do estado é de feature ou de servidor via TanStack Query)
└── utils/                         # Utilitários específicos deste app que não fazem sentido em packages/utils
```

### 1.2 Regra de dependência entre features

Mesma disciplina do Dossiê 12 §1.4 (fronteiras de módulo do backend), agora aplicada ao frontend: uma feature nunca importa um arquivo interno de outra feature diretamente (ex. `features/trips` não importa `features/students/components/CardAluno.tsx`) — se um componente/hook precisa ser usado por duas features, ele **não pertence a nenhuma das duas**: sobe para `components/`/`hooks/` do app (se for específico daquele app) ou para `packages/` (se fizer sentido em mais de um app). Esta regra é reforçada por um _lint_ de fronteira de import (ESLint com regra de restrição de caminho, Seção 9), não apenas por convenção informal — o mesmo princípio de "regra imposta por ferramenta, não por boa vontade" do Dossiê 22 §6.2.

### 1.3 `Pages` no vocabulário desta arquitetura

O termo "Pages" citado no briefing corresponde, no Next.js App Router, à pasta `app/` (arquivos `page.tsx` por rota) — tratada como **camada fina de composição**: um arquivo de página importa e monta componentes de `features/`, nunca contém lógica de negócio ou chamada de API diretamente. Isso mantém a estrutura de rotas (Seção 4) desacoplada da estrutura de domínio (`features/`) — uma reorganização de URL nunca exige mover lógica de negócio, apenas a fina camada de composição.

---

## 2. Gerenciamento de Estado

### 2.1 As quatro opções avaliadas, por tipo de estado

O erro mais comum em arquitetura de estado React é tratar "gerenciamento de estado" como uma escolha única — na prática, existem **dois tipos de estado fundamentalmente diferentes**, e a Rotta usa uma ferramenta especializada para cada um, em vez de forçar as duas em uma única biblioteca genérica:

| Tipo de estado                                                                         | Exemplos na Rotta                                                                                      | Ferramenta escolhida |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------- |
| **Estado de servidor** (dado que vive no backend, o cliente só tem uma cópia em cache) | Lista de rotas, perfil do aluno, posição atual do veículo, status de documentos                        | **TanStack Query**   |
| **Estado de cliente puro** (nunca existiu no servidor, é da sessão de UI local)        | Tema selecionado, filtro ativo de uma tabela, estado de um wizard multi-etapa, seleção de perfil ativo | **Zustand**          |

### 2.2 Por que TanStack Query para estado de servidor (e não Redux Toolkit Query)

TanStack Query resolve, de fábrica, exatamente os problemas que **90% do código de gerenciamento de estado manual em produtos anteriores existe para resolver**: cache com invalidação, deduplicação de requisições simultâneas, refetch em background ao focar a janela/app, retry automático com backoff, estados de loading/error por consulta sem boilerplate. Redux Toolkit Query oferece uma proposta semelhante, mas exige adotar todo o ecossistema Redux (store global, slices, middleware) para um ganho equivalente — custo de complexidade maior sem benefício adicional relevante para o padrão de uso da Rotta (a maior parte do estado da aplicação **é** estado de servidor; muito pouco é estado de cliente genuinamente global).

### 2.3 Por que Zustand para estado de cliente (e não Redux Toolkit puro, nem apenas Context API)

- **Contra Redux Toolkit "puro" (sem RTK Query)**: mesmo com a redução de boilerplate que o Redux Toolkit trouxe sobre o Redux clássico, ainda exige mais estrutura cerimonial (slices, actions, selectors) do que o volume real de estado-de-cliente-puro da Rotta justifica — a maior parte da complexidade do produto está no estado de servidor (já resolvido por TanStack Query), não em uma teia complexa de estado de UI interdependente que justificaria a arquitetura unidirecional rígida do Redux.
- **Contra Context API como mecanismo único de estado global**: Context API é ótima para **injeção de dependência** (prover o cliente de tema, o cliente de autenticação — Seção 1.1, `providers/`), mas é uma ferramenta pobre para estado que muda com frequência e é lido por muitos componentes (qualquer mudança de valor do contexto re-renderiza todos os consumidores, sem um mecanismo nativo de seleção granular) — Zustand resolve isso nativamente (cada componente assina apenas a fatia específica do estado que usa, sem re-renderizar por mudanças em outras fatias).
- **Zustand, especificamente**: API mínima (sem _boilerplate_ de providers aninhados, sem _reducers_/_actions_ formais obrigatórios), completamente compatível com React Native (mesma biblioteca usada em `apps/web` e `apps/mobile`, reforçando o princípio de código compartilhado do Dossiê 9), e passível de ser fatiada em `packages/stores` (Dossiê 22 §5.9) quando um store específico faz sentido ser compartilhado entre apps.

### 2.4 Onde vive o Context API, então

Reservado a **injeção de dependência de baixa frequência de mudança**: o provedor de tema (dark/light, Seção 5), o provedor de sessão de autenticação (usuário atual, papel ativo — que muda raramente durante o uso, tipicamente só no login/logout/troca de perfil), o cliente de feature flags (Seção 6). Nunca usado para estado que muda a cada interação do usuário (isso é trabalho do Zustand) nem para dado que veio do servidor (isso é trabalho do TanStack Query).

---

## 3. Consumo de API

### 3.1 Axios vs. Fetch nativo

**Decisão**: `fetch` nativo (via um wrapper fino) para todo o consumo web, e a implementação de `fetch` do runtime do React Native para o mobile — não Axios. Justificativa: `fetch` é nativo em ambas as plataformas-alvo desde alguns anos (elimina uma dependência inteira do bundle), e o conjunto de funcionalidades que historicamente justificava Axios (interceptors, cancelamento de requisição, transformação automática de resposta) é **inteiramente reimplementado, de forma mais idiomática ao React, pelo próprio TanStack Query** (retry, cache, cancelamento automático ao desmontar o componente) combinado a um wrapper fino de `fetch` dentro de `packages/api-client` (Dossiê 22 §5.6) que centraliza: injeção do header de autenticação, tratamento do formato padrão de erro (Dossiê 13 §23), e base URL por ambiente (Seção 7).

### 3.2 Cache

Inteiramente delegado ao TanStack Query (Seção 2.2) — cada tipo de dado tem uma `queryKey` estruturada (ex. `['students', tenantId, studentId]`) e um tempo de "stale" (frescor) calibrado por volatilidade do dado: dados quase estáticos (perfil de uma escola) toleram minutos de "stale time"; dados operacionais (lista de rotas do dia) usam "stale time" curto ou refetch em intervalo; a posição em tempo real do veículo **não** passa por TanStack Query — vem do canal Socket.IO (Dossiê 14 §1.3) e é escrita diretamente em um estado Zustand local de "última posição conhecida", porque não é, semanticamente, um dado buscável por request/response, é um stream.

### 3.3 Retry

Política de retry do TanStack Query configurada de forma diferenciada por tipo de operação: leituras (`GET`) usam retry automático com backoff exponencial (padrão de até 3 tentativas) — uma falha de rede transitória nunca deveria virar um erro visível ao usuário sem antes tentar novamente silenciosamente. Escritas (`POST`/`PATCH`/`DELETE`) **não** usam retry automático genérico (evita o risco de duplicar uma ação de escrita por reenvio automático) — em vez disso, operações de escrita críticas de campo (checklist, GPS) têm sua própria lógica de retry com idempotência explícita (chave única gerada no cliente, Dossiê 14 §1.7), nunca a política de retry genérica de leitura.

### 3.4 Offline

No `apps/mobile`, a camada de consumo de API é complementada pela fila local (`packages/storage`, Dossiê 22 §5.13) para as ações de campo já detalhadas em profundidade no Dossiê 14 §1.7 — o TanStack Query cuida do estado de servidor "normal" (listagens, cadastro), enquanto o subsistema de fila offline cuida especificamente do caminho crítico de GPS/checklist que precisa funcionar sem rede. `apps/web`/`apps/admin` não implementam modo offline (uso sempre assumido com conectividade, dado o contexto de uso em escritório/computador do Gestor/Admin) — decisão deliberada de não superengenheirar uma capacidade sem valor de produto correspondente para essas superfícies.

---

## 4. Organização de Rotas

### 4.1 Web (`apps/web`, `apps/admin`) — Next.js App Router

Estrutura de pastas de `app/` espelha a URL (convenção nativa do Next.js), organizada por _route groups_ para separar contextos sem afetar a URL:

```
app/
├── (marketing)/            # Landing Page — layout público, sem sidebar
│   ├── page.tsx              # "/"
│   └── precos/page.tsx         # "/precos" (se necessário)
├── (auth)/                  # Login, cadastro, recuperação — layout centralizado sem navegação
│   ├── login/page.tsx
│   └── cadastro/page.tsx
└── (dashboard)/             # Painel autenticado — layout com sidebar (Dossiê 10 §11.2)
    ├── layout.tsx             # AppShell: sidebar + cabeçalho, valida sessão
    ├── dashboard/page.tsx
    ├── rotas/
    │   ├── page.tsx             # Listagem
    │   └── [id]/page.tsx          # Detalhe
    ├── alunos/...
    └── ...
```

Toda rota sob `(dashboard)` passa por um _middleware_/verificação de sessão no `layout.tsx` daquele grupo — nenhuma tela individual reimplementa a checagem de autenticação, ela é garantida estruturalmente por estar dentro daquele _route group_.

### 4.2 Mobile (`apps/mobile`) — React Navigation, condicionado por papel

Navegação em duas camadas: um _navigator_ raiz decide, a partir do papel ativo do usuário autenticado (`packages/auth`), qual conjunto de telas/bottom-tabs montar (Dossiê 10 §11.1) — o Motorista nunca "vê" as rotas do Responsável sequer montadas na árvore de navegação (não é apenas uma tela escondida por permissão, é uma árvore de navegação estruturalmente diferente por papel), reduzindo tanto a superfície de erro quanto o tamanho de bundle relevante carregado por sessão.

```
navigation/
├── RootNavigator.tsx         # Decide entre AuthNavigator e o navigator do papel ativo
├── AuthNavigator.tsx           # Telas de login/cadastro (Dossiê 15)
├── DriverNavigator.tsx           # Bottom tabs: Início, Viagem, Histórico, Perfil
├── ParentNavigator.tsx             # Bottom tabs: Início, Histórico, Notificações, Perfil
└── ...
```

---

## 5. Tema (Dark/Light) como código

Tokens do Dossiê 10 (§6) implementados em `packages/theme` como um objeto TypeScript único por tema (`darkTheme`, `lightTheme`), nunca como valores soltos espalhados em componentes. No web, os tokens são também exportados como variáveis CSS customizadas (permitindo troca de tema em tempo real via um atributo no elemento raiz, sem re-renderizar toda a árvore React); no mobile, consumidos via um `ThemeProvider` (Context API, Seção 2.4) que expõe o tema ativo a todo componente de `packages/ui/native`. Preferência de tema persistida por conta de usuário (não por dispositivo, Dossiê 20 `CFG-02`), sincronizada via o mesmo mecanismo de configuração de perfil.

---

## 6. Internacionalização (i18n)

### 6.1 Por que preparar desde já, mesmo com um único idioma em uso

Adicionar i18n depois que centenas de strings já estão _hardcoded_ em português espalhadas pelo código é uma refatoração cara e propensa a erro (strings esquecidas, quebra de layout com texto mais longo em outro idioma). Preparar a arquitetura desde o início custa pouco a mais agora e elimina esse retrabalho futuro por completo — mesmo padrão de raciocínio já aplicado à hierarquia de tenancy do Dossiê 8 §1.4.

### 6.2 Arquitetura

`packages/i18n` define a infraestrutura (biblioteca `next-intl` para `apps/web`/`apps/admin`, `i18next`/`react-i18next` para `apps/mobile` — escolhas específicas por ecossistema, mas com a mesma estrutura de arquivo de mensagens); todo texto de interface é uma chave de tradução (`t('trips.startButton')`), nunca uma string literal dentro do componente — inclusive hoje, com um único idioma ativo (`pt-BR`). Arquivos de mensagem organizados por feature (espelhando `features/` da Seção 1), não em um único arquivo monolítico de milhares de linhas:

```
packages/i18n/messages/
├── pt-BR/
│   ├── common.json
│   ├── auth.json
│   ├── trips.json
│   └── ...
├── en/          # Reservado — mesma estrutura de chaves, ainda não populado com tradução
└── es/          # Idem
```

### 6.3 O que já é tratado corretamente desde o MVP, mesmo em português único

Formatação de data, número e moeda **sempre** via as funções sensíveis a locale de `packages/i18n` (nunca concatenação manual de string) — porque o formato de data brasileiro (DD/MM/AAAA) já é, ele mesmo, uma decisão de locale, e escrever esse código de forma "genérica desde o início" custa o mesmo que escrever hardcoded, mas já elimina uma classe inteira de bug de internacionalização futura.

---

## 7. Feature Flags

### 7.1 Por que

Permitir que uma funcionalidade (ex. reconhecimento facial `EMB-04`, Dossiê 18) seja implantada em produção **desligada**, ativada gradualmente por tenant/porcentagem de usuários, sem precisar de um novo deploy para cada estágio de rollout — essencial para um produto de segurança onde uma funcionalidade nova precisa ser validada com um grupo pequeno antes de expor a todos.

### 7.2 Arquitetura

`packages/feature-flags` expõe um hook único (`useFeatureFlag('reconhecimento-facial')`) consumido por qualquer app; por trás, a implementação inicial (MVP) é o mais simples possível — uma tabela própria no banco (análoga a `EmpresaConfiguracao`, Dossiê 8 §3.1) com avaliação no backend, expondo ao frontend apenas o resultado booleano já resolvido para aquele usuário/tenant (nunca a lógica de avaliação, que fica só no servidor) — evitando a dependência de um serviço de terceiros (LaunchDarkly, GrowthBook) antes que a escala real justifique o custo/complexidade adicional. A interface do hook, no entanto, já é desenhada de forma a permitir trocar a implementação por um serviço dedicado no futuro sem alterar nenhum código consumidor (mesmo princípio de adapter já reiterado em todo este conjunto de dossiês).

### 7.3 Uso disciplinado

Toda flag tem um dono, uma data de criação e uma expectativa de remoção documentada (uma flag que nunca é removida depois de 100% do rollout confirmado é dívida técnica silenciosa) — revisão trimestral de flags ativas incluída na rotina de manutenção do time (Seção 12).

---

## 8. Variáveis de Ambiente

### 8.1 Princípio geral

Nenhuma variável de ambiente é lida diretamente via `process.env.X` espalhado pelo código de features — cada app tem um único módulo de configuração (`config/env.ts`) que lê, valida (via schema Zod, mesma biblioteca já usada em `packages/validators`) e exporta um objeto de configuração tipado; a aplicação **falha ao iniciar** (não silenciosamente em runtime) se uma variável obrigatória estiver ausente ou malformada — mesmo princípio já estabelecido para o backend no Dossiê 12 §12.4, agora replicado para todo app do monorepo.

### 8.2 Organização por ambiente

```
apps/web/.env.example        # Documenta quais variáveis existem, nunca valores reais
apps/web/.env.development     # Valores de desenvolvimento local (gitignored se contiver segredo real)
apps/web/.env.production       # Nunca commitado — injetado pelo pipeline de CI/CD (Seção 12) a partir do gerenciador de segredos
```

Variáveis prefixadas de forma explícita por visibilidade: `NEXT_PUBLIC_*` (web) / `EXPO_PUBLIC_*` (mobile) para qualquer valor que efetivamente vai parar no bundle do cliente (nunca um segredo real); qualquer variável sem esse prefixo é, por convenção do próprio framework, inacessível ao bundle do navegador/app, reforçando estruturalmente que segredos de backend nunca vazam para o cliente por engano de nomenclatura.

### 8.3 Segredos

Nunca em `.env` commitado, em nenhum ambiente além do `.env.development` local (e mesmo esse, apenas com credenciais de desenvolvimento sem valor real de produção) — geridos pelo gerenciador de segredos do provedor de hospedagem (Dossiê 9 §2.8), injetados como variável de ambiente em tempo de build/deploy pelo pipeline de CI/CD (Seção 12).

---

## 9. Logs (Frontend)

Complementar ao Dossiê 12 §10.3 (logs de backend): cada app de frontend integra um serviço de captura de erro (ex. Sentry) que reporta exceções não tratadas e falhas de requisição, **carregando o mesmo id de correlação** gerado no backend para aquela requisição (propagado de volta ao cliente no cabeçalho de resposta) — permitindo reconstituir, a partir de um erro capturado no app do motorista, toda a jornada correspondente nos logs de backend (Dossiê 12 §10.3) sem precisar de investigação manual cruzada entre ferramentas desconectadas. Nenhum dado sensível (token, localização exata fora de contexto, dado de menor) é enviado ao serviço de captura de erro — mascaramento automático configurado na integração, mesmo princípio de minimização do Dossiê 12 §7.3.

---

## 10. Testes

Reafirmando e estendendo a pirâmide já definida para o backend (Dossiê 12 §9) para o front-end:

| Nível                 | Ferramenta                                                                                    | O que cobre                                                                                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unitário**          | Jest/Vitest + React Testing Library (web/admin), Jest + React Native Testing Library (mobile) | Componentes de `packages/ui` isoladamente, hooks de `packages/hooks`, lógica pura de `packages/utils`/`packages/validators`                                                                                                            |
| **Integração**        | React Testing Library com mocks de rede (MSW — Mock Service Worker)                           | Fluxos de feature completos (ex. formulário de cadastro de aluno) sem precisar de um backend real rodando                                                                                                                              |
| **E2E**               | Playwright (web/admin), Detox ou Maestro (mobile)                                             | Jornadas completas ponta a ponta (Dossiê 11, fluxos): login → criar rota → cadastrar aluno → iniciar viagem → checklist                                                                                                                |
| **Visual Regression** | Chromatic (integrado ao Storybook de `packages/ui`, `apps/docs`)                              | Captura automática de screenshot de cada componente do design system a cada PR, comparado ao baseline — qualquer mudança visual não intencional (ex. um ajuste de token quebrando o contraste de um botão) é sinalizada antes do merge |

**Regra de cobertura mínima**: todo `package/` compartilhado exige cobertura de teste unitário como critério de CI obrigatório (Seção 12) — um package usado por 4 apps propaga um bug para os 4 simultaneamente se não for bem testado, tornando o padrão de qualidade aqui não negociável, mais rígido do que o exigido de uma tela específica de um único app.

---

## 11. Estratégia de Git

### 11.1 Avaliação: Git Flow clássico vs. Trunk-Based Development

O briefing cita explicitamente `main`, `develop`, `feature`, `release`, `hotfix` — a nomenclatura clássica do **Git Flow**. Antes de adotá-lo ao pé da letra, vale a análise:

| Critério                                                                                          | Git Flow clássico (com `develop` permanente)                                                                                                        | **Trunk-Based com branches curtas + `release/*` sob demanda**                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Velocidade de integração contínua                                                                 | ⚠️ `develop` como branch de integração permanente tende a acumular divergência do `main` por dias/semanas, gerando merges maiores e mais arriscados | ✅ Toda `feature/*` é curta (dias, não semanas) e mergeada direto em `main`, mantendo `main` sempre próximo do estado real de produção                                                                          |
| Compatibilidade com deploy contínuo (Seção 12)                                                    | ⚠️ Fica ambíguo "o que está em produção agora" quando existem duas branches de longa vida (`main` e `develop`)                                      | ✅ `main` é, por definição, sempre o que está (ou está prestes a estar) em produção — a pergunta "o que está em produção" tem uma resposta única                                                                |
| Adequação a dezenas de desenvolvedores simultâneos                                                | ⚠️ Mais desenvolvedores commitando em `develop` por mais tempo aumenta a chance de conflito acumulado                                               | ✅ Branches curtas reduzem a janela de divergência entre o trabalho de desenvolvedores diferentes                                                                                                               |
| Necessidade de estabilizar uma versão antes de lançar (ex. app mobile aguardando revisão de loja) | ✅ `release/*` cobre isso nativamente                                                                                                               | ✅ Também suportado — uma `release/*` é cortada de `main` quando necessário (tipicamente para o app mobile, dado o ciclo de revisão de loja, Dossiê 9 §6), sem que isso exija uma `develop` permanente por trás |

**Decisão**: **Trunk-Based Development modificado** — `main` é a única branch de longa vida e é sempre "implantável" (protegida por CI obrigatório, Seção 12); todo trabalho novo nasce em uma `feature/*` de vida curta, aberta a partir de `main` e mergeada de volta via Pull Request; `release/*` é cortada **sob demanda**, não permanentemente, especificamente para estabilizar uma versão do app mobile durante a janela de revisão de loja (onde uma correção pontual pode precisar ser aplicada sem incluir features já mergeadas em `main` depois do corte); `hotfix/*` nasce diretamente de `main` (ou da tag de produção vigente) para uma correção urgente, mergeada de volta tanto em `main` quanto retro-portada para a `release/*` em andamento, se houver uma.

**Por que não a `develop` permanente**: ela resolveria um problema que a Rotta mitiga de outra forma — a necessidade de "acumular" trabalho antes de lançar — através de **feature flags** (Seção 7) em vez de uma branch de integração separada. Uma funcionalidade incompleta é mergeada em `main` atrás de uma flag desligada, não deixada "estacionada" em uma branch `develop` divergente por semanas. Isso é consistente com a ambição de CI/CD contínuo explicitamente pedida no briefing — Git Flow clássico foi desenhado em uma era de ciclos de release mensais/trimestrais, não de deploy contínuo.

### 11.2 Convenção de nomenclatura de branch

`feature/<área>-<descrição-curta>` (ex. `feature/trips-checklist-embarque`), `fix/<área>-<descrição>`, `release/mobile-1.4.0`, `hotfix/<descrição-curta>` — prefixo por área facilita localizar rapidamente branches relacionadas a um módulo específico em um repositório com múltiplos times trabalhando em paralelo.

### 11.3 Proteção de branch

`main` exige: Pull Request obrigatório (nunca push direto), ao menos uma aprovação de revisão de código, todos os checks de CI (Seção 12) passando, e branch atualizada com `main` antes do merge (sem merges de branches muito desatualizadas, que reintroduziriam o problema de divergência acumulada que o trunk-based busca evitar).

---

## 12. Conventional Commits

### 12.1 Padrão adotado

Todo commit segue estritamente [Conventional Commits](https://www.conventionalcommits.org/): `<tipo>(<escopo>): <descrição>`.

**Tipos padronizados**: `feat` (nova funcionalidade), `fix` (correção de bug), `docs` (documentação), `refactor` (mudança de código sem alterar comportamento externo), `test` (adição/ajuste de teste), `perf` (melhoria de performance), `chore` (manutenção sem impacto em código de produção — ex. atualização de dependência), `ci` (mudança de pipeline), `build` (mudança de configuração de build), `revert` (reversão de commit anterior).

**Escopo**: nome do app ou package afetado (ex. `feat(trips): adiciona confirmação de van vazia`, `fix(ui): corrige contraste do badge de alerta`) — torna o histórico de commits diretamente filtrável por área do monorepo.

### 12.2 Por que isso importa estruturalmente, não apenas estilisticamente

Conventional Commits não é só uma convenção estética — é o **insumo direto** de duas automações críticas: (a) geração automática de changelog por app/package (Seção 13), e (b) determinação automática do tipo de _version bump_ (major/minor/patch) via Changesets (Seção 13) — um commit `feat` sugere minor, um `fix` sugere patch, um commit com `BREAKING CHANGE` no rodapé força major. Sem essa disciplina, o versionamento semântico da Seção 13 exigiria decisão manual a cada release, cara e sujeita a erro humano em um monorepo com múltiplos pacotes.

---

## 13. Versionamento

### 13.1 SemVer para packages internos

Todo `package/` do monorepo segue Versionamento Semântico (`MAJOR.MINOR.PATCH`) — ainda que nenhum deles seja publicado publicamente no NPM (são consumidos internamente via o workspace do pnpm), versionar corretamente permite rastrear no changelog interno exatamente quando uma mudança _breaking_ em `packages/ui` ou `packages/api-client` foi introduzida e quais apps precisaram de ajuste em decorrência.

### 13.2 Changesets como ferramenta

**Changesets** (ferramenta mantida pela comunidade, amplamente adotada em monorepos Turborepo) gerencia esse processo: todo Pull Request que altera um package compartilhado inclui um arquivo de _changeset_ (gerado por um comando de CLI interativo) descrevendo o tipo de mudança e um resumo em linguagem humana; na integração contínua, os changesets acumulados são consolidados automaticamente em um Pull Request de "Version Packages" que atualiza os números de versão e o `CHANGELOG.md` de cada package afetado — sem exigir que um humano decida manualmente qual versão cada package deveria ter a cada release.

### 13.3 Versionamento dos apps (unidades deployáveis)

- **`apps/api`, `apps/realtime-gateway`, `apps/worker`**: versionados pela tag de imagem Docker (hash do commit + tag semântica de release, Seção 12) — a API também expõe versionamento de contrato por prefixo de caminho (`/v1/...`, já estabelecido no Dossiê 12 §17.3), independente do versionamento interno do código.
- **`apps/mobile`**: segue o versionamento próprio exigido pelas lojas (`versionCode` no Android, `CFBundleVersion` no iOS), incrementado automaticamente pelo EAS a cada build de release (Dossiê 9 §6.1) — dissociado do SemVer interno dos packages, mas rastreável a um commit/tag específico do monorepo para fins de depuração.
- **`apps/web`, `apps/admin`**: não exigem "número de versão" visível ao usuário (deploy contínuo, o usuário sempre vê a versão mais recente publicada) — rastreabilidade garantida pelo hash do commit associado a cada deploy, visível no pipeline de CI/CD.

---

## 14. Pipeline de CI/CD

### 14.1 Visão geral do pipeline (GitHub Actions)

```
Pull Request aberto/atualizado
   │
   ├─▶ [1] Lint + Type Check      (roda apenas nos pacotes/apps afetados, via Turborepo — Dossiê 22 §2)
   ├─▶ [2] Testes Unitários + Integração
   ├─▶ [3] Build de todos os apps afetados
   ├─▶ [4] Testes E2E              (contra ambiente de preview, quando aplicável)
   └─▶ [5] Visual Regression       (Chromatic, apenas se packages/ui foi alterado)
              │
              ▼ (todos os checks verdes + aprovação de review)
         Merge em `main`
              │
              ▼
   [6] Deploy automático por app:
       ├─ apps/web, apps/admin  → Vercel (produção)
       ├─ apps/api, apps/realtime-gateway, apps/worker → build de imagem Docker → deploy (Dossiê 12 §12.3)
       └─ apps/mobile → EAS Build (perfil de produção) → EAS Submit às lojas (quando uma release é explicitamente cortada — não a cada merge, dado o ciclo de revisão de loja)
              │
              ▼
   [7] Consolidação de Changesets pendentes → PR automático de "Version Packages"
```

### 14.2 Execução incremental (o motivo prático de usar Turborepo, Dossiê 22 §2)

Cada etapa do pipeline usa o grafo de dependência do Turborepo para rodar **apenas** contra os apps/packages efetivamente afetados pelo diff daquele Pull Request (e seus dependentes) — um PR que só altera `apps/mobile` não dispara rebuild/teste de `apps/admin`, por exemplo. Combinado a cache remoto (artefatos de build/teste já computados em um PR anterior idêntico são reaproveitados), o tempo de CI permanece administrável mesmo à medida que o monorepo cresce para dezenas de packages e múltiplos apps — o requisito de "dezenas de desenvolvedores simultâneos" do briefing depende diretamente dessa característica para não se tornar uma fila de CI cada vez mais lenta.

### 14.3 Ambientes

- **Preview**: todo Pull Request de `apps/web`/`apps/admin` gera um deploy de preview isolado (nativo da Vercel), permitindo revisão visual da mudança antes do merge, sem afetar produção.
- **Staging**: ambiente completo (API + banco de dados de teste + apps) para validação de integração antes de uma release do app mobile ser submetida às lojas.
- **Produção**: `main` sempre implantável; deploy do backend/web ocorre a cada merge (deploy contínuo); deploy do mobile ocorre por corte explícito de release (Seção 11.1), dado o ciclo de revisão de loja que não permite o mesmo cadência de "a cada merge" do restante da plataforma.

---

## 15. Qualidade de Código

### 15.1 Ferramentas e onde configurá-las

Toda configuração vive centralizada em `packages/config` (Dossiê 22 §5.18) e é **estendida**, nunca duplicada, por cada app/package individual — garantindo que uma regra de lint nova se propague automaticamente a todo o monorepo com uma única alteração.

- **ESLint**: regras compartilhadas (`packages/config/eslint`), incluindo a regra de fronteira de import entre features (Seção 1.2) e entre packages (Dossiê 12 §1.4 aplicado ao frontend).
- **Prettier**: formatação automática compartilhada (`packages/config/prettier`) — nunca debate de estilo em code review (é resolvido automaticamente, não por opinião de revisor).
- **EditorConfig**: garante consistência básica (indentação, fim de linha) mesmo antes de qualquer ferramenta JS rodar, independente do editor de cada desenvolvedor.
- **Husky**: hooks de Git locais — `pre-commit` roda lint-staged (abaixo); `commit-msg` roda Commitlint (abaixo); `pre-push` roda a suíte de testes unitários dos pacotes afetados (feedback rápido antes mesmo de abrir o Pull Request, complementar ao CI, nunca um substituto dele).
- **lint-staged**: aplica lint/formatação apenas aos arquivos efetivamente alterados no commit (não o repositório inteiro), mantendo o hook de `pre-commit` rápido o suficiente para não frustrar o desenvolvedor.
- **Commitlint**: valida que toda mensagem de commit segue Conventional Commits (Seção 12) antes de aceitar o commit localmente — falha rápida, antes mesmo de chegar ao CI.

### 15.2 Por que isso é "arquitetura", não só "estilo"

Qualidade de código consistente automatizada por ferramenta (em vez de depender de revisão humana lembrando de apontar cada desvio) é o que torna viável "dezenas de desenvolvedores trabalhando simultaneamente" sem que o código se fragmente em dialetos de estilo diferentes por sub-time — a mesma lógica de "regra imposta por ferramenta, não por boa vontade" reiterada ao longo de todo este dossiê.

---

## 16. Documentação Viva

### 16.1 Princípio: documentação como código, no mesmo repositório, no mesmo Pull Request

Toda mudança de comportamento relevante (uma nova regra de negócio, uma mudança de contrato de API, uma decisão de arquitetura) atualiza a documentação correspondente **no mesmo Pull Request** que implementa a mudança — nunca como uma tarefa "para depois". Isso é viabilizado por três mecanismos concretos, cada um automatizando uma fatia da documentação em vez de depender de disciplina manual isolada:

1. **Documentação de produto/arquitetura** (os Dossiês 1–23, esta mesma pasta `docs/`): versionada em Git como qualquer código, revisada em Pull Request, servida navegável em `apps/docs`.
2. **Documentação de componentes** (`packages/ui`): gerada automaticamente pelo Storybook a partir do próprio código do componente e de seus arquivos de história (_stories_) — a documentação nunca "diverge" do componente real, porque é literalmente renderizada a partir dele.
3. **Documentação de API** (`apps/api`): gerada automaticamente a partir dos decorators do NestJS (Swagger/OpenAPI) — todo endpoint documentado (Dossiê 13) é also uma fonte executável de especificação, publicada em `apps/docs`, sempre em sincronia com o código de fato em produção (documentação gerada do código nunca fica desatualizada por esquecimento, ao contrário de documentação escrita à parte).

### 16.2 Registro de Decisões de Arquitetura (ADRs)

Toda decisão arquitetural relevante (as dezenas já tomadas ao longo dos Dossiês 4, 9, 12, 22, 23) é, adicionalmente, registrada como um **Architecture Decision Record** curto (`docs/adr/000X-titulo-da-decisao.md`) no momento em que é tomada — não uma reescrita retroativa dos dossiês completos, mas um registro pontual de "o que foi decidido, por quê, e quais alternativas foram descartadas", para que uma decisão já tomada (ex. "Turborepo em vez de Nx") nunca seja re-debatida do zero meses depois por um novo membro do time sem contexto — ele lê o ADR correspondente antes de propor revisitar a decisão.

### 16.3 Responsabilidade contínua

Cada `package`/`app` mantém seu próprio `README.md` local (o que é, como rodar localmente, como testar) — a documentação de mais alto nível (estes Dossiês) explica o "porquê" das decisões estruturais; o `README.md` de cada pasta explica o "como" operacional imediato de trabalhar naquela pasta especificamente. Revisão trimestral agendada (mesma rotina da Seção 7.3 de revisão de feature flags) inclui uma checagem de que a documentação de arquitetura ainda reflete o estado real do sistema — divergência encontrada é tratada como um bug a corrigir, não uma tarefa de baixa prioridade a acumular.
