# Especificação Funcional Oficial da Rotta — Parte 7: Casos Especiais e Regras de Negócio Consolidadas

> Parte final da Especificação Funcional Oficial (Partes 1–7, `docs/15-...` a `docs/21-...`). Esta parte documenta, em detalhe, como o sistema deve se comportar nos 21 cenários especiais explicitamente levantados, e consolida em um único índice rastreável todas as regras de negócio (`RN-*`) citadas ao longo de toda a especificação — nenhuma delas fica implícita.

---

## Casos Especiais

Cada caso é descrito em termos de: **gatilho** (o que dispara o cenário), **comportamento esperado do sistema**, **impacto em cada papel envolvido**, e **critério de aceite em BDD**.

### CASO-01 — Motorista perde internet durante a viagem

**Gatilho**: dispositivo do motorista perde conectividade de dados móveis no meio de uma viagem `em_andamento`.

**Comportamento esperado**: o app continua funcionando normalmente do ponto de vista do motorista — GPS continua sendo capturado, checklist continua operável — tudo gravado localmente no dispositivo (`GPS-04`). Nenhuma ação de campo é bloqueada pela ausência de rede. Ao reconectar, a sincronização ocorre automaticamente e em ordem cronológica correta (`GPS-05`), usando as chaves de idempotência geradas no dispositivo (Dossiê 14 §1.7) para evitar duplicidade.

**Impacto em cada papel**:

- **Motorista**: vê um indicador discreto de "sem conexão", mas nenhuma tela bloqueadora; segue a rota normalmente.
- **Responsável/Gestor**: o mapa em tempo real para de atualizar durante a janela sem conexão, exibindo claramente "última atualização há X minutos" (nunca uma posição desatualizada apresentada como atual, Dossiê 8 §6.6) — nenhuma notificação de embarque/desembarque é perdida, apenas atrasada até a reconexão.

**Critério de aceite**:

- **Dado** um motorista sem conectividade por 5 minutos durante uma viagem, **quando** a conexão retorna, **então** todos os pontos de GPS e eventos de checklist capturados durante a janela offline são sincronizados corretamente e na ordem real de ocorrência, sem duplicidade.

---

### CASO-02 — GPS fica indisponível

**Gatilho**: sinal de GPS do dispositivo ausente ou de precisão muito baixa (ex. túnel, área de sombra de sinal, dispositivo com hardware degradado).

**Comportamento esperado**: o sistema nunca "inventa" uma posição — mantém a última posição conhecida exibida com indicador claro de tempo decorrido sem atualização (`GPS-06`). Se o sinal ausente persistir além de um limiar (ex. 3 minutos), o Gestor recebe um alerta de "possível perda de rastreamento" na rota afetada, para que possa, se necessário, contatar o motorista por telefone como canal alternativo.

**Impacto em cada papel**:

- **Motorista**: indicador de "sinal de GPS fraco" no próprio app; pode continuar operando o checklist normalmente (o checklist não depende de precisão de GPS, apenas de confirmação manual do motorista/monitor).
- **Responsável**: vê a última posição conhecida com o indicador de desatualização, nunca um mapa "congelado" sem explicação.
- **Gestor**: recebe alerta operacional após o limiar de tempo sem atualização.

**Critério de aceite**:

- **Dado** uma viagem sem atualização de posição por mais de 3 minutos, **quando** esse limiar é atingido, **então** o Gestor recebe um alerta de possível perda de rastreamento naquela rota.

---

### CASO-03 — Aluno não embarca

**Gatilho**: motorista chega à parada e o aluno esperado não está presente, sem justificativa prévia registrada (`STU-absence`).

**Comportamento esperado**: motorista marca o aluno como "Ausente" com submotivo (`EMB-01`); se não houver justificativa prévia, o sistema publica o evento `aluno.faltou`, disparando notificação ao responsável perguntando o motivo (`RN-14`) — nunca bloqueando o motorista de seguir viagem enquanto aguarda essa resposta.

**Impacto em cada papel**:

- **Motorista**: registra a ausência em poucos toques e segue viagem sem esperar confirmação.
- **Responsável**: recebe notificação imediata perguntando sobre a ausência, podendo confirmar o motivo a qualquer momento depois.
- **Gestor**: vê a ocorrência refletida no dashboard/relatório de frequência (`REL-02`).

**Critério de aceite**:

- **Dado** um aluno esperado numa parada sem justificativa prévia, **quando** o motorista o marca como ausente, **então** o responsável recebe notificação perguntando o motivo, e a viagem segue normalmente para a próxima parada.

---

### CASO-04 — Aluno embarca fora do ponto cadastrado

**Gatilho**: aluno embarca em um local diferente do ponto de embarque cadastrado (ex. a família pediu informalmente para o motorista buscar em outro endereço naquele dia).

**Comportamento esperado**: o checklist (`EMB-01`) não depende de geolocalização exata do aluno — é uma confirmação nominal feita pelo motorista/monitor, portanto o embarque "fora do ponto" ainda é registrável normalmente. O sistema não bloqueia essa ação, mas o Gestor pode configurar um alerta informativo (não bloqueante) quando o embarque de um aluno específico ocorrer fora de um raio razoável do ponto cadastrado, para visibilidade operacional — nunca impedindo o motorista de prosseguir.

**Impacto em cada papel**:

- **Motorista**: registra o embarque normalmente, independentemente do local físico real.
- **Gestor**: pode ver, se configurado, um sinalizador informativo de "embarque fora do ponto cadastrado" para aquele aluno naquele dia, útil para identificar mudanças de rotina que deveriam ser formalizadas via edição do cadastro do aluno (`STU-06`).
- **Responsável**: recebe a notificação de embarque normalmente — a notificação não menciona a divergência de local, para não gerar alarme desnecessário por uma combinação pontual e legítima.

**Critério de aceite**:

- **Dado** um aluno embarcando fisicamente fora do ponto cadastrado, **quando** o motorista confirma o embarque no checklist, **então** o evento é registrado normalmente, com um sinalizador informativo opcional visível apenas ao Gestor.

---

### CASO-05 — Motorista troca de rota

**Gatilho**: reatribuição de um motorista para conduzir uma rota diferente da habitual, permanente ou pontualmente (`ROT-05`/`DRV-09`).

**Comportamento esperado**: já detalhado integralmente em `ROT-05` (Dossiê Parte 4) — reatribuição validada contra elegibilidade documental (`RN-18`/`RN-19`), evento `motorista.trocado` publicado, notificação às famílias da rota.

**Critério de aceite**: ver `ROT-05`.

---

### CASO-06 — Motorista troca de veículo

**Gatilho**: substituição do veículo utilizado por um motorista em uma rota, permanente ou pontualmente (`ROT-06`/`DRV-08`).

**Comportamento esperado**: já detalhado integralmente em `ROT-06` (Dossiê Parte 4) — validação de capacidade (`RN-CAP-01`) e de conformidade documental (`RN-19`) do veículo substituto antes de confirmar a troca; evento `veiculo.trocado` publicado.

**Critério de aceite**: ver `ROT-06`.

---

### CASO-07 — Início de operação em um novo turno/dia da semana não configurado

_(Caso complementar identificado durante a revisão desta especificação, incluído por completude de cobertura da regra `ROT-04`.)_

**Gatilho**: motorista tenta iniciar uma viagem em um dia da semana para o qual a rota não está configurada como ativa.

**Comportamento esperado**: bloqueio explícito (`ROT-04`), com mensagem clara ao motorista, e nenhuma cobrança operacional (o dia não aparece como "pendente/atrasado" no dashboard, pois nunca era esperado).

**Critério de aceite**: ver `ROT-04`.

---

### CASO-08 — Empresa troca de plano

**Gatilho**: no MVP, o plano é único (`RN-01`) — este caso se torna relevante a partir de V2, quando múltiplos planos existirem (`ADM-02`).

