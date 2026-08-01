# Especificação Funcional Oficial da Rotta — Parte 1: Autenticação

> Esta é a **Especificação Funcional Oficial da Rotta**, dividida em 7 partes (`docs/15-...` a `docs/21-...`), destinada a desenvolvedores, designers, QA e futuros colaboradores como fonte única de verdade sobre o comportamento esperado de cada funcionalidade da plataforma. Consolida e formaliza, em nível de especificação testável, as decisões já tomadas nos Dossiês 1–14. Cada funcionalidade é identificada por um código estável (ex. `AUTH-01`) usado para rastreabilidade em issues, casos de teste e código. Regras de negócio já numeradas nos dossiês anteriores (`RN-01` a `RN-34`) são referenciadas, não reescritas; novas regras específicas de uma funcionalidade recebem um código próprio (ex. `RN-AUTH-01`).

---

## AUTH-01 — Cadastro (self-service de conta de usuário)

**Objetivo**: permitir que qualquer pessoa física crie uma identidade (`Usuario`) na Rotta, como ponto de entrada para, em seguida, assumir um papel (Empresa, Motorista, Responsável etc.) em um ou mais tenants.

**Descrição**: o cadastro de `Usuario` é sempre o primeiro passo antes de qualquer vínculo de papel. Pode ocorrer de duas formas: (a) **cadastro originário**, quando a pessoa chega pela Landing Page e cria a conta assumindo diretamente o papel Empresa (fluxo self-service, Dossiê 11 §7.1); (b) **cadastro por convite**, quando a pessoa é convidada por uma Empresa/Gestor já existente para assumir um papel dentro de um tenant (Motorista, Monitor, Responsável, Escola) — neste caso, o cadastro do `Usuario` acontece no momento da aceitação do convite (`AUTH-01b`), nunca antes.

**Usuários envolvidos**: qualquer pessoa física (todos os papéis, exceto Admin Rotta, cujas contas são criadas internamente pela equipe, nunca por self-service).

**Pré-requisitos**: para cadastro originário, nenhum. Para cadastro por convite, um convite válido e não expirado emitido por um Gestor/Empresa (`SETT-02`, Parte 6).

**Fluxo principal (cadastro originário — Empresa)**:

1. Usuário acessa a Landing Page e seleciona "Começar agora".
2. Informa telefone ou e-mail e o tipo de conta (Autônomo/MEI/Empresa).
3. Sistema envia código de verificação (OTP) ao canal informado.
4. Usuário confirma o código.
5. Usuário informa dados cadastrais da empresa (razão social/nome, CPF/CNPJ, endereço, contato).
6. Sistema cria `Usuario` + `Empresa` (tenant) + `VinculoPapel` (Empresa) em uma única transação.
7. Usuário é redirecionado ao fluxo de pagamento/trial e, em seguida, ao onboarding (Dossiê 11 §7.2).

**Fluxos alternativos**:

- **A1 — Cadastro por convite**: usuário recebe link/código de convite → abre o app/link → informa dados complementares exigidos pelo papel (ex. CNH para Motorista) → aceita → `Usuario` e `VinculoPapel` são criados vinculados ao tenant convidante.
- **A2 — Identificador já existente**: se o telefone/e-mail informado já pertence a um `Usuario`, o sistema oferece login em vez de um segundo cadastro, prevenindo contas duplicadas para a mesma pessoa.

**Regras de negócio**:

- Um `Usuario` é único por pessoa; múltiplos `VinculoPapel` são permitidos para a mesma pessoa em tenants/papéis diferentes (RN-06, Capítulo 13).
- CPF é obrigatório para Motorista, Monitor, Responsável e Empresa/autônomo; opcional para Escola (papel institucional).
- CNPJ é obrigatório apenas quando `tipo = empresa`; para `autônomo`/`MEI`, o CPF é suficiente.
- Toda conta nasce com status `pendente_verificacao` até a confirmação do OTP/e-mail.

**Permissões**: rota pública (`[público]`), sem autenticação prévia.

**Validações**:

- Formato de CPF/CNPJ validado (dígito verificador), não apenas quantidade de caracteres.
- Telefone validado com DDI+DDD, checagem de formato brasileiro válido no MVP.
- E-mail validado por formato e, opcionalmente, por verificação de domínio ativo.
- Senha (quando aplicável ao papel — Seção AUTH-02): mínimo 8 caracteres, ao menos 1 número e 1 letra, nunca igual ao identificador de login.

