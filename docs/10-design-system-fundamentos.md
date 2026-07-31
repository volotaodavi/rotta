# Dossiê 10 — Experiência de Produto: Fundamentos e Design System

> Este dossiê aprofunda os Capítulos 26–30 (UX, UI, Design System, Componentes, Estrutura das telas — `docs/06-ux-ui-design-system.md`, ainda a ser detalhado no plano original de 40 capítulos) com o nível de especificação necessário para um time de design/front-end implementar sem ambiguidade. O Dossiê 11 (`docs/11-experiencia-telas-fluxos-wireframes.md`) complementa este com as telas, fluxos e wireframes tela a tela. Nenhum código é escrito aqui — é especificação de produto e design.

---

## 1. Princípios de experiência (o que cada referência ensina à Rotta)

A Rotta não copia nenhum desses produtos — extrai um princípio específico de cada um, porque cada um resolve um problema de UX que a Rotta também tem:

| Referência | Princípio extraído | Onde se manifesta na Rotta |
|---|---|---|
| **Uber** | Uma única tela "diz tudo" sobre o estado atual (onde está o carro, quando chega) sem exigir navegação | Tela de mapa ao vivo do Responsável mostra tudo em uma tela: posição, ETA, status — nunca exige trocar de aba para saber "cadê meu filho" |
| **Google Maps** | Camadas de informação aparecem progressivamente, nunca todas de uma vez | O mapa do Gestor mostra veículos por padrão; detalhes de uma rota só aparecem ao tocar naquele veículo — não polui o mapa com tudo simultaneamente |
| **Stripe Dashboard** | Densidade de dado com clareza — tabelas e números complexos apresentados sem parecer complicado | Dashboard operacional do Gestor (Capítulo 31) usa a mesma lógica: KPIs no topo, tabela densa abaixo, sem enfeite visual competindo com o dado |
| **Notion** | Estrutura hierárquica clara, tipografia como principal ferramenta de hierarquia (não cor, não borda) | Toda tela da Rotta usa peso e tamanho de fonte, não caixinhas coloridas, para indicar o que é mais importante |
| **Apple** | Restrição deliberada — poucos elementos na tela, cada um com propósito único, sem redundância visual | Telas do app do motorista/responsável nunca têm mais de 1 ação primária visível por vez |
| **Linear** | Velocidade percebida — toda interação responde instantaneamente (otimismo de UI), atalhos de teclado no painel web | Toda ação no painel (criar rota, cadastrar aluno) atualiza a UI otimisticamente antes da confirmação do servidor |
| **Airbnb** | Confiança transmitida por fotos reais, avaliação e prova social — reduzir ansiedade de "estou entregando meu filho a um desconhecido" | Perfil do motorista (foto, documentos verificados, "selo Rotta verificado") visível ao responsável desde o primeiro dia |

### 1.1 As quatro regras inegociáveis de UX da Rotta

1. **Zero telas com mais de 1 decisão principal.** Se uma tela pede para o usuário decidir duas coisas importantes ao mesmo tempo, ela é duas telas.
2. **Toda ação crítica de segurança exige confirmação explícita; toda ação não crítica não exige confirmação nenhuma.** Nada de "tem certeza?" para ações reversíveis e de baixo risco — isso é ruído que ensina o usuário a clicar em "confirmar" sem ler.
3. **Nenhuma tela em branco sem explicação.** Todo estado vazio explica o que fazer a seguir (Seção 9.7).
4. **O texto da interface nunca explica o óbvio.** Um botão chamado "Iniciar rota" não precisa de um parágrafo abaixo dizendo "clique aqui para iniciar a rota".

---

## 2. Grid e layout

### 2.1 Unidade base

Toda medida de espaçamento, tamanho de componente e grid deriva de uma unidade base de **4px**. Isso garante alinhamento consistente entre design e implementação (qualquer valor é um múltiplo de 4), e simplifica a comunicação entre design e engenharia ("esse espaçamento é um 6" em vez de "18px").

### 2.2 Breakpoints responsivos

| Breakpoint | Largura | Dispositivo típico |
|---|---|---|
| `xs` | < 480px | iPhone SE e celulares compactos |
| `sm` | 480–767px | Celulares padrão (retrato) |
| `md` | 768–1023px | Tablets (retrato), celulares grandes (paisagem) |
| `lg` | 1024–1439px | Tablets (paisagem), notebooks |
| `xl` | ≥ 1440px | Desktops e monitores grandes |