**Comportamento esperado (preparado para V2)**: mudança de plano é sempre uma ação explícita da Empresa (nunca automática), com comparação clara de funcionalidades antes da confirmação; cobrança do novo valor a partir do próximo ciclo (nunca retroativa ao ciclo corrente já iniciado); nenhuma funcionalidade em uso ativo é interrompida no meio de uma operação (ex. troca de plano no meio de uma viagem em andamento não afeta aquela viagem).

**Impacto em cada papel**: apenas Empresa decide (`RN-EMP-01`, nova — exclusividade do papel Empresa sobre decisões de plano/cobrança).

**Critério de aceite** (referência para V2):

- **Dado** uma Empresa em um plano ativo, **quando** ela confirma a troca para outro plano, **então** o novo valor passa a valer a partir do próximo ciclo de cobrança, sem interrupção da operação corrente.

---

### CASO-09 — Empresa cancela assinatura

**Gatilho**: papel Empresa solicita cancelamento (`EMP-03`, A1... na prática, ação de cancelamento).

**Comportamento esperado**: cancelamento é sempre agendado para o **fim do ciclo de cobrança corrente** (a Empresa já pagou por aquele mês, o serviço continua disponível até o fim dele) — nunca uma interrupção imediata. Durante o período entre a solicitação e a efetivação, a operação continua 100% funcional. Após a efetivação, o tenant entra em status `cancelado` (não `suspenso` — distinção semântica de que foi uma decisão do cliente, não uma penalidade), com o mesmo tratamento de retenção de dados de qualquer encerramento de tenant (soft delete, RN-28, Capítulo 13).

**Impacto em cada papel**:

- **Empresa**: recebe confirmação clara da data efetiva de encerramento e pode reverter o cancelamento a qualquer momento antes dessa data.
- **Gestor/Motorista/Responsável**: continuam operando normalmente até a data efetiva; a partir dela, perdem acesso operacional, mas o histórico de viagens do Responsável permanece consultável por ele (a extinção do tenant não apaga o direito do Responsável ao próprio histórico, tratado pela política de retenção do Dossiê 8 §16.5).

**Critério de aceite**:

- **Dado** uma Empresa que solicita cancelamento faltando 12 dias para o fim do ciclo, **quando** a solicitação é confirmada, **então** a operação continua normalmente por esses 12 dias e o tenant é encerrado apenas ao final do ciclo.
- **Dado** um cancelamento agendado, **quando** a Empresa decide reverter antes da data efetiva, **então** a assinatura continua normalmente sem qualquer interrupção.

---

### CASO-10 — Responsável altera telefone

**Gatilho**: ver `RESP-05`.

**Comportamento esperado**: já detalhado integralmente em `RESP-05` — verificação dupla (novo número confirmado + canal antigo notificado, `RN-RESP-01`), nunca uma troca silenciosa.

**Critério de aceite**: ver `RESP-05`.

---

### CASO-11 — Responsável altera e-mail

**Gatilho/Comportamento esperado/Critério de aceite**: idênticos a `CASO-10`, aplicados ao e-mail em vez de telefone — mesmo mecanismo de dupla verificação (`RESP-05`).

---

### CASO-12 — Empresa exclui motorista

**Gatilho**: Gestor/Empresa executa `DRV-07` (Inativação/desligamento).

**Comportamento esperado**: já detalhado em `DRV-07` — bloqueio se houver viagem em andamento; sinalização obrigatória de toda rota afetada como "sem motorista designado" (`RN-27`); revogação imediata de todas as sessões do motorista desligado; preservação integral do histórico de viagens conduzidas por ele (o desligamento nunca apaga histórico — apenas encerra a capacidade operacional futura).

**Critério de aceite**: ver `DRV-07`.

**Nota adicional de completude**: a exclusão **de dados** (diferente da inativação operacional) segue a política de retenção do Dossiê 8 (o motorista, como qualquer titular de dado pessoal, pode solicitar exclusão via `CFG-05`, aplicada ao próprio perfil, respeitando o prazo de retenção obrigatória de registros já vinculados a viagens realizadas — nunca uma exclusão retroativa que comprometeria a integridade do histórico de viagens de terceiros, como alunos transportados por ele).

