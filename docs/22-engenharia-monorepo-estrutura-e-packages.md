# Dossiê 22 — Monorepo, Estrutura de Projeto, Aplicações e Packages

> Este dossiê projeta a engenharia completa do repositório da Rotta — a organização física de código que precisa suportar dezenas de desenvolvedores trabalhando simultaneamente, sem pisar uns nos outros, mantendo a arquitetura limpa já definida nos Dossiês 9, 12–14. Aprofunda os Capítulos 37–39 (Stack, Organização dos repositórios, Estrutura das pastas — plano original de 40 capítulos, nunca detalhado em nível de implementação). Nenhum código é escrito aqui — é o projeto da "casa" onde o código vai morar.

---

## 1. Estratégia de repositório: Monorepo único

### 1.1 Por que um monorepo, não múltiplos repositórios

A Rotta é composta por 4+ aplicações (Landing/Painel, App Mobile, API, Admin) e mais de uma dezena de pacotes compartilhados (design system, tipos, clientes de API, validadores). A alternativa de "poli-repo" (um repositório por aplicação) foi descartada pelos seguintes motivos técnicos:

- **Consistência de tipos ponta a ponta**: a aposta estratégica de todo o Dossiê 9 é TypeScript em toda a stack (backend, painel web, app mobile). Isso só entrega valor real (erro de contrato detectado em tempo de compilação, não em produção) se os três consumirem os **mesmos tipos gerados a partir do mesmo lugar**, no mesmo commit. Em poli-repo, isso exigiria publicar e versionar um pacote npm privado a cada mudança de tipo — lento e propenso a dessincronia (o app mobile rodando contra uma versão de tipos mais antiga que o painel web, por exemplo).
- **Refatoração atômica**: uma mudança de contrato de API (ex. renomear um campo do DTO de `Aluno`) precisa alterar o backend, o cliente de API compartilhado e os dois frontends **no mesmo Pull Request**, revisado e mergeado atomicamente. Em poli-repo, isso vira uma sequência de PRs coordenados manualmente entre repositórios — fonte clássica de "quebrou em produção porque o repo B não atualizou a dependência do repo A a tempo".
- **Design system compartilhado**: o Dossiê 10 exige que web e mobile falem exatamente a mesma linguagem visual. Um único pacote `packages/ui` consumido por ambos, vivendo no mesmo repositório, torna trivial garantir que uma correção de acessibilidade ou um ajuste de token de cor se propague aos dois simultaneamente.
- **Onboarding de novos desenvolvedores**: um único `git clone` traz o contexto inteiro do produto — um novo engenheiro entende a superfície completa (o que existe, como as peças se conectam) sem precisar descobrir e clonar N repositórios espalhados.

### 1.2 O contra-argumento (e por que não se aplica aqui, ainda)

O risco clássico de monorepo — build lento, CI que roda tudo a cada PR mesmo para uma mudança pequena — é real, mas resolvido por ferramentas de monorepo modernas com _task orchestration_ incremental (build/cache somente do que mudou, Seção 2), não por dividir o código em repositórios separados. Dividir repositórios para "resolver" lentidão de CI é tratar o sintoma trocando de problema (builds lentos por outro motivo: coordenação manual entre repos) em vez de resolver a causa raiz (falta de cache/orquestração incremental).

---

## 2. Ferramenta de Monorepo: Turborepo + pnpm Workspaces

### 2.1 As quatro opções avaliadas

