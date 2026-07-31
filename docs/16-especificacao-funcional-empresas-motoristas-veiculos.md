# Especificação Funcional Oficial da Rotta — Parte 2: Empresas, Motoristas e Veículos

> Continuação da Parte 1 (`docs/15-...`). Códigos de funcionalidade: `EMP-*` (Empresas), `DRV-*` (Motoristas), `VEI-*` (Veículos).

---

## EMP-01 — Cadastro de Empresa

**Objetivo**: registrar formalmente uma nova Empresa (tenant) na plataforma, com todos os dados cadastrais e fiscais necessários.

**Descrição**: mecanicamente idêntico ao fluxo de conta descrito em `AUTH-01`; esta funcionalidade especifica o conjunto completo de dados cadastrais da entidade `Empresa` (Dossiê 8 §3.1) que são coletados/editáveis, além do momento de criação.

**Usuários envolvidos**: Empresa (criador), Admin Rotta (visualização/suporte).

**Pré-requisitos**: nenhum (self-service).

**Fluxo principal**:
1. Ver `AUTH-01`, passos 1–6.
2. Sistema exibe formulário completo de dados cadastrais: razão social/nome fantasia, CNPJ ou CPF (conforme tipo), inscrição municipal (opcional), endereço completo (logradouro, número, complemento, bairro, cidade, UF, CEP), telefone, WhatsApp de contato, e-mail administrativo, fuso horário operacional.
3. Sistema valida e persiste os dados, associando-os ao tenant recém-criado.

**Fluxos alternativos**: nenhum além dos já descritos em `AUTH-01`.

**Regras de negócio**:
- CNPJ é obrigatório quando `tipo = pequena_empresa`/`media_grande_empresa`/`terceirizada_publica`; para `autonomo`/`mei`, apenas CPF é obrigatório e o campo CNPJ permanece nulo.
- Um mesmo CNPJ/CPF não pode estar associado a mais de uma `Empresa` ativa simultaneamente (índice único).
- Fuso horário é definido na criação e usado em todo cálculo de horário de rota daquele tenant (relevante para expansão nacional entre fusos diferentes).

**Permissões**: criação é pública (self-service); edição posterior restrita ao papel Empresa (dados fiscais/cadastrais) — Gestor não pode alterar razão social/CNPJ (`EMP-02`).

**Validações**: CNPJ/CPF com dígito verificador válido; CEP existente (validado via consulta a serviço de CEP, quando disponível); telefone/e-mail em formato válido.

**Mensagens exibidas**: "Empresa cadastrada com sucesso!"; erro — "CNPJ inválido."; erro — "Já existe uma conta com este CNPJ."

**Casos excepcionais**: motorista autônomo que, ao crescer, quer migrar de `tipo = autonomo` para `tipo = pequena_empresa` e obter CNPJ — tratado como uma edição de tipo (`EMP-02`), preservando todo o histórico do tenant, nunca como um novo cadastro.

**Critérios de aceite**:
- **Dado** um CNPJ nunca usado, **quando** uma Empresa completa o cadastro com todos os dados obrigatórios válidos, **então** o tenant é criado com status `trial` ou `ativo` conforme a política comercial vigente.
- **Dado** um CNPJ já cadastrado em outra conta ativa, **quando** alguém tenta se cadastrar com o mesmo CNPJ, **então** o sistema recusa com mensagem clara.

**Possíveis melhorias futuras**: validação automática de CNPJ contra a Receita Federal (situação cadastral ativa) no momento do cadastro.

---

## EMP-02 — Edição de dados da Empresa

**Objetivo**: permitir a atualização dos dados cadastrais de uma Empresa já existente.

**Descrição**: tela de "Configurações → Empresa" (Dossiê 11 §2.2) onde os dados coletados em `EMP-01` podem ser revisados e corrigidos.

**Usuários envolvidos**: Empresa (edição plena), Gestor (edição de dados operacionais, não fiscais).

**Pré-requisitos**: Empresa cadastrada.

**Fluxo principal**:
1. Usuário acessa Configurações → Empresa.
2. Edita os campos permitidos ao seu papel.
3. Sistema valida e salva, gerando registro de auditoria (`RN-32`, Dossiê 8).

**Fluxos alternativos**: alteração de tipo de empresa (`autônomo` → `pequena_empresa`) exige also informar o novo CNPJ, tratada como uma sub-jornada dentro desta mesma funcionalidade.

**Regras de negócio**: CNPJ/CPF, uma vez definido, só pode ser alterado mediante confirmação adicional (reenvio de OTP), nunca uma edição trivial de texto — mitigação contra troca indevida de identidade fiscal do tenant.

**Permissões**: Empresa edita todos os campos; Gestor edita apenas contato/endereço operacional, não CNPJ/razão social/dados de cobrança.

**Validações**: idênticas a `EMP-01` para os campos correspondentes.

**Mensagens exibidas**: "Dados atualizados com sucesso."; erro de permissão — "Apenas o titular da conta pode alterar estes dados."

**Casos excepcionais**: edição concorrente (dois Gestores editando simultaneamente) — a última escrita prevalece (last-write-wins), com o registro de auditoria preservando ambas as tentativas para investigação, caso necessário.

