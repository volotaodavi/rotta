# Dossiê 8 — Modelagem Completa de Dados e Regras de Negócio (Base Técnica)

> Este dossiê aprofunda o Capítulo 16 (`docs/04-arquitetura-e-dados.md`) com o nível de detalhe necessário para servir de base direta à implementação. Ainda não há código — o objetivo aqui é o **projeto arquitetural do banco de dados**: entidades, atributos, relacionamentos, cardinalidades, índices, estratégia de cache/particionamento e a régua de crescimento até escala nacional com milhões de usuários. Todo nome de entidade/atributo é conceitual (nomenclatura de domínio), não DDL.

---

## 0. Premissas de escala que orientam todo o desenho

Antes de modelar qualquer entidade, três números orientam cada decisão abaixo, porque são o que diferencia "banco que funciona em um piloto" de "banco que aguenta operação nacional":

- **Volume de tenants**: de dezenas (MVP) a centenas de milhares (operação nacional consolidando autônomos, MEIs, empresas e prefeituras).
- **Volume de eventos de tempo real**: o maior volume do sistema, disparado, não pelo número de tenants, mas pelo número de **veículos em rota simultaneamente nas janelas de pico** (manhã/tarde). Um veículo transmitindo posição a cada 5–10s por 1h de rota gera ~400–700 registros de GPS por viagem. Em escala nacional (centenas de milhares de veículos ativos diariamente), isso significa **centenas de milhões de registros de GPS por dia** — esta é, disparadamente, a tabela que dita a estratégia de particionamento (Seção 21).
- **Volume de usuários finais**: cada aluno tem em média 1,5 a 2 responsáveis com conta própria; a proporção de usuários finais para tenants pagantes é de ordens de grandeza maior (um único tenant pequeno de 20 alunos já gera ~30–40 contas de responsável) — é este número, não o de empresas, que leva o produto à casa dos milhões de usuários, o que reforça que a arquitetura de leitura (dashboards de responsável, WebSocket de mapa) precisa escalar independentemente da arquitetura de escrita de cadastro.

---

## 1. Estratégia Multi-Tenant — aprofundamento e decisão final

### 1.1 As três opções avaliadas

| Critério | Banco dedicado por tenant | Schema dedicado por tenant | **`tenant_id` + Row-Level Security (RLS)** |
|---|---|---|---|
| Isolamento de dados | Máximo (isolamento físico) | Alto (isolamento lógico por schema) | Forte (isolamento lógico por linha, reforçado no nível do motor de banco) |
| Custo de operar 1 tenant | Alto (1 banco a monitorar, backupear, migrar) | Médio | Marginal (uma linha a mais em tabelas já existentes) |
| Custo de operar 100.000 tenants | Inviável sem automação extrema (100 mil bancos) | Inviável além de poucos milhares (limite prático de schemas/conexões por instância Postgres) | **Linear e previsível** (um único banco, escalado por réplicas/partições) |
| Migration de schema | Precisa rodar em N bancos (risco de drift entre tenants) | Precisa rodar em N schemas | **Uma única migration, aplicada uma vez** |
| Adequação ao perfil de mercado (muitos tenants pequenos) | Péssima (desperdício de recursos ociosos por tenant pequeno) | Ruim | **Excelente** (tenants pequenos compartilham capacidade ociosa) |
| Onboarding self-service instantâneo | Difícil (provisionar banco novo por signup é lento/operacionalmente arriscado) | Possível, mas lento em escala | **Trivial** (inserir uma linha em `Empresa`) |
| Relatórios cross-tenant (Admin Rotta, métricas de negócio) | Muito difícil (requer agregar N bancos) | Difícil | **Uma única query** |

### 1.2 Decisão

**`tenant_id` em toda tabela de negócio + Row-Level Security (RLS) nativa do PostgreSQL**, com as seguintes camadas de reforço (defesa em profundidade — nunca uma única camada de proteção):

1. **Camada de banco (a que realmente importa)**: cada tabela tem uma *policy* de RLS que só permite `SELECT`/`INSERT`/`UPDATE`/`DELETE` quando `tenant_id = current_setting('app.tenant_id')::uuid`. Isso significa que **mesmo que a camada de aplicação tenha um bug e esqueça de filtrar por tenant**, o próprio Postgres recusa a operação. Esta é a mitigação primária contra o risco #1 do produto: vazamento de dados entre empresas concorrentes.
2. **Camada de aplicação**: todo repositório de dados injeta o `tenant_id` do contexto de sessão automaticamente (nunca aceito como parâmetro vindo do cliente) — o `tenant_id` é resolvido exclusivamente a partir do token de autenticação validado no servidor.
3. **Camada de contrato de API**: nenhum endpoint aceita `tenant_id` como parâmetro de entrada em rotas de tenant comum — apenas o namespace `Admin` (Administrador Rotta) tem essa capacidade, e cada chamada nesse namespace gera registro de auditoria obrigatório (Seção 16).

### 1.3 Por que não um modelo híbrido "a maioria em RLS, os grandes clientes isolados"

Foi avaliado permitir que tenants muito grandes (ex.: uma Secretaria de Educação com milhares de alunos) tivessem banco dedicado por exigência contratual/contrato público. **Decisão: não, no nível de banco.** A exigência de "isolamento físico" de um cliente público grande pode ser atendida com um mecanismo mais barato e igualmente robusto: uma política de RLS adicional que restringe esse tenant específico a rodar em uma **réplica de leitura dedicada** ou a um **particionamento físico por tenant_id** dentro da mesma arquitetura (Postgres suporta particionamento por lista/hash, então um tenant "grande demais" pode ganhar sua própria partição física dentro da mesma tabela lógica, sem exigir um banco/schema totalmente separado). Isso resolve a exigência de isolamento de recursos sem duplicar a complexidade operacional de N bancos.

### 1.4 Tenancy hierárquico (Secretaria → Empresas terceirizadas)

Reafirmado do Capítulo 15: `Empresa.organizacao_pai_id` (nulo por padrão) permite montar a árvore de tenancy sem remodelagem. Uma segunda *policy* de RLS de somente-leitura permite que um usuário com papel `Secretaria` vinculado ao tenant pai enxergue dados agregados dos tenants filhos, nunca o contrário e nunca entre filhos irmãos.

### 1.5 Identificação e propagação do tenant em toda a pilha

- Login → token carrega `tenant_id` + `papel` + `usuario_id`, assinado e de curta duração.
- Toda requisição HTTP/WebSocket seta `app.tenant_id` na sessão de banco no início da transação (middleware obrigatório, não opcional, sem *bypass* possível pelo código de módulo).
- Jobs assíncronos (fila de notificação, workers de relatório) recebem o `tenant_id` explicitamente no payload do job e o restauram na sessão de banco antes de qualquer query — nenhum worker roda "sem tenant setado".

---

## 2. Modelagem de Usuários e Permissões

### 2.1 Separação entre Identidade (`Usuario`) e Papel (`VinculoPapel`)

Um erro comum em modelagem multi-perfil é misturar "quem a pessoa é" com "o que ela pode fazer em um tenant". A Rotta separa os dois:

- **`Usuario`**: identidade única da pessoa física (nome, telefone, e-mail, hash de senha/OTP, foto, status de conta, preferências globais de notificação). Existe **uma vez** por pessoa, independentemente de quantos tenants ela participa.
- **`VinculoPapel`**: associação entre `Usuario`, `Empresa` (tenant) e um `Papel` (enum: `admin_rotta`, `empresa`, `gestor`, `motorista`, `monitor`, `responsavel`, `escola`), com status próprio (ativo/suspenso/removido) e data de vínculo. Um `Usuario` pode ter **múltiplos** `VinculoPapel`, em tenants diferentes e com papéis diferentes (ex.: é responsável de um filho na Empresa A e, paralelamente, motorista autônomo cadastrado como Empresa B).

Esta separação é o que permite, sem gambiarra, que o mesmo número de telefone sirva de login para qualquer papel, em qualquer tenant, com a Rotta resolvendo o contexto correto no momento do login (se a pessoa tem mais de um vínculo ativo, o app pergunta "em qual perfil deseja entrar", como um seletor de conta).