| Critério                                                                          | **Turborepo**                                                                                                       | Nx                                                                                                                                                                                                                                | pnpm Workspaces (puro)                                                                                 | Lerna                                                                                   |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Gerenciamento de dependências entre pacotes (workspaces)                          | Delega ao gerenciador de pacotes (pnpm)                                                                             | Tem o próprio, mas tipicamente também roda sobre pnpm/npm/yarn workspaces                                                                                                                                                         | Nativo, é exatamente o que resolve isso                                                                | Historicamente usava seu próprio symlink, hoje delega a npm/yarn/pnpm workspaces também |
| Cache incremental de build/lint/test (só reprocessa o que mudou)                  | ✅ Nativo, simples de configurar (`turbo.json`), cache remoto opcional                                              | ✅ Nativo, mais sofisticado (grafo de dependência de tarefas, _affected_ commands)                                                                                                                                                | ❌ Não oferece isso sozinho — cada pacote roda seu próprio script sem orquestração de cache entre eles | ⚠️ Suporte limitado/menos maduro que os dois anteriores                                 |
| Curva de aprendizado / complexidade de configuração                               | Baixa — arquivo de configuração único e simples, convenções mínimas                                                 | Alta — conceito próprio de _generators_, _executors_, plugins por framework, muito poder mas mais para aprender                                                                                                                   | Baixa (é "só" workspaces do gerenciador de pacotes)                                                    | Baixa, mas o projeto está com desenvolvimento mais lento no ecossistema atual           |
| Suporte de primeira classe a Expo/React Native                                    | Bom, sem opinião forte sobre como o app mobile deve ser estruturado (vantagem: não briga com as convenções do Expo) | Tem plugin (`@nx/expo`), mas impõe mais convenções próprias por cima do Expo                                                                                                                                                      | Neutro (é só gerenciamento de pacotes)                                                                 | Neutro                                                                                  |
| Adequação ao tamanho de time da Rotta hoje (poucas dezenas de devs, não centenas) | ✅ Poder suficiente sem complexidade excedente                                                                      | ⚠️ Todo o poder de Nx (module boundaries enforçados, geradores de código, visualização de grafo) só se paga com times muito maiores/múltiplas dezenas de pacotes com regras de arquitetura muito rígidas impostas pela ferramenta | —                                                                                                      | —                                                                                       |
| Mantenedor/maturidade atual                                                       | Vercel (mesma empresa do Next.js — integração natural com o deploy do `apps/web`)                                   | Nrwl, ecossistema robusto e maduro, mas mais "opinativo"                                                                                                                                                                          | Comunidade pnpm                                                                                        | Manutenção mais lenta comparada às duas primeiras opções                                |

### 2.2 Decisão

**Turborepo para orquestração de tarefas (build, lint, test, cache) + pnpm Workspaces para gerenciamento de dependências entre pacotes.** Esta é, na prática, a combinação recomendada pelo próprio ecossistema Turborepo (que não reinventa gerenciamento de dependência, delega a um gerenciador de pacotes real).

**Justificativa de desempate contra Nx**: Nx é uma ferramenta mais poderosa e mais rígida — mas essa rigidez (fronteiras de módulo impostas pela ferramenta, geradores de código customizados, plugins específicos por framework) é exatamente o tipo de poder que se paga em organizações com **centenas** de engenheiros e dezenas de times precisando de regras de arquitetura impostas automaticamente por tooling. A Rotta, mesmo no cenário otimista de "dezenas de desenvolvedores simultâneos" citado no briefing, ainda está numa escala onde a disciplina de arquitetura (fronteiras de módulo, Dossiê 12 §1.4) pode e deve ser garantida por revisão de código + lint de arquitetura configurado manualmente (Seção 2.3), sem precisar da camada adicional de abstração e curva de aprendizado do Nx. Turborepo entrega o ganho de performance mais importante (cache incremental, builds paralelos, só reprocessar o que mudou) com uma fração da complexidade de configuração — e, por rodar sobre pnpm workspaces (um padrão aberto, não proprietário de uma ferramenta), a saída de Turborepo no futuro (se algum dia a Rotta precisar de mais poder e migrar para Nx) é barata, porque a estrutura real de pacotes/dependências não muda, apenas a camada de orquestração por cima dela.

**Justificativa de desempate contra pnpm Workspaces puro (sem Turborepo)**: sem uma camada de orquestração de tarefas, cada `pnpm run build` em cada pacote roda do zero, sem cache, e sem entender automaticamente "quais pacotes dependem de quais" para paralelizar corretamente. Em um monorepo de 4 apps + 15 packages, isso se torna lento rapidamente — exatamente o cenário que o CI/CD de dezenas de desenvolvedores simultâneos (Seção do Dossiê 23) não pode tolerar.

