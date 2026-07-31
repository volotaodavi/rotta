# Dossiê 1 — Produto e Personas (Capítulos 1–5)

---

## Capítulo 1. Visão do Produto

### 1.1 Declaração de visão

> **Rotta será a infraestrutura digital do transporte escolar brasileiro** — o sistema operacional que conecta, em uma única plataforma, todo transportador (do motorista autônomo à secretaria de educação municipal) a todas as famílias que dependem do transporte escolar para colocar seus filhos na escola com segurança.

Rotta não compete com "apps de rastreamento de veículo". Rastreamento é uma *feature*, não um produto. O produto é a **operação inteira do transporte escolar**: cadastro, conformidade documental, rotas, escala de motoristas e monitores, comunicação com a família, cobrança da mensalidade dos alunos (quando aplicável ao transportador), prestação de contas às escolas e, no limite, auditoria pública quando o cliente é uma prefeitura.

Isso posiciona Rotta como um **ERP verticalizado**, na mesma lógica de produtos como Linx/Cielo para varejo ou Sólides para RH, mas para um nicho extremamente carente de digitalização: hoje a esmagadora maioria dos transportadores escolares no Brasil opera com WhatsApp, planilhas de Excel, cadernos de papel e, na melhor das hipóteses, um rastreador veicular genérico (não desenhado para o caso de uso escolar).

### 1.2 Por que agora

Três forças convergem para tornar este o momento certo:

- **Pressão regulatória crescente**: municípios e o Ministério Público vêm exigindo cada vez mais rastreabilidade e prestação de contas do transporte escolar (público e privado), especialmente após incidentes de segurança amplamente noticiados (crianças esquecidas em vans, atrasos não comunicados, veículos sem documentação em dia).
- **Penetração de smartphone**: motoristas autônomos e MEIs, o segmento mais pulverizado e historicamente mais difícil de digitalizar, hoje têm smartphone e usam apps (WhatsApp, apps bancários, apps de entrega) no dia a dia — o produto pode ser mobile-first sem medo de exclusão digital.
- **Ausência de um player vertical dominante**: o mercado de rastreamento veicular é genérico (Creare, Sascar, etc., focados em frotas de carga) e o mercado de gestão escolar (ERPs educacionais) não cobre o transporte. Não existe hoje uma solução verticalizada, com marca própria e experiência de produto de primeira linha, dominando o segmento escolar.

### 1.3 O que a Rotta não é

Para manter o foco do produto, é tão importante declarar o que a Rotta **não** é:

- Não é um marketplace de motoristas (não conecta demanda de transporte a oferta de motoristas terceiros).
- Não é uma fintech (não processa split de pagamento entre motorista e escola no MVP — pode vir em V3 como funcionalidade adicional, não como core).
- Não é uma rede social entre pais.
- Não é um produto de rastreamento genérico de frotas (carga, entregas, ride-hailing) — toda decisão de UX é otimizada para o caso de uso escolar (rotas fixas e recorrentes, checklist de crianças nominal, comunicação com responsáveis).

### 1.4 Proposta de valor por ator

| Ator | Dor de hoje | Valor entregue pela Rotta |
|---|---|---|
| Motorista autônomo / MEI | Gestão manual em papel/WhatsApp, sem profissionalização, risco jurídico por falta de documentação em dia | App simples que substitui caderno + rastreador + grupo de WhatsApp por R$ 39,90/mês |
| Empresa de transporte escolar | Dificuldade de escalar operação com múltiplos motoristas/veículos, sem visibilidade centralizada | Painel único de gestão de frota, rotas, documentos e comunicação, com dashboard operacional |
| Responsável (pai/mãe) | Ansiedade por não saber onde está o filho, atrasos não comunicados | Rastreamento em tempo real, notificação de embarque/desembarque, histórico de viagens, grátis |
| Escola | Nenhuma visibilidade sobre o transporte de seus alunos, dependência de terceiros não auditáveis | Portal com visão de quais alunos estão em rota, atrasos, ocorrências |
| Prefeitura / Secretaria de Educação | Falta de auditoria sobre transporte terceirizado, risco de fraude e de acidentes | Camada de compliance e relatórios agregados sobre empresas contratadas |

### 1.5 Tese de produto

A tese central é: **quem ganha a confiança do motorista autônomo e da pequena empresa primeiro, ganha o mercado depois** — porque (a) é o segmento mais pulverizado e mais difícil de um concorrente de cima para baixo (enterprise) atender lucrativamente, e (b) uma vez que o responsável se acostuma a acompanhar o filho pela Rotta, a troca de fornecedor de transporte não implica em troca de app (o app "pertence" à família, não à empresa) — o que cria um fosso competitivo incomum em B2B puro.

