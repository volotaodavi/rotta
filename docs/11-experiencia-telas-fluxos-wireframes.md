# Dossiê 11 — Telas, Fluxos, Microinterações e Wireframes

> Continuação direta do Dossiê 10 (`docs/10-design-system-fundamentos.md`). Aqui cada tela é descrita como um wireframe funcional — layout, componentes usados (nomenclatura do Capítulo 12 do Dossiê 10), estados e interações — pronto para um time de UI transformar em alta fidelidade, e cada fluxo é descrito passo a passo. Nenhum código ou peça gráfica é produzida aqui, apenas a especificação completa.

---

## 1. Landing Page

**Objetivo de conversão**: um visitante (majoritariamente motorista autônomo/pequeno empresário chegando por indicação ou busca) entende em menos de 10 segundos o que a Rotta faz e por que custa R$ 39,90/mês, e consegue começar o cadastro sem falar com ninguém.

### 1.1 Estrutura da página (wireframe, ordem de rolagem)

1. **Header fixo (sticky)**: logo Rotta à esquerda · links de âncora para "Como funciona", "Para quem é", "Depoimentos", "FAQ" ao centro (ocultos em mobile, substituídos por menu simples) · botão `secondary` "Entrar" + botão `primary` "Começar agora" à direita. Fundo transparente sobre o hero, ganha fundo `surface` sólido ao rolar (transição suave).
2. **Hero**: título `display` em duas linhas curtas (ex. "O transporte escolar, finalmente organizado."), subtítulo `body-lg` em `text-muted` (uma frase, não um parágrafo) explicando a proposta de valor central, botão `primary` `lg` "Começar agora — R$ 39,90/mês" + link secundário "Ver como funciona" (rolagem suave até a seção 3). À direita (desktop) ou abaixo (mobile): uma composição visual — mockup do app mostrando o mapa em tempo real com um marcador de van e uma notificação de "Embarque confirmado" sobreposta, transmitindo o momento de maior valor emocional do produto sem precisar de texto.
3. **Prova social rápida** (faixa fina logo abaixo do hero): 3–4 números-chave em `h2`/`caption` (ex. "500+ empresas", "50 mil famílias tranquilas", "Presente em X estados") — nunca inventados; populados progressivamente conforme dado real existir, com placeholder honesto ("Em breve" ou omitido) até lá.
4. **Benefícios** (grid de 3 colunas desktop / 1 coluna mobile): cada item é um ícone (`radius-lg`, fundo `primary-muted`) + `h3` curto + uma frase `body`. Exatamente os 4–6 diferenciais do Capítulo 1 (rastreamento em tempo real, checklist de segurança, comunicação automática, um único painel) — nunca mais que 6 itens, para não diluir a mensagem.
5. **Como funciona** (3 ou 4 passos numerados, layout horizontal no desktop com linha conectando os passos, empilhado no mobile): "1. Cadastre sua empresa" → "2. Adicione veículos, motoristas e alunos" → "3. Convide as famílias" → "4. Rastreie cada viagem em tempo real" — cada passo com um ícone simples, sem texto longo.
6. **Para quem é** (cards lado a lado): "Motorista autônomo", "Pequena empresa", "Empresa de transporte escolar" — cada card com 2–3 bullets de dor resolvida específica daquele perfil (reaproveitando as personas do Capítulo 5), e um CTA secundário "Ver planos" ao final da seção (ainda que o plano seja único, a seção reforça "cabe no seu caso").
7. **Depoimentos** (estrutura, populada progressivamente com casos reais): carrossel/grid de cards com foto do depoente (motorista ou responsável), nome + cidade, e uma frase curta entre aspas — nunca texto genérico de marketing, sempre no tom de fala real da persona.
8. **FAQ** (acordeão vertical): 6–8 perguntas objetivas (ex. "Os responsáveis pagam alguma coisa?", "Preciso de equipamento de rastreamento?", "Funciona no meu celular?", "Como funciona o suporte?") — respostas curtas, sem jargão.
9. **CTA final** (bloco de destaque de fundo `surface`, full-width): repetição do CTA do hero, reforçando o preço e a ausência de fricção ("Comece agora, sem contrato de fidelidade").
10. **Rodapé**: logo + descrição de uma linha · colunas de links (Produto, Empresa, Legal — política de privacidade, termos de uso) · ícones de redes sociais · seletor de idioma (reservado para expansão futura, não ativo no MVP) · copyright.