**Por que pnpm, especificamente, como gerenciador de pacotes (não npm ou Yarn)**: pnpm usa um armazenamento de conteúdo endereçável (_content-addressable store_) compartilhado entre todos os pacotes do monorepo — uma dependência instalada uma vez nunca é duplicada fisicamente em disco para cada pacote que a usa (apenas linkada), o que economiza tempo de instalação e espaço em disco de forma muito relevante em um monorepo deste tamanho, além de impor uma resolução de dependências mais estrita (evita o problema clássico de um pacote acessar acidentalmente uma dependência "fantasma" que não declarou explicitamente, mas que existe no disco por causa de outro pacote — bug de isolamento que o npm/Yarn clássico permitem e o pnpm previne estruturalmente).

---

## 3. Estrutura de pastas de alto nível

```
rotta/
├── apps/
│   ├── web/                 # Landing Page + Painel Administrativo (Next.js)
│   ├── mobile/               # App React Native/Expo (Motorista, Monitor, Responsável)
│   ├── admin/                 # Portal Admin Rotta (Next.js, deploy isolado)
│   ├── api/                    # Core API (NestJS — monólito modular)
│   ├── realtime-gateway/        # Serviço de GPS/WebSocket (NestJS, deploy independente)
│   ├── worker/                    # Workers de fila (BullMQ — notificações, relatórios, jobs)
│   └── docs/                        # Site de documentação viva (Storybook + docs técnicas)
│
├── packages/
│   ├── ui/                  # Design System compartilhado (componentes visuais)
│   ├── theme/                # Tokens de tema (cores, tipografia, espaçamento, dark/light)
│   ├── icons/                 # Biblioteca de ícones da marca
│   ├── types/                   # Tipos TypeScript compartilhados (contratos de domínio)
│   ├── validators/                # Schemas de validação (Zod) compartilhados
│   ├── api-client/                  # Cliente de API tipado (consumido por web/mobile/admin)
│   ├── auth/                          # Lógica de autenticação/sessão compartilhada
│   ├── hooks/                          # React hooks reutilizáveis (web + mobile)
│   ├── stores/                          # Stores de estado global (Zustand) compartilhados
│   ├── forms/                             # Componentes/lógica de formulário reutilizável
│   ├── maps/                                # Abstração de mapas (Google Maps/Mapbox)
│   ├── notifications/                        # Cliente de push/notificação compartilhado
│   ├── storage/                                # Abstração de storage local (device/web)
│   ├── i18n/                                     # Infraestrutura de internacionalização
│   ├── feature-flags/                              # Cliente de feature flags
│   ├── constants/                                    # Constantes de negócio compartilhadas
│   ├── utils/                                          # Utilitários puros (data, string, número)
│   └── config/                                           # Configurações compartilhadas (ESLint, TS, Prettier)
│
├── shared/
│   └── contracts/            # Definições de contrato de domínio (fonte única de verdade dos DTOs/eventos)
│
├── docs/                     # Documentação de produto e arquitetura (este conjunto de dossiês)
│
├── scripts/                  # Scripts de automação (migração, seed, geração de código, release)
│
├── infra/                    # Infraestrutura como código (Terraform, Docker, configuração de CI auxiliar)
│
├── .github/
│   ├── workflows/             # Pipelines de CI/CD (Dossiê 23)
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

### 3.1 Responsabilidade de cada pasta de alto nível

- **`apps/`**: toda unidade **deployável** de forma independente — cada pasta aqui vira um artefato de produção próprio (um container Docker, um build do Expo, um deploy da Vercel). Uma regra simples orienta o que entra aqui: _"isso tem um pipeline de deploy próprio?"_ — se sim, é um app.
- **`packages/`**: código **reutilizado por mais de um app**, nunca deployado sozinho — apenas consumido como dependência interna do workspace. Nenhum `package` conhece detalhes de nenhum `app` específico (a dependência é sempre de app → package, nunca o contrário).
- **`shared/contracts/`**: uma pasta deliberadamente separada de `packages/types` — contém a **definição canônica** dos contratos de domínio (a forma dos DTOs de API, o formato dos eventos de domínio do Dossiê 14) da qual `packages/types` deriva os tipos TypeScript consumidos pelo frontend, e da qual o backend (`apps/api`) também deriva sua validação. É a fonte única de verdade que impede o contrato "divergir" entre backend e frontend ao longo do tempo (Seção 6.3 aprofunda isso).
- **`docs/`**: exatamente esta pasta — toda a documentação de produto/arquitetura/UX/backend já produzida (Dossiês 1–21), tratada como parte do código-fonte, versionada e revisada em Pull Request como qualquer outra mudança (Dossiê 23, Seção "Documentação viva").
- **`scripts/`**: automações que não são nem um app nem um package — geração de código a partir de templates, scripts de migração/seed de banco de desenvolvimento, scripts de corte de release.
- **`infra/`**: definição de infraestrutura como código (Terraform para os recursos de nuvem da fase de escala nacional, Dossiê 9 §2.8), Dockerfiles compartilhados, configuração de ambientes.
- **`.github/`**: workflows de CI/CD (Dossiê 23), templates de Issue/PR que padronizam a informação mínima exigida em toda contribuição.

---

## 4. Aplicações (`apps/`)

### 4.1 `apps/web` — Landing Page + Painel Administrativo

**Responsabilidade**: um único aplicativo Next.js (App Router) que serve **dois públicos distintos** através de _route groups_: `(marketing)` para a Landing Page (Dossiê 11 §1, público, SSG/SSR para SEO) e `(dashboard)` para o Painel Administrativo consumido por Empresa, Gestor e Escola (autenticado, Dossiê 11 §2/5).

**Por que os dois vivem no mesmo app, e não em `apps/landing` + `apps/dashboard` separados**: ambos compartilham 100% do design system (`packages/ui`), do tema (`packages/theme`) e da infraestrutura de autenticação (`packages/auth`) — separá-los em dois deploys distintos duplicaria configuração (domínio, variáveis de ambiente, pipeline) sem nenhum ganho real neste estágio, já que ambos têm o mesmo perfil de tráfego relativamente leve (comparado ao volume do app mobile) e o mesmo time tende a mexer nos dois. A divisão futura em dois apps separados (caso a Landing Page precise, por exemplo, de um CMS operado por um time de marketing sem acesso ao código do painel) é uma extração barata **exatamente pelo mesmo motivo do Dossiê 12 §1.4** — fronteiras já são respeitadas internamente (pastas de rota separadas, nenhum acoplamento de estado entre marketing e dashboard).

**Escola** consome o mesmo `apps/web`, sob o mesmo route group `(dashboard)`, com uma superfície de tela reduzida conforme seu RBAC (Dossiê 12 §5.2) — não é um app separado, é o mesmo shell de navegação (Dossiê 10 §11.2) com menos itens de menu.

### 4.2 `apps/mobile` — Motorista, Monitor e Responsável

**Responsabilidade**: um único app React Native/Expo, publicado como dois binários distintos por perfil de loja (ver Seção 4.2.1) a partir da mesma base de código, com navegação e telas condicionadas ao papel do usuário autenticado (Dossiê 11 §3/4).

**Por que um único código-fonte para papéis tão diferentes (Motorista/Monitor vs. Responsável)**: os três papéis compartilham a mesma infraestrutura crítica (autenticação, notificações, mapas, design system) e, mais importante, **o mesmo ciclo de release** — uma correção de bug de GPS ou de notificação beneficia motoristas e responsáveis simultaneamente, e mantê-los no mesmo app permite corrigir e publicar (inclusive via OTA, Dossiê 9 §6.2) de uma vez só. A navegação (Dossiê 10 §11.1) já é inteiramente condicionada por papel — um Responsável nunca vê a tela de checklist, um Motorista nunca vê a tela de acompanhamento de filho — então o código de tela é naturalmente segregado por pasta de feature (Dossiê 23), ainda que compilado no mesmo binário.

**4.2.1 — Um ou dois apps nas lojas?** Tecnicamente, o mesmo código-fonte gera **dois produtos de loja diferentes** (dois `app.json`/identificadores Expo distintos, dois ícones, dois nomes: "Rotta Motorista" e "Rotta Família"), porque a Apple/Google App Store tratam a descoberta e a percepção de marca de forma diferente para um público que instala por indicação de escola (responsável) versus um público que instala por ser contratado como motorista — misturar os dois em um único ícone/nome confundiria a experiência de primeira impressão. A base de código continua sendo **uma só** dentro de `apps/mobile`, com a diferenciação de build (ícone, nome, bundle ID) resolvida via _variantes de build_ do Expo (EAS Build profiles), não por duplicação de projeto.

### 4.3 `apps/admin` — Portal Admin Rotta

**Responsabilidade**: painel interno da equipe Rotta (Dossiê 11 §6) — clientes/tenants, suporte, financeiro, logs, métricas.

**Por que é um app separado, e não mais um route group dentro de `apps/web`**: diferente da Escola (que é "menos" do mesmo painel), o Admin Rotta tem um **modelo de autorização fundamentalmente diferente** (cross-tenant, Dossiê 12 §5.2) e uma superfície de ataque distinta — nunca deve ser possível, nem por engano de configuração de rota, que um bug no roteamento do painel de cliente exponha uma tela administrativa interna. Isolar em um app/deploy próprio, com seu próprio domínio (ex. `admin.rotta.com.br`, nunca em subcaminho do domínio de cliente) e potencialmente atrás de camadas adicionais de rede (VPN/allowlist de IP corporativo em V2), é uma decisão de segurança, não apenas de organização de código — reflete o princípio de defesa em profundidade já estabelecido no Dossiê 12 §5.

### 4.4 `apps/api` — Core API

**Responsabilidade**: o monólito modular NestJS (Dossiê 12) — todos os 24 módulos de negócio (Dossiê 13), exceto o que já foi isolado como serviço próprio (Seção 4.5/4.6).

### 4.5 `apps/realtime-gateway` — Serviço de GPS e Tempo Real

**Responsabilidade**: ingestão de GPS, geofencing, distribuição via Socket.IO (Dossiê 9 §14, Dossiê 14 §1) — já justificado como deploy independente desde o MVP por ter um perfil de carga incompatível com o resto da API (Dossiê 12 §1.3).

### 4.6 `apps/worker` — Processamento Assíncrono

**Responsabilidade**: consumidores das filas BullMQ (Dossiê 14 §2/3) — notificações, geração de relatórios, jobs agendados de manutenção/compliance. Compartilha o código de domínio com `apps/api` (mesmos módulos, mesma camada de aplicação/domínio, Dossiê 12 §2) mas é um processo e um deploy distintos, escaláveis independentemente (Dossiê 12 §12.1).

### 4.7 `apps/docs` — Documentação Viva

**Responsabilidade**: site que hospeda (a) o **Storybook** do `packages/ui` (cada componente do design system documentado, visualizável e testável isoladamente, Seção 5), e (b) a documentação técnica navegável (os Dossiês 1–23 renderizados como um site de documentação, não apenas arquivos Markdown soltos no GitHub) e (c) a documentação de API gerada automaticamente a partir dos decorators do NestJS (OpenAPI/Swagger, Dossiê 23 — Documentação viva). Deploy próprio, de baixíssima criticidade operacional (nunca compete por recursos/atenção de incidente com os apps de produção).

---

## 5. Packages Compartilhados (`packages/`)

Cada package abaixo segue o mesmo princípio do Dossiê 12 §1.4: interface pública clara, testável isoladamente, consumido por múltiplos apps sem que nenhum app precise conhecer os detalhes internos de implementação do package.

### 5.1 `packages/ui` — Design System

Todos os componentes visuais especificados no Dossiê 10 (§9: botões, inputs, cards, tabelas, modais, toasts, alertas, loading, skeleton, empty states) e no Dossiê 11 (organismos: mapa, timeline, cabeçalho de página). Organizado internamente por camada de abstração (átomos → moléculas → organismos, mesma nomenclatura do Dossiê 10 §12), documentado no Storybook (`apps/docs`). **Importante**: como React Native e React (web) não compartilham primitivas de renderização (`<div>` não existe em RN), `packages/ui` é internamente dividido em:

- `packages/ui/web` — implementação para Next.js (baseada em Tailwind + Radix/shadcn, Dossiê 9 §2.1).
- `packages/ui/native` — implementação para React Native (baseada em primitivas RN + biblioteca de estilos compatível, ex. NativeWind, para reaproveitar a mesma sintaxe de utilitário Tailwind entre web e mobile).
- Ambas consomem os **mesmos tokens** de `packages/theme` — a paridade visual entre plataformas vem da fonte de tokens compartilhada, não da implementação de componente (que é necessariamente distinta por plataforma).

### 5.2 `packages/theme`

Tokens de tema em código (cores, tipografia, espaçamento, raios — exatamente os valores especificados no Dossiê 10 §3–6), exportados como objetos TypeScript tipados e como variáveis CSS (para o web) — fonte única de verdade consumida tanto por `packages/ui/web` quanto por `packages/ui/native`, eliminando qualquer risco de "o azul do app ficar sutilmente diferente do azul do painel web" por dessincronia manual de valores hexadecimais copiados em dois lugares.

### 5.3 `packages/icons`

Biblioteca de ícones da marca (Dossiê 10 §4) como componentes React (web) e componentes RN (mobile), gerados a partir de uma única fonte de arquivos SVG — nunca ícones importados ad-hoc de fontes diferentes por app, o que quebraria a consistência visual exigida pelo briefing de design.

### 5.4 `packages/types`

Tipos TypeScript de todo contrato de domínio (entidades do Dossiê 8, DTOs de request/response do Dossiê 13) — gerados/derivados de `shared/contracts` (Seção 6.3), nunca escritos manualmente em duplicidade em cada app consumidor.

### 5.5 `packages/validators`

Schemas de validação (Zod) reutilizados tanto no frontend (validação de formulário client-side, Seção `packages/forms`) quanto no backend (`apps/api`, validação de payload de entrada) — a mesma regra "CPF precisa ter dígito verificador válido" (Dossiê 15 `AUTH-01`) é escrita **uma única vez** e usada nos dois lados, eliminando o risco clássico de front e back validarem de forma sutilmente diferente.

### 5.6 `packages/api-client`

Cliente HTTP tipado, gerado a partir do contrato de API do backend (Dossiê 13), consumido por `apps/web`, `apps/mobile` e `apps/admin` — nenhum desses apps escreve chamadas `fetch`/`axios` cruas para a API; todos consomem funções tipadas deste package (ex. `api.trips.start(routeId)`), de forma que uma mudança de endpoint quebra a compilação de todo consumidor desatualizado, em vez de falhar silenciosamente em produção.

### 5.7 `packages/auth`

Lógica de sessão compartilhada (armazenamento seguro de token por plataforma — `expo-secure-store` no mobile, cookie `httpOnly` no web, conforme Dossiê 12 §4.6 —, renovação automática de token, lógica de seleção de perfil) — cada app consome os mesmos hooks/serviços de autenticação, garantindo que o comportamento de expiração/renovação de sessão seja idêntico em toda a plataforma.

### 5.8 `packages/hooks`

Hooks React reutilizáveis não específicos de nenhum domínio de negócio (ex. `useDebounce`, `useMediaQuery`, `useGeolocation` abstraído por plataforma) — hooks de domínio de negócio (ex. `useAlunoAtivo`) vivem dentro da estrutura de _features_ de cada app (Dossiê 23), não aqui.

### 5.9 `packages/stores`

Stores de estado global client-side (Zustand, Dossiê 23) que fazem sentido compartilhar entre apps (ex. store de preferências de tema/notificação) — a maior parte do estado de servidor, no entanto, vive em TanStack Query (Dossiê 23), não aqui.

### 5.10 `packages/forms`

Componentes e lógica de formulário reutilizável (campo com label+erro+helper, Dossiê 10 §9.2) integrados a `packages/validators`, usados por qualquer fluxo de cadastro (Dossiê 15–20) em qualquer app.

### 5.11 `packages/maps`

Abstração sobre os provedores de mapa (Google Maps para geocodificação/rotas, Mapbox para renderização, Dossiê 9 §2.6) — cada app consome uma interface única (`<RottaMap />`, `geocode(endereco)`), nunca importando os SDKs de Google/Mapbox diretamente, preservando a capacidade de trocar de fornecedor sem tocar em código de aplicação (mesmo princípio de adapter do Dossiê 4 §18.3).

### 5.12 `packages/notifications`

Cliente de registro/recebimento de push (Firebase, Dossiê 9 §2.7) e lógica de exibição de notificação in-app (banner discreto, Dossiê 10) — abstrai a diferença entre a API de notificação do navegador (web) e a API nativa (mobile).

### 5.13 `packages/storage`

Abstração de armazenamento local (fila offline do motorista, Dossiê 14 §1.7, usando `expo-sqlite`/AsyncStorage no mobile; `localStorage`/IndexedDB quando aplicável no web) — cada app não decide diretamente qual mecanismo de storage usar, consome a interface deste package.

### 5.14 `packages/i18n`

Infraestrutura de internacionalização (Dossiê 23) — arquivos de mensagem, funções de formatação de data/número sensíveis a locale, hook de tradução consumido por todos os apps de frontend.

### 5.15 `packages/feature-flags`

Cliente de feature flags (Dossiê 23) consumido por todos os apps — nunca uma implementação de "flag" ad-hoc (variável de ambiente booleana espalhada) escrita individualmente em cada app.

### 5.16 `packages/constants`

Constantes de negócio compartilhadas entre frontend e (quando aplicável) o pacote de contratos consumido pelo backend — limiares padrão (ex. limiar de atraso padrão de 10 minutos, RN-15), enums que espelham `shared/enums` do backend (Dossiê 12 §3.1), evitando strings mágicas duplicadas em múltiplos apps.

### 5.17 `packages/utils`

Funções utilitárias puras (formatação de data, máscara de CPF/telefone, cálculo de idade a partir de data de nascimento) sem nenhuma dependência de framework — testáveis unitariamente em isolamento completo (Dossiê 23).

### 5.18 `packages/config`

Configurações compartilhadas de ferramental (ESLint, TypeScript, Prettier, Jest) que todo app/package do monorepo estende — nunca uma configuração de lint duplicada e potencialmente divergente por app (Dossiê 23, Seção Qualidade).

---

## 6. Organização do Design System no monorepo

### 6.1 Fluxo de um componente, do design ao consumo

```
Especificação (Dossiê 10/11)
   → Componente implementado em packages/ui/web e packages/ui/native
   → Documentado e visualmente testado no Storybook (apps/docs)
   → Consumido por apps/web, apps/mobile, apps/admin via import do package
