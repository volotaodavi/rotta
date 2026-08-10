# Dossiê 37 — UX/UI Master do Marketplace da Rotta (Responsável) — Fase 1

> Escopo original (Prompt "UX/UI Master do Marketplace da Rotta —
> Responsável"): reformular a experiência do Responsável em torno de
> cinco pilares — mapa como protagonista, usuário nunca perdido, um
> objetivo por tela, pouca informação, tudo premium — cobrindo Home em
> dois estados (busca por escola / painel operacional), perfil da
> empresa como página institucional, timeline de status, animações,
> microinterações, tipografia/cores, Design System completo,
> responsividade total (iPhone SE a tablet/desktop).

## 1. Método

Antes de qualquer implementação: auditoria de código real de todo o
módulo Marketplace do Responsável (`apps/mobile/src/features/
marketplace`, `schools`, navegação `ParentNavigator`/
`MarketplaceNavigator`), do backend (`SearchTransportersParams`,
`TransporterDetail`, `School`) e do estado do `@rotta/ui/native`
(`export {}` — nenhum componente cross-feature nativo existia). O
escopo pedido é maior do que cabe com qualidade numa única entrega —
esta é a **Fase 1**: os itens de maior alavancagem, usando 100% de
capacidade já real do backend, sem substituir nenhuma funcionalidade
existente (Marketplace, Solicitação, Contrato, GPS/Acompanhamento,
Avaliações — todos intocados na lógica de negócio).

## 2. Descoberta: o backend já suportava busca por escola

`escolaId` já existia como filtro real e funcional de
`SearchTransportersParams`/`GET /marketplace/transporters` (Dossiê 16),
com o vínculo `escolasVinculadas` já filtrado no repositório
(`prisma-transporter.repository.ts`) — **nunca usado por nenhuma tela
até esta entrega**. `School.latitude`/`longitude` também já existiam
(geocodificados pelo Rotta Geo Engine). Isso significa que o fluxo
"busca-primeiro-pela-escola" pedido pelo Prompt não precisou de nenhuma
mudança de backend — só de expor, no app, uma capacidade que já
existia e nunca tinha UI.

## 3. Implementado

### 3.1 `@rotta/ui/native` — primeiros componentes reais

Documentado como `export {}` desde o Dossiê 22 ("nenhuma tela tinha
precisado ainda") — este Prompt foi o gatilho real, mesmo princípio já
usado para o `Modal` de `@rotta/ui/web` (Dossiê 36):

- **`Timeline`** (`molecules/Timeline`) — etapas com estado real
  (`done`/`current`/`pending`/`error`), nunca uma barra de progresso
  fake.
- **`BottomSheet`** (`organisms/BottomSheet`) — `Animated` +
  `PanResponder` (ambos do próprio `react-native`), sem nova
  dependência de gestos. Decisão de arquitetura explícita: o projeto já
  aceita dependência nativa quando o ganho é real
  (`@maplibre/maplibre-react-native`, `react-native-svg` — Dossiê 36
  §7), mas `react-native-reanimated` + `react-native-gesture-handler` +
  `@gorhom/bottom-sheet` é um compromisso maior (plugin de Babel, nova
  cadeia de gestos em todo o app) — fica registrado como próximo passo
  se o produto precisar de múltiplos snap-points (ver §5).

Ambos recebem `theme: Theme` explicitamente (nunca um Context) — este
pacote não pode depender do `ThemeProvider` específico de
`apps/mobile`.

### 3.2 Home (`mapa-screen.tsx`) — busca-primeiro-pela-escola

Reescrita completa do layout, mantendo toda a lógica de busca/filtro
anterior:

- **Mapa ocupa a tela inteira** (`flex: 1`), nunca mais um card de
  220px dentro de uma `ScrollView` — Pilar 1 do Prompt ("o mapa sempre
  será o protagonista... nunca desaparecer"). `MapaHome` passou a
  `headerShown: false` no stack (só esta tela — as demais do módulo
  mantêm o header nativo, sem mudar a navegação delas).
- **Barra de busca flutuante** no topo (`"Para qual escola seu filho
vai?"`, texto literal do Prompt), posicionada com `useSafeAreaInsets`
  (`react-native-safe-area-context`, já uma dependência do projeto —
  primeiro uso real dela no app).
- **Escolas no mapa**: enquanto o usuário digita, os resultados de
  `useSchoolsSearch` (hook já existente, usado antes só no formulário
  de solicitação) viram marcadores reais (`RottaMapMarker`) e uma lista
  compacta flutuante abaixo da busca — tocar num item OU num marcador
  seleciona a escola (`onMarkerPress`, já suportado por `RottaMap`).
- **Cartão de escola → Bottom Sheet**: ao selecionar uma escola, a
  busca de transportadores passa a incluir `escolaId` — o `BottomSheet`
  muda de título ("Transportadores próximos" → "Transportadores que
  atendem {Escola}") e de conteúdo automaticamente, sem endpoint novo.
- Filtros (ordenar por / somente verificados) continuam existindo,
  agora dentro do cabeçalho do `BottomSheet`, só visíveis no modo sem
  escola selecionada (fazem sentido para "perto de mim", não fazem
  sentido depois de já filtrar por escola).

### 3.3 `TransporterCard` — perfil, não item de compra

CTA explícito "Conhecer empresa" (ícone `ChevronRight`) no rodapé do
card — nunca "Comprar"/"Contratar"/"Adicionar" (Prompt: "nada de
linguagem de marketplace"). Card inteiro continua clicável (o CTA é só
o afordance visual, não um segundo toque).

### 3.4 Perfil do transportador — blocos institucionais

`transportador-detalhes-screen.tsx` reorganizada em blocos nomeados
("a página deve lembrar um site institucional"): "primeira dobra" com
nome/avaliação/CTA "Solicitar transporte" (movido para o topo — antes
ficava escondido no fim da tela), depois **Quem somos**, **Frota**,
**Área atendida**, **Contato**, **Avaliações recentes** — cada bloco só
com dado que `TransporterDetail` já expõe de verdade. Nenhum texto
inventado.

### 3.5 Timeline de status real

`transporte-inicio-screen.tsx` — os estados `SOLICITACAO_PENDENTE` e
`AGUARDANDO_CONTRATO` (que antes só mostravam um `StatusPill` solto)
agora renderizam a `Timeline` nova, com etapas calculadas a partir do
enum real (`TransportRequestStatus`: RECEBIDA/EM_ANALISE/APROVADA/
RECUSADA; `Contract.assinadoResponsavelEm`) — "Sem telas vazias. Tudo
em Timeline", como pedido, sem inventar nenhuma etapa que o backend não
reporte.

## 4. Fora desta Fase 1 (registrado, não escondido)

Por exigirem trabalho real e maior do que cabe nesta entrega:

- **Perfil institucional completo**: lista nomeada de motoristas/
  monitores, lista de escolas atendidas, galeria de fotos,
  documentação pública, FAQ — nenhum desses dados existe hoje em
  `TransporterDetail`/nenhum endpoint reverso "escolas de uma empresa"
  existe. Exigiria modelagem e endpoint novos no backend
  (`CompaniesModule`/`SchoolsModule`), fora do escopo "evolução de
  UX/UI sem mudar funcionalidade" deste Prompt.
- **"Anos de atuação"/"tempo médio de resposta"** nos cards de busca —
  mencionados no Prompt, não existem como campo calculado hoje;
  fabricar um número seria pior que omitir.
- **Estado 2 (painel operacional) fundindo as abas "Mapa" e
  "Transporte" numa única Home adaptativa** — o Prompt descreve uma
  única Home que muda de estado; a implementação atual (herdada,
  intocada) já cobre a mesma necessidade com duas abas
  (`ParentNavigator`: "Mapa" sempre marketplace, "Transporte" com
  rótulo dinâmico e todo o painel operacional real —
  `AcompanhamentoSection` com GPS ao vivo, `Timeline` agora incluída).
  Fundir as duas abas numa Home só é uma mudança de arquitetura de
  navegação genuína (afeta deep-links, badge de notificação, histórico
  de navegação) — decisão de produto que merece ser tomada
  explicitamente, não assumida de lado dentro de uma passada de UI.
- **Câmera acompanhando o veículo, transições com continuidade visual
  (shared element), múltiplos snap-points do Bottom Sheet** — exigem
  `react-native-reanimated`/`react-native-gesture-handler` (ver §3.1) e
  bastante ajuste fino de animação; registrado como próximo passo, não
  fingido com um placeholder.
- **Responsividade tablet/desktop** — o app mobile roda só em
  iOS/Android (não há build web deste app); os ajustes de layout para
  tablet não puderam ser testados neste ambiente (sem simulador/
  dispositivo disponível) — o layout usa Flexbox relativo em todo
  lugar (nenhum valor de pixel fixo além de ícone/raio pequenos), o que
  ajuda, mas não foi validado visualmente em tela grande.
- **Auditoria de copy "cara de IA"** em todo o app mobile — não
  repetida nesta entrega (já feita para a Landing Page em sessão
  anterior); os textos novos desta entrega (blocos do perfil, título da
  Home) foram escritos com o mesmo cuidado, não auditados
  sistematicamente pelo app inteiro.

## 5. Verificação

- `pnpm --filter @rotta/ui --filter @rotta/mobile --filter @rotta/theme --filter @rotta/icons run typecheck` — **passou** (0 erros).
- `eslint --fix` escopado a cada arquivo novo/editado — 0 erros; 2 avisos pré-existentes de estilo (`no-inline-styles`/`no-color-literals`), mesmo padrão já presente em código anterior não tocado por esta entrega.
- `git status --short` conferido antes do commit.
- Sem simulador/dispositivo neste ambiente — verificação visual real (mapa cheio, Bottom Sheet arrastável, busca de escola) fica pendente de teste manual num build de desenvolvimento (EAS dev client, já exigido por `@maplibre/maplibre-react-native`/`react-native-svg`).