**Critérios de aceite**:
- **Dado** um Gestor autenticado, **quando** ele tenta editar o CNPJ da empresa, **então** o sistema recusa a ação com erro de permissão.
- **Dado** o papel Empresa autenticado, **quando** ele edita o endereço, **então** a alteração é salva e um registro de auditoria é criado.

**Possíveis melhorias futuras**: histórico visual de alterações cadastrais diretamente na tela de configurações (hoje disponível apenas via `AUD-01`, Parte 6).

---

## EMP-03 — Gestão de Plano

**Objetivo**: permitir que a Empresa visualize e gerencie sua assinatura do plano Rotta.

**Descrição**: como o plano é único (R$ 39,90/mês, RN-01), esta funcionalidade cobre visualização do plano atual, forma de pagamento, próxima cobrança, e histórico de faturas — não uma seleção entre múltiplos planos no MVP (reservado a V2+ se novos planos forem lançados).

**Usuários envolvidos**: Empresa.

**Pré-requisitos**: tenant ativo.

**Fluxo principal**:
1. Empresa acessa Configurações → Plano e Cobrança.
2. Visualiza: plano atual, valor, status da assinatura, data da próxima cobrança, forma de pagamento cadastrada.
3. Pode atualizar a forma de pagamento (novo cartão/chave Pix) a qualquer momento.
4. Pode acessar o histórico de faturas anteriores.

**Fluxos alternativos**: **A1 — Falha de cobrança**: tela exibe alerta destacado com o motivo da falha e ação direta "Atualizar forma de pagamento".

**Regras de negócio**: `RN-01` a `RN-05` (Capítulo 13) regem integralmente esta funcionalidade — cobrança fixa por tenant, nunca por veículo/aluno; carência de 15 dias antes de suspensão real (`RN-03`).

**Permissões**: exclusivo do papel Empresa — nem Gestor nem nenhum outro papel acessa esta tela (`EMP-02`, regra de permissão).

**Validações**: token de pagamento validado pelo gateway antes de ser aceito como forma de pagamento ativa.

**Mensagens exibidas**: "Sua próxima cobrança de R$ 39,90 será em [data]."; alerta — "Não conseguimos processar seu pagamento. Atualize sua forma de pagamento para evitar interrupção."

**Casos excepcionais**: ver `CASO-08` e `CASO-09` (Parte 7) para troca/cancelamento de plano.

**Critérios de aceite**:
- **Dado** uma assinatura ativa, **quando** a Empresa acessa a tela de Plano, **então** vê corretamente o valor, status e próxima data de cobrança.
- **Dado** uma falha de pagamento recente, **quando** a Empresa acessa a tela, **então** vê o alerta de falha com ação de correção em destaque.

**Possíveis melhorias futuras**: múltiplos planos (ex. plano com funcionalidades adicionais de V2, como cobrança de responsáveis) exigirá uma tela de comparação/upgrade.

---

## EMP-04 — Status do Tenant

**Objetivo**: refletir e comunicar de forma transparente o status operacional da Empresa (`trial`, `ativo`, `restrito`, `suspenso`, `cancelado`).

**Descrição**: o status não é editável diretamente pelo usuário — é derivado do estado de cobrança (`EMP-03`) e de decisões administrativas do Admin Rotta (`ADM-01`, Parte 6). Esta funcionalidade cobre como o status é exibido e como ele afeta o restante do sistema.

**Usuários envolvidos**: Empresa, Gestor (leitura); Admin Rotta (alteração administrativa excepcional, ex. suspensão por violação de termos de uso).

**Pré-requisitos**: nenhum.

**Fluxo principal**: o status é exibido de forma persistente (faixa no topo do painel) sempre que diferente de `ativo`, com explicação e ação recomendada.

**Fluxos alternativos**: **A1 (Admin Rotta)**: suspensão manual por violação de termos, com justificativa obrigatória registrada em auditoria — distinta da suspensão automática por inadimplência (`RN-03`).

**Regras de negócio**: `RN-03` define as transições `ativo → restrito → suspenso`; a transição `trial → ativo` ocorre automaticamente ao final do período de teste mediante cobrança bem-sucedida.

**Permissões**: leitura por Empresa/Gestor; escrita (alteração manual) restrita ao Admin Rotta, sempre auditada (`RN-10`).

**Validações**: nenhuma alteração de status manual é permitida sem justificativa textual registrada.

**Mensagens exibidas**: "Sua conta está em período de teste até [data]."; "Sua conta está com pagamento pendente. Regularize até [data] para evitar restrições."; "Sua conta foi suspensa. Entre em contato com o suporte."

**Casos excepcionais**: uma Empresa suspensa por inadimplência que regulariza o pagamento é reativada automaticamente (não exige intervenção manual do Admin Rotta) — distinto da suspensão por violação de termos, que exige revisão manual antes de reativar.

**Critérios de aceite**:
- **Dado** um tenant em `restrito` por falha de pagamento, **quando** a cobrança é reprocessada com sucesso, **então** o status retorna automaticamente a `ativo`.
- **Dado** um tenant suspenso manualmente pelo Admin Rotta, **quando** a Empresa tenta reativar sozinha, **então** o sistema não oferece essa opção — apenas contato com suporte.