### 2.2 Atributos de `Usuario`

Nome completo · CPF (opcional para responsável, obrigatório para motorista/gestor/empresa) · telefone (canônico, usado como login principal) · e-mail (opcional para papéis de campo, obrigatório para papéis administrativos) · hash de senha (nulo se o usuário só usa OTP) · foto de perfil · status da conta (ativo/bloqueado/pendente de verificação) · canal de autenticação preferido · data de criação · data do último acesso · flag de 2FA habilitado.

### 2.3 Atributos de `VinculoPapel`

Usuario (FK) · Empresa/tenant (FK) · Papel (enum) · status do vínculo (ativo/suspenso/removido) · data de início · data de encerramento (nulo se ativo) · convidado_por (FK Usuario, para trilha de quem originou o convite) · metadados específicos do papel (ex.: se `motorista`, referência à entidade `Motorista`; se `responsavel`, nenhuma tabela satélite obrigatória além do vínculo com `Aluno`).

### 2.4 Matriz de permissões por papel (visão consolidada)

| Módulo / Ação | Admin Rotta | Empresa | Gestor | Motorista | Monitor | Responsável | Escola |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Ver/gerenciar todos os tenants | ✅ (auditado) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gerenciar assinatura/plano do próprio tenant | ❌ | ✅ | ⚠️ leitura | ❌ | ❌ | ❌ | ❌ |
| Cadastrar/editar veículos | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cadastrar/editar motoristas e monitores | ❌ | ✅ | ✅ | ❌ (só o próprio perfil) | ❌ (só o próprio perfil) | ❌ | ❌ |
| Cadastrar/editar alunos | ❌ | ✅ | ✅ | ❌ | ❌ | ⚠️ apenas dados complementares do próprio filho | ❌ |
| Cadastrar/editar rotas | ❌ | ✅ | ✅ | ⚠️ apenas se acumula papel de gestor | ❌ | ❌ | ❌ |
| Iniciar/finalizar viagem | ❌ | ❌ | ❌ | ✅ (apenas rota própria) | ❌ | ❌ | ❌ |
| Registrar checklist embarque/desembarque | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| Ver localização em tempo real | ❌ (exceto suporte auditado) | ✅ (todas as rotas do tenant) | ✅ (todas as rotas do tenant) | ✅ (própria rota) | ✅ (própria rota) | ✅ (apenas trecho do próprio filho) | ⚠️ apenas status agregado, sem coordenada bruta |
| Ver histórico de viagens | ⚠️ auditado | ✅ | ✅ | ✅ (próprias) | ✅ (próprias) | ✅ (do próprio filho) | ✅ (dos próprios alunos) |
| Justificar ausência do aluno | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ (próprio filho) | ❌ |
| Enviar comunicado em massa | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Gerenciar documentos (upload/validação) | ❌ | ✅ | ✅ | ⚠️ upload próprio, sem auto-validação | ⚠️ upload próprio | ❌ | ❌ |
| Gerar relatórios operacionais | ⚠️ agregados anonimizados | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ apenas dos próprios alunos |
| Acessar log de auditoria do tenant | ⚠️ auditado | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

Legenda: ✅ acesso pleno · ⚠️ acesso restrito/condicional · ❌ sem acesso.

### 2.5 Justificativa técnica da matriz

- Gestor e Empresa têm permissões quase idênticas por desenho — a diferença é que **Empresa** é o papel dono do relacionamento comercial (único que pode alterar plano, forma de pagamento, ou encerrar a conta), enquanto **Gestor** é operacional puro. Isso evita que um gestor contratado possa acidentalmente (ou maliciosamente) cancelar a assinatura da empresa.
- Motorista e Monitor têm a mesma superfície de checklist (RN do Capítulo 13), mas só o Motorista pode iniciar/finalizar a rota (responsabilidade legal do condutor sobre o veículo).
- Escola nunca vê coordenada de GPS bruta — apenas status derivado ("em rota", "chegou", "atrasado") — decisão de minimização de dado (RN-25 estendida): a escola não precisa saber a rota completa de todos os alunos de outras famílias para cumprir sua função de acompanhamento.

---

## 3. Modelagem de Empresas (Tenant)

### 3.1 Atributos de `Empresa`

- **Identificação**: razão social · nome fantasia · CNPJ (nulo se autônomo/MEI sem CNPJ, obrigatório caso contrário) · CPF (obrigatório quando pessoa física/autônomo) · tipo de empresa (enum: `autonomo`, `mei`, `pequena_empresa`, `media_grande_empresa`, `terceirizada_publica`, `secretaria_educacao`) · inscrição municipal (opcional, relevante para regulação local do transporte escolar).
- **Endereço**: logradouro · número · complemento · bairro · cidade · estado (UF) · CEP · latitude/longitude da sede (usado para geocodificação de referência, não operacional).
- **Contato**: telefone principal · WhatsApp de contato · e-mail administrativo · responsável legal (FK Usuario).
- **Plano e cobrança**: plano contratado (referência a `Plano`, ainda que único no MVP, já modelado como entidade própria para permitir planos futuros) · status da assinatura (enum: `trial`, `ativo`, `restrito`, `suspenso`, `cancelado`) · data de início · próxima data de cobrança · forma de pagamento (referência tokenizada ao gateway, nunca dado de cartão bruto armazenado).
- **Organizacional**: `organizacao_pai_id` (nulo — hierarquia B2G, Seção 1.4) · data de criação do tenant · fuso horário operacional (relevante para cálculo correto de horários de rota em diferentes regiões do país).
- **Configurações operacionais** (tabela satélite `EmpresaConfiguracao`, chave-valor tipado, para não poluir a entidade principal com dezenas de flags): limiar de atraso para notificação proativa (padrão 10 min) · política de bloqueio por documento vencido (rígida/alerta, RN-21) · canais de notificação habilitados · limite de tempo para confirmação de checklist antes de alerta (RN-13).

### 3.2 Por que configurações ficam em tabela satélite, não em colunas da `Empresa`

Configurações operacionais tendem a crescer em número ao longo do produto (cada nova funcionalidade tende a precisar de um novo parâmetro configurável por tenant). Uma tabela chave-valor tipada (`chave`, `tipo`, `valor`) evita migrations constantes na tabela `Empresa` — que é lida em praticamente toda requisição do sistema (deve permanecer enxuta e estável) — e mantém `Empresa` como a fonte de verdade apenas dos dados estruturais que raramente mudam de formato.

---

## 4. Modelagem de Motoristas

### 4.1 Atributos de `Motorista`

- Vínculo com `Usuario` (FK) e `Empresa`/tenant.
- **Habilitação**: número da CNH · categoria (enum conforme CTB: B, D, E — categoria mínima exigida para transporte escolar é D) · EAR — Exerce Atividade Remunerada (booleano + número do registro, exigência específica para condutor de transporte escolar/coletivo) · data de emissão da CNH · data de validade da CNH · pontuação atual da CNH (campo opcional, quando o dado estiver disponível via integração futura com órgão de trânsito).
- **Cursos obrigatórios**: entidade satélite `CursoMotorista` (tipo de curso — ex. "curso de transporte escolar", "direção defensiva" — instituição, data de conclusão, data de validade quando aplicável, arquivo do certificado) — modelada como lista (N cursos por motorista), não como colunas fixas, porque a exigência de cursos varia por município.
- **Documentos**: referência a `Documento` (entidade genérica, Seção 4.3 do Cap. 16) para CNH digitalizada, antecedentes criminais, atestado de saúde/psicotécnico.
- **Reconhecimento facial**: `biometria_facial_hash` — não a foto/template bruto armazenado diretamente na entidade principal, mas uma referência a um registro biométrico em repositório especializado com criptografia reforçada e política de retenção própria (dado biométrico é categoria sensível expressa pela LGPD, tratado com controles adicionais — ver Capítulo 19 e Seção 16 deste dossiê). Uso: confirmação de identidade do motorista no início da rota (evita que outra pessoa "logue como" o motorista cadastrado) — funcionalidade de V2, mas o campo de referência já é reservado no modelo desde o MVP para não exigir migração disruptiva depois.
- **Status**: enum (`pendente_verificacao`, `aprovado`, `reprovado`, `bloqueado_documento_vencido`, `inativo`) — derivado automaticamente a partir do estado dos documentos vinculados (RN-18) mas também sobrescrevível manualmente pelo Gestor (ex.: bloqueio por conduta).
- **Disponibilidade**: `DisponibilidadeMotorista` (satélite) — dias/turnos em que está disponível para ser designado como substituto, usado no fluxo de "reatribuição rápida" (Capítulo 10.4).
- **Histórico**: nunca se sobrescreve o registro de habilitação/curso ao atualizar — cada atualização gera uma nova versão versionada (Seção 16, Auditoria), preservando o estado histórico ("no dia do incidente X, a CNH do motorista estava válida até a data Y").