### 1.2 Regras específicas da Landing Page

- Tema **sempre dark** na Landing Page, independente da preferência de sistema — é a superfície de maior impacto de marca, e a consistência com o app reforça reconhecimento visual imediato.
- Nenhuma seção usa mais de uma cor de destaque simultaneamente além do `primary` — sem gradientes multicoloridos, sem ilustrações "fofinhas" fora da paleta.
- Performance como requisito de UX: a Landing é SSG (Capítulo 9, Next.js), com imagem do hero otimizada e carregamento abaixo de 1,5s em conexão 4G comum — decisivo porque uma fração relevante do público-alvo acessa por link de WhatsApp em conexão móvel modesta.

---

## 2. Dashboard da Empresa (Gestor/Empresa)

### 2.1 Wireframe da tela principal

**Layout**: Sidebar fixa à esquerda (Seção 11.2 do Dossiê 10) · Cabeçalho de página ("Dashboard" + seletor de data, padrão "Hoje") · Corpo em 3 blocos verticais:

1. **Faixa de KPIs** (4–5 cards lado a lado, desktop; carrossel horizontal, mobile/tablet): "Rotas ativas hoje" (número + fração, ex. "12/14"), "Pontualidade média" (percentual + variação vs. semana anterior), "Alertas abertos" (número, cor `warning` se > 0), "Documentos vencendo" (número, cor `danger` se houver vencido), "Receita estimada do mês" (Seção 15 do Dossiê 8 — sempre rotulada "estimativa").
2. **Mapa consolidado** (bloco principal, ocupando a maior área): mapa Mapbox mostrando todos os veículos em rota no momento, com marcador colorido por status (verde = no horário, âmbar = atrasado, cinza = não iniciado). Clique em um marcador abre um popup compacto (nome da rota, motorista, próxima parada, ETA) com link "Ver detalhes".
3. **Lista de rotas do dia** (tabela, abaixo do mapa): colunas Rota · Motorista · Veículo · Status (badge colorido) · Horário previsto · Horário real/ETA · Ações (ícone `ghost` de "ver no mapa" e "contatar motorista"). Ordenável, com filtro rápido por turno e por status.

**Painel lateral de Alertas** (drawer que abre a partir de um ícone de sino no cabeçalho, com contador): lista cronológica de alertas (documento vencendo, rota atrasada, ocorrência registrada), cada item com ícone semântico, texto curto e ação direta ("Ver rota", "Ver documento").

### 2.2 Sub-telas do módulo Empresa

- **Viagens**: histórico completo, filtrável por período/rota/motorista, cada linha expansível para a timeline de eventos daquela viagem (embarques, desembarques, ocorrências — reaproveitando o componente Timeline do Dossiê 10, Seção 12).
- **Motoristas**: lista em cards ou tabela (alternável) — foto, nome, status de documentação (badge verde/âmbar/vermelho), rotas atribuídas. Clique abre o perfil completo: dados pessoais, documentos (com upload/visualização), disponibilidade, histórico de viagens.
- **Veículos**: mesmo padrão de Motoristas — placa, modelo, status de documentos, rota(s) vinculada(s), histórico de utilização.
- **Alunos**: tabela com foto, nome, escola, rota/parada vinculada, responsável(is), status. Ação em massa disponível (ex. selecionar vários e enviar comunicado).
- **Documentos**: visão unificada (não separada por entidade) de todos os documentos do tenant com semáforo de vencimento, ordenável por "vence primeiro" — a tela que resolve diretamente a dor da persona "Diego" (Capítulo 5.3).
- **Relatórios**: seleção de tipo de relatório (pontualidade, frequência, ocorrências, uso de frota) + período → pré-visualização em tela → exportação (PDF/planilha).
- **Configurações**: dados da empresa, plano/cobrança, preferências operacionais (limiar de atraso, política de bloqueio por documento — RN-21), gestão de usuários/permissões (convidar novo Gestor).

---

## 3. Painel do Motorista (app mobile)

### 3.1 Tela inicial

**Wireframe**: cabeçalho simples (saudação + nome do motorista + avatar, sem elementos decorativos) → card único de destaque: **rota do momento** (a próxima ou atual rota do dia, com nome, horário previsto, número de alunos, e um botão `primary` `lg` de largura total: **"Iniciar rota"**) → abaixo, lista compacta das demais rotas do dia (se houver mais de um turno) em estado colapsado. Bottom Navigation: Início · Histórico · Perfil (3 itens apenas).