**Possíveis melhorias futuras**: página de status público (ex. `status.rotta.com.br`) para transparência de disponibilidade da plataforma como um todo — não confundir com o status individual do tenant.

---

## EMP-05 — Configurações Operacionais da Empresa

**Objetivo**: permitir que a Empresa/Gestor ajuste parâmetros operacionais que alteram o comportamento das regras de negócio dentro do próprio tenant.

**Descrição**: interface sobre a entidade `EmpresaConfiguracao` (Dossiê 8 §3.1/3.2) — limiar de atraso para notificação proativa, política de bloqueio por documento vencido (rígida/alerta, `RN-21`), canais de notificação habilitados por padrão.

**Usuários envolvidos**: Empresa, Gestor.

**Pré-requisitos**: tenant ativo.

**Fluxo principal**:
1. Usuário acessa Configurações → Operacional.
2. Ajusta o valor de cada parâmetro disponível (ex. "notificar atraso a partir de: 10 minutos").
3. Sistema salva e aplica a nova configuração imediatamente às próximas execuções de regra (nunca retroativo a viagens já em andamento no exato momento da alteração, para não gerar inconsistência de comportamento no meio de uma rota).

**Fluxos alternativos**: nenhum.

**Regras de negócio**: o padrão de fábrica de toda configuração é sempre o mais seguro/conservador (`RN-21`) — alterar para uma política menos rígida é uma ação deliberada, nunca o comportamento inicial.

**Permissões**: Empresa e Gestor podem alterar; nenhum outro papel visualiza esta tela.

**Validações**: valores numéricos dentro de faixas plausíveis (ex. limiar de atraso entre 1 e 60 minutos — um valor absurdo como "0" ou "500" é rejeitado).

**Mensagens exibidas**: "Configurações salvas. As novas regras valem a partir da próxima viagem."

**Casos excepcionais**: alteração da política de bloqueio de `rígida` para `apenas alerta` — o sistema exibe um aviso de confirmação adicional explicando a implicação de segurança antes de permitir a mudança, dado o impacto direto em `RN-18`/`RN-19`.

**Critérios de aceite**:
- **Dado** um limiar de atraso padrão de 10 minutos, **quando** o Gestor o altera para 5 minutos, **então** viagens iniciadas após a alteração passam a notificar atraso a partir de 5 minutos.
- **Dado** uma tentativa de alterar a política de bloqueio para "apenas alerta", **quando** o Gestor confirma a ação após o aviso, **então** a nova política é aplicada e um registro de auditoria é criado destacando a mudança de postura de segurança.

**Possíveis melhorias futuras**: perfis de configuração pré-definidos (ex. "conservador", "flexível") para simplificar a decisão do Gestor.

---

## DRV-01 — Cadastro de Motorista

**Objetivo**: registrar um motorista dentro do tenant, com todos os dados exigidos por regulação de transporte escolar.

**Descrição**: iniciado pelo Gestor (convite) ou pelo próprio motorista autônomo quando ele mesmo é o titular do tenant (papel Empresa acumulado com Motorista).

**Usuários envolvidos**: Gestor/Empresa (criador), Motorista (completa o próprio cadastro via convite).

**Pré-requisitos**: tenant ativo, dentro dos limites de uso esperados (`RN-05` não bloqueia, apenas monitora).

**Fluxo principal**: ver `AUTH-01`, fluxo A1, especializado para o papel Motorista — dados pessoais, CNH (número, categoria, validade), EAR (número de registro e validade), telefone/e-mail de convite.

**Fluxos alternativos**: cadastro direto pelo Gestor sem convite imediato (motorista é cadastrado "no papel" primeiro, convite enviado depois) — status permanece `pendente_verificacao` até o motorista aceitar e completar seus próprios dados de acesso.

**Regras de negócio**: `RN-29` (Dossiê 8) — o status `aprovado` é sempre derivado, nunca setado diretamente neste cadastro.

**Permissões**: criação por Gestor/Empresa; o próprio Motorista só edita os campos de seu próprio perfil, nunca o vínculo com rota/veículo (isso é `ROT-*`).

**Validações**: CNH com categoria mínima D (exigência de transporte escolar); formato de EAR validado conforme padrão do órgão de trânsito local.

**Mensagens exibidas**: "Motorista cadastrado. Convite enviado para [telefone/e-mail]."

**Casos excepcionais**: motorista com CNH de categoria inferior a D cadastrado por engano — sistema aceita o cadastro (não impede o registro administrativo), mas o status nunca chega a `aprovado` e o bloqueio de início de rota (`RN-18`) impede a operação até a regularização.

**Critérios de aceite**:
- **Dado** um Gestor autenticado, **quando** ele cadastra um motorista com CNH categoria D e dados válidos, **então** o motorista é criado com status `pendente_verificacao` e um convite é enviado.
- **Dado** uma CNH de categoria B (insuficiente), **quando** cadastrada, **então** o motorista é criado mas nunca atinge status `aprovado` automaticamente.

**Possíveis melhorias futuras**: importação em massa de motoristas via planilha (mesmo padrão de `STU-01c`, Parte 3).

---

## DRV-02 — Validação da CNH