### 4.2 Regra de negócio derivada (nova, complementar ao Capítulo 13)

- **RN-29**: o status `aprovado` de um Motorista é uma função pura do conjunto de documentos obrigatórios vigentes (nenhum vencido) — não é um campo editável livremente, é recalculado automaticamente a cada mudança relevante (novo documento, vencimento atingido), evitando o estado inconsistente "aprovado manualmente, mas com CNH vencida".

---

## 5. Modelagem de Veículos

### 5.1 Atributos de `Veiculo`

- Empresa/tenant (FK) · placa (única por tenant; não única globalmente, pois a placa pode mudar de dono ao longo do tempo em bases diferentes) · modelo · marca · ano de fabricação/modelo · cor · capacidade de lugares sentados · capacidade de cadeirantes (quando aplicável) · tipo (van, kombi, ônibus, micro-ônibus) · foto do veículo.
- **Seguro**: seguradora · número da apólice · data de vigência início/fim · referência a `Documento` (apólice digitalizada).
- **Vistoria**: tipo de vistoria (municipal/estadual, conforme regulação local do transporte escolar) · data da última vistoria · data de validade · órgão emissor · referência a `Documento` (laudo digitalizado).
- **Documentos gerais**: CRLV (com data de validade do licenciamento anual), autorização/alvará municipal para operar transporte escolar.
- **Status**: enum (`ativo`, `manutencao`, `bloqueado_documento_vencido`, `inativo`) — mesma lógica de derivação automática do Motorista (RN-19).
- **Motorista atual**: não é um campo fixo na entidade `Veiculo` — é derivado da `Rota` ativa que o referencia como veículo padrão, mais qualquer substituição pontual do dia (`ViagemSubstituicao`, Seção 12). Um veículo pode, ao longo de sua vida, ser operado por motoristas diferentes; a entidade `Veiculo` não guarda esse dado diretamente para não duplicar a fonte de verdade (que é a `Rota`/`Viagem`).
- **Histórico de utilização**: derivado por consulta às `Viagem`s em que o veículo participou — não é uma tabela própria, é uma visão/relatório sobre `Viagem` filtrada por `veiculo_id` (evita duplicar dado que já existe na tabela de viagens).

---

## 6. Modelagem de Escolas (padrão INEP)

### 6.1 Por que alinhar ao INEP

Adotar a estrutura de identificação usada pelo Censo Escolar (INEP) desde o início traz dois ganhos: (a) permite validar/enriquecer o cadastro de escola contra a base pública oficial (reduz erro de digitação, entrega dado padronizado), e (b) é pré-requisito de fato para qualquer integração futura com poder público (Capítulo 24 — V3), que falará a mesma "língua" de códigos INEP.

### 6.2 Atributos de `Escola`

- Empresa/tenant (FK — lembrando a nota do Capítulo 16.3: cada tenant tem seu próprio registro de escola, mesmo quando a escola física é a mesma atendida por concorrentes).
- **Código INEP** (código oficial de 8 dígitos da escola no Censo Escolar) — campo opcional no MVP (nem toda escola particular pequena tem/usa o código de forma corrente no dia a dia do transportador, mas o campo já existe para validação/enriquecimento).
- **Dependência administrativa/Rede** (enum alinhado ao INEP: federal, estadual, municipal, privada).
- **Nome da escola** · **Município** · **Estado (UF)** · **Endereço completo** · **Latitude/Longitude** (geolocalização precisa, essencial para cálculo de rota/ETA e geofencing do ponto de desembarque).
- **Turnos ofertados** (enum múltiplo: matutino, vespertino, integral, noturno) — usado para validar coerência entre o turno da `Rota` e o turno em que o aluno efetivamente estuda.
- **Contato da escola**: telefone, e-mail, nome do responsável pelo contato com o transportador.

---

## 7. Modelagem de Responsáveis

### 7.1 Atributos de `Responsavel`

- Vínculo com `Usuario` (FK) — reaproveitando toda a identidade/login já modelada na Seção 2, um `Responsavel` não duplica nome/telefone/e-mail, apenas referencia o `Usuario`.
- CPF (obrigatório — usado inclusive para eventual emissão de cobrança em V2, Seção 15) · endereço residencial (pode divergir do endereço de embarque/desembarque do aluno, ex.: mora em bairro diferente da casa dos avós onde a criança é buscada) · grau de parentesco com o(s) aluno(s) vinculado(s) (via tabela associativa `AlunoResponsavel`, Seção 8.2) · indicador de responsável financeiro (quem recebe cobrança, quando aplicável) e responsável legal (quem pode autorizar decisões sobre a criança — podem ser pessoas diferentes, ex.: guarda compartilhada).
- **Histórico**: assim como Veículo, o "histórico do responsável" não é uma tabela própria — é a consulta às `Viagem`s/`ChecklistEmbarque`/`Ocorrencia` relacionadas aos alunos vinculados a ele, respeitando a regra RN-09 (só enxerga o que é do próprio filho).

### 7.2 Múltiplos responsáveis por aluno

Modelado via `AlunoResponsavel` (N:N): um aluno pode ter pai e mãe com contas separadas, cada um recebendo notificações independentemente, cada um podendo (opcionalmente) ter permissões diferentes (ex.: só o responsável financeiro vê cobrança, mas ambos veem localização em tempo real).

---

## 8. Modelagem de Alunos

### 8.1 Atributos de `Aluno`

- Empresa/tenant (FK) · nome completo · data de nascimento · foto · escola (FK `Escola`) · turma/turno em que estuda (texto livre ou enum simples — a Rotta não é o sistema de gestão pedagógica da escola, apenas precisa saber o suficiente para casar o horário da rota com o horário de aula) · série/ano escolar · necessidades especiais relevantes ao transporte (campo estruturado — ex. `cadeirante`, `mobilidade_reduzida` — mais campo de observação livre, usado para dimensionar corretamente o veículo/tempo de embarque).
- **Ponto de embarque** e **ponto de desembarque**: cada um é uma referência a um endereço geolocalizado (podem ser o mesmo endereço residencial ou diferentes — ex.: embarca em casa, desembarca na casa da avó à tarde), versionável ao longo do tempo (mudança de endereço não apaga o endereço anterior usado historicamente em viagens passadas).
- **Status**: enum (`ativo`, `inativo`, `transferido`, `trancado_temporariamente` — ex. período de férias/licença médica sem cancelar o cadastro).
- **Vínculo com Empresa**: um aluno pertence, a qualquer momento, a exatamente uma Empresa/tenant ativa para fins de transporte (RN-26 do Capítulo 13, já existente) — mas o histórico de vínculos anteriores é preservado (ex.: aluno trocou de transportador no meio do ano) via tabela de histórico de vínculo, não por sobrescrita.
- **Motorista/Veículo "atuais"**: mesmíssimo princípio do Veículo (Seção 5) — não são colunas na entidade `Aluno`, são derivados da `Rota` ativa à qual o aluno está vinculado (via `AlunoRota`).
- **Histórico**: consulta às `Viagem`/`ChecklistEmbarque`/`ChecklistDesembarque`/`Ocorrencia` relacionadas, nunca uma tabela redundante.