Se não houver rota agendada para o momento: Empty State ("Nenhuma rota agora — sua próxima rota é às 17h" ou, se não houver nenhuma, "Nenhuma rota hoje").

### 3.2 Viagem atual (tela cheia, ativa durante a rota)

**Wireframe**: mapa ocupando o topo (60% da tela) com a posição do veículo e a rota traçada até a próxima parada → faixa de status logo abaixo do mapa ("A caminho de: Rua X, 123 — chegada em 4 min") → lista de alunos daquela parada (avatar + nome + toggle de embarque, Seção 3.3) → botão FAB (Seção 11.1 do Dossiê 10) para "Registrar ocorrência", sempre visível. Barra inferior fixa mostra o progresso da rota (ex. "Parada 2 de 6").

### 3.3 Checklist de embarque/desembarque

Lista de alunos esperados naquela parada, cada item como uma linha com: avatar/foto, nome, e dois botões de toque único (não um switch que exige acerto de posição): **"Embarcou"** (`success`, ícone de check) e **"Ausente"** (`ghost`, abre um seletor rápido de submotivo: "Faltou", "Atraso do responsável", "Outro"). Ao confirmar todos os alunos daquela parada, um botão `primary` "Confirmar e seguir" aparece fixo no rodapé da tela — só então a notificação é disparada (RN-13 do Capítulo 13) e o app avança para a próxima parada.

Ao final da rota (última parada), a tela de checklist é substituída pela **confirmação de van vazia** (Capítulo 9.6/RN-12): uma tela dedicada, de tela cheia, com um único botão grande `primary`: **"Confirmo que o veículo está vazio"** — deliberadamente sem atalho, sem gesto, sem automação, exigindo o toque explícito.

### 3.4 Alunos (aba dentro de uma rota) e Mapa

- **Alunos**: lista completa de alunos da rota selecionada, com acesso rápido a informações relevantes ao motorista (ponto de embarque/desembarque, necessidade especial relevante ao transporte, contato de emergência) — nunca dados fora do escopo operacional (ex. o motorista não vê CPF do responsável).
- **Mapa** (fora do contexto de uma viagem ativa): visão estática da rota configurada, útil para o motorista revisar o trajeto antes de sair de casa.

### 3.5 Histórico

Lista de viagens passadas (data, rota, horário real de início/fim, ocorrências registradas), cada uma expansível para o detalhe completo — mesmo padrão de Timeline usado no painel do Gestor.

### 3.6 Perfil

Dados pessoais, documentos (CNH, cursos) com status de vencimento visível, configurações de notificação, tema (dark/light — Seção 7.2 do Dossiê 10), suporte/ajuda, sair da conta.

---

## 4. Painel do Responsável (app mobile)

### 4.1 Tela inicial

Se o responsável tem um filho com rota ativa no momento: card de destaque em tela cheia mostrando **o mapa com a posição do veículo e o ETA até o ponto do filho** — esta é, disparadamente, a tela mais importante de todo o produto (Capítulo 8.3). Se houver mais de um filho, um seletor simples no topo (chips com foto/nome) alterna entre eles sem sair da tela.

Se não houver rota ativa no momento (fora do horário operacional): tela mostra o **resumo do dia** — "Hoje, [nome] embarcou às 07h12 e chegou à escola às 07h38" — nunca uma tela vazia sem informação, mesmo fora do horário de viagem.

Bottom Navigation: Início · Histórico · Notificações · Perfil.

### 4.2 Localização em tempo real e previsão de chegada

Detalhado no mapa da tela inicial: marcador do veículo com heading (direção), linha do trajeto até o próximo ponto relevante ao filho, **ETA em destaque tipográfico grande** (`h1`, o dado mais importante da tela) acima do mapa, e um indicador textual de frescor do dado ("atualizado agora" / "atualizado há 2 min", conforme a regra de confiança do Capítulo 8.6).

### 4.3 Histórico

Lista cronológica por dia, cada entrada mostrando embarque/desembarque com horário e, se houver, ocorrência registrada naquele dia — mesmo padrão visual usado no Motorista e no Gestor (consistência de vocabulário, Seção 11.3 do Dossiê 10).