**Objetivo**: garantir que todo motorista ativo possua CNH válida e de categoria compatível com a condução de veículo escolar.

**Descrição**: parte do subsistema de Documentos (`DOC-01`, Parte 6) especializada para o documento CNH — inclui verificação de categoria mínima e recálculo automático de status.

**Usuários envolvidos**: Motorista (upload), Gestor (revisão/aprovação).

**Pré-requisitos**: motorista cadastrado (`DRV-01`).

**Fluxo principal**:
1. Motorista (ou Gestor) faz upload da CNH digitalizada com data de validade informada.
2. Sistema cria o registro de `Documento` com status `pendente_verificacao`.
3. Gestor revisa (ou o sistema aplica OCR assistido, V2) e aprova/rejeita.
4. Status do Motorista é recalculado automaticamente (`RN-29`).

**Fluxos alternativos**: renovação de CNH já vencida — novo upload substitui/complementa o anterior, preservando o histórico da CNH vencida para fins de auditoria (nunca sobrescrita silenciosa).

**Regras de negócio**: `RN-18` — motorista com CNH vencida é bloqueado de iniciar rota; categoria mínima D é obrigatória para status `aprovado`, mesmo com data de validade correta.

**Permissões**: upload por Motorista ou Gestor; aprovação exclusiva do Gestor/Empresa.

**Validações**: data de validade não pode estar no passado no momento do upload (rejeitada com mensagem clara, orientando a buscar a renovação); categoria deve ser D ou E.

**Mensagens exibidas**: "CNH enviada, aguardando aprovação."; erro — "Esta CNH já está vencida. Envie uma CNH válida."; "CNH aprovada — motorista liberado para iniciar rotas."

**Casos excepcionais**: ver `CASO-15` (Parte 7) para o comportamento completo quando a CNH vence com o motorista já em operação.

**Critérios de aceite**:
- **Dado** uma CNH categoria D com validade futura, **quando** aprovada pelo Gestor, **então** o status do Motorista é recalculado para `aprovado` (assumindo os demais documentos também em dia).
- **Dado** uma CNH com data de validade no passado, **quando** o upload é tentado, **então** o sistema rejeita o envio com mensagem explicativa.

**Possíveis melhorias futuras**: OCR automático extraindo categoria e validade diretamente da imagem (V2, Dossiê 8 §18.2).

---

## DRV-03 — Validação do EAR

**Objetivo**: garantir que todo motorista possua o registro de Exerce Atividade Remunerada (EAR) válido, exigência específica para condução remunerada de transporte escolar/coletivo.

**Descrição**: mesmo padrão de `DRV-02`, aplicado ao documento EAR.

**Usuários envolvidos**: Motorista (upload), Gestor (revisão).

**Pré-requisitos**: motorista cadastrado.

**Fluxo principal**: idêntico a `DRV-02`, substituindo "CNH" por "EAR" (número de registro + validade).

**Fluxos alternativos**: em municípios onde o EAR não é exigido por regulação local, o Gestor pode desativar essa exigência específica nas configurações operacionais (`EMP-05`) — mas o padrão de fábrica exige o documento (postura conservadora, `RN-21`).

**Regras de negócio**: `RN-19`-equivalente para EAR (mesma lógica de bloqueio de `RN-18`, aplicada a este documento específico quando exigido pela configuração do tenant).

**Permissões**: idênticas a `DRV-02`.

**Validações**: idênticas a `DRV-02`.

**Mensagens exibidas**: "EAR enviado, aguardando aprovação."; "EAR vencido — regularize para continuar operando."

**Casos excepcionais**: ver `CASO-16` (Parte 7).

**Critérios de aceite**:
- **Dado** um tenant com exigência de EAR habilitada, **quando** um motorista está com EAR vencido, **então** ele é bloqueado de iniciar rota até a regularização.
- **Dado** um tenant que desabilitou a exigência de EAR, **quando** um motorista está sem EAR cadastrado, **então** isso não impede seu status `aprovado`.

**Possíveis melhorias futuras**: nenhuma além das já listadas em `DRV-02`.

---

## DRV-04 — Reconhecimento facial do Motorista

**Objetivo**: confirmar a identidade do motorista no início de cada rota, prevenindo que outra pessoa opere sob a conta de um motorista cadastrado.

**Descrição**: funcionalidade de V2 (estrutura de dados já reservada desde o MVP, Dossiê 8 §4.1) — cadastro do *embedding* de referência (enrolamento) e verificação subsequente a cada início de rota.

**Usuários envolvidos**: Motorista.

**Pré-requisitos**: motorista com status `aprovado`; enrolamento facial previamente concluído.

**Fluxo principal (enrolamento, uma vez)**:
1. No app, o motorista é solicitado a capturar uma foto de referência do rosto.
2. Processamento local gera o *embedding*; imagem bruta é descartada imediatamente após a geração.
3. *Embedding* é enviado ao serviço de verificação facial e associado ao perfil do motorista (`RN-33`).

**Fluxo principal (verificação, a cada início de rota — V2)**:
1. Motorista aperta "Iniciar rota".
2. App solicita captura rápida com checagem de vivacidade.
3. Sistema compara o novo *embedding* contra o de referência.
4. Em caso de correspondência, a rota inicia normalmente (`TRIP-01`, Parte 4); em caso de não correspondência, o início é bloqueado e o Gestor é alertado.