---

## 9. Modelagem de Rotas

### 9.1 Atributos de `Rota`

- Empresa/tenant (FK) · nome/identificador da rota (ex. "Rota Manhã — Escola Girassol") · turno (enum) · dias da semana ativos (conjunto — ex. seg-sex, ou apenas ter/qui) · veículo padrão (FK `Veiculo`) · motorista padrão (FK `Motorista`) · monitor padrão (FK `Monitor`, opcional) · status (enum: `ativa`, `pausada`, `encerrada`).
- **Sequência de paradas**: `ParadaRota` (entidade própria, N por rota, com ordem sequencial explícita, geolocalização, horário previsto, tipo — embarque/desembarque/ambos).
- **Sequência de alunos**: `AlunoRota` (N:N entre `Aluno` e `Rota`, referenciando a `ParadaRota` específica de embarque e a de desembarque daquele aluno — podem ser diferentes paradas).
- **Distância e tempo médio**: campos calculados/cacheados (`distancia_estimada_km`, `tempo_medio_minutos`) — recalculados sempre que a composição de paradas muda, usados para estimativas de ETA antes mesmo de haver dado real de viagens, e depois reconciliados com a média real observada nas `Viagem`s (Seção 10) para refinar a estimativa ao longo do tempo.
- **Histórico**: mudanças estruturais da rota (parada adicionada/removida, motorista/veículo padrão trocado) geram registro versionado (Seção 16), permitindo reconstituir "como era a rota" em qualquer data — essencial para investigar uma reclamação antiga sem depender da configuração atual.

---

## 10. Modelagem de Viagens

### 10.1 Atributos de `Viagem`

A `Viagem` é a **execução concreta**, em uma data específica, de uma `Rota` — a `Rota` é o "template", a `Viagem` é "o que de fato aconteceu naquele dia".

- Empresa/tenant (FK) · rota (FK) · data · motorista efetivo (FK — pode divergir do motorista padrão da rota, em caso de substituição, Seção 12) · veículo efetivo (idem) · monitor efetivo (idem, opcional) · horário previsto de início/fim (herdado da rota) · horário real de início/fim · status (enum: `agendada`, `em_andamento`, `finalizada`, `cancelada`) · motivo de cancelamento (quando aplicável).
- **Relações**: uma `Viagem` agrega `PosicaoGPS` (N, série temporal — Seção 11), `Evento` (N — Seção 12, incluindo checklists de embarque/desembarque, atrasos, ocorrências), e `ParadaViagem` (o "instantâneo" de cada parada realizada naquele dia específico, com horário real de chegada, para comparação com o horário previsto da `ParadaRota` de origem).
- **Velocidade**: não é campo da `Viagem` em si — é uma métrica derivada da série de `PosicaoGPS` (velocidade instantânea reportada pelo GPS do dispositivo em cada ponto, mais velocidade média calculada por trecho).
- **Histórico completo**: a combinação de `Viagem` + suas `PosicaoGPS` + seus `Evento`s **é**, por definição, o histórico completo e imutável daquele dia de operação — não existe uma tabela paralela de "resumo" que possa divergir da realidade granular.

---

## 11. Modelagem de Rastreamento (GPS)

### 11.1 Atributos de `PosicaoGPS`

- Viagem (FK) · timestamp (com precisão de segundo, gerado no dispositivo, não no servidor, para tolerar reenvio tardio por perda momentânea de conectividade) · latitude · longitude · precisão/acurácia (metros, informada pelo próprio GPS do aparelho — usada para descartar/sinalizar leituras de baixa confiabilidade) · velocidade instantânea · direção/heading (graus, usado para orientar o ícone do veículo no mapa de forma realista) · status do GPS (enum: `ativo`, `sinal_fraco`, `simulado_suspeito` — sinalizado pela regra de coerência geoespacial do Capítulo 19.3) · fonte do GPS (enum: `app_motorista`, `hardware_dedicado` — já prevendo a integração de V3 com rastreadores veiculares dedicados, Capítulo 18.2).

### 11.2 Por que esta é a tabela mais crítica de todo o desenho de escala

Cobre-se em profundidade na Seção 21 (particionamento), mas o princípio de modelagem aqui é: **nenhuma outra entidade do sistema referencia `PosicaoGPS` diretamente por chave estrangeira além de `Viagem`** — isso é deliberado, para que a tabela possa ser particionada/arquivada/expurgada agressivamente sem risco de quebrar integridade referencial em qualquer outro lugar do sistema.

---

## 12. Modelagem de Eventos

### 12.1 Por que um modelo de "Evento" genérico, não uma tabela por tipo

Embarque, desembarque, falta, ausência avisada, troca de motorista, troca de veículo, chegada, saída, atraso e cancelamento têm todos a mesma forma estrutural: **algo aconteceu, em um instante, dentro do contexto de uma Viagem (ou de uma Rota, para trocas estruturais fora de uma viagem específica), com um ator responsável e um payload específico do tipo**. Modelar cada um como tabela própria multiplicaria por 10 o número de tabelas para manter, sem ganho real (nenhuma dessas informações precisa de um schema radicalmente diferente).

### 12.2 Atributos de `Evento`

- Empresa/tenant (FK) · viagem (FK, nulo para eventos fora do contexto de uma viagem específica, ex. troca de motorista padrão da rota) · tipo (enum: `embarque`, `desembarque`, `falta`, `ausencia_avisada`, `troca_motorista`, `troca_veiculo`, `chegada_parada`, `saida_parada`, `atraso_detectado`, `cancelamento_rota`, `ocorrencia_registrada`, `van_vazia_confirmada`) · timestamp · ator (FK `Usuario` — quem registrou/disparou o evento; nulo quando o evento é gerado automaticamente pelo sistema, ex. `atraso_detectado`) · entidade relacionada (aluno, quando aplicável) · payload (estrutura JSON tipada por `tipo`, ex.: para `falta`, contém o submotivo; para `troca_motorista`, contém motorista anterior e novo).
- **Imutabilidade**: um `Evento`, uma vez gravado, nunca é alterado ou apagado — é o registro de fato do que aconteceu (correção posterior gera um novo evento complementar, ex. `falta` seguido de `ausencia_avisada` registrada depois pelo responsável, nunca a edição do evento original).

### 12.3 Relação entre `Evento` e os módulos de negócio

`ChecklistEmbarque`/`ChecklistDesembarque` citados no Capítulo 16 são, na prática, **projeções de leitura** sobre `Evento` filtrado por tipo `embarque`/`desembarque` — mantidos como visões/tabelas materializadas otimizadas para consulta rápida ("qual o status atual de cada aluno nesta viagem"), mas a fonte de verdade é sempre a sequência imutável de `Evento`s.

---

## 13. Modelagem de Notificações

### 13.1 Atributos de `Notificacao`

- Empresa/tenant (FK) · destinatário (FK `Usuario`) · evento de origem (FK `Evento`, quando aplicável — rastreabilidade de "por que esta notificação foi enviada") · canal (enum: `push`, `whatsapp`, `sms`, `email`) · template usado · conteúdo renderizado (guardado para auditoria, já que templates mudam ao longo do tempo) · status (enum: `enfileirada`, `enviada`, `entregue`, `falhou`, `lida` — quando o canal suporta confirmação de leitura) · timestamp de cada transição de status · motivo de falha (quando aplicável) · tentativa número (para lógica de retry com backoff) · prioridade (enum: `normal`, `alta`, `critica` — eventos como SOS usam `critica` e ignoram preferência de silêncio do usuário, RN-17).

### 13.2 Fila e entrega

`Notificacao` nasce no status `enfileirada` (publicada em fila assíncrona pelo módulo de origem, Capítulo 14.4) e é processada pelo worker de notificações (Capítulo 14.2), que tenta o canal preferido do usuário primeiro e faz *fallback* automático para o canal seguinte da preferência configurada (ex.: push falhou → tenta WhatsApp → tenta SMS) em caso de falha, respeitando a regra de que notificações críticas disparam múltiplos canais em paralelo, não em sequência (RN-17).