### 2.3 Grid por breakpoint

| Contexto | Colunas | Gutter | Margem lateral | Largura máxima de conteúdo |
|---|---|---|---|---|
| Mobile (`xs`/`sm`) | 4 colunas | 16px | 16px | 100% |
| Tablet (`md`) | 8 colunas | 20px | 24px | 100% |
| Desktop (`lg`/`xl`) | 12 colunas | 24px | 32px (`lg`) / auto-centralizado (`xl`) | 1280px de conteúdo, painel de dados até 1440px |

**Regra de ouro**: o painel web nunca usa a largura total da tela em monitores grandes — o conteúdo é centralizado com largura máxima de 1280–1440px, preservando o "muito espaço negativo" pedido, em vez de esticar tabelas e formulários até as bordas de um monitor ultrawide.

### 2.4 Escala de espaçamento (tokens)

| Token | Valor | Uso típico |
|---|---|---|
| `space-1` | 4px | Espaço entre ícone e texto dentro de um botão pequeno |
| `space-2` | 8px | Espaço entre elementos muito próximos (label e input) |
| `space-3` | 12px | Padding interno de componentes compactos |
| `space-4` | 16px | Padding padrão de cards e inputs; espaçamento entre itens de lista |
| `space-6` | 24px | Espaço entre blocos/seções dentro de uma tela |
| `space-8` | 32px | Espaço entre grupos de seção |
| `space-12` | 48px | Espaço entre grandes blocos de layout (ex. hero e seção seguinte) |
| `space-16` | 64px | Respiro entre seções da Landing Page |
| `space-24` | 96px | Respiro máximo, usado com moderação em telas de altíssimo impacto (hero da Landing) |

---

## 3. Tipografia

### 3.1 Família tipográfica

**Inter** como tipografia única da marca (variable font), em todo o ecossistema — landing page, painel web e app mobile. Justificativa: Inter é desenhada especificamente para interfaces digitais (alta legibilidade em tamanhos pequenos, números tabulares para dados/KPIs, ampla gama de pesos), é gratuita e open-source (sem custo de licenciamento em escala), e é a mesma escolha por trás da estética "premium minimalista" de Linear e de boa parte do ecossistema Stripe/Vercel — exatamente o território visual que a Rotta mira. No app mobile, mantém-se Inter (não a fonte de sistema) para garantir que a marca pareça idêntica em iOS e Android, em vez de herdar San Francisco de um lado e Roboto do outro.

### 3.2 Escala tipográfica

| Estilo | Tamanho / Altura de linha | Peso | Uso |
|---|---|---|---|
| `display` | 40px / 48px (mobile: 32px/40px) | 700 (Bold) | Hero da Landing Page, número de destaque em KPI muito grande |
| `h1` | 32px / 40px (mobile: 26px/32px) | 700 | Título de tela principal (ex. "Dashboard", "Alunos") |
| `h2` | 24px / 32px | 600 (Semibold) | Título de seção dentro de uma tela |
| `h3` | 20px / 28px | 600 | Título de card/bloco |
| `body-lg` | 16px / 24px | 400 / 500 | Texto de leitura confortável, descrições importantes |
| `body` | 14px / 20px | 400 | Texto padrão de interface (rótulos, texto de tabela, parágrafos) |
| `caption` | 12px / 16px | 400 / 500 | Metadados, timestamps, textos auxiliares |
| `label` | 13px / 16px | 600, leve tracking positivo (+0.2px) | Texto de botão, tag, badge, cabeçalho de tabela |
| `mono-data` | 14px / 20px | 500, tabular-nums | Placas de veículo, CPF/CNPJ, horários — qualquer dado que precise alinhar verticalmente em coluna |

### 3.3 Hierarquia — regra de uso

A hierarquia visual é construída **primariamente por peso e tamanho de fonte**, nunca por cor ou por caixas decorativas. Uma tela nunca deve precisar de uma cor de destaque para indicar "isto é mais importante" — o tamanho/peso já resolve isso (princípio Notion/Apple, Seção 1). Cor é reservada exclusivamente para significado semântico (sucesso, alerta, erro, marca) — nunca para hierarquia pura.

---

## 4. Ícones