```

### 6.2 Regra de ouro: nenhum app estiliza "por conta própria"

Nenhum componente visual (botão, card, modal) é criado diretamente dentro de `apps/web`, `apps/mobile` ou `apps/admin` fora de casos muito específicos de layout de página (que não é um componente reutilizável, é a composição de componentes de `packages/ui` em uma tela específica daquele app). Se uma tela precisa de um botão com uma variante que não existe ainda em `packages/ui`, a primeira pergunta é sempre "essa variante deveria existir no design system?" — na esmagadora maioria dos casos, sim, e o componente é adicionado/estendido em `packages/ui`, nunca duplicado inline no app consumidor. Esta é a aplicação prática, em nível de engenharia de repositório, do princípio "Design premium e minimalista" do Dossiê README: consistência visual é uma propriedade estrutural do monorepo, não uma disciplina que depende da boa vontade de cada desenvolvedor lembrar de seguir o guia de estilo.

### 6.3 `shared/contracts` como fonte única de verdade de tipos

Complementar à Seção 5.4/5.5: a pasta `shared/contracts` (fora de `packages/`, porque é consumida tanto pelo lado TypeScript do frontend quanto pela definição de validação do backend NestJS) define, em um formato único (schemas Zod, que geram tanto validação em runtime quanto tipos estáticos via inferência de tipo), a forma de cada DTO de API e de cada evento de domínio (Dossiê 14 §4). `packages/types` e `packages/validators` são, na prática, a re-exportação consumível desses contratos para o lado frontend; o `apps/api` consome os mesmos schemas diretamente para validação de entrada. O resultado prático: **o dia em que um campo do DTO de `Aluno` muda, o TypeScript quebra a build de todo consumidor desatualizado** (frontend web, app mobile, ou o próprio backend) no mesmo Pull Request, antes de qualquer código chegar a produção — a garantia mais forte de consistência de contrato que uma arquitetura de repositório consegue oferecer sem exigir disciplina manual de ninguém.