**Fluxos alternativos**: falha técnica da câmera/serviço de verificação — o sistema permite início da rota mediante aprovação manual explícita do Gestor como contingência, nunca deixando o motorista impedido de trabalhar por uma falha técnica de terceiro.

**Regras de negócio**: `RN-33` — o dado biométrico nunca é visível a nenhum papel humano; apenas o resultado binário de correspondência é utilizado pela aplicação.

**Permissões**: exclusivo do próprio Motorista (ação sobre si mesmo); Gestor apenas recebe o alerta de falha, nunca visualiza o dado biométrico.

**Validações**: checagem de vivacidade (anti-spoofing) obrigatória — uma foto estática apresentada à câmera deve ser rejeitada.

**Mensagens exibidas**: "Identidade confirmada. Iniciando rota."; "Não foi possível confirmar sua identidade. Tente novamente ou contate seu gestor."

**Casos excepcionais**: mudança relevante de aparência do motorista (ex. barba, óculos) causando falsos negativos recorrentes — fluxo de re-enrolamento disponível mediante aprovação do Gestor.

**Critérios de aceite**:
- **Dado** um motorista com *embedding* de referência cadastrado, **quando** a verificação no início da rota corresponde, **então** a viagem é iniciada normalmente.
- **Dado** uma verificação que não corresponde ao *embedding* de referência, **quando** isso ocorre, **então** o início da rota é bloqueado e o Gestor recebe um alerta imediato.

**Possíveis melhorias futuras**: verificação periódica durante a rota (não apenas no início), para cenários de troca de motorista não reportada no meio do trajeto.

---

## DRV-05 — Documentos do Motorista (visão geral)

**Objetivo**: centralizar a gestão de todos os documentos de um motorista além de CNH/EAR — cursos obrigatórios (direção defensiva, curso de transporte escolar) e demais certificações.

**Descrição**: interface de listagem e upload que reaproveita o subsistema genérico de Documentos (`DOC-*`, Parte 6), filtrado ao contexto do motorista.

**Usuários envolvidos**: Motorista (upload), Gestor (revisão, cadastro de novo tipo de curso exigido).

**Pré-requisitos**: motorista cadastrado.

**Fluxo principal**:
1. Gestor/Motorista acessa a aba "Documentos" do perfil do motorista.
2. Visualiza lista de documentos com status de vencimento (semáforo verde/amarelo/vermelho).
3. Adiciona novo documento (tipo, upload, validade).

**Fluxos alternativos**: cadastro de um tipo de curso específico exigido por regulação municipal não previsto na lista padrão — Gestor pode adicionar um tipo customizado (campo de texto livre com data de validade).

**Regras de negócio**: mesmas de `DOC-01`–`DOC-03` (Parte 6), aplicadas à entidade Motorista.

**Permissões**: como em `DRV-02`.

**Validações**: como em `DRV-02`, generalizado a qualquer tipo de documento.

**Mensagens exibidas**: análogas às de `DRV-02`/`DRV-03`.

**Casos excepcionais**: nenhum além dos já cobertos em `DOC-*`.

**Critérios de aceite**:
- **Dado** um motorista com um curso de direção defensiva vencendo em 10 dias, **quando** o Gestor acessa a aba Documentos, **então** o item aparece destacado em âmbar com a data de vencimento visível.

**Possíveis melhorias futuras**: nenhuma além das já listadas em `DOC-*`.

---

## DRV-06 — Ativação de Motorista

**Objetivo**: formalizar a transição de um motorista de "cadastrado, pendente" para "operacional" dentro do tenant.

**Descrição**: ocorre automaticamente quando todos os documentos obrigatórios estão aprovados e em dia (`RN-29`) — não é, em geral, uma ação manual isolada, mas o resultado direto do fluxo de `DRV-02`/`DRV-03`. Esta funcionalidade documenta esse comportamento derivado como uma entidade própria de especificação, dado seu impacto direto na operação.

**Usuários envolvidos**: Gestor (aprovação de documentos, gatilho indireto), sistema (cálculo automático).

**Pré-requisitos**: motorista cadastrado com ao menos os documentos mínimos obrigatórios enviados.

**Fluxo principal**:
1. Último documento obrigatório pendente é aprovado pelo Gestor (ou automaticamente via OCR de alta confiança, V2).
2. Sistema recalcula o status do motorista para `aprovado`.
3. Motorista passa a poder ser vinculado a rotas (`ROT-01`) e a iniciar viagens (`TRIP-01`).
4. Motorista recebe notificação de ativação.

**Fluxos alternativos**: Gestor pode, excepcionalmente, forçar uma reativação manual após resolver uma pendência fora do fluxo padrão (ex. erro de sistema) — ação registrada em auditoria com justificativa obrigatória.

**Regras de negócio**: `RN-29`.

**Permissões**: automática pelo sistema; forçar manualmente é ação exclusiva do Gestor/Empresa, sempre auditada.