- **Biblioteca**: conjunto de ícones baseado em traço (*stroke-based*, estilo Lucide/Feather) — mesma linha visual de Linear e Notion, consistente com "ícones consistentes" pedido pelo briefing.
- **Espessura de traço**: 1.5px (telas densas de dado, painel web) a 2px (app mobile, onde ícones são vistos a distâncias/tamanhos menores e precisam de mais peso visual para legibilidade).
- **Tamanhos padronizados**: 16px (dentro de texto/badges), 20px (padrão em botões e itens de lista), 24px (ícones de navegação principal, cabeçalhos de seção), 32px+ (ilustração de empty state, ícone de destaque).
- **Regra de uso**: todo ícone interativo (clicável) tem uma área de toque mínima de 44×44px (mobile) / 32×32px (web), mesmo que o ícone visual seja menor — requisito de acessibilidade e de usabilidade para o público de menor familiaridade digital (persona "Seu Anderson", Capítulo 5).
- **Nunca decorativo**: um ícone nunca aparece "porque fica bonito" — todo ícone carrega significado (ação, status, categoria). Ícone sem rótulo textual só é aceitável quando o significado é universalmente reconhecido (voltar, fechar, buscar, mais opções) — qualquer ícone de significado ambíguo é sempre acompanhado de texto.

---

## 5. Raios de borda (border-radius)

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 6px | Badges, tags, inputs pequenos, checkboxes |
| `radius-md` | 10px | Botões, inputs padrão, itens de lista |
| `radius-lg` | 16px | Cards, modais, painéis flutuantes |
| `radius-xl` | 24px | Blocos de destaque da Landing Page (hero cards, imagens grandes) |
| `radius-full` | 9999px | Avatares, pills de status, botão de ação flutuante (FAB) |

Consistência: nunca misturar dois valores de raio dentro do mesmo componente composto (ex. um card `radius-lg` nunca contém um botão `radius-sm` — o botão interno usa `radius-md`, e a proporção visual entre os dois raios foi calibrada para nunca parecer desalinhada).

---

## 6. Paleta de cores

### 6.1 Filosofia da paleta

O briefing de marca restringe a paleta a azul, preto, branco e cinza — **decisão mantida como regra geral**, com uma única exceção deliberada e documentada: três cores semânticas mínimas (verde, âmbar, vermelho) para estados de sucesso/alerta/perigo, porque a Rotta é um produto de **segurança infantil em tempo real**, e a ambiguidade de "está tudo bem ou não?" comunicada apenas por tom de azul/cinza seria uma regressão de segurança em nome de uma regra estética. Essas três cores são usadas com extrema disciplina — nunca como cor decorativa, sempre como sinalização de estado, e sempre a menor mancha de cor possível na tela (um ponto, um ícone, uma borda fina — nunca um bloco grande).

### 6.2 Tokens — Tema Escuro (padrão da plataforma)

| Token | Hex | Uso |
|---|---|---|
| `background` | `#0B0F14` | Fundo base de toda a aplicação |
| `surface` | `#12161D` | Cards, painéis, barra lateral, cabeçalho de tabela |
| `surface-elevated` | `#1A2029` | Modais, dropdowns, popovers — qualquer camada "acima" da superfície padrão |
| `primary` | `#3B6EF6` | Cor de marca: botão primário, links, ícone ativo, elementos de destaque de marca |
| `primary-hover` | `#5A8CFF` | Estado de hover/pressed do primary |
| `primary-muted` | `#1B2B4D` | Fundo sutil para realçar um item ativo (ex. item de menu selecionado) sem competir com o `primary` sólido |
| `secondary` | `#E5E8EC` (aplicado sobre fundo escuro como texto/ícone) | Botões secundários, ações de segunda prioridade — visualmente neutro (cinza-claro), nunca azul, para não competir com o `primary` |
| `success` | `#22C55E` | Confirmação de embarque/desembarque concluído, documento em dia, rota no horário |
| `warning` | `#F5A623` | Atraso, documento vencendo em breve, ação pendente de atenção |
| `danger` | `#EF4444` | Documento vencido/bloqueio, ocorrência grave, SOS, exclusão destrutiva |
| `border` | `#232A35` | Divisores, bordas de card e input em estado padrão |
| `border-strong` | `#333C4A` | Borda de input em foco (sem ser a cor primary sólida), separadores de maior ênfase |
| `text` | `#F5F7FA` | Texto principal |
| `text-muted` | `#9AA4B2` | Texto secundário, metadados, placeholder |
| `text-disabled` | `#5C6673` | Texto de elemento desabilitado |