---

### CASO-13 — Motorista tenta iniciar rota sem GPS disponível

**Gatilho**: motorista aperta "Iniciar rota" (`GPS-01`) em um dispositivo sem permissão de localização concedida, ou com o serviço de localização do sistema operacional desativado.

**Comportamento esperado**: o sistema **bloqueia o início da rota** até que a permissão seja concedida — diferente de uma perda de sinal _durante_ a viagem (`CASO-02`, que não bloqueia o que já está em andamento), a ausência total de capacidade de rastreamento **no início** é tratada como impeditiva, porque iniciar uma viagem sem qualquer possibilidade de rastreamento contraria o valor central do produto e o compromisso de segurança com as famílias. O app explica claramente o motivo e guia o motorista à tela de permissões do sistema operacional.

**Impacto em cada papel**:

- **Motorista**: vê uma tela explicativa e um atalho direto às configurações de permissão do aparelho, nunca apenas uma mensagem de erro genérica.
- **Gestor**: se o motorista permanecer bloqueado por tempo prolongado sem conseguir iniciar, um alerta é gerado no dashboard.

**Critério de aceite**:

- **Dado** um motorista sem permissão de localização concedida, **quando** ele tenta iniciar a rota, **então** o sistema bloqueia o início e apresenta instrução clara de como conceder a permissão.
- **Dado** um motorista que concede a permissão em seguida, **quando** ele tenta novamente, **então** a rota inicia normalmente.

---

### CASO-14 — Empresa exclui aluno

**Gatilho**: Gestor executa a exclusão (soft delete) de um aluno (`STU-01`, ação de exclusão).

**Comportamento esperado**: exclusão é sempre lógica (soft delete), nunca física imediata (`RN-24`) — o aluno deixa de aparecer em listagens ativas e é removido de qualquer rota vinculada, mas o histórico de viagens/checklist permanece preservado pelo prazo de retenção. Se houver uma viagem em andamento no momento da exclusão que já inclui aquele aluno no checklist do dia, a exclusão é aplicada apenas a partir da próxima viagem (mesma lógica de não perturbar uma operação já em curso, `ROT-02`).

**Impacto em cada papel**:

- **Gestor**: confirma a exclusão com aviso claro sobre o efeito (remoção de rotas, preservação de histórico).
- **Responsável**: perde acesso operacional futuro (o filho não aparece mais como "em rota"), mas mantém acesso ao histórico já registrado, dentro do prazo de retenção, mesmo após a exclusão administrativa pelo tenant.

**Critério de aceite**:

- **Dado** um aluno vinculado a uma rota, **quando** o Gestor o exclui, **então** ele é removido da rota a partir da próxima viagem e seu histórico anterior permanece consultável pelo responsável.

---

### CASO-15 — CNH venceu

**Gatilho**: data de validade da CNH de um motorista é atingida sem renovação.

**Comportamento esperado**: recalculo automático do status do motorista para `bloqueado_documento_vencido` (`RN-29`); bloqueio técnico e não apenas visual de início de qualquer rota (`RN-18`); notificações automáticas ao motorista e ao Gestor nos marcos de 30/15/5 dias antes do vencimento (`RN-20`) e no momento em que o vencimento efetivamente ocorre.

**Impacto em cada papel**:

- **Motorista**: recebe alertas antecipados; se o vencimento ocorrer, é impedido de iniciar qualquer rota até a regularização, com mensagem explicando exatamente o motivo.
- **Gestor**: recebe os mesmos alertas antecipados e, se o motorista tiver rota agendada, um alerta destacado de risco operacional iminente.

**Critério de aceite**:

- **Dado** uma CNH que vence hoje sem renovação registrada, **quando** o motorista tenta iniciar uma rota, **então** o sistema bloqueia o início com mensagem explicando o motivo do bloqueio.
- **Dado** o mesmo motorista, **quando** ele envia uma CNH renovada e o Gestor a aprova, **então** o status volta a `aprovado` e ele pode iniciar rotas normalmente.

---