### 4.4 Notificações

Lista de todas as notificações recebidas (mesmo que o canal efetivo tenha sido WhatsApp/SMS, o app mantém um registro central), com ícone por tipo (embarque, desembarque, atraso, comunicado, ocorrência) e acesso às preferências de canal a partir do cabeçalho desta aba.

### 4.5 Filhos

Lista dos alunos vinculados àquela conta de responsável, cada um levando ao perfil do aluno: foto, escola, rota, ponto de embarque/desembarque, pessoas autorizadas a retirar, e um botão de ação rápida **"Avisar ausência"** (abre um seletor de data + motivo curto — fluxo detalhado na Seção 6.11).

### 4.6 Perfil

Dados pessoais, canais de notificação preferidos, tema, suporte, sair da conta.

---

## 5. Painel da Escola

*(Projetado com a mesma qualidade de atenção que os demais, mesmo sendo usado inicialmente por poucos tenants — Capítulo 12.7/V2.)*

### 5.1 Tela inicial (web, mesmo shell de navegação do Gestor)

**Wireframe**: cabeçalho de página "Painel da Escola — [Nome da Escola]" → faixa de KPIs simplificada (2–3 cards): "Alunos em rota agora", "Atrasos hoje", "Ocorrências no mês" → lista de alunos da escola com status em tempo real derivado ("Em rota", "Chegou às 07h38", "Ainda não embarcou") — **sem coordenada de GPS bruta** (RN-25 estendida, Capítulo 08 §2.5), apenas o status textual/badge.

### 5.2 Sub-telas

- **Alunos**: lista de todos os alunos daquela escola atendidos por qualquer transportador parceiro que use a Rotta, com o respectivo transportador identificado.
- **Ocorrências**: histórico de ocorrências relevantes reportadas pelos transportadores, relacionadas aos alunos daquela escola.
- **Comunicação** (V2): canal formal com os transportadores parceiros.
- **Perfil da escola**: dados institucionais, contato responsável.

---

## 6. Admin Rotta (painel interno da equipe)

### 6.1 Tela inicial

**Wireframe**: cabeçalho "Painel Rotta — Administração" → KPIs de saúde da plataforma (tenants ativos, MRR, churn do mês, disponibilidade dos serviços nas últimas 24h) → lista/busca de tenants (busca global por nome/CNPJ/e-mail) → atalhos para "Chamados de suporte abertos" e "Alertas de infraestrutura".

### 6.2 Sub-telas

- **Clientes/Empresas**: lista de todos os tenants, com filtro por status (trial/ativo/restrito/suspenso), plano, data de criação. Clique abre a ficha do tenant: dados cadastrais, status de assinatura, uso (veículos/motoristas/alunos ativos), e — mediante o mecanismo de acesso auditado do Capítulo 16.1 (Dossiê 8) — um botão explícito "Acessar como suporte" que só é usado com justificativa registrada e gera log de auditoria imediato, nunca acesso silencioso.
- **Suporte**: fila de chamados (se integrado a uma ferramenta de atendimento) ou lista simples de solicitações, vinculada à ficha do tenant relevante.
- **Financeiro**: visão consolidada de receita (MRR, novos tenants, cancelamentos, inadimplência agregada — nunca dado de cartão bruto, apenas status de cobrança via gateway).
- **Logs**: interface de consulta aos logs estruturados (Capítulo 17, Dossiê 8) — filtro por tenant, tipo de log, período, id de correlação — ferramenta de investigação para a persona "Bianca" (Capítulo 5.6), eliminando a necessidade de acesso direto a banco de dados.
- **Métricas**: dashboards de produto (ativação, retenção, uso do app por perfil) e de infraestrutura (latência, disponibilidade, throughput do Realtime Gateway).

---

## 7. Fluxos completos

Cada fluxo é descrito como uma sequência de telas/decisões, incluindo os desvios de erro.

### 7.1 Cadastro (Empresa/Autônomo — self-service)

1. Landing Page → "Começar agora".
2. Tela 1: telefone ou e-mail + tipo (Autônomo/MEI/Empresa) → OTP de verificação.
3. Tela 2: dados básicos (nome/razão social, CPF/CNPJ conforme tipo) — validação em tempo real de formato (máscara de CPF/CNPJ).
4. Tela 3: escolha de forma de pagamento (cartão ou Pix recorrente) — se trial ativo, esta etapa pode ser adiada para o fim do período de teste (decisão comercial, não bloqueia o uso inicial).
5. Confirmação → redireciona ao **Wizard de onboarding** (Seção 7.2).