### 6.3 Tokens — Tema Claro

| Token | Hex | Uso |
|---|---|---|
| `background` | `#FFFFFF` | Fundo base |
| `surface` | `#F7F8FA` | Cards, painéis |
| `surface-elevated` | `#FFFFFF` (com sombra sutil, já que não há como "clarear" mais que branco) | Modais, dropdowns |
| `primary` | `#2F5FE0` | Ligeiramente mais escuro que no tema dark, para manter contraste AA sobre fundo branco |
| `primary-hover` | `#1E4BC7` | — |
| `primary-muted` | `#E8EEFF` | Fundo sutil de item ativo |
| `secondary` | `#4B5563` | Texto/ícone de ação secundária |
| `success` | `#16A34A` | — |
| `warning` | `#D97706` | — |
| `danger` | `#DC2626` | — |
| `border` | `#E5E8EC` | — |
| `border-strong` | `#C7CDD6` | — |
| `text` | `#0B0F14` | — |
| `text-muted` | `#6B7280` | — |
| `text-disabled` | `#A6ACB5` | — |

### 6.4 Onde cada cor deve ser utilizada (guia de aplicação)

- **`primary` (azul)**: reservado para (a) a ação principal de cada tela (um único botão `primary` por tela, nunca dois competindo), (b) links e elementos interativos de texto, (c) estado ativo de navegação, (d) elementos de identidade de marca (logo, splash screen). Nunca usado como cor de fundo de bloco de conteúdo extenso — azul em excesso dilui o próprio significado de "isto é a ação principal".
- **`secondary` (cinza)**: toda ação de segunda prioridade (cancelar, voltar, ações auxiliares) — visualmente discreta para não competir com o `primary`.
- **`background`/`surface`/`surface-elevated`**: sistema de profundidade — quanto mais "acima" um elemento está na hierarquia visual (modal > card > fundo), mais claro (no dark) o tom de superfície, criando profundidade sem depender de sombra pesada.
- **`success`/`warning`/`danger`**: exclusivamente para estado operacional e de sistema (nunca decoração): confirmação, alerta de atenção, erro/bloqueio/perigo. Sempre acompanhadas de um ícone e/ou texto explícito — nunca a cor sozinha como único portador de significado (requisito de acessibilidade, Seção 12).
- **`border`**: divisão sutil entre elementos — nunca uma borda "forte" ao redor de cards no estado padrão (o produto usa separação por espaço negativo primeiro, borda sutil como reforço secundário).
- **`text`/`text-muted`/`text-disabled`**: hierarquia de leitura — título e dado principal em `text`, metadado/legenda em `text-muted`, qualquer coisa não interativa no momento em `text-disabled`.
- **`muted`** (mencionado no briefing): mapeado a `text-muted` para texto e a `surface`/`primary-muted` para fundo — não existe como um token de cor isolado, é um **modificador de opacidade/tom** aplicado aos tokens acima, evitando multiplicar a paleta com mais uma cor nomeada.

---

## 7. Tema: Dark Mode e Light Mode

### 7.1 Quando usar cada um

- **Dark Mode é o tema padrão de toda a plataforma** (identidade de marca definida no briefing) — landing page, painel web, e ambos os apps abrem em dark por padrão, independentemente da configuração do sistema operacional do usuário na primeira instalação.
- **Light Mode é oferecido como opção**, não removido: (a) alguns usuários (especialmente o público de idade mais avançada, como a persona "Seu Anderson") relatam consistentemente melhor legibilidade em tema claro sob luz solar direta — cenário extremamente comum para um motorista dirigindo de dia; (b) o painel administrativo usado em ambiente de escritório tradicional pode ser preferido em claro por parte dos Gestores; (c) respeito à preferência de acessibilidade do usuário (`prefers-color-scheme` do sistema é respeitado na primeira abertura, com opção de sobrescrever manualmente nas configurações).
- **Regra de consistência**: a troca de tema é sempre uma preferência explícita e persistente por usuário (não por tela) — nunca uma tela específica "força" um tema diferente do restante do app.

### 7.2 Direção de exceção prática

Para o **app do motorista**, especificamente, dado o uso sob luz solar direta durante boa parte do dia operacional, o Light Mode é sugerido ativamente (não forçado) na primeira configuração se o app detectar alto brilho ambiente do dispositivo (quando a API do sistema operacional expuser essa informação) — um ajuste de usabilidade real acima da preferência estética padrão da marca.