### CASO-16 — EAR venceu

**Gatilho/Comportamento esperado/Impacto/Critério de aceite**: idênticos a `CASO-15`, aplicados ao registro de EAR (`RN-19`-equivalente, `DRV-03`), condicionado à configuração do tenant que exige esse documento (`EMP-05`).

---

### CASO-17 — Veículo acima da capacidade

**Gatilho**: tentativa de vincular um aluno a uma rota cujo veículo já está no limite de sua capacidade cadastrada (`VEI-03`).

**Comportamento esperado**: bloqueio da vinculação com mensagem explicando o limite atingido; oferece caminho de resolução (remover outro aluno, trocar o veículo por um de maior capacidade, ou — mediante justificativa explícita e auditada — forçar uma exceção pontual, nunca silenciosa).

**Critério de aceite**: ver `VEI-03`.

---

### CASO-18 — Seguro venceu

**Gatilho/Comportamento esperado/Impacto/Critério de aceite**: idênticos a `CASO-15`, aplicados à apólice de seguro do veículo (`RN-19`, `VEI-04`) — bloqueio técnico de início de rota para aquele veículo até a regularização.

---

### CASO-19 — Responsável possui mais de um filho

**Gatilho**: uma mesma pessoa é responsável por múltiplos alunos, no mesmo tenant ou em tenants diferentes.

**Comportamento esperado**: a conta única (`Usuario`) do responsável acumula múltiplos vínculos `AlunoResponsavel`, cada um independente (`RESP-02`); o app apresenta um seletor simples entre os filhos na tela inicial (Dossiê 11 §4.1), sem exigir múltiplos logins; preferências de notificação podem ser configuradas de forma independente por filho, quando fizer sentido (ex. um filho em uma escola de manhã, outro à tarde, com diferentes necessidades de canal).

**Critério de aceite**:

- **Dado** um responsável com dois filhos em duas empresas diferentes, **quando** ele abre o app, **então** vê ambos os filhos disponíveis para seleção, cada um refletindo corretamente os dados/rota do respectivo tenant.

---

### CASO-20 — Aluno possui dois responsáveis

**Gatilho**: um aluno tem mais de um responsável cadastrado (ex. pai e mãe, cada um com conta própria) — `STU-05`.

**Comportamento esperado**: ambos recebem notificações de forma independente e simultânea (nenhum é "secundário" tecnicamente, salvo a distinção funcional de responsável financeiro/legal quando aplicável); qualquer um pode registrar ausência avisada (`STU-absence`) — a ação de qualquer responsável ativo é válida, refletida para ambos; remoção de um responsável exige que o outro (ou um terceiro promovido) assuma a flag de responsável legal, nunca deixando o aluno sem nenhum responsável legal ativo (`STU-05`).

**Critério de aceite**: ver `STU-05`.

---

### CASO-21 — Empresa possui centenas de motoristas e milhares de alunos (operação em grande escala)

**Gatilho**: tenant cresce para uma operação de grande porte (ex. uma empresa terceirizada de transporte público, ou uma rede de franquias — Capítulo 4, segmentação secundária).

**Comportamento esperado**: nenhuma tela da plataforma degrada de forma perceptível com o crescimento do volume dentro de um único tenant — listagens usam paginação por cursor (Capítulo 17.3), buscas são indexadas (`tenant_id` sempre como primeira coluna de índice, Dossiê 8 §19), dashboards usam contadores pré-agregados/cacheados em vez de cálculo em tempo real ingênuo (Dossiê 8 §20.1), e relatórios pesados são sempre processados de forma assíncrona contra réplica de leitura (Dossiê 8 §21.6), nunca bloqueando a interface enquanto processam.

**Impacto em cada papel**:

- **Gestor**: continua operando com a mesma responsividade percebida independentemente de o tenant ter 5 ou 5.000 motoristas — a única diferença visível é a necessidade de usar filtros/busca em vez de rolar uma lista inteira.
- **Admin Rotta**: monitora, via métricas de infraestrutura (`ADM-06`), se algum tenant específico está gerando um padrão de uso desproporcional que mereça atenção arquitetural dedicada (Dossiê 8 §1.3, escape valve de partição física por tenant grande).