### 13.3 Histórico

A própria tabela `Notificacao`, com suas transições de status preservadas (ou em uma tabela satélite `NotificacaoStatusHistorico` se a granularidade de "toda transição" for necessária para auditoria fina), **é** o histórico — não há necessidade de tabela paralela de "notificações enviadas no passado" separada das "notificações atuais".

---

## 14. Modelagem de Agenda

### 14.1 Atributos de `EventoAgenda`

Entidade única para todos os tipos de evento de calendário, com discriminador de tipo (mesmo princípio de `Evento`, Seção 12, aplicado ao domínio de agendamento):

- Empresa/tenant (FK) · tipo (enum: `feriado`, `recesso`, `evento_escolar`, `troca_de_rota_pontual`, `ausencia_planejada`, `manutencao_veiculo`, `vencimento_cnh`, `vencimento_seguro`, `vencimento_documento_generico`) · data/período (data única ou intervalo) · entidade relacionada (rota, veículo, motorista, aluno — o campo relevante depende do `tipo`) · descrição · gerado automaticamente (booleano — distingue eventos criados pelo usuário de alertas derivados automaticamente do módulo de Documentos, ex. `vencimento_cnh` é sempre gerado pelo sistema a partir da data de validade cadastrada em `Motorista`, nunca digitado manualmente na agenda).

### 14.2 Por que vencimentos de documento aparecem na Agenda

Ainda que a "fonte de verdade" do vencimento seja o campo `data_validade` em `Motorista`/`Veiculo`/`Documento`, projetar esses vencimentos como entradas de `EventoAgenda` (geradas/atualizadas automaticamente, nunca editáveis manualmente) dá ao Gestor uma **visão unificada de calendário** — ele não precisa consultar três telas diferentes (documentos de motorista, de veículo, feriados) para saber "o que precisa da minha atenção esta semana".

---

## 15. Financeiro (MVP simplificado)

### 15.1 Escopo deliberadamente mínimo

Conforme especificado, não há módulo financeiro completo no MVP — não há emissão de cobrança, conciliação bancária ou split de pagamento entre transportador e responsável (isso é V2, Capítulo 12.16/23). O que existe é uma **camada de estimativa de receita do próprio transportador**, útil para o Gestor entender a saúde do próprio negócio dentro do painel Rotta, sem que a Rotta processe esse dinheiro.

### 15.2 Atributos do módulo

- Campo `valor_mensalidade` em `Aluno` (opcional — preenchido pelo Gestor, representa quanto aquele aluno paga ao transportador, informação de uso puramente informativo/analítico dentro do painel, sem geração de cobrança real).
- **Métricas derivadas** (calculadas sob demanda, não armazenadas como tabela própria, para nunca divergirem da fonte): `quantidade_de_alunos_ativos` (contagem de `Aluno` com status `ativo` no tenant) · `receita_estimada_mensal` (soma de `valor_mensalidade` dos alunos ativos) · `receita_estimada_anual` (projeção simples ×12, sem sazonalidade — nota explícita na tela de que é estimativa) · `receita_mensal_realizada` (fica reservado como campo para V2, quando cobrança real existir e puder ser reconciliada com o valor efetivamente pago).

### 15.3 Por que não modelar isso como um módulo financeiro completo agora

Modelar parcelas, inadimplência, conciliação e emissão de cobrança exige decisões (gateway de pagamento do lado do transportador, split, tributação) que ainda não foram validadas com o mercado. Construir esse modelo de dados agora, sem validação, arrisca desenhar o esquema errado e pagar o custo de migração depois. A estimativa simples de receita (Seção 15.2) entrega valor imediato ao Gestor (visibilidade do próprio negócio) sem comprometer a Rotta com uma modelagem financeira prematura.

---

## 16. Auditoria

### 16.1 Princípio: toda alteração relevante gera um registro imutável, nunca sobrescreve

- Entidade `RegistroAuditoria`: tenant (FK, nulo apenas para ações do próprio Admin Rotta fora de contexto de tenant) · entidade afetada (tipo + id) · ação (enum: `criacao`, `atualizacao`, `exclusao`, `leitura_sensivel` — esta última reservada a acessos que a própria natureza do dado exige rastrear mesmo sem alteração, ex. Admin Rotta consultando dados de um tenant) · usuário que executou a ação (FK `Usuario`, nulo se ação automática do sistema) · timestamp · valor anterior (snapshot JSON do estado antes) · valor novo (snapshot JSON do estado depois) · IP de origem · identificador do dispositivo/user-agent · id de correlação da requisição (para cruzar com logs técnicos, Seção 17).

### 16.2 O que obrigatoriamente gera auditoria

Toda alteração em: dados de Aluno, Responsável, Motorista (especialmente documentos e status), Veículo (documentos e status), composição de Rota, papéis/permissões (`VinculoPapel`), configuração de tenant, e qualquer acesso do Admin Rotta a dado de um tenant — mesmo leitura. Alterações puramente operacionais de altíssima frequência (ex. cada `PosicaoGPS` recebida) **não** passam pela mesma trilha de auditoria de mudança de estado — são, elas mesmas, o dado operacional, já coberto pela imutabilidade nativa da tabela de eventos/posições (Seções 11–12).

### 16.3 Retenção e proteção do log de auditoria

O `RegistroAuditoria` é **append-only** em nível de permissão de banco (nenhum papel de aplicação, nem mesmo Admin Rotta, possui permissão de `UPDATE`/`DELETE` sobre essa tabela — apenas um processo de expurgo administrado por política de retenção de longo prazo, executado fora do caminho de código de aplicação). Retido por prazo mínimo de 5 anos, alinhado ao prazo de guarda de documentos fiscais/trabalhistas e ao tempo de prescrição de eventuais disputas.

---

## 17. Logs

### 17.1 Distinção entre Auditoria (Seção 16) e Logs técnicos

Auditoria responde "o que mudou no negócio e quem mudou" (voltada a compliance/suporte/disputas). Logs técnicos respondem "o que o sistema estava fazendo tecnicamente" (voltados a operação/observabilidade/debug) — são complementares, não substitutos.

### 17.2 Camadas de log

| Camada | Conteúdo | Retenção sugerida |
|---|---|---|
| **Log de acesso (API Gateway)** | Método, rota, status HTTP, latência, tenant_id, usuario_id, IP, user-agent, id de correlação | 30–90 dias (quente), depois arquivado |
| **Log de aplicação** | Eventos estruturados de execução (início/fim de caso de uso, decisões de regra de negócio relevantes, warnings) | 30 dias quente |
| **Log de erro/exceção** | Stack trace, contexto da requisição, id de correlação | 90 dias, com alerta em tempo real via ferramenta de observabilidade |
| **Log de segurança** | Tentativas de login falhas, mudanças de permissão, acessos do Admin Rotta, rejeições de RLS (se instrumentadas) | 1 ano, acesso restrito à equipe de segurança |
| **Log de integração externa** | Requisições/respostas com provedores (WhatsApp, SMS, pagamento, mapas) — sem dado sensível bruto, apenas metadados e status | 30–90 dias |

### 17.3 Requisitos técnicos

Todo log é estruturado (JSON), nunca texto livre não parseável — pré-requisito para busca/alerta eficiente em ferramenta de observabilidade (Capítulo 20/36). Todo log carrega o `id de correlação` da requisição de origem, permitindo reconstituir a jornada completa de uma ação (do clique no app até a query de banco) entre as diferentes camadas listadas acima e cruzando com `RegistroAuditoria` quando aplicável. Nenhum log grava dado sensível bruto (senha, token, CPF completo, localização exata de criança fora do contexto de auditoria apropriado) — mascaramento automático na camada de logging.

---

## 18. Relacionamentos e Cardinalidades (visão consolidada)