**Validações**: nenhuma ação manual de "ativar" é aceita se ainda houver documento obrigatório pendente ou vencido — o sistema recusa a tentativa.

**Mensagens exibidas**: "Parabéns! [Nome do motorista] está liberado para operar rotas."

**Casos excepcionais**: nenhum além dos já cobertos em `DRV-02`/`DRV-03`.

**Critérios de aceite**:
- **Dado** um motorista com todos os documentos obrigatórios aprovados e em dia, **quando** o último pendente é aprovado, **então** o status muda automaticamente para `aprovado` e uma notificação é enviada.

**Possíveis melhorias futuras**: nenhuma identificada.

---

## DRV-07 — Inativação de Motorista

**Objetivo**: permitir o desligamento formal de um motorista do tenant, preservando integridade operacional e histórico.

**Descrição**: ação deliberada do Gestor/Empresa, distinta do bloqueio automático por documento vencido (que é reversível e temporário) — a inativação é uma decisão de desligamento.

**Usuários envolvidos**: Gestor, Empresa.

**Pré-requisitos**: motorista cadastrado.

**Fluxo principal**:
1. Gestor acessa o perfil do motorista → "Desligar motorista".
2. Sistema exibe aviso sobre rotas atualmente vinculadas a esse motorista.
3. Gestor confirma.
4. Sistema marca o motorista como inativo, revoga o acesso ao app (todas as sessões), e sinaliza toda rota que o tinha como padrão como "sem motorista designado" (`RN-27`).

**Fluxos alternativos**: motorista tem viagem em andamento no momento da tentativa de desligamento — sistema bloqueia a inativação imediata e orienta o Gestor a aguardar o fim da viagem ou realizar uma substituição pontual (`ROT-substituição`) primeiro.

**Regras de negócio**: `RN-27` — nenhuma rota fica silenciosamente sem motorista; o Gestor é obrigatoriamente alertado.

**Permissões**: exclusivo de Gestor/Empresa.

**Validações**: bloqueio de inativação durante viagem em andamento daquele motorista (ver fluxo alternativo).

**Mensagens exibidas**: "Este motorista possui 3 rotas ativas. Ao desligar, elas ficarão sem motorista designado até você atribuir um substituto. Deseja continuar?"; erro — "Não é possível desligar um motorista com viagem em andamento."

**Casos excepcionais**: motorista desligado que era também o único usuário com papel Empresa (motorista autônomo desligando a si mesmo) — tratado como cancelamento de conta (`EMP-*`/`CASO-09`), não como uma inativação comum de funcionário.

**Critérios de aceite**:
- **Dado** um motorista sem viagem em andamento e vinculado a 2 rotas, **quando** o Gestor confirma o desligamento, **então** o motorista é inativado e as 2 rotas passam a exibir alerta de "sem motorista designado".
- **Dado** um motorista com viagem em andamento, **quando** o Gestor tenta desligá-lo, **então** o sistema recusa a ação até o fim da viagem.

**Possíveis melhorias futuras**: fluxo guiado de "desligar e substituir" em uma única jornada (hoje são duas ações separadas).

---

## DRV-08 — Troca de veículo do Motorista

**Objetivo**: permitir que o veículo associado a um motorista (dentro de uma rota) seja alterado, seja permanentemente ou pontualmente para um dia específico.

**Descrição**: implementada como a ação `POST /routes/:id/substitute-vehicle` (Dossiê 13, Módulo Routes) — tecnicamente é uma alteração na Rota, não no Motorista, mas documentada aqui pela ótica da jornada do motorista.

**Usuários envolvidos**: Gestor (ação típica), Motorista (quando acumula papel de Gestor).

**Pré-requisitos**: rota existente, veículo substituto com status `aprovado`.

**Fluxo principal**: ver `ROT-06` (Parte 4, "Substituição de veículo").

**Fluxos alternativos/Regras de negócio/Permissões/Validações/Mensagens/Casos excepcionais/Critérios de aceite**: integralmente detalhados em `ROT-06`, para evitar duplicação — esta entrada existe para satisfazer a rastreabilidade da jornada do Motorista solicitada nesta especificação.

**Possíveis melhorias futuras**: ver `ROT-06`.

---

## DRV-09 — Troca de rota do Motorista

**Objetivo**: permitir a reatribuição de um motorista para uma rota diferente da(s) que ele conduz habitualmente.

**Descrição**: cobre tanto a reatribuição permanente (o motorista passa a conduzir uma nova rota como parte de sua escala regular) quanto a substituição pontual em outra rota por necessidade do dia (`ROT-05`, Parte 4).

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: motorista com status `aprovado`, disponibilidade compatível com o turno da rota-alvo (`DisponibilidadeMotorista`, Dossiê 8 §4.1).

**Fluxo principal**:
1. Gestor acessa a Rota-alvo → "Atribuir motorista".
2. Sistema lista apenas motoristas `aprovado`s com disponibilidade compatível.
3. Gestor seleciona o motorista.
4. Sistema atualiza o vínculo motorista-padrão da rota (ou registra substituição pontual, conforme escopo escolhido).

**Fluxos alternativos**: ver `ROT-05` para o cenário de substituição de emergência no mesmo dia.