---

## 8. Responsividade

### 8.1 Princípio geral

A Rotta não tem uma versão "mobile" e uma "desktop" do produto — tem **um único design system responsivo** que se adapta, mas cada superfície (app nativo vs. painel web) tem seu próprio conjunto de telas otimizado para o contexto de uso, não um redimensionamento automático ingênuo de uma para a outra.

### 8.2 Comportamento por dispositivo

| Dispositivo | Superfície | Comportamento |
|---|---|---|
| **iPhone / Android (celular)** | App nativo (Motorista, Monitor, Responsável) | Navegação por Bottom Navigation + gestos nativos; layout de coluna única; tipografia otimizada para leitura a um braço de distância |
| **Tablet** | Painel web responsivo (Gestor/Empresa/Escola/Admin usando o painel em tablet) ou o app nativo em modo tablet (Responsável acompanhando em um iPad, por ex.) | Painel web usa grid de 8 colunas, navegação lateral colapsável; app nativo em tablet ganha layout de duas colunas em telas que fazem sentido (ex. lista de alunos + detalhe lado a lado) |
| **Notebook / Desktop** | Painel web (Gestor/Empresa/Escola/Admin) | Sidebar fixa, densidade de informação maior, atalhos de teclado habilitados (princípio Linear), tabelas com mais colunas visíveis simultaneamente |

### 8.3 O que nunca muda entre dispositivos

Paleta de cores, tipografia, tokens de espaçamento/raio, e a linguagem de iconografia são **idênticos** em todas as superfícies — o que muda é a densidade de informação por tela e o padrão de navegação (Seção 13), nunca o vocabulário visual.

---

## 9. Componentes — especificação

### 9.1 Botões

**Variantes**: `primary` (ação principal, fundo `primary` sólido), `secondary` (fundo `surface`, borda `border-strong`, texto `text`), `ghost` (sem fundo, apenas texto/ícone, usado em ações terciárias ou dentro de tabelas), `destructive` (fundo `danger`, reservado a ações irreversíveis como excluir aluno/cancelar conta).

**Tamanhos**: `sm` (32px de altura, uso em tabelas/toolbars), `md` (40px, padrão), `lg` (48px, ações principais de tela cheia e CTAs da Landing Page).

**Estados obrigatórios de todo botão**: `default`, `hover` (leve clareamento/escurecimento do fundo, nunca mudança de cor de família), `pressed` (leve escala 0.98 + escurecimento adicional), `focus` (anel de foco visível de 2px em `primary` para navegação por teclado — requisito de acessibilidade), `disabled` (opacidade reduzida + `cursor: not-allowed`, nunca some da tela), `loading` (substitui o texto por um spinner inline do mesmo tamanho do texto, mantendo a largura do botão fixa para não "pular" o layout).

**Regra de conteúdo**: rótulo de botão é sempre um verbo de ação ("Criar rota", não "Rota"), nunca mais de 3 palavras, primeira letra maiúscula apenas (nunca ALL CAPS, nunca Title Case Completo).

### 9.2 Inputs

**Tipos**: texto, número, telefone (com máscara e seletor de DDI para expansão internacional futura), data (com date-picker nativo/customizado consistente com o design system), seleção única (`select`), seleção múltipla (`multi-select` com chips), busca (com ícone de lupa e "x" de limpar quando preenchido), upload de arquivo (Seção 9.4 do Dossiê 8 — visual próprio com estado de progresso).

**Estrutura visual**: rótulo (`label`) sempre acima do campo (nunca *placeholder* fazendo o papel de rótulo — *placeholder* desaparece ao digitar e o usuário perde a referência, problema clássico de acessibilidade); texto auxiliar (*helper text*) abaixo do campo quando necessário; mensagem de erro substitui o texto auxiliar quando presente, sempre em `danger` com ícone.

**Estados**: `default` (borda `border`), `focus` (borda `primary`, leve halo), `filled` (com valor, borda `border-strong`), `error` (borda `danger` + mensagem), `disabled` (fundo `surface`, texto `text-disabled`), `readonly` (sem borda destacável, cursor padrão, usado em campos derivados/calculados, ex. "distância estimada da rota").

### 9.3 Cards