**Critério de aceite**:

- **Dado** um tenant com 5.000 alunos cadastrados, **quando** o Gestor busca por um aluno específico pelo nome, **então** o resultado é retornado instantaneamente, sem degradação perceptível de performance em relação a um tenant pequeno.
- **Dado** o mesmo tenant, **quando** um relatório de frequência do mês inteiro é solicitado, **então** o processamento ocorre de forma assíncrona, sem bloquear o uso do restante do painel enquanto é gerado.

---

## Índice Consolidado de Regras de Negócio

Toda regra de negócio citada ao longo desta Especificação Funcional (Partes 1–7) e dos Dossiês de arquitetura (1–14), reunida em um único índice rastreável. Nenhuma regra listada aqui é nova além do que já foi definido nos documentos de origem — este índice existe para que nenhuma decisão fique implícita ou espalhada sem referência central.

### Regras de assinatura e cobrança

| Código    | Regra                                                                                                 | Origem            |
| --------- | ----------------------------------------------------------------------------------------------------- | ----------------- |
| RN-01     | Plano único, R$ 39,90/mês, cobrado por Empresa (tenant), independente de veículos/motoristas/alunos   | Capítulo 13       |
| RN-02     | Responsáveis, motoristas, monitores e escolas nunca são cobrados                                      | Capítulo 13       |
| RN-03     | Cobrança recorrente com retry D+1/D+3/D+7; modo restrito; carência de 15 dias antes de suspensão real | Capítulo 13       |
| RN-04     | Sem cobrança pro-rata complexa; ciclo mensal cheio a partir do trial                                  | Capítulo 13       |
| RN-05     | Tenant só é "ativo" para métricas com ao menos 1 veículo, 1 motorista, 1 rota                         | Capítulo 13       |
| RN-EMP-01 | Decisões de plano/cobrança são exclusivas do papel Empresa                                            | Parte 6, `EMP-03` |

### Regras de permissão e acesso (RBAC)

| Código          | Regra                                                                                                                                                                                                                     | Origem              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| RN-06           | Um usuário pode ter múltiplos `VinculoPapel` em tenants/papéis diferentes                                                                                                                                                 | Capítulo 13         |
| RN-07           | Gestor só acessa dados do próprio tenant                                                                                                                                                                                  | Capítulo 13         |
| RN-08           | Escola só acessa alunos vinculados a ela, somente leitura                                                                                                                                                                 | Capítulo 13         |
| RN-09           | Responsável só acessa dados do(s) próprio(s) filho(s)                                                                                                                                                                     | Capítulo 13         |
| RN-10           | Todo acesso do Admin Rotta a um tenant gera log de auditoria, inclusive leitura                                                                                                                                           | Capítulo 13         |
| RN-11           | Apenas o motorista titular/substituto designado pode iniciar uma rota                                                                                                                                                     | Capítulo 13         |
| RN-AUTH-01 a 05 | Dispositivo novo sempre exige verificação completa; bloqueio progressivo após tentativas falhas; nunca revela existência de conta; redefinição de senha revoga todas as sessões; logout em viagem ativa exige confirmação | Parte 1 (`AUTH-*`)  |
| RN-RESP-01      | Alteração de telefone/e-mail sempre notifica o canal antigo                                                                                                                                                               | Parte 3 (`RESP-05`) |

### Regras de operação da viagem

| Código    | Regra                                                                                                       | Origem             |
| --------- | ----------------------------------------------------------------------------------------------------------- | ------------------ |
| RN-12     | Rota só finaliza com confirmação ativa e explícita de van vazia                                             | Capítulo 13        |
| RN-13     | Alerta se aluno não processado em X minutos após horário previsto                                           | Capítulo 13        |
| RN-14     | Ausência não avisada gera notificação perguntando o motivo ao responsável                                   | Capítulo 13        |
| RN-15     | Atraso calculado por comparação ETA vs. previsto; notificação proativa após limiar configurável             | Capítulo 13        |
| RN-16     | Apenas Gestor (ou motorista-gestor) altera composição de rota, nunca o motorista em campo                   | Capítulo 13        |
| RN-17     | Ocorrência grave dispara notificação multicanal simultânea, ignorando preferência de silêncio               | Capítulo 13        |
| RN-CAP-01 | Total de alunos vinculados a um veículo/turno nunca excede sua capacidade, salvo exceção explícita auditada | Parte 2 (`VEI-03`) |