**Erro tratado**: CNPJ/CPF já cadastrado → mensagem clara oferecendo "Fazer login" em vez de apenas rejeitar.

### 7.2 Primeiro acesso (Wizard de onboarding)

Tela de progresso (stepper, Dossiê 10 §12) com 5 passos, cada um podendo ser pulado exceto o primeiro:
1. Cadastrar primeiro veículo (obrigatório para avançar de forma significativa, mas pulável tecnicamente).
2. Cadastrar primeiro motorista.
3. Cadastrar primeiros alunos (com opção de importar via planilha, reduzindo fricção para empresas com base existente).
4. Criar primeira rota (interface de mapa, Seção 7.5).
5. Convidar responsáveis (gera links/mensagens de convite automaticamente).

Ao concluir (ou pular), o usuário chega ao Dashboard real, com um card de "Continue o onboarding" persistente até 100% concluído.

### 7.3 Login

Coberto em detalhe na Seção 5.1 do Dossiê 9 (fluxo técnico). Do ponto de vista de tela: campo único de telefone/e-mail → detecção automática do método esperado → tela de OTP (teclado numérico automático, preenchimento automático do código via SMS quando o sistema operacional suporta) ou tela de senha (com opção "Esqueci minha senha", Seção 7.4).

### 7.4 Esqueci a senha

1. Tela de login → "Esqueci minha senha" → informa e-mail/telefone.
2. Sistema envia link (e-mail) ou código (SMS/WhatsApp) de redefinição.
3. Tela de nova senha (com indicador de força, requisitos mínimos exibidos de forma clara, nunca apenas "senha inválida" após o fato).
4. Confirmação → redireciona ao login com o novo método já pronto para uso.

### 7.5 Criar rota

1. Tela "Rotas" → botão `primary` "+ Nova rota".
2. Formulário (tela dedicada, não modal — é um formulário longo): nome, turno, dias da semana, veículo e motorista padrão (selects com busca).
3. Etapa de paradas: interface de mapa interativo — clique no mapa ou busca de endereço adiciona uma parada; lista lateral mostra as paradas em ordem, reordenável por arrastar (`drag handle` visível); cada parada recebe horário previsto (sugerido automaticamente com base em distância/trânsito, editável).
4. Etapa de alunos: para cada parada, busca e adiciona alunos já cadastrados (ou atalho para cadastrar um novo aluno sem sair do fluxo, abrindo um Drawer lateral).
5. Revisão final: resumo da rota (distância estimada, tempo médio, número de alunos) → "Criar rota".

### 7.6 Cadastrar aluno

1. Tela "Alunos" → "+ Novo aluno".
2. Formulário em etapas curtas (não um formulário único gigante): (a) dados básicos (nome, data de nascimento, foto, escola, turma/turno), (b) ponto de embarque/desembarque (endereço com geocodificação automática, ajustável no mapa), (c) necessidades especiais relevantes ao transporte (opcional), (d) responsável(is) — convite por telefone/e-mail, com opção de vincular a um responsável já existente na base (evita duplicidade quando dois filhos do mesmo responsável são cadastrados em momentos diferentes).
3. Confirmação → aluno criado com status "aguardando confirmação do responsável" até o convite ser aceito.

### 7.7 Adicionar motorista

1. Tela "Motoristas" → "+ Novo motorista".
2. Dados pessoais + telefone/e-mail de convite.
3. Upload de documentos (CNH, EAR, cursos) — cada um com data de validade solicitada explicitamente no momento do upload (nunca deixado para depois, reduzindo a chance de documento cadastrado sem vencimento rastreado).
4. Status inicial: "Pendente de verificação" até aprovação (RN-29).

### 7.8 Adicionar veículo

Mesmo padrão do fluxo 7.7: dados do veículo → upload de CRLV/seguro/vistoria com datas de validade → status derivado automaticamente.

### 7.9 Iniciar viagem

Coberto em detalhe na Seção 3.2 e na Seção 5.2 do Dossiê 9. Tela: card de rota → botão "Iniciar rota" → (se permissão de localização não concedida) tela explicativa antes do prompt do sistema operacional ("A Rotta precisa da sua localização para que as famílias acompanhem a viagem — só usamos isso durante a rota ativa") → confirmação do sistema → GPS ativo, tela avança para "Viagem atual".