Um único padrão de card em toda a plataforma: fundo `surface`, raio `radius-lg`, padding `space-4`/`space-6`, sem sombra pesada (o produto usa a diferença de tom entre `background` e `surface` para criar profundidade, não sombra dramática — alinhado ao princípio "nunca cards exagerados" do briefing). Borda `border` sutil opcional, usada apenas quando o card está sobre um fundo de mesma cor de superfície (ex. card dentro de outro card em um layout de detalhe) e precisa de separação adicional.

**Anti-padrão explicitamente banido**: cards com gradientes, ícones decorativos grandes dentro do card sem função, ou sombras multicamada — tudo isso é a "interface antiga" que o briefing pede para nunca usar.

### 9.4 Tabelas

Componente central do Dashboard da Empresa e do Admin Rotta (dado denso, referência Stripe). Especificação: cabeçalho fixo (`sticky`) ao rolar, linha com altura mínima de 48px (área de toque confortável mesmo em tabelas usadas em tablet), zebra-striping **não utilizado** (o briefing pede "nada poluído" — separação de linha é feita por um traço `border` fino de 1px, não por alternância de cor de fundo), coluna de ação (ícone `ghost`) sempre à direita, ordenação por clique no cabeçalho com indicador de seta minimalista, busca e filtros acima da tabela (nunca dentro do cabeçalho da própria tabela).

**Estado de linha selecionável**: ao selecionar uma ou mais linhas (para ação em massa, ex. "enviar comunicado a estes alunos"), a linha ganha fundo `primary-muted`, nunca uma borda grossa colorida.

### 9.5 Modais

Reservados para: (a) confirmação de ação destrutiva/crítica (excluir, cancelar assinatura), (b) formulário curto e contido (ex. "adicionar substituto para esta rota"), (c) visualização rápida de detalhe sem navegação de página inteira (ex. detalhe de uma ocorrência). Nunca usados para formulários longos e multi-etapa (isso vira uma tela própria ou um *drawer* lateral). Fundo `surface-elevated`, raio `radius-lg`, overlay escuro semitransparente (`rgba(0,0,0,0.6)` sobre o fundo), fechamento por clique fora, tecla `Esc`, ou botão "X" explícito — sempre as três opções disponíveis simultaneamente.

### 9.6 Toasts (notificações transitórias de sistema)

Usados para confirmar o resultado de uma ação que o usuário acabou de tomar (ex. "Rota criada com sucesso", "Falha ao salvar — tente novamente"). Aparecem no canto superior direito (web) ou no topo da tela (mobile), com ícone de estado (`success`/`danger`/informativo em `primary`), desaparecem automaticamente após 4 segundos (ações de sucesso) ou permanecem até dispensados manualmente (erros que exigem ação do usuário). Nunca empilham mais de 3 simultaneamente — o quarto substitui o mais antigo.

### 9.7 Alertas (banners inline, persistentes)

Diferente do toast (transitório, sobre a ação recém-tomada), o Alerta é **persistente na tela** enquanto a condição que o gerou existir — ex. "Este motorista tem a CNH vencendo em 5 dias" no topo da tela de perfil do motorista. Visual: barra horizontal de fundo `warning`/`danger`/`primary` em tom muito sutil (nunca a cor sólida cobrindo todo o alerta — apenas uma borda lateral de 3px na cor semântica + ícone + fundo com opacidade baixa da mesma cor), texto curto, e uma ação associada quando aplicável ("Ver documento", "Regularizar agora").

### 9.8 Loading

Dois padrões, nunca misturados na mesma tela: (a) **spinner** minimalista (arco girando, cor `primary`) para ações pontuais e rápidas (submissão de formulário, botão em estado `loading`); (b) **Skeleton** (Seção 9.9) para carregamento de conteúdo de tela inteira ou de listas — nunca um spinner central grande de tela cheia para carregar uma lista, porque isso é exatamente o padrão "ultrapassado" que o briefing pede para evitar.

### 9.9 Skeleton (esqueleto de carregamento)

Blocos de fundo `surface` com leve animação de "pulso" (opacidade oscilando suavemente), no formato exato do conteúdo que vai aparecer (ex. um skeleton de linha de tabela tem a mesma altura e divisão de colunas da linha real) — para que o layout não "pule" quando o dado real chega. Usado em: carregamento inicial de dashboard, lista de rotas/alunos/motoristas, histórico de viagens.

### 9.10 Empty States (estados vazios)