### Regras de conformidade documental

| Código | Regra                                                                                                         | Origem      |
| ------ | ------------------------------------------------------------------------------------------------------------- | ----------- |
| RN-18  | Motorista com CNH vencida bloqueado de iniciar rota                                                           | Capítulo 13 |
| RN-19  | Veículo com documento obrigatório vencido (CRLV/seguro/vistoria) bloqueado                                    | Capítulo 13 |
| RN-20  | Alertas de vencimento em 30/15/5 dias, ao Gestor e ao titular do documento                                    | Capítulo 13 |
| RN-21  | Política de bloqueio (rígida/apenas alerta) configurável por tenant; padrão de fábrica sempre o mais seguro   | Capítulo 13 |
| RN-29  | Status `aprovado` do Motorista é sempre derivado do conjunto de documentos vigentes, nunca setado manualmente | Dossiê 8    |
| RN-30  | Idem, para status `ativo` do Veículo                                                                          | Dossiê 8    |

### Regras de dados, privacidade e auditoria

| Código | Regra                                                                                                                         | Origem      |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------- |
| RN-22  | Dados de crianças tratados com padrão de proteção reforçado                                                                   | Capítulo 13 |
| RN-23  | Nenhum dado de aluno/responsável usado para publicidade ou fora do propósito do produto                                       | Capítulo 13 |
| RN-24  | Exclusão sob solicitação do responsável legal, respeitando vínculos ativos e retenção mínima obrigatória                      | Capítulo 13 |
| RN-25  | Localização em tempo real visível apenas a responsáveis com aluno ativo na rota naquele dia                                   | Capítulo 13 |
| RN-31  | Tabelas de alto volume (`PosicaoGPS`, `Evento`, `Notificacao`) nunca são referenciadas por FK a partir de tabelas de cadastro | Dossiê 8    |
| RN-32  | Alteração em Motorista/Veículo/Rota/`VinculoPapel`/`EmpresaConfiguracao` é sempre auditada                                    | Dossiê 8    |
| RN-33  | Dado biométrico nunca é visível a nenhum papel humano; apenas resultado binário de correspondência é usado                    | Dossiê 8    |

### Regras de ciclo de vida de entidades

| Código | Regra                                                                                       | Origem      |
| ------ | ------------------------------------------------------------------------------------------- | ----------- |
| RN-26  | Aluno não pode estar em duas rotas ativas do mesmo turno simultaneamente                    | Capítulo 13 |
| RN-27  | Desligamento de motorista/monitor sinaliza toda rota afetada como "sem motorista designado" | Capítulo 13 |
| RN-28  | Exclusão de tenant é sempre soft delete com retenção antes de purga definitiva              | Capítulo 13 |
| RN-34  | Receita estimada sempre rotulada como estimativa, nunca valor financeiro reconhecido        | Dossiê 8    |

---

## Nota de fechamento da Especificação Funcional

Esta especificação (Partes 1–7) é o documento vivo de referência para qualquer decisão de implementação, teste ou suporte da Rotta. Toda funcionalidade nova, a partir daqui, deve ser adicionada seguindo exatamente o mesmo padrão (código de funcionalidade, objetivo, descrição, usuários envolvidos, pré-requisitos, fluxo principal, fluxos alternativos, regras de negócio, permissões, validações, mensagens, casos excepcionais, critérios de aceite em BDD, melhorias futuras) — e toda regra de negócio nova deve ser adicionada ao índice consolidado desta Parte 7, nunca deixada apenas implícita dentro do texto de uma única funcionalidade.