**Mensagens exibidas**:

- Sucesso: "Conta criada! Enviamos um código para confirmar seu telefone."
- Erro — identificador já em uso: "Este telefone/e-mail já possui uma conta. Fazer login?"
- Erro — CPF/CNPJ inválido: "CPF/CNPJ inválido. Verifique os números digitados."
- Erro — convite expirado (A1): "Este convite expirou. Peça para [empresa] enviar um novo."

**Casos excepcionais**:

- Usuário fecha o app entre a confirmação do OTP e o preenchimento dos dados da empresa: o `Usuario` já existe (status `pendente_verificacao` de perfil, não de conta), e ao retornar o sistema retoma exatamente de onde parou, nunca pedindo o OTP novamente dentro da janela de validade da sessão de cadastro.
- Dois convites simultâneos para o mesmo telefone (dois tenants diferentes convidando a mesma pessoa): ambos podem ser aceitos — o `Usuario` passa a ter dois `VinculoPapel` ativos (RN-06).

**Critérios de aceite**:

- **Dado** que um telefone nunca foi cadastrado, **quando** o usuário completa o fluxo de cadastro originário com dados válidos, **então** um `Usuario`, uma `Empresa` e um `VinculoPapel` (Empresa) são criados e o usuário recebe tokens de sessão válidos.
- **Dado** que um telefone já possui conta ativa, **quando** o usuário tenta se cadastrar novamente com o mesmo telefone, **então** o sistema exibe a mensagem de conta existente e oferece login, sem criar um segundo `Usuario`.
- **Dado** um convite de Responsável válido e não expirado, **quando** o convidado completa a aceitação com CPF válido, **então** o `VinculoPapel` (Responsável) é ativado e vinculado ao(s) aluno(s) especificado(s) no convite.
- **Dado** um convite expirado, **quando** o convidado tenta aceitá-lo, **então** o sistema recusa com mensagem clara e não cria nenhum vínculo.

**Possíveis melhorias futuras**: cadastro via importação em massa de motoristas/responsáveis por planilha (parcialmente coberto por `STU-01c`, Parte 3, para alunos); verificação de identidade por documento com foto (KYC) no cadastro de Empresa, para reforço antifraude em V2/V3.

---

## AUTH-02 — Login

**Objetivo**: autenticar um `Usuario` já cadastrado e resolver o(s) `VinculoPapel` sob o qual ele deseja operar, emitindo tokens de sessão válidos.

**Descrição**: cobre os quatro métodos definidos no Dossiê 9 (§2.5) e no Dossiê 12 (§4): OTP por telefone/CPF (Motorista, Monitor, Responsável), e-mail/senha (+2FA opcional, Gestor/Empresa/Escola/Admin), Magic Link (Escola/conveniência), e OAuth Google (institucional, V2).

**Usuários envolvidos**: todos os papéis.

**Pré-requisitos**: conta ativa (status diferente de `bloqueado`), ao menos um `VinculoPapel` ativo.

**Fluxo principal (OTP)**:

1. Usuário informa telefone, e-mail ou CPF na tela de login.
2. Sistema identifica o `Usuario` correspondente e o método de verificação esperado.
3. Sistema envia código OTP via SMS ou WhatsApp (conforme preferência/disponibilidade).
4. Usuário informa o código recebido.
5. Sistema valida o código, emite `access_token` + `refresh_token`.
6. Se o usuário possui mais de um `VinculoPapel` ativo, o sistema apresenta o seletor de perfil antes de finalizar o login (Dossiê 11 §-, fluxo de login).

**Fluxos alternativos**:

- **A1 — E-mail/senha**: usuário informa e-mail + senha → se 2FA habilitado, informa código TOTP adicional → tokens emitidos.
- **A2 — Magic Link**: usuário solicita link por e-mail → clica no link recebido → tokens emitidos automaticamente, sem digitação adicional.
- **A3 — Dispositivo confiável**: se o dispositivo já completou OTP com sucesso anteriormente e foi marcado como confiável, o sistema pode reduzir a fricção (ex. pular a etapa de reenvio de código se o token de dispositivo ainda for válido) — nunca elimina totalmente a possibilidade de verificação, apenas reduz a frequência de solicitação em dispositivo já reconhecido.

**Regras de negócio**:

- `RN-AUTH-01`: um dispositivo novo (nunca associado à conta) sempre exige verificação completa (OTP ou senha+2FA), independentemente de configuração de "dispositivo confiável" de outro aparelho da mesma conta.
- `RN-AUTH-02`: após 5 tentativas de login malsucedidas consecutivas (senha incorreta ou OTP incorreto) em um intervalo de 15 minutos, a conta entra em bloqueio temporário progressivo (Dossiê 12 §7.4).
- Login por CPF resolve o `Usuario` da mesma forma que telefone/e-mail (AUTH-01), sem tratamento diferenciado além da busca por esse campo.

**Permissões**: rota pública (`[público]`) até a emissão do token; a partir daí, toda ação subsequente exige o token emitido.

**Validações**: identificador deve corresponder a uma conta existente (mensagem genérica se não corresponder, RN de enumeração de usuário, Dossiê 12 §7.4); código OTP válido por 5 minutos, uso único.

**Mensagens exibidas**:

- Erro genérico (identificador não encontrado OU senha incorreta — nunca especifica qual): "Não foi possível entrar. Verifique os dados e tente novamente."
- Erro — código expirado: "Este código expirou. Solicite um novo."
- Bloqueio temporário: "Muitas tentativas. Tente novamente em [X] minutos."
- 2FA obrigatório: "Digite o código do seu aplicativo autenticador."

**Casos excepcionais**:

- Usuário perde acesso ao número de telefone cadastrado (trocou de chip): fluxo de recuperação de conta assistido por suporte (`SUP-01`), nunca uma auto-recuperação puramente automatizada quando o único fator de identificação (telefone) não está mais acessível — mitigação de sequestro de conta.
- Usuário com múltiplos vínculos tenta logar durante uma rota ativa (Motorista): o seletor de perfil é sempre exibido, mesmo durante o horário operacional — não há login "automático" no último perfil usado, para evitar o motorista operar acidentalmente sob o papel errado.

**Critérios de aceite**:

- **Dado** um usuário com conta ativa e um único vínculo, **quando** ele completa a verificação OTP corretamente, **então** o sistema emite tokens válidos e o direciona diretamente à tela inicial do seu papel.
- **Dado** um usuário com dois vínculos ativos em tenants diferentes, **quando** ele completa a autenticação, **então** o sistema exibe o seletor de perfil antes de conceder acesso à tela inicial.
- **Dado** uma conta bloqueada temporariamente por tentativas excessivas, **quando** o usuário tenta logar novamente antes do fim do bloqueio, **então** o sistema recusa a tentativa e informa o tempo restante.
- **Dado** um código OTP correto porém expirado, **quando** o usuário o submete, **então** o sistema rejeita com mensagem de expiração e oferece reenvio.

**Possíveis melhorias futuras**: login biométrico local (Face ID/Touch ID/biometria Android) como atalho de conveniência sobre uma sessão já estabelecida (não substitui a autenticação primária); login por QR Code escaneado de um dispositivo já autenticado (padrão "WhatsApp Web").

---

## AUTH-03 — Recuperação de senha

**Objetivo**: permitir que um usuário com método de login por senha (Gestor, Empresa, Escola, Admin Rotta) recupere o acesso à conta sem depender de suporte manual.

**Descrição**: aplicável apenas a papéis que usam e-mail/senha como método primário — Motorista/Monitor/Responsável (login por OTP) não possuem "senha" a recuperar por este fluxo.

**Usuários envolvidos**: Gestor, Empresa, Escola, Admin Rotta.

**Pré-requisitos**: conta existente com e-mail cadastrado e confirmado.

**Fluxo principal**:

1. Usuário seleciona "Esqueci minha senha" na tela de login.
2. Informa o e-mail/identificador.
3. Sistema envia link de redefinição por e-mail (token de uso único, expiração curta — 30 minutos).
4. Usuário clica no link, é levado a uma tela de definição de nova senha.
5. Usuário define nova senha (com validação de força, Seção AUTH-01).
6. Sistema invalida a senha antiga, revoga todas as sessões ativas daquela conta (medida de segurança — se a recuperação foi motivada por suspeita de comprometimento, todas as sessões antigas são encerradas), e permite novo login.

**Fluxos alternativos**:

- **A1 — Link expirado**: usuário solicita novo envio, repetindo o fluxo desde o passo 2.

**Regras de negócio**:

- `RN-AUTH-03`: a resposta ao passo 2 é sempre "Se este e-mail existir, enviaremos instruções" — nunca confirma ou nega a existência da conta (Dossiê 12 §7.4).
- `RN-AUTH-04`: toda redefinição de senha bem-sucedida revoga **todas** as sessões/refresh tokens ativos daquela conta, em todos os dispositivos, forçando novo login em cada um.
- Um token de redefinição só pode ser usado uma vez; uma segunda tentativa de uso do mesmo link (já usado) é rejeitada.

**Permissões**: rota pública (`[público]`).

**Validações**: nova senha segue a mesma política de força de AUTH-01; nova senha não pode ser igual à anterior (verificação por hash).

**Mensagens exibidas**:

- "Se este e-mail existir em nossa base, você receberá um link de redefinição em instantes."
- Erro — token expirado: "Este link expirou. Solicite a redefinição novamente."
- Sucesso: "Senha redefinida com sucesso. Você foi desconectado de todos os dispositivos por segurança."

**Casos excepcionais**: usuário solicita redefinição múltiplas vezes seguidas — apenas o link mais recente é válido; links anteriores são invalidados automaticamente ao gerar um novo, evitando confusão sobre qual link usar.

**Critérios de aceite**:

- **Dado** um e-mail cadastrado, **quando** o usuário solicita redefinição e usa o link recebido dentro do prazo, **então** a nova senha passa a ser válida e todas as sessões anteriores são revogadas.
- **Dado** um e-mail não cadastrado, **quando** alguém solicita redefinição para ele, **então** o sistema responde com a mesma mensagem genérica de sucesso, sem enviar e-mail algum.
- **Dado** um link de redefinição já utilizado, **quando** alguém tenta usá-lo novamente, **então** o sistema rejeita com mensagem de link inválido/expirado.

**Possíveis melhorias futuras**: redefinição também por SMS/WhatsApp para papéis institucionais que preferirem, mantendo e-mail como padrão.

---

## AUTH-04 — Primeiro acesso

**Objetivo**: garantir que a primeira entrada de qualquer papel na plataforma inclua as confirmações e configurações mínimas necessárias antes de liberar o uso pleno.

**Descrição**: distinto do cadastro (AUTH-01) — é a sequência que ocorre **após** a criação da conta/vínculo, na primeira vez que aquele papel específico acessa. Para Empresa, é o Wizard de onboarding (Dossiê 11 §7.2). Para Motorista/Monitor, é a confirmação de dados pessoais + upload inicial de documentos obrigatórios. Para Responsável, é a confirmação/complementação dos dados do aluno já pré-cadastrado (Dossiê 2 §8.1) e a configuração de canais de notificação.

**Usuários envolvidos**: Empresa, Motorista, Monitor, Responsável, Escola.

**Pré-requisitos**: convite aceito (AUTH-01, fluxo A1) ou cadastro originário concluído (Empresa).

**Fluxo principal (Responsável)**:

1. Responsável aceita convite (AUTH-01-A1) e realiza o primeiro login.
2. Sistema exibe tela de boas-vindas com o(s) aluno(s) já vinculado(s) ao convite.
3. Responsável confirma/completa dados do aluno permitidos ao seu papel (foto, contatos de emergência, autorizados a retirar).
4. Responsável configura canais de notificação preferidos.
5. Sistema libera a tela inicial normal do app.

**Fluxos alternativos**:

- **A1 (Motorista/Monitor)**: primeiro acesso exige upload de ao menos os documentos obrigatórios mínimos (CNH para Motorista) antes de liberar visualização de rotas — o app mostra claramente "Complete seu cadastro" como bloqueador visual até isso ser feito, mesmo que o status final ainda dependa de aprovação do Gestor.
- **A2 (Empresa)**: primeiro acesso é o Wizard completo de onboarding (Dossiê 11 §7.2), com opção de pular etapas não obrigatórias.

**Regras de negócio**:

- Primeiro acesso nunca bloqueia indefinidamente o usuário sem explicação — toda etapa pendente é comunicada com clareza sobre o motivo e o que falta.
- Dados que só a Empresa/Gestor pode alterar (ex. escola do aluno, rota) não são editáveis pelo Responsável mesmo durante o primeiro acesso — ele apenas complementa o que é de sua competência (Dossiê 12 §5.2).

**Permissões**: exige autenticação (token do vínculo recém-criado); escopo de edição limitado ao papel (RBAC padrão).