---

## Capítulo 2. Missão

### 2.1 Declaração de missão

> **Tornar o transporte escolar brasileiro mais seguro, mais transparente e mais simples de operar — para quem dirige, para quem gerencia e, principalmente, para quem confia o filho a esse serviço todos os dias.**

### 2.2 Desdobramento da missão em compromissos concretos

1. **Segurança antes de tudo**: toda criança que sobe em um veículo cadastrado na Rotta deve ter seu embarque e desembarque confirmados por um adulto responsável (motorista/monitor), com rastro auditável.
2. **Nenhum responsável fica no escuro**: a família sabe, em tempo real, onde está o veículo, se há atraso, e recebe confirmação de embarque e desembarque — sem precisar perguntar em um grupo de WhatsApp.
3. **Profissionalização do pequeno transportador**: um motorista autônomo com a Rotta deve parecer, para a família, tão profissional e confiável quanto uma grande empresa de transporte.
4. **Simplicidade radical**: qualquer funcionalidade que exija treinamento de mais de 5 minutos para um motorista de 50+ anos usar sozinho é considerada uma falha de design, não uma falha do usuário.
5. **Dado como ativo de confiança, nunca como produto**: os dados de crianças e responsáveis nunca são monetizados via publicidade, venda a terceiros ou uso fora do propósito de segurança do transporte (compromisso que também é requisito legal sob a LGPD, tratado em profundidade no Capítulo 19).

### 2.3 Por que a missão importa para decisões técnicas

A missão não é uma peça de marketing — ela arbitra empates de engenharia ao longo de toda esta documentação:

- Quando "tempo real" (missão 2) compete com "custo de infraestrutura" (eficiência de negócio), o desenho técnico prioriza a atualização de localização a cada 5–10 segundos mesmo que isso implique investimento maior em gateway de realtime (ver Capítulo 14 e 20).
- Quando "simplicidade" (missão 4) compete com "completude de funcionalidade", o MVP prioriza sistematicamente menos telas com mais qualidade a mais telas com funcionalidades incompletas (ver Capítulo 22).
- Quando "segurança" (missão 1) compete com "velocidade de cadastro", o onboarding aceita fricção adicional (ex.: upload de CNH do motorista, documento do veículo) como não-negociável mesmo que isso reduza a conversão inicial.

---

## Capítulo 3. Objetivos

### 3.1 Objetivos de produto (Norte de longo prazo)

- **O1 — Ser o sistema padrão de facto do transporte escolar privado no Brasil** dentro de 3–5 anos, medido por participação de mercado entre transportadores digitalizados.
- **O2 — Zero incidentes de "criança esquecida no veículo"** entre operações que usam o checklist de desembarque da Rotta corretamente, através de alertas obrigatórios de veículo vazio.
- **O3 — Expandir de B2B (transportador) para B2B2G (prefeituras/secretarias)**, criando uma segunda linha de receita mais previsível e de ticket maior a partir do ano 2–3.
- **O4 — Construir o maior dataset georreferenciado e comportamental do transporte escolar do país**, que se torna a base para produtos futuros de inteligência operacional (otimização de rotas, previsão de atraso, score de risco de motorista/veículo).

### 3.2 Objetivos de negócio (12–18 meses, formato OKR sugerido)

**Objetivo A — Validar o product-market fit com transportadores pequenos**
- KR1: 500 empresas pagantes ativas até o fim do MVP + V2.
- KR2: Churn mensal de tenants pagantes abaixo de 5%.
- KR3: NPS de motoristas ≥ 60.

**Objetivo B — Construir o efeito de rede via responsáveis**
- KR1: 70% dos responsáveis cadastrados abrem o app ao menos 3x por semana.
- KR2: 40% dos novos tenants chegam por indicação de um responsável que já usa o app em outra empresa (efeito de rede lateral).

**Objetivo C — Provar a arquitetura multi-tenant em escala**
- KR1: Suportar 10.000 tenants simultâneos com p95 de latência de API abaixo de 300ms.
- KR2: Zero incidentes de vazamento de dados entre tenants (isolamento auditado trimestralmente).

### 3.3 Objetivos técnicos (o que a arquitetura precisa garantir desde o dia 1)