| Relação | Cardinalidade | Observação |
|---|---|---|
| Organizacao → Empresa | 1:N | Hierarquia B2G opcional (Seção 1.4) |
| Empresa → Usuario (via VinculoPapel) | N:N | Um usuário pode ter vínculos em várias empresas; uma empresa tem vários usuários |
| Empresa → Veiculo | 1:N | Veículo pertence a exatamente um tenant |
| Empresa → Motorista / Monitor | 1:N | Idem |
| Empresa → Aluno | 1:N | Um aluno pertence a um tenant ativo por vez (histórico preservado à parte) |
| Empresa → Escola | 1:N | Cada tenant tem seu próprio cadastro de escola (Seção 6) |
| Empresa → Rota | 1:N | — |
| Aluno ↔ Responsavel | N:N (via AlunoResponsavel) | Múltiplos responsáveis por aluno, múltiplos filhos por responsável |
| Aluno ↔ Rota | N:N (via AlunoRota) | Um aluno pode, em teoria, estar em rotas de turnos diferentes (manhã/tarde distintas), nunca duas rotas ativas do mesmo turno (RN-26) |
| Rota → ParadaRota | 1:N | Sequência ordenada de paradas |
| Rota → Motorista/Veiculo (padrão) | N:1 cada | Um motorista/veículo pode ser padrão de várias rotas (ex. motorista faz manhã e tarde) |
| Rota → Viagem | 1:N | Uma rota gera uma viagem por dia efetivamente operado |
| Viagem → PosicaoGPS | 1:N | Altíssimo volume — Seção 21 |
| Viagem → Evento | 1:N | Inclui checklists, ocorrências, atrasos |
| Viagem → ParadaViagem | 1:N | Instantâneo por parada realizada naquele dia |
| Usuario → Notificacao | 1:N | — |
| Evento → Notificacao | 1:N | Um evento pode disparar notificações a múltiplos destinatários/canais |
| Motorista/Veiculo/Empresa → Documento | 1:N | Documento é entidade genérica referenciando `entidade_tipo` + `entidade_id` (polimórfico) |
| Empresa → RegistroAuditoria | 1:N | — |

### 18.1 Nota sobre relações polimórficas

`Documento` e `EventoAgenda` (Seções 6 do Cap.16 e 14) usam referência polimórfica (`entidade_tipo` + `entidade_id`) em vez de uma FK dedicada por tipo de entidade — trade-off deliberado: perde-se a garantia de integridade referencial nativa do banco para esse relacionamento específico (compensado por validação na camada de aplicação e testes automatizados), em troca de não precisar de uma tabela `DocumentoMotorista`, `DocumentoVeiculo`, `DocumentoEmpresa` redundantes para uma mesma lógica de negócio (upload, validade, alerta).

---

## 19. Índices recomendados

Princípio geral: **`tenant_id` é sempre a primeira coluna de qualquer índice composto** em tabelas de negócio, porque toda query de aplicação filtra por tenant antes de qualquer outra condição (e a RLS já impõe esse filtro implicitamente — o índice precisa "casar" com o plano de execução que a RLS gera).

| Tabela | Índice sugerido | Motivo |
|---|---|---|
| `VinculoPapel` | (`usuario_id`, `status`) e (`tenant_id`, `papel`, `status`) | Resolver rapidamente "quais vínculos ativos este usuário tem" no login, e "quantos gestores/motoristas ativos este tenant tem" |
| `Motorista` / `Veiculo` | (`tenant_id`, `status`) | Listagens de dashboard filtram por status constantemente |
| `Documento` | (`entidade_tipo`, `entidade_id`) e (`data_vencimento`) parcial (`WHERE status != 'expirado'`) | Consulta de documentos de uma entidade específica, e varredura diária de vencimentos próximos |
| `Aluno` | (`tenant_id`, `escola_id`) e (`tenant_id`, `status`) | Listagens por escola e por status ativo/inativo |
| `AlunoRota` | (`rota_id`, `parada_rota_id`) e (`aluno_id`) | Montagem do checklist por parada, e consulta "em quais rotas este aluno está" |
| `Rota` | (`tenant_id`, `status`, `turno`) | Dashboard "rotas ativas hoje, por turno" |
| `Viagem` | (`tenant_id`, `data`, `status`) e (`rota_id`, `data`) | Consulta operacional do dia, e histórico por rota |
| `PosicaoGPS` | Índice sobre partição corrente por (`viagem_id`, `timestamp`) + índice espacial GiST (PostGIS) sobre a coluna de geometria | Consulta de trajeto por viagem ordenado no tempo, e consultas espaciais (geofencing, "veículos próximos a este ponto") |
| `Evento` | (`viagem_id`, `tipo`, `timestamp`) e (`tenant_id`, `tipo`, `timestamp`) | Reconstituição de checklist de uma viagem, e relatórios agregados por tipo de evento no tenant |
| `Notificacao` | (`destinatario_id`, `status`) e (`tenant_id`, `status`, `criado_em`) | "Minhas notificações não lidas", e fila de reprocessamento de falhas por tenant |
| `RegistroAuditoria` | (`tenant_id`, `entidade_tipo`, `entidade_id`, `timestamp`) | Reconstituir histórico de uma entidade específica em ordem cronológica |
| `EventoAgenda` | (`tenant_id`, `tipo`, `data`) | Visão de calendário filtrada por período |

Todas as tabelas de negócio possuem, adicionalmente, um índice único composto (`tenant_id`, `id`) sempre que a chave primária técnica (`id`) for um UUID global — reforça a query planner a usar o filtro de tenant eficientemente mesmo em buscas por chave primária.

---

## 20. Estratégia de Cache

### 20.1 O que vai para cache (Redis) e por quê

| Dado | TTL sugerido | Motivo |
|---|---|---|
| Sessão/token validado (permissões resolvidas do usuário) | Duração do token de acesso (minutos) | Evita recalcular RBAC completo a cada requisição |
| Configuração do tenant (`EmpresaConfiguracao`) | 5–15 min, invalidado ativamente na escrita | Lido em quase toda decisão de regra de negócio (ex. limiar de atraso), baixa mutabilidade |
| Status da assinatura do tenant (`ativo`/`restrito`/`suspenso`) | 5 min, invalidado ativamente no webhook de pagamento | Consultado em todo request para decidir se o tenant pode operar |
| Última posição conhecida de cada veículo em rota ativa | Segundos (sobrescrito a cada nova posição recebida) | É literalmente o dado consumido pelo mapa em tempo real — nunca deveria ir ao Postgres para "onde está o veículo agora", só para histórico |
| Rota do dia já montada (paradas + alunos esperados) | Até o fim do turno operacional, invalidado em qualquer alteração | Consultado repetidamente pelo app do motorista/monitor durante toda a viagem |
| Contadores de dashboard (rotas ativas hoje, atrasos no momento) | 10–30 s | Tolerável levemente desatualizado, evita recontar em toda visita ao dashboard |

### 20.2 O que **não** vai para cache

Dados de auditoria, histórico de longo prazo, e qualquer leitura que exija consistência forte imediata após escrita (ex.: confirmação de checklist — o motorista precisa ver o próprio checklist atualizado no mesmo instante, sem risco de servir uma versão de cache defasada) são sempre lidos direto da fonte primária (Postgres, eventualmente réplica de leitura, nunca cache de aplicação).

### 20.3 Estratégia de invalidação

Invalidação **ativa** (o módulo que escreve o dado publica a invalidação do cache correspondente via o mesmo barramento de eventos de domínio, Capítulo 14.4) é preferida a depender apenas de TTL curto — TTL curto é a rede de segurança para o caso de falha na invalidação ativa, não a estratégia primária, especialmente para dados como status de assinatura (onde servir "ativo" por engano depois de uma suspensão real seria um problema de segurança/negócio).

---

## 21. Estratégia de Particionamento (preparar o banco para milhões de registros de GPS)

### 21.1 O problema em números

Conforme a Seção 0, a tabela `PosicaoGPS` é, disparadamente, a que mais cresce. Em escala nacional, ela cresce na casa de centenas de milhões de linhas por mês. Uma tabela não particionada desse tamanho degrada previsivelmente: índices maiores que a memória disponível, `VACUUM` cada vez mais caro, consultas por janela de tempo recente obrigadas a varrer estrutura de dados otimizada para o histórico completo.