**Regras de negócio**: a lista de motoristas elegíveis nunca inclui motoristas bloqueados por documento vencido (reforço de `RN-18` também na tela de atribuição, não apenas no momento de iniciar a viagem).

**Permissões**: exclusivo de Gestor/Empresa.

**Validações**: motorista já vinculado como padrão a outra rota do mesmo turno gera um aviso de possível conflito de agenda (não bloqueia — pode ser intencional em operações pequenas onde o mesmo motorista atende turnos diferentes em rotas distintas, desde que os horários não colidam de fato).

**Mensagens exibidas**: "Motorista atribuído com sucesso à rota [nome]."; aviso — "Este motorista já está designado para outra rota no mesmo turno. Verifique se os horários não colidem."

**Casos excepcionais**: ver `CASO-05` (Parte 7).

**Critérios de aceite**:
- **Dado** uma rota sem motorista designado, **quando** o Gestor atribui um motorista `aprovado` e disponível, **então** a rota passa a exibi-lo como motorista padrão.
- **Dado** um motorista bloqueado por documento vencido, **quando** o Gestor tenta atribuí-lo a uma rota, **então** ele não aparece na lista de elegíveis.

**Possíveis melhorias futuras**: sugestão automática do motorista mais adequado com base em proximidade geográfica e histórico de pontualidade (V3, Analytics).

---

## VEI-01 — Cadastro de Veículo

**Objetivo**: registrar um veículo dentro do tenant, com os dados necessários para operação e conformidade documental.

**Usuários envolvidos**: Gestor, Empresa.

**Pré-requisitos**: tenant ativo.

**Fluxo principal**:
1. Gestor acessa "Veículos" → "+ Novo veículo".
2. Informa placa, modelo, marca, ano, cor, capacidade de lugares, capacidade de cadeirantes (se aplicável), tipo (van/kombi/ônibus/micro-ônibus), foto.
3. Sistema valida e cria o veículo com status `pendente_verificacao` (até documentos serem aprovados).

**Fluxos alternativos**: nenhum.

**Regras de negócio**: placa única por tenant (não globalmente — Dossiê 8 §5.1); capacidade deve ser um número inteiro positivo.

**Permissões**: exclusivo de Gestor/Empresa.

**Validações**: formato de placa (padrão Mercosul ou antigo, ambos aceitos); ano de fabricação dentro de uma faixa plausível (não aceita, por exemplo, ano futuro).

**Mensagens exibidas**: "Veículo cadastrado. Envie os documentos para liberar a operação."

**Casos excepcionais**: cadastro de veículo com placa já usada por outro veículo do mesmo tenant no passado (veículo vendido e placa reutilizada por engano de digitação) — sistema alerta sobre a placa duplicada e pede confirmação explícita antes de prosseguir.

**Critérios de aceite**:
- **Dado** dados válidos e uma placa não usada no tenant, **quando** o Gestor cadastra o veículo, **então** ele é criado com status `pendente_verificacao`.
- **Dado** uma placa já cadastrada no mesmo tenant, **quando** o cadastro é tentado, **então** o sistema alerta sobre a duplicidade antes de permitir prosseguir.

**Possíveis melhorias futuras**: preenchimento automático de modelo/marca a partir da placa via consulta a uma base veicular pública/paga.

---

## VEI-02 — Edição de Veículo

**Objetivo**: permitir atualização dos dados cadastrais de um veículo existente.

**Usuários envolvidos**: Gestor, Empresa.

**Pré-requisitos**: veículo cadastrado.

**Fluxo principal**: análogo a `EMP-02`, aplicado à entidade Veículo — edição de qualquer campo de `VEI-01` exceto placa (tratada como alteração sensível).

**Fluxos alternativos**: alteração de placa (ex. veículo passou por transferência/nova emplacação) — exige confirmação adicional e gera registro de auditoria destacado, dado o impacto em todo o histórico de viagens associado.

**Regras de negócio**: alteração de capacidade abaixo do número de alunos atualmente vinculados a rotas que usam este veículo é bloqueada até a composição da(s) rota(s) ser ajustada (ver `VEI-03`).

**Permissões**: Gestor/Empresa.

**Validações**: idênticas a `VEI-01`.

**Mensagens exibidas**: "Veículo atualizado com sucesso."; erro — "Não é possível reduzir a capacidade abaixo do número de alunos já vinculados às rotas deste veículo."

**Casos excepcionais**: ver `CASO-17` (Parte 7, veículo acima da capacidade).

**Critérios de aceite**:
- **Dado** um veículo com 15 alunos vinculados em suas rotas, **quando** o Gestor tenta reduzir a capacidade para 10, **então** o sistema recusa a alteração e explica o motivo.

**Possíveis melhorias futuras**: nenhuma identificada além das já cobertas.

---

## VEI-03 — Capacidade do Veículo

**Objetivo**: garantir que o número de alunos vinculados a qualquer rota que utilize um veículo nunca exceda sua capacidade declarada.

**Descrição**: regra transversal, aplicada tanto na composição de rota (`ROT-05`, vínculo de aluno) quanto na edição do próprio veículo (`VEI-02`).

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: veículo com capacidade cadastrada.