- Todo tenant novo pode ser provisionado **sem deploy manual** (self-service signup → tenant ativo em produção em segundos).
- Nenhuma alteração de schema de banco de dados exige *downtime* (migrations aditivas, *expand/contract pattern* — ver Capítulo 16).
- O app do motorista deve funcionar de forma degradada **sem internet contínua** (fila local de eventos de GPS/checklist com sincronização posterior), porque rotas escolares frequentemente passam por áreas rurais/periféricas com conectividade instável.
- Tempo de "cold start" do app abaixo de 2 segundos em aparelhos de entrada (Android com 2GB RAM), pois grande parte dos motoristas usa aparelhos populares.

---

## Capítulo 4. Público-alvo

### 4.1 Segmentação primária (fase MVP/V2)

| Segmento | Descrição | Tamanho estimado no Brasil | Prioridade |
|---|---|---|---|
| Motorista autônomo / MEI | 1 pessoa, 1 a 2 veículos, opera de forma independente, geralmente atende bairro/escola específica | ~150 a 200 mil (estimativa de mercado informal, alta pulverização) | **Alta — foco do MVP** |
| Pequena empresa de transporte escolar | 2 a 15 veículos, 1 gestor administrativo + motoristas contratados/terceirizados | Dezenas de milhares | **Alta — foco do MVP/V2** |
| Média/grande empresa de transporte escolar | 15+ veículos, estrutura administrativa própria, múltiplas filiais | Milhares | **Média — V2** |

### 4.2 Segmentação secundária (fase V2/V3 — expansão B2G)

| Segmento | Descrição | Prioridade |
|---|---|---|
| Empresas terceirizadas do transporte público escolar | Contratadas por prefeituras via licitação, precisam prestar contas ao poder público | V2/V3 |
| Prefeituras / Secretarias Municipais de Educação | Órgão público que licita e fiscaliza o transporte escolar gratuito | V3 |

### 4.3 Perfis de usuário final (não pagantes, mas essenciais ao produto)

- **Responsáveis** (pais, mães, tutores legais): usam o app gratuito para acompanhar o filho.
- **Motoristas**: contratados ou autônomos, operam o veículo e o app em campo.
- **Monitores**: acompanham crianças no veículo (obrigatório por lei em muitos municípios para vans/ônibus escolares), fazem o checklist junto ou no lugar do motorista.
- **Escolas**: instituições de ensino que recebem os alunos transportados, com um portal de visibilidade.

### 4.4 Critérios de exclusão inicial (o que a Rotta não vai atender no MVP)

- Transporte fretado corporativo (funcionários de empresas) — mesma lógica de rota fixa, mas público, regras e integrações diferentes; fora do escopo para não diluir o produto.
- Transporte de passageiros avulso/ride-hailing — modelo de negócio e UX completamente diferentes (viagem sob demanda vs. rota fixa recorrente).
- Transporte escolar universitário/intermunicipal de longa distância — regras regulatórias e de segurança diferentes (ex.: ANTT em vez de regulação municipal).

### 4.5 Perfil de mercado endereçável (TAM/SAM/SOM, direcional)

- **TAM (Total Addressable Market)**: todo o transporte escolar do Brasil, público e privado — estimado em centenas de milhares de veículos/operadores.
- **SAM (Serviceable Addressable Market)**: transportadores privados (autônomos + empresas) digitalizáveis via app próprio, sem depender de licitação — o segmento inicial completo.
- **SOM (Serviceable Obtainable Market) em 3 anos**: fração do SAM alcançável via aquisição direta (marketing digital local, indicação boca a boca dos responsáveis, parcerias com sindicatos/associações de transporte escolar).

---

## Capítulo 5. Personas

Cada persona a seguir é usada como referência obrigatória em decisões de UX (Capítulo 26) e de priorização de funcionalidades (Capítulo 12). Qualquer funcionalidade nova deve ser avaliada primeiro contra a persona **Seu Anderson** (o piso de simplicidade) e a persona **Marcela** (a exigência de confiança emocional).

### 5.1 Persona — "Seu Anderson", o motorista autônomo

- **Idade**: 52 anos. **Perfil digital**: usa WhatsApp, Facebook e apps bancários; não é "nativo digital", mas não tem medo de tecnologia simples.
- **Contexto**: dono de uma Kombi/van, atende 18 alunos de 2 escolas do bairro há 12 anos. Cliente PJ como MEI.
- **Dores**: perde tempo repassando "cheguei"/"vou atrasar" em grupos de WhatsApp separados por escola; já teve problema com pai que reclamou que "ninguém avisou" sobre um atraso; não tem controle real de quais documentos (CNH, seguro, vistoria) estão vencendo.
- **O que ele quer**: abrir um app, apertar "iniciar rota", e o app cuidar de avisar todo mundo. Não quer aprender a configurar nada complexo.
- **Critério de sucesso do produto para Seu Anderson**: ele consegue rodar a rota inteira do dia usando apenas 2 botões (iniciar rota / marcar embarque-desembarque) sem precisar olhar manual algum.