Todo empty state segue a mesma estrutura de três elementos: **ícone/ilustração simples** (linha única, consistente com a iconografia do produto, nunca uma ilustração colorida destoante da paleta) + **frase curta explicando o estado** ("Nenhuma rota criada ainda") + **ação primária clara** ("Criar primeira rota"). Nunca um empty state que só diz "Nada aqui" sem oferecer o próximo passo — coerente com a regra 3 da Seção 1.1.

### 9.11 Estados de erro

Dois níveis: **erro de campo** (Seção 9.2, contido, específico) e **erro de tela/sistema** (ex. falha de conexão ao carregar o dashboard) — este último segue a mesma estrutura do Empty State (ícone + frase + ação, neste caso "Tentar novamente"), nunca um código de erro técnico cru exposto ao usuário final (mensagens técnicas completas vão para o log, Capítulo 17, não para a tela).

### 9.12 Estados de sucesso

Confirmação de sucesso é, na maioria dos casos, um Toast (Seção 9.6) — discreto, não bloqueia o fluxo. Exceção: sucessos que representam o fim de um fluxo importante de múltiplas etapas (ex. finalizar o onboarding da empresa, concluir o cadastro completo de uma rota) recebem uma tela de confirmação dedicada, com o mesmo padrão visual do Empty State (ícone de sucesso em `success`, frase de confirmação, próxima ação sugerida) — o momento de sucesso é também um momento de orientação para o próximo passo, nunca um beco sem saída.

---

## 10. Acessibilidade

### 10.1 Por que é inegociável neste produto

Acessibilidade não é uma funcionalidade extra na Rotta — é parte do compromisso de "UX extremamente simples" e do público real do produto: motoristas de mais idade, responsáveis com deficiência visual/motora, e o requisito legal-moral de um produto que lida com segurança de crianças não pode excluir nenhum adulto responsável por essa segurança.

### 10.2 Requisitos concretos

- **Contraste**: todo par texto/fundo atende no mínimo **WCAG AA** (4.5:1 para texto padrão, 3:1 para texto grande/`h1`+). Os tokens de cor das Seções 6.2/6.3 foram calibrados para atender esse mínimo em ambos os temas.
- **Nunca cor como único portador de informação**: todo estado (sucesso/alerta/erro) é sempre acompanhado de ícone e/ou texto, nunca apenas uma mudança de cor (crítico para usuários com daltonismo, comum o suficiente para ser tratado como caso central, não exceção).
- **Área de toque mínima**: 44×44px em qualquer elemento interativo no app mobile (padrão de acessibilidade da Apple/Google), 32×32px no painel web.
- **Navegação por teclado completa no painel web**: todo fluxo (login, criar rota, cadastrar aluno) deve ser 100% operável sem mouse, com indicador de foco visível (anel `primary` de 2px) em cada elemento focável, em ordem lógica de tabulação.
- **Leitores de tela**: toda imagem/ícone com significado tem texto alternativo; toda ação tem rótulo acessível mesmo quando visualmente é só um ícone; estrutura semântica de cabeçalhos (`h1`→`h2`→`h3`) segue a hierarquia real da informação, não escolhida por efeito visual.
- **Tamanho de fonte ajustável**: o app respeita a configuração de tamanho de fonte do sistema operacional (Dynamic Type no iOS, escala de fonte no Android) sem quebrar layout — testado especificamente até o nível "grande" de acessibilidade do sistema.
- **Redução de movimento**: toda animação/microinteração (Capítulo 33/Seção 11 do Dossiê 11) respeita a preferência de sistema "reduzir movimento", substituindo transições por mudanças instantâneas de estado quando essa preferência estiver ativa.
- **Linguagem simples**: todo texto de interface é escrito no nível de leitura mais simples possível (evitar jargão técnico/jurídico), com atenção redobrada em telas usadas pela persona "Seu Anderson" (motorista, Capítulo 5).

---

## 11. Sistema de navegação

### 11.1 App mobile (Motorista, Monitor, Responsável)