### 21.2 Particionamento por tempo (partição primária)

`PosicaoGPS` é particionada nativamente pelo Postgres (*declarative partitioning*) por **intervalo de tempo, uma partição por dia** (ou por hora, nos primeiros meses de operação nacional, se o volume diário justificar granularidade menor). Consequências práticas:
- Consultas operacionais (dashboards, mapa ao vivo, checklist do dia) tocam **apenas a partição do dia corrente**, que é pequena e cabe confortavelmente em memória/cache — performance previsível independentemente de quantos anos de histórico existam no total.
- Expurgo/arquivamento de dado antigo (Seção 16.5 do Capítulo 16 já citava a política de retenção) se torna uma operação de **remover uma partição inteira** (instantâneo, sem `DELETE` linha a linha, sem gerar *bloat* de índice) em vez de uma varredura custosa.
- `VACUUM`/manutenção incide sobre partições menores e mais recentes, nunca sobre a tabela monolítica inteira.

### 21.3 Subparticionamento por tenant (segundo nível, quando necessário)

Quando o volume por partição diária de um único tenant gigante (ex. uma Secretaria com milhares de veículos) começar a dominar desproporcionalmente uma partição compartilhada, o Postgres permite subparticionar por `tenant_id` (hash) dentro da partição de tempo — isolando fisicamente a carga de escrita/leitura de um tenant especialmente grande sem sair do modelo de "banco único" (reforça a decisão da Seção 1.3: isolamento físico pontual sem multiplicar bancos).

### 21.4 Downsampling e camadas de resolução temporal

Réplicas de dado com resolução decrescente ao longo do tempo (já introduzido no Capítulo 16.5): granularidade total (a cada 5–10s) nas partições recentes (≤ 90 dias), agregação para 1 ponto a cada 5 minutos em uma tabela de histórico de resolução reduzida (retida por até 2 anos), e arquivamento frio (object storage, formato colunar como Parquet) além disso — mantendo o Postgres operacional enxuto apenas com o dado "quente" que realmente sustenta a operação do dia a dia e o histórico recente de valor prático.

### 21.5 Extensão especializada: TimescaleDB vs. particionamento nativo do Postgres

Ambos resolvem o problema; a escolha entre "particionamento declarativo nativo" e "TimescaleDB" (que automatiza esse particionamento e adiciona funções de agregação contínua para downsampling) é uma decisão de conveniência operacional a ser validada com dado real de carga no início do V2 — **ambas as opções mantêm o mesmo modelo conceitual descrito aqui**, portanto esta decisão específica não bloqueia o desenho atual.

### 21.6 Read Replicas para separar leitura analítica de escrita operacional

Dashboards, relatórios e consultas de histórico de longo prazo são direcionados a **réplicas de leitura**, nunca ao primário — que fica dedicado ao caminho crítico de escrita (ingestão de GPS, checklist, início/fim de viagem). Esta separação é o que permite que um relatório pesado gerado por um Gestor não degrade a latência de escrita de checklist de outro tenant rodando simultaneamente (isolamento de perfil de carga, não apenas de dado).

---

## 22. Banco de Dados Recomendado

### 22.1 Comparação técnica

| Critério | **PostgreSQL** | Supabase | MySQL | MongoDB |
|---|---|---|---|---|
| Suporte geoespacial maduro (PostGIS) | ✅ Excelente, padrão de mercado | ✅ (é Postgres por baixo, PostGIS disponível) | ⚠️ Suporte espacial mais limitado/menos maduro | ⚠️ Suporte via `2dsphere`, ecossistema menor para geoconsultas complexas de rota |
| Row-Level Security nativa (pilar da Seção 1) | ✅ Nativo, maduro | ✅ (herda do Postgres) | ❌ Sem RLS nativo equivalente | ❌ Sem RLS nativo; isolamento precisaria ser 100% na aplicação (risco maior) |
| Particionamento declarativo por tempo | ✅ Nativo e maduro | ✅ (herda do Postgres) | ⚠️ Particionamento existe, mas ecossistema de ferramentas mais limitado | ⚠️ Sharding existe, mas modelo operacional diferente e mais complexo de operar bem |
| Integridade referencial e transações ACID entre entidades fortemente relacionadas (Empresa→Rota→Aluno→Responsável) | ✅ Forte | ✅ | ✅ Forte | ⚠️ Transações multi-documento existem mas não é o ponto forte do modelo, e o domínio da Rotta é fundamentalmente relacional |
| JSON/semi-estruturado quando necessário (ex. payload de Evento, configuração de tenant) | ✅ JSONB nativo, indexável | ✅ | ⚠️ Suporte a JSON existe, menos maduro que JSONB do Postgres | ✅ Nativo (mas aí o resto do domínio, majoritariamente relacional, sofreria) |
| Controle operacional total (tuning fino, extensões customizadas, portabilidade entre provedores de nuvem) | ✅ Total, se self-managed/gerenciado (RDS/Aurora/Cloud SQL) | ⚠️ Boa parte da infra é opinativa da Supabase — ótimo para velocidade inicial, menos controle fino em escala nacional | ✅ | ✅ |
| Velocidade de entrega do MVP (auth, storage, realtime "de fábrica") | Neutro (precisa montar cada peça) | ✅ Forte vantagem — Auth, Storage e Realtime prontos aceleram muito o MVP | Neutro | Neutro |
| Risco de vendor lock-in em funcionalidades proprietárias | Baixo (Postgres puro é portável entre qualquer provedor gerenciado) | Médio — depende de **não** amarrar regra de negócio às particularidades da camada Auth/Edge Functions proprietárias da Supabase | Baixo | Baixo |

### 22.2 Decisão

**PostgreSQL como banco definitivo da plataforma**, por reunir sozinho os três requisitos não negociáveis do domínio (RLS nativo para multi-tenant seguro, PostGIS para todo o núcleo geoespacial do produto, particionamento maduro para o volume de GPS em escala nacional) — nenhuma das outras três opções atende aos três simultaneamente sem compromisso significativo.

**Sobre a Supabase especificamente**: é uma opção legítima e recomendada **como acelerador da fase inicial do MVP** (ela é, tecnicamente, PostgreSQL com uma camada de produto por cima — Auth, Storage, Realtime e painel administrativo prontos), desde que a equipe imponha a si mesma uma disciplina: **usar apenas recursos padrão de Postgres na modelagem de dados e regras de negócio**, evitando amarrar lógica de domínio a funcionalidades proprietárias da Supabase (ex. suas *Edge Functions* ou seu modelo específico de Auth) que dificultariam uma eventual migração para um Postgres self-managed/gerenciado (Amazon Aurora PostgreSQL, Google Cloud SQL) quando a escala e a necessidade de controle fino (tuning de partição, réplicas dedicadas, subparticionamento por tenant da Seção 21.3) exigirem. Essa migração, se a disciplina acima for seguida, é operacionalmente simples — é o mesmo motor de banco por baixo.

**MySQL e MongoDB são descartados** como banco primário: MySQL por suporte geoespacial e de RLS inferiores ao Postgres para exatamente os dois pilares mais críticos deste domínio; MongoDB por o domínio da Rotta ser fundamentalmente relacional (empresa → veículo/motorista → rota → aluno → responsável, com integridade referencial e transações que importam de verdade para correção operacional), o que joga contra os pontos fortes de um banco documento-orientado.

---

## 23. Síntese Final

### 23.1 Diagrama conceitual do banco (visão macro)