**Fluxo principal**: a cada tentativa de vincular um novo aluno a uma parada de uma rota, o sistema soma o total de alunos já vinculados àquele veículo (considerando toda a rota, não apenas aquela parada) e compara com a capacidade — se o novo total exceder, a vinculação é bloqueada.

**Fluxos alternativos**: Gestor pode, deliberadamente, forçar uma exceção pontual (ex. capacidade sentada é X mas há tolerância legal para Y crianças pequenas em determinada configuração) mediante confirmação explícita e justificativa registrada — a exceção nunca é silenciosa.

**Regras de negócio**: `RN-CAP-01` (nova) — o total de alunos vinculados a todas as rotas ativas que compartilham o mesmo veículo em um mesmo turno nunca excede a capacidade cadastrada, salvo exceção explícita e auditada.

**Permissões**: validação de sistema, aplicada independentemente do papel que tenta a ação.

**Validações**: soma de alunos por veículo/turno vs. capacidade cadastrada.

**Mensagens exibidas**: "Este veículo já está no limite de capacidade (15/15). Remova um aluno ou aumente a capacidade cadastrada."

**Casos excepcionais**: ver `CASO-17` (Parte 7).

**Critérios de aceite**:
- **Dado** um veículo com capacidade 15 já com 15 alunos vinculados, **quando** o Gestor tenta vincular o 16º aluno, **então** o sistema bloqueia a ação com mensagem explicativa.
- **Dado** o mesmo cenário, **quando** o Gestor força a exceção com justificativa, **então** o vínculo é criado e um registro de auditoria destacado é gerado.

**Possíveis melhorias futuras**: cálculo de capacidade diferenciado por faixa etária (crianças pequenas ocupam menos espaço físico que adolescentes), refinamento de V3.

---

## VEI-04 — Documentação do Veículo

**Objetivo**: gerenciar CRLV, seguro e vistoria do veículo, com controle de vencimento.

**Descrição**: mesmo padrão de `DRV-02`/`DRV-03`, aplicado às entidades documentais de `Veiculo` (Dossiê 8 §5.1).

**Usuários envolvidos**: Gestor (upload/gestão).

**Pré-requisitos**: veículo cadastrado.

**Fluxo principal**: idêntico a `DRV-05`, filtrado ao veículo — upload de CRLV (com validade do licenciamento anual), apólice de seguro (seguradora, número, vigência), laudo de vistoria (tipo, órgão emissor, validade).

**Fluxos alternativos**: nenhum além dos já cobertos em `DOC-*` (Parte 6).

**Regras de negócio**: `RN-19` (Capítulo 13) — veículo com qualquer documento obrigatório vencido é bloqueado de operar (`RN-CAP` combinado com `RN-19` na prática de `TRIP-01`).

**Permissões**: exclusivo de Gestor/Empresa.

**Validações**: idênticas a `DRV-02`.

**Mensagens exibidas**: análogas a `DRV-02`/`DRV-03`, adaptadas ao contexto de veículo.

**Casos excepcionais**: ver `CASO-18` (Parte 7, seguro vencido).

**Critérios de aceite**:
- **Dado** um veículo com seguro vencido, **quando** um motorista tenta iniciar uma rota com este veículo, **então** o início é bloqueado (`RN-19`) com mensagem explicando o motivo.

**Possíveis melhorias futuras**: OCR do CRLV para preenchimento automático de dados do veículo a partir do documento digitalizado.

---

## VEI-05 — Histórico de Utilização do Veículo

**Objetivo**: permitir a consulta do histórico completo de viagens realizadas por um veículo específico.

**Descrição**: tela de consulta (não uma tabela própria — Dossiê 8 §5.1) sobre as `Viagem`s associadas ao veículo.

**Usuários envolvidos**: Gestor, Empresa.

**Pré-requisitos**: veículo com ao menos uma viagem registrada.

**Fluxo principal**:
1. Gestor acessa o perfil do veículo → aba "Histórico".
2. Sistema lista viagens realizadas (data, rota, motorista, duração, ocorrências), com filtro por período.

**Fluxos alternativos**: exportação do histórico em relatório (`REL-05`, Parte 5).

**Regras de negócio**: nenhuma regra de negócio própria — consulta de leitura sobre dado já regido pelas regras de `Viagem` (Parte 4).

**Permissões**: leitura restrita a Gestor/Empresa do próprio tenant.

**Validações**: nenhuma.

**Mensagens exibidas**: estado vazio — "Este veículo ainda não realizou nenhuma viagem."

**Casos excepcionais**: veículo utilizado por múltiplos motoristas ao longo do tempo (substituições frequentes) — o histórico exibe claramente qual motorista conduziu cada viagem específica, nunca atribuindo a viagem apenas ao "motorista padrão" da rota se houve substituição naquele dia.

**Critérios de aceite**:
- **Dado** um veículo com 20 viagens registradas no mês, **quando** o Gestor consulta o histórico filtrando por aquele mês, **então** vê as 20 viagens com motorista correto identificado em cada uma, inclusive as conduzidas por substitutos.

**Possíveis melhorias futuras**: gráfico de utilização (km rodados, horas em operação) por veículo ao longo do tempo, para apoiar decisão de manutenção preventiva (V2 — Dossiê 3 §12.3).