### 7.10 Finalizar viagem

Coberto na Seção 3.3 — checklist de desembarque final de cada parada → tela dedicada de confirmação de van vazia → tela de resumo da rota concluída (duração real, alunos transportados, ocorrências, se houver) → retorno à tela inicial.

### 7.11 Embarque / Desembarque

Coberto em detalhe na Seção 3.3.

### 7.12 Ausência (avisada pelo responsável)

1. App do Responsável → perfil do filho → "Avisar ausência".
2. Seletor: "Hoje" / "Data específica" + turno (manhã/tarde/ambos) + motivo opcional (texto curto).
3. Confirmação → o app do Motorista mostra aquele aluno já marcado como "Ausência avisada" na lista de checklist daquela parada, sem exigir ação do motorista além de confirmar visualmente.

### 7.13 Ausência (não avisada, detectada em campo)

1. Motorista chega à parada, aluno não embarca, motorista marca "Ausente" no checklist (Seção 3.3) com submotivo.
2. Sistema, se não houver justificativa prévia do responsável, envia notificação ao responsável perguntando o motivo (RN-14) — não bloqueia o seguimento da rota, mas registra o evento para acompanhamento do Gestor.

### 7.14 Troca de motorista (substituição em uma rota)

1. Painel do Gestor → tela da Rota afetada → "Substituir motorista" (ação disponível mesmo com a rota já em andamento, para cobrir imprevistos do dia).
2. Seleção de um motorista com status "aprovado" e disponibilidade compatível (lista já filtrada, nunca mostrando motoristas bloqueados por documento vencido).
3. Confirmação → evento `troca_motorista` registrado (Capítulo 12, Dossiê 8), notificação automática aos responsáveis daquela rota informando a mudança ("A partir de hoje, [nome do novo motorista] conduzirá o transporte do seu filho"), e o app do motorista substituto passa a mostrar aquela rota como sua a partir daquele momento.

---

## 8. Microinterações

| Elemento | Microinteração |
|---|---|
| Botão `primary` | Leve escurecimento no hover (web) / leve escala 0.98 + feedback tátil (*haptic*) no toque (mobile) |
| Botão em `loading` | Texto substituído por spinner inline, largura do botão mantida fixa (nunca redimensiona) |
| Checklist de embarque | Ao tocar "Embarcou", o item da lista desliza levemente e ganha um check `success` animado (~150ms) antes de mover para o topo da lista de "confirmados" — feedback imediato de que o toque foi registrado |
| Confirmação de van vazia | Botão exige *long-press* de 1 segundo (não um toque simples) com barra de progresso circular visível durante a pressão — fricção deliberada para uma ação que nunca deve ser acionada por engano |
| Mapa ao vivo | Marcador do veículo se move suavemente (interpolação/*easing*) entre posições recebidas, nunca "pulando" de um ponto a outro instantaneamente — percepção de movimento real |
| Toast de sucesso | Entra com leve deslize + fade (~200ms), sai automaticamente após 4s com fade reverso |
| Pull-to-refresh (mobile) | Padrão nativo do sistema operacional, nunca uma animação customizada que destoe da expectativa do usuário |
| Skeleton → conteúdo real | *Crossfade* suave (~150ms) do skeleton para o conteúdo carregado, nunca uma troca abrupta |
| Alerta de atraso detectado | Ícone do card de rota pulsa sutilmente (uma única vez, não em loop contínuo — loop contínuo é ruído visual) ao mudar de status para "atrasado" |
| Notificação push recebida com app aberto | Banner interno discreto no topo da tela (não interrompe a tela atual com um modal), com toque levando à tela relevante |
| Campo de formulário com erro | Leve *shake* horizontal (~2px, 200ms) + borda `danger` aparecendo simultaneamente — reforço tátil sutil, nunca exagerado |

**Princípio geral de duração**: toda animação de microinteração fica entre 100–250ms — rápido o suficiente para parecer instantâneo (princípio Linear de "velocidade percebida"), longo o suficiente para ser perceptível como feedback intencional. Nenhuma animação decorativa dura mais que 300ms, e todas respeitam a preferência de redução de movimento (Dossiê 10, Seção 10.2).