- **Bottom Navigation** (barra inferior fixa) como navegação primária — 3 a 4 itens no máximo (ex., para o Responsável: Mapa · Histórico · Notificações · Perfil), nunca mais que isso (mais itens dilui a decisão e contraria a regra de "poucos elementos").
- **Sem menu hambúrguer**: a navegação principal é sempre visível na barra inferior — o menu escondido atrás de um ícone de hambúrguer é um padrão que aumenta a carga cognitiva ("o que tem lá dentro?") e foi deliberadamente descartado (é, literalmente, o exemplo de "interface antiga" mencionado no briefing).
- **Sem FAB (Floating Action Button) no app do Responsável** (não há uma ação de criação frequente que justifique um botão flutuante). **Com FAB no app do Motorista/Monitor** apenas na tela de checklist ativo, como atalho de uma mão para "Registrar ocorrência" — a única ação que precisa estar acessível a qualquer momento durante a viagem sem navegar.
- **Navegação hierárquica dentro de uma aba**: pilha de telas com botão de "voltar" no canto superior esquerdo (padrão nativo iOS/Android respeitado, não uma barra de voltar customizada que rompe a expectativa do sistema operacional).

### 11.2 Painel Web (Gestor, Empresa, Escola, Admin Rotta)

- **Sidebar fixa à esquerda** (colapsável para ícones apenas, em telas menores/tablet) — itens de navegação por módulo (Dashboard, Rotas, Alunos, Motoristas, Veículos, Escolas, Documentos, Relatórios, Configurações), com o item ativo destacado por fundo `primary-muted` (nunca por uma barra colorida grossa).
- **Breadcrumb**: usado apenas em telas de profundidade 3+ (ex. Rotas → Rota "Manhã Girassol" → Parada 3) — nunca em telas de nível 1–2, onde a sidebar já deixa claro "onde estou".
- **Busca global** no topo do painel (atalho de teclado `Cmd/Ctrl+K`, inspirado diretamente em Linear/Notion) para localizar rapidamente um aluno, motorista, rota ou veículo sem navegar manualmente pela sidebar.
- **Sem FAB no painel web** — ações de criação ficam em um botão `primary` no canto superior direito de cada tela de listagem ("+ Nova rota", "+ Novo aluno"), padrão consistente de posição em toda a plataforma.

### 11.3 Regra de consistência entre superfícies

A **ordem de prioridade da informação** (o que aparece primeiro) é a mesma entre app e painel web para o mesmo domínio (ex. tanto no app do motorista quanto no painel do gestor, o status "atrasado" tem a mesma cor, o mesmo ícone e a mesma posição relativa de destaque) — a navegação muda de padrão (bottom nav vs. sidebar) porque o dispositivo exige, mas o **vocabulário visual e a hierarquia de significado nunca mudam**.

---

## 12. Componentização — lista de componentes reutilizáveis

Organizados por camada de abstração (do mais atômico ao mais composto), formando a base do pacote de design system compartilhado entre painel web e app (Capítulo 38 — pacote `ui` do monorepo):

**Átomos**: Botão · Input de texto · Select · Checkbox · Radio · Switch/Toggle · Avatar · Badge/Pill de status · Ícone · Tipografia (componentes de texto padronizados `Display`/`H1`/`H2`/`Body`/`Caption`) · Divider · Spinner · Tag/Chip.

**Moléculas**: Campo de formulário (label + input + helper/erro) · Card de KPI (número + rótulo + variação) · Item de lista (avatar + título + subtítulo + ação) · Barra de busca · Seletor de data/período · Upload de arquivo com progresso · Linha de tabela · Cabeçalho de tabela com ordenação · Alerta inline · Toast · Stepper de progresso (onboarding, cadastro multi-etapa).

**Organismos**: Tabela completa (com busca, filtro, paginação, seleção em massa) · Modal · Drawer lateral · Formulário multi-etapa (wizard) · Mapa com marcadores e popup de detalhe · Timeline de eventos de uma viagem · Card de perfil (motorista/veículo/aluno) com documentos e status · Menu de navegação (sidebar/bottom nav) · Cabeçalho de página (título + breadcrumb + ação primária) · Empty state · Tela de erro.

**Templates de tela**: Layout de painel autenticado (sidebar + cabeçalho + conteúdo) · Layout de app autenticado (bottom nav + conteúdo) · Layout de autenticação (centralizado, sem navegação) · Layout de Landing Page (seções empilhadas) · Layout de wizard/onboarding (progresso + conteúdo + navegação de etapa).

Esta lista é a base de nomenclatura usada no pacote `packages/ui` do monorepo (Capítulo 38) — qualquer componente novo, antes de ser criado, é primeiro avaliado contra esta lista para evitar duplicação (princípio de manutenibilidade, Capítulo 40).