**Validações**: mesmas validações de campo dos módulos de origem (ex. formato de foto, tamanho de arquivo).

**Mensagens exibidas**: "Bem-vindo(a) à Rotta! Vamos confirmar alguns dados antes de começar."; "Falta pouco — confirme seus documentos para começar a rodar suas rotas." (Motorista).

**Casos excepcionais**: Responsável com mais de um filho convidado simultaneamente por convites de empresas diferentes — o primeiro acesso trata cada vínculo de forma independente, sem misturar a configuração de notificação de um tenant com o outro (preferências são por vínculo, não globais ao `Usuario`, quando fizer sentido — ex. um responsável pode querer WhatsApp para o filho A e apenas push para o filho B).

**Critérios de aceite**:

- **Dado** um Responsável completando o primeiro acesso, **quando** ele conclui a confirmação de dados e preferências, **então** o app libera a tela inicial padrão sem repetir esse fluxo em logins futuros.
- **Dado** um Motorista sem nenhum documento enviado, **quando** ele tenta acessar a tela de rotas antes do primeiro upload, **então** o sistema o redireciona à etapa de upload obrigatório com explicação clara.

**Possíveis melhorias futuras**: tour guiado interativo (tooltips contextuais) na primeira sessão de uso do painel web para Gestores.

---

## AUTH-05 — Logout

**Objetivo**: encerrar a sessão ativa do usuário no dispositivo atual, de forma segura e imediata.

**Descrição**: reafirma o Dossiê 12 (§4.4) — revoga o refresh token e a sessão associada àquele dispositivo específico.

**Usuários envolvidos**: todos os papéis.

**Pré-requisitos**: sessão ativa.

**Fluxo principal**:

1. Usuário seleciona "Sair" no Perfil.
2. Sistema exibe confirmação (apenas quando há uma viagem em andamento — Seção casos excepcionais; do contrário, ação direta sem confirmação, conforme princípio de UX do Dossiê 10 §1.1, regra 2).
3. Sistema revoga o refresh token e a sessão daquele dispositivo.
4. App/painel retorna à tela de login, limpando dados sensíveis da memória/armazenamento local.

**Fluxos alternativos**: nenhum além da confirmação condicional descrita acima.

**Regras de negócio**:

- Logout nunca revoga sessões de **outros** dispositivos da mesma conta — apenas o dispositivo atual (revogação de todos os dispositivos é uma ação distinta, AUTH-06).
- `RN-AUTH-05`: se o Motorista está com uma viagem em andamento, o logout exige confirmação explícita adicional ("Você tem uma viagem em andamento. Deseja mesmo sair?"), porque encerrar a sessão nesse contexto interrompe a transmissão de GPS.

**Permissões**: qualquer papel autenticado, sobre a própria sessão.

**Validações**: nenhuma além da sessão estar ativa.

**Mensagens exibidas**: "Você saiu da sua conta."; (contexto de viagem ativa) "Você tem uma viagem em andamento. Sair agora pode interromper o rastreamento para as famílias. Deseja continuar?"

**Casos excepcionais**: logout durante viagem ativa (RN-AUTH-05, acima) — se o motorista confirmar mesmo assim, o sistema registra um evento de auditoria e, se possível, notifica o Gestor de que a rota ficou sem transmissão de GPS.

**Critérios de aceite**:

- **Dado** um usuário autenticado sem viagem em andamento, **quando** ele seleciona "Sair", **então** a sessão é encerrada imediatamente sem diálogo de confirmação adicional.
- **Dado** um Motorista com viagem em andamento, **quando** ele tenta sair, **então** o sistema exige confirmação explícita informando o impacto no rastreamento.

**Possíveis melhorias futuras**: nenhuma relevante identificada — funcionalidade estável por natureza.

---

## AUTH-06 — Sessões (gestão de dispositivos conectados)

**Objetivo**: dar ao usuário visibilidade e controle sobre todos os dispositivos com sessão ativa em sua conta.

**Descrição**: tela "Meus dispositivos" (Dossiê 12 §4.3) listando toda `Sessao` ativa, com opção de revogação individual ou em massa.

**Usuários envolvidos**: todos os papéis (tela acessível a partir do Perfil).

**Pré-requisitos**: conta com ao menos uma sessão ativa (a atual).

**Fluxo principal**:

1. Usuário acessa Perfil → "Dispositivos conectados".
2. Sistema lista todas as sessões ativas: dispositivo, localização aproximada de criação, data do último uso, indicação de "este dispositivo" para a sessão atual.
3. Usuário seleciona "Encerrar" em uma sessão específica (que não a atual).
4. Sistema revoga aquela sessão imediatamente.

**Fluxos alternativos**:

- **A1 — Encerrar todas as outras sessões**: ação em massa, útil em caso de suspeita de acesso indevido — revoga todas exceto a sessão atual, em uma única ação.

**Regras de negócio**: a sessão atual nunca pode ser revogada a partir desta tela (evita o usuário se desconectar acidentalmente de si mesmo por engano; para isso existe o Logout, AUTH-05).

**Permissões**: usuário só vê/revoga as próprias sessões — nunca as de outro usuário (exceto Admin Rotta e Gestor, em ações administrativas específicas de revogação de vínculo, `SETT-05`, Parte 6, que é uma ação diferente desta).

**Validações**: a sessão-alvo da revogação deve pertencer ao próprio usuário solicitante.

**Mensagens exibidas**: "Sessão encerrada."; "Todas as outras sessões foram encerradas."

**Casos excepcionais**: usuário revoga a sessão de um dispositivo que está sendo usado no exato momento por outra pessoa (ex. celular roubado em uso) — a próxima requisição daquele dispositivo recebe 401 e é forçado a tela de login, efetivamente interrompendo o uso indevido em tempo quase real (limitado pela janela de validade do JWT de acesso já emitido, até 15 minutos, Dossiê 12 §4.4 — mitigado pela denylist de curta duração quando a urgência justificar).

**Critérios de aceite**:

- **Dado** um usuário com 3 sessões ativas, **quando** ele acessa "Dispositivos conectados", **então** vê as 3 sessões listadas com a atual claramente identificada.
- **Dado** uma sessão de outro dispositivo, **quando** o usuário a revoga, **então** aquele dispositivo perde acesso à próxima requisição/na próxima tentativa de refresh.

**Possíveis melhorias futuras**: alerta automático (push/e-mail) quando uma nova sessão é criada em um dispositivo não reconhecido anteriormente, com atalho direto para revogá-la caso não tenha sido o próprio usuário.

---

## AUTH-07 — Troca de senha (usuário autenticado)

**Objetivo**: permitir que um usuário com login por senha altere sua senha proativamente, sem depender do fluxo de recuperação.

**Descrição**: aplicável aos mesmos papéis de AUTH-03 (Gestor, Empresa, Escola, Admin Rotta).

**Usuários envolvidos**: Gestor, Empresa, Escola, Admin Rotta.

**Pré-requisitos**: sessão ativa, conhecimento da senha atual.

**Fluxo principal**:

1. Usuário acessa Perfil → "Alterar senha".
2. Informa a senha atual.
3. Informa a nova senha (duas vezes, para confirmação).
4. Sistema valida a senha atual e a força da nova senha.
5. Sistema atualiza a senha e revoga as demais sessões ativas (mesma lógica de segurança de AUTH-03), mantendo apenas a sessão atual ativa.

**Fluxos alternativos**: nenhum.

**Regras de negócio**: mesma política de força de senha de AUTH-01; nova senha não pode ser igual à atual; revogação das demais sessões segue `RN-AUTH-04`.

**Permissões**: o próprio usuário, sobre a própria conta.

**Validações**: senha atual deve corresponder exatamente (hash); as duas digitações da nova senha devem coincidir.

**Mensagens exibidas**: erro — "Senha atual incorreta."; sucesso — "Senha alterada com sucesso. Suas outras sessões foram encerradas por segurança."

**Casos excepcionais**: usuário digita a senha atual incorretamente 3 vezes seguidas — o sistema aplica o mesmo mecanismo de bloqueio progressivo de `RN-AUTH-02`, tratando essa ação como uma tentativa sensível equivalente a login.

**Critérios de aceite**:

- **Dado** um usuário autenticado que informa corretamente a senha atual e uma nova senha válida, **quando** ele confirma a alteração, **então** a senha é atualizada e as demais sessões são revogadas.
- **Dado** uma senha atual incorreta, **quando** o usuário tenta trocar a senha, **então** o sistema rejeita a operação sem alterar nada.

**Possíveis melhorias futuras**: indicador visual de força de senha em tempo real durante a digitação.