```
                                   ┌────────────────┐
                                   │  Organizacao    │  (opcional, B2G)
                                   └────────┬────────┘
                                            │ 1:N
                                   ┌────────▼────────┐
                     ┌─────────────┤    Empresa       ├─────────────┐
                     │             │   (tenant)       │             │
                     │             └───┬────┬────┬────┘             │
             1:N     │            1:N  │1:N │1:N │ 1:N       1:N    │      1:N
      ┌──────────────▼───┐   ┌────────▼┐ ┌─▼───────┐ ┌──▼────┐ ┌───▼──────┐
      │  VinculoPapel      │   │ Veiculo │ │Motorista│ │ Monitor│ │  Escola   │
      │  (Usuario × Papel) │   │         │ │         │ │        │ │ (INEP)    │
      └──────────┬─────────┘   └────┬────┘ └────┬────┘ └────────┘ └─────┬─────┘
                  │                  │           │                       │
              N:1 │                  │ 1:N       │ 1:N            1:N   │
      ┌───────────▼──┐          ┌────▼─────────────▼────┐        ┌──────▼───┐
      │   Usuario      │        │        Rota             │        │  Aluno    │
      └───────────────┘        │ (veic.+motor. padrão)   │◀──N:N──┤ (via      │
                                 └────────┬────────────────┘  Aluno  │AlunoRota) │
                                    1:N   │                    Rota  └─────┬─────┘
                              ┌───────────▼──────────┐                    │ N:N
                              │     ParadaRota         │           ┌──────▼───────┐
                              └────────────────────────┘           │ Responsavel    │
                                    1:N                              │(via Aluno-     │
                              ┌───────────▼──────────┐              │ Responsavel)   │
                              │       Viagem           │              └────────────────┘
                              └───┬────────┬──────┬───┘
                              1:N │    1:N │  1:N │
                       ┌──────────▼┐ ┌────▼───┐ ┌▼────────────┐
                       │ PosicaoGPS │ │ Evento  │ │ ParadaViagem │
                       └────────────┘ └────┬────┘ └──────────────┘
                                            │ 1:N
                                     ┌──────▼───────┐
                                     │ Notificacao    │
                                     └────────────────┘

     (Transversais a todas as entidades de negócio acima: Documento [polimórfico],
      EventoAgenda [polimórfico], RegistroAuditoria [referencia qualquer entidade])
```

### 23.2 Lista completa das entidades

**Identidade e acesso**: `Usuario`, `VinculoPapel`.
**Tenancy**: `Organizacao`, `Empresa`, `EmpresaConfiguracao`, `Plano`.
**Frota e pessoas**: `Veiculo`, `Motorista`, `Monitor`, `CursoMotorista`, `DisponibilidadeMotorista`.
**Pessoas atendidas**: `Escola`, `Aluno`, `Responsavel`, `AlunoResponsavel`, `AutorizadoRetirada`.
**Operação estrutural**: `Rota`, `ParadaRota`, `AlunoRota`.
**Operação em tempo real**: `Viagem`, `ParadaViagem`, `PosicaoGPS`, `Evento`.
**Comunicação**: `Notificacao`.
**Agenda**: `EventoAgenda`.
**Documentos**: `Documento` (polimórfico).
**Financeiro (MVP simplificado)**: nenhuma tabela nova além do campo `valor_mensalidade` em `Aluno` (métricas são derivadas, Seção 15).
**Governança**: `RegistroAuditoria`.

### 23.3 Relacionamentos (resumo)

Ver tabela completa na Seção 18. Padrão geral: tudo pendura de `Empresa` (tenant) via `tenant_id`; a cadeia operacional central é `Empresa → Rota → Viagem → (PosicaoGPS, Evento, ParadaViagem)`; a cadeia de pessoas atendidas é `Escola → Aluno ↔ Responsavel`, conectada à operação via `AlunoRota`.

### 23.4 Regras de negócio (consolidado desta modelagem, complementar às RN-01 a RN-28 do Capítulo 13)

- **RN-29** (Seção 4.2): status `aprovado` de Motorista é sempre derivado, nunca um campo livre.
- **RN-30**: análogo à RN-29 para `Veiculo` — status `ativo` é derivado do conjunto de documentos vigentes.
- **RN-31**: nenhuma tabela de alto volume (`PosicaoGPS`, `Evento`, `Notificacao`) é referenciada por chave estrangeira a partir de tabelas de cadastro estrutural — apenas o inverso — para permitir particionamento/expurgo sem risco de integridade referencial quebrada.
- **RN-32**: qualquer alteração em `Motorista`, `Veiculo`, `Rota` (composição), `VinculoPapel` ou `EmpresaConfiguracao` é obrigatoriamente auditada (Seção 16.2) — não é uma opção de implementação, é um requisito de todo *use case* que escreve nessas entidades.
- **RN-33**: dado biométrico (`biometria_facial_hash`) nunca é lido por nenhum papel humano diretamente (nem Admin Rotta) — apenas comparado programaticamente pelo serviço de verificação facial, nunca exposto em relatório, tela ou exportação.
- **RN-34**: a métrica de receita estimada (Seção 15.2) é sempre rotulada como estimativa na interface — nunca apresentada como valor financeiro reconhecido/realizado, para não criar confusão contábil ao Gestor.

### 23.5 Estrutura preparada para crescimento nacional

O desenho aqui documentado sustenta o caminho de MVP a operação nacional **sem exigir remodelagem de domínio** em nenhum salto de escala, porque cada decisão já nasceu pensando no topo da curva:
1. Multi-tenant via RLS (Seção 1) suporta de dezenas a centenas de milhares de tenants no mesmo banco lógico, com escape valve de particionamento físico por tenant grande (Seção 1.3/21.3) sem precisar de banco dedicado.
2. `PosicaoGPS` particionada por tempo (Seção 21) desacopla o crescimento de volume histórico da performance operacional do dia corrente.
3. Réplicas de leitura (Seção 21.6) desacoplam a carga analítica/relatórios da carga transacional crítica.
4. Hierarquia de tenancy (`organizacao_pai_id`) já embutida permite a expansão B2G sem migração de schema quando esse momento chegar.
5. Cache (Seção 20) absorve o padrão de acesso mais repetitivo (posição atual, configuração de tenant, sessão) sem sobrecarregar o banco primário nos picos das janelas operacionais.

### 23.6 Possíveis gargalos futuros e como evitá-los

| Gargalo potencial | Sintoma | Mitigação já prevista no desenho |
|---|---|---|
| Tabela `PosicaoGPS` crescendo além da capacidade de uma única partição diária em cidades de altíssima densidade de operação | Latência de escrita degradando nas janelas de pico | Subparticionamento por `tenant_id`/região (Seção 21.3); considerar granularidade horária em vez de diária |
| Um tenant público (Secretaria) com volume desproporcional dominando recursos compartilhados | Degradação de performance para tenants pequenos vizinhos na mesma infraestrutura | Escape valve de partição física dedicada (Seção 1.3) sem sair do modelo de banco único |
| Crescimento do número de conexões simultâneas de banco (milhões de usuários finais, ainda que via poucos backends) | Esgotamento de conexões no Postgres | *Connection pooling* de borda (PgBouncer/pooler gerenciado) entre a aplicação e o banco — nenhum processo de aplicação abre conexão direta ao Postgres em produção |
| Consultas analíticas pesadas (relatórios, dashboards agregados) competindo com a escrita operacional crítica | Picos de latência em checklist/início de rota durante geração de relatório | Réplicas de leitura dedicadas (Seção 21.6); relatórios pesados sempre executados contra réplica, nunca contra o primário |
| Cache desatualizado servindo status de assinatura incorreto após suspensão | Tenant inadimplente continuando a operar além do previsto | Invalidação ativa via evento de domínio no momento da mudança de status (Seção 20.3), TTL curto como rede de segurança adicional |
| Crescimento do número de tabelas/entidades ao longo do tempo dificultando manutenção | Onboarding de novo engenheiro lento, risco de regressão | Fronteiras de módulo já mapeadas (Capítulo 14.3) mantêm cada grupo de entidades sob responsabilidade de um módulo de domínio claro, nunca uma tabela "solta" sem dono |
| Migração de schema em tabela de altíssimo volume (`PosicaoGPS`, `Evento`) causando lock prolongado | Indisponibilidade momentânea em janela operacional | Estratégia expand/contract (Capítulo 16.4) e o fato de migrations em tabelas particionadas poderem ser aplicadas partição por partição, nunca como operação monolítica bloqueante |