### 5.2 Persona — "Marcela", a responsável

- **Idade**: 36 anos. **Perfil**: mãe de 2 filhos (5 e 9 anos), trabalha em horário comercial, o transporte escolar é a peça que permite que ela trabalhe sem se preocupar com o trajeto casa-escola.
- **Dores**: ansiedade de "cadê meu filho", falta de aviso quando o van atrasa, não saber se o filho realmente desceu no ponto certo.
- **O que ela quer**: abrir o app e, em 2 segundos, saber "meu filho está no van, chega em 8 minutos" ou "meu filho desceu em casa às 12h07". Notificação automática, sem precisar abrir o app toda hora.
- **Critério de sucesso**: ela nunca precisa perguntar ao motorista "cadê meu filho?" pelo WhatsApp — o app responde antes da pergunta.

### 5.3 Persona — "Diego", o gestor de uma empresa de transporte de 8 vans

- **Idade**: 41 anos. **Perfil**: cresceu a empresa do pai, hoje administra 8 motoristas, 8 veículos, ~200 alunos.
- **Dores**: não tem visão consolidada de quem está atrasado, qual motorista está com CNH vencendo, quais rotas têm reclamação recorrente; hoje usa uma planilha compartilhada que ninguém atualiza direito.
- **O que ele quer**: um dashboard que mostre em 5 segundos "está tudo funcionando hoje?" e alertas proativos de problemas (documento vencendo, atraso recorrente, veículo parado).
- **Critério de sucesso**: ele consegue gerenciar a operação inteira do celular, sem precisar estar no escritório.

### 5.4 Persona — "Fernanda", diretora de escola

- **Idade**: 47 anos. **Perfil**: diretora de escola particular de médio porte, terceiriza o transporte para 3 empresas diferentes que atendem famílias diferentes.
- **Dores**: quando um pai liga reclamando do van, a escola não tem nenhuma visibilidade e depende de ligar para o transportador.
- **O que ela quer**: um portal simples onde ela vê quais alunos estão "em rota" e é notificada em caso de ocorrência grave (acidente, atraso crítico) para poder se antecipar com os pais.
- **Critério de sucesso**: a escola nunca é pega de surpresa por uma reclamação de transporte que ela poderia ter antecipado.

### 5.5 Persona — "Rafael", monitor de van escolar

- **Idade**: 24 anos. **Perfil**: trabalha como monitor (obrigatório por regulação municipal em vans com crianças pequenas), responsável por conferir que toda criança embarcou e desembarcou corretamente.
- **Dores**: hoje faz a conferência "de cabeça" ou em uma lista de papel que se perde/molha.
- **O que ele quer**: uma lista simples e rápida de tocar no celular, com foto/nome de cada criança, para não errar na contagem.
- **Critério de sucesso**: o checklist leva menos de 30 segundos por parada, mesmo com 6 crianças embarcando ao mesmo tempo.

### 5.6 Persona — "Bianca", administradora Rotta (equipe interna)

- **Idade**: 29 anos. **Perfil**: faz parte do time de operações/suporte da própria Rotta.
- **Dores**: sem um painel administrativo master, não consegue investigar um chamado de suporte ("o app do motorista X não está enviando localização") sem acessar banco de dados diretamente — o que é inseguro e lento.
- **O que ela quer**: um painel de administração global (cross-tenant, com controle de acesso rígido) para monitorar saúde da plataforma, investigar tenants específicos e gerenciar cobrança.
- **Critério de sucesso**: qualquer chamado de suporte nível 1 é resolvido sem acesso direto a banco de dados ou infraestrutura.

### 5.7 Persona secundária (V3) — "Secretaria Municipal de Educação"

- **Perfil institucional**: gestor público responsável por fiscalizar dezenas de empresas terceirizadas de transporte escolar gratuito.
- **Dores**: falta de padronização entre os fornecedores (cada um usa uma ferramenta diferente ou nenhuma), dificuldade de auditoria em caso de incidente, pressão do Ministério Público por transparência.
- **O que quer**: um painel agregador que enxergue todas as empresas contratadas rodando na mesma plataforma, com relatórios exportáveis para prestação de contas.
- **Nota de produto**: esta persona só se torna endereçável quando o modelo de tenancy hierárquico (Capítulo 15) e o módulo de compliance público (Capítulo 24 — V3) estiverem prontos.
