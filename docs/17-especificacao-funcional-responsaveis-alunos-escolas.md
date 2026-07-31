# Especificação Funcional Oficial da Rotta — Parte 3: Responsáveis, Alunos e Escolas

> Continuação da Parte 2 (`docs/16-...`). Códigos de funcionalidade: `RESP-*` (Responsáveis), `STU-*` (Alunos), `ESC-*` (Escolas).

---

## RESP-01 — Cadastro de Responsável

**Objetivo**: registrar a conta de um responsável legal/financeiro vinculado a um ou mais alunos.

**Descrição**: especialização de `AUTH-01`, fluxo A1 (cadastro por convite) — o Responsável nunca se autocadastra "do zero" sem um aluno pré-existente vinculando-o (Dossiê 2 §8.1); o convite é sempre originado pelo Gestor no momento do cadastro do aluno (`STU-01`).

**Usuários envolvidos**: Responsável (aceita), Gestor (origina o convite).

**Pré-requisitos**: aluno já cadastrado (`STU-01`) com ao menos um convite de responsável pendente.

**Fluxo principal**:
1. Gestor cadastra o aluno e informa telefone/e-mail do(s) responsável(is) (`STU-01`, passo relacionado).
2. Sistema envia convite via SMS/WhatsApp/e-mail.
3. Responsável abre o link/código, informa CPF, confirma dados pessoais e define o método de login (OTP, padrão).
4. Sistema cria (ou reconhece, se já existente) o `Usuario`, cria o `Responsavel` e o vínculo `AlunoResponsavel`.

**Fluxos alternativos**: ver `AUTH-01`-A2 (identificador já existente — pessoa que já é responsável de outro aluno em outro tenant, ou já é usuária Rotta por qualquer outro papel).

**Regras de negócio**: um aluno pode ter múltiplos responsáveis (`AlunoResponsavel` N:N); ao menos um responsável do aluno deve ser marcado como responsável financeiro e ao menos um como responsável legal (podem ser a mesma pessoa) — regra validada no momento do cadastro do aluno, não neste fluxo.

**Permissões**: aceitação do convite é uma ação pública mediante posse do token de convite (`[público, token]`).

**Validações**: CPF válido; convite não expirado (validade padrão de 15 dias, renovável pelo Gestor).

**Mensagens exibidas**: "Você foi convidado a acompanhar [nome do aluno] na Rotta. Aceitar convite?"; erro — "Este convite expirou. Peça para a escola/transportador reenviar."

**Casos excepcionais**: dois responsáveis do mesmo aluno aceitando o convite em momentos diferentes — cada um gera seu próprio `Usuario`/vínculo, independentemente, sem conflito.

**Critérios de aceite**:
- **Dado** um convite de responsável válido, **quando** o convidado o aceita com CPF válido, **então** o vínculo `AlunoResponsavel` é criado e ele passa a visualizar o aluno em `RESP-view/children`.
- **Dado** um convite expirado, **quando** o convidado tenta aceitá-lo, **então** o sistema recusa e orienta a solicitar reenvio.

**Possíveis melhorias futuras**: aceite de convite diretamente por QR Code impresso entregue fisicamente pela escola/transportador no início do ano letivo.

---

## RESP-02 — Vinculação automática de Responsável

**Objetivo**: reduzir a fricção de cadastro quando uma pessoa que já é responsável de um aluno em um tenant precisa ser vinculada a um novo aluno (ex. segundo filho) ou ao mesmo aluno em um novo tenant (troca de transportador).

**Descrição**: ao receber um novo convite de responsável, o sistema busca automaticamente por um `Usuario` já existente com o mesmo CPF/telefone informado — se encontrado, o novo vínculo é criado sobre a conta existente, sem exigir um segundo cadastro completo.

**Usuários envolvidos**: Responsável, Gestor (origina o convite, geralmente sem saber se a pessoa já é usuária Rotta).

**Pré-requisitos**: convite emitido com CPF ou telefone que corresponda a um `Usuario` pré-existente.

**Fluxo principal**:
1. Gestor cadastra um novo aluno e informa o CPF do responsável.
2. Sistema identifica que aquele CPF já corresponde a um `Usuario` ativo (de outro vínculo, possivelmente em outro tenant).
3. Ao aceitar o convite, o Responsável apenas confirma o novo vínculo — nenhum dado pessoal é solicitado novamente (já existe).
4. O novo aluno passa a aparecer na lista de filhos daquela conta já existente (`RESP-view/children`), ao lado dos demais.

**Fluxos alternativos**: se o CPF informado pelo Gestor não corresponde a nenhum `Usuario` existente, o fluxo cai para `RESP-01` (cadastro completo).

**Regras de negócio**: a vinculação automática nunca ocorre por correspondência de nome — apenas por CPF ou telefone verificado, para evitar vínculo indevido de uma pessoa errada com o mesmo nome.

**Permissões**: automática do sistema, mediante aceite explícito do próprio responsável (nunca um vínculo criado sem confirmação ativa da pessoa).

**Validações**: correspondência exata de CPF/telefone.

**Mensagens exibidas**: "Notamos que você já tem uma conta Rotta. [Nome do novo aluno] foi adicionado à sua lista de filhos."

**Casos excepcionais**: ver `CASO-19` (Parte 7, responsável com mais de um filho, incluindo em tenants diferentes).

**Critérios de aceite**:
- **Dado** um responsável já cadastrado em um tenant A, **quando** ele é convidado como responsável de um aluno no tenant B com o mesmo CPF, **então** o vínculo é criado sobre a conta existente sem exigir novo cadastro de dados pessoais.

**Possíveis melhorias futuras**: notificação proativa ao Gestor de que o responsável convidado "já é usuário Rotta" no momento do cadastro do aluno, antes mesmo do convite ser enviado.

---

## RESP-03 — Confirmação de dados do Responsável

**Objetivo**: garantir que os dados do responsável estejam corretos e atualizados no momento da ativação e periodicamente depois.

**Descrição**: parte do primeiro acesso (`AUTH-04`), mas também reexecutável a qualquer momento pelo próprio responsável ou solicitada proativamente pelo sistema em marcos (ex. início de ano letivo).

**Usuários envolvidos**: Responsável.

**Pré-requisitos**: vínculo `AlunoResponsavel` ativo.

**Fluxo principal**:
1. Responsável acessa Perfil → "Meus dados".
2. Revisa nome, CPF (somente leitura — CPF não é autoeditável, requer contato com suporte para correção, dado seu peso como identificador legal), telefone, e-mail, endereço.
3. Confirma ou solicita alteração dos campos editáveis.

**Fluxos alternativos**: solicitação periódica proativa do sistema ("Confirme se seus dados continuam corretos") disparada uma vez por ano letivo, não intrusiva (dispensável sem repetição imediata).

**Regras de negócio**: CPF nunca é editável diretamente pelo usuário (apenas por processo assistido de suporte, dado seu papel como identificador em `RESP-02`); telefone/e-mail seguem as regras de `RESP-05`.

**Permissões**: o próprio responsável, sobre os próprios dados.

**Validações**: idênticas a `AUTH-01` para os campos correspondentes.

**Mensagens exibidas**: "Seus dados estão atualizados."; "Para alterar seu CPF, entre em contato com o suporte."

**Casos excepcionais**: nenhum além dos já cobertos.

**Critérios de aceite**:
- **Dado** um responsável acessando "Meus dados", **quando** ele revisa as informações, **então** consegue confirmar ou editar todos os campos exceto CPF.

**Possíveis melhorias futuras**: nenhuma identificada.

---

## RESP-04 — Segurança de acesso do Responsável (PIN local / troca de método)

**Objetivo**: oferecer uma camada adicional opcional de proteção de acesso rápido ao app, e permitir a troca do método de login preferido.

**Descrição**: como o login primário do Responsável é OTP (Dossiê 12 §4.1), não existe "senha" no sentido tradicional — esta funcionalidade cobre (a) a definição de um PIN numérico local de desbloqueio rápido do app (proteção contra uso indevido do aparelho já desbloqueado, não substitui a autenticação de sessão), e (b) a opção de habilitar login por e-mail/senha como método alternativo, para responsáveis que preferem essa modalidade.

**Usuários envolvidos**: Responsável.

**Pré-requisitos**: conta ativa.

**Fluxo principal (PIN local)**:
1. Responsável acessa Perfil → Segurança → "Criar PIN de acesso rápido".
2. Define um PIN de 4–6 dígitos.
3. Sistema passa a solicitar o PIN (não um novo OTP) para reabrir o app quando a sessão já está ativa, em vez de manter o app permanentemente desbloqueado.

**Fluxos alternativos**: **A1 — Habilitar login por senha**: Responsável define uma senha (mesma política de força de `AUTH-01`) como método alternativo ao OTP, útil quando a troca frequente de OTP é vista como fricção pelo usuário mais assíduo.

**Regras de negócio**: o PIN local é validado inteiramente no dispositivo (não é um mecanismo de autenticação de sessão do backend) — perda do PIN exige apenas refazer o OTP normal de login, nunca um processo de recuperação de conta.

**Permissões**: exclusivamente sobre a própria conta.

**Validações**: PIN não pode ser sequência óbvia (`0000`, `1234`) — alerta (não bloqueia) recomendando um PIN mais seguro.

**Mensagens exibidas**: "PIN criado. Use-o para acessar o app rapidamente."; "PIN esquecido? Basta entrar novamente com seu telefone."

**Casos excepcionais**: troca de aparelho — o PIN não é portado (é local ao dispositivo); o novo aparelho exige OTP completo no primeiro acesso, e o usuário pode configurar um novo PIN nele.

**Critérios de aceite**:
- **Dado** um responsável com PIN configurado, **quando** ele reabre o app com a sessão ainda válida, **então** o sistema solicita apenas o PIN, não um novo OTP.
- **Dado** um responsável que esqueceu o PIN, **quando** ele opta por "esqueci o PIN", **então** o sistema o redireciona ao login OTP padrão.

**Possíveis melhorias futuras**: suporte a biometria do aparelho (Face ID/impressão digital) como alternativa ao PIN.

---

## RESP-05 — Alteração de dados do Responsável (telefone/e-mail)

**Objetivo**: permitir que o responsável atualize seu telefone e/ou e-mail de contato com segurança.

**Descrição**: funcionalidade sensível — telefone e e-mail são também identificadores de login (`AUTH-02`), então a alteração exige verificação dupla (do método antigo e do novo).

**Usuários envolvidos**: Responsável.

**Pré-requisitos**: conta ativa.

**Fluxo principal**:
1. Responsável acessa Perfil → "Meus dados" → edita telefone ou e-mail.
2. Sistema envia código de confirmação ao **novo** identificador informado.
3. Responsável confirma o código no novo identificador.
4. Sistema também notifica o identificador **antigo** (SMS/e-mail para o valor anterior) informando que uma alteração ocorreu, como medida de transparência/segurança.
5. Dado atualizado, válido para login a partir de então.

**Fluxos alternativos**: se o novo telefone/e-mail já pertence a outro `Usuario` ativo, a alteração é recusada (não permite dois usuários compartilhando o mesmo identificador de login).

**Regras de negócio**: `RN-RESP-01` (nova) — toda alteração de identificador de login notifica obrigatoriamente o canal antigo, mesmo que o usuário não solicite isso explicitamente, como proteção contra alteração indevida por terceiro com acesso momentâneo à sessão.

**Permissões**: o próprio responsável.

**Validações**: identificador novo não pode já estar em uso por outra conta; código de confirmação de uso único e expiração curta.

**Mensagens exibidas**: "Enviamos um código para confirmar seu novo telefone."; "Seu telefone foi alterado. Se você não fez essa alteração, contate o suporte imediatamente." (enviado ao canal antigo).

**Casos excepcionais**: ver `CASO-10` e `CASO-11` (Parte 7).

**Critérios de aceite**:
- **Dado** um responsável alterando o telefone, **quando** ele confirma o código enviado ao novo número, **então** o telefone é atualizado e uma notificação de segurança é enviada ao número antigo.
- **Dado** um novo telefone já em uso por outra conta, **quando** a alteração é tentada, **então** o sistema recusa com mensagem clara.

**Possíveis melhorias futuras**: período de carência de 24h antes da alteração ser efetivada (em vez de imediata), dando janela para o titular original cancelar a mudança caso não tenha sido ele quem solicitou.

---

## STU-01 — Cadastro de Aluno

**Objetivo**: registrar um aluno no tenant, com todos os dados necessários à operação de transporte.

**Descrição**: sempre originado pelo Gestor/Empresa — nunca pelo Responsável (Dossiê 2 §8.1). Inclui, no mesmo fluxo, o convite ao(s) responsável(is) (`RESP-01`).

**Usuários envolvidos**: Gestor, Empresa (criador); Responsável (recebe convite, mas não cria).

**Pré-requisitos**: escola do aluno já cadastrada (`ESC-01`).

**Fluxo principal**:
1. Gestor acessa "Alunos" → "+ Novo aluno".
2. Etapa 1 — dados básicos: nome, data de nascimento, foto, escola (`STU-02`), turma/turno (`STU-03`/`STU-04`).
3. Etapa 2 — pontos de embarque/desembarque (`STU-06`).
4. Etapa 3 — necessidades especiais relevantes ao transporte (opcional).
5. Etapa 4 — responsável(is): vínculo a um responsável já existente ou convite de um novo (`RESP-01`).
6. Sistema cria o aluno com status `ativo` e dispara o(s) convite(s) de responsável.

**Fluxos alternativos**: **A1 — Importação em massa** (`STU-01c`): upload de planilha com múltiplos alunos, processado de forma assíncrona, com relatório de linhas processadas com sucesso e linhas com erro (ex. escola não encontrada, CPF de responsável inválido).

**Regras de negócio**: `RN-26` (Capítulo 13) — aluno não pode estar em duas rotas ativas do mesmo turno; capacidade do veículo (`VEI-03`) validada apenas no momento do vínculo à rota (`ROT-05`), não neste cadastro (o aluno pode ser cadastrado antes de ter uma rota definida).

**Permissões**: exclusivo de Gestor/Empresa.

**Validações**: data de nascimento plausível (idade compatível com educação básica); endereço de embarque/desembarque geocodificável (`STU-06`).

**Mensagens exibidas**: "Aluno cadastrado. Convite enviado ao(s) responsável(is)."; erro (importação) — "12 de 50 alunos não puderam ser importados. Veja o relatório de erros."

**Casos excepcionais**: aluno com dois responsáveis informados simultaneamente no mesmo cadastro — ambos os convites são enviados em paralelo, cada um seguindo `RESP-01` de forma independente.

**Critérios de aceite**:
- **Dado** dados completos e válidos, **quando** o Gestor cadastra um aluno com um responsável, **então** o aluno é criado com status `ativo` e o convite é enviado.
- **Dado** uma planilha de importação com 50 linhas, das quais 12 com erro, **quando** o processamento conclui, **então** 38 alunos são criados e um relatório detalhado das 12 falhas é disponibilizado.

**Possíveis melhorias futuras**: sugestão automática de rota/parada mais próxima com base no endereço informado, no momento do cadastro.

---

## STU-02 — Vínculo do Aluno com a Escola

**Objetivo**: garantir que todo aluno esteja corretamente associado à instituição de ensino que frequenta, para fins de coerência de horário e do Painel da Escola.

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: escola cadastrada no tenant (`ESC-01`).

**Fluxo principal**: seleção da escola em um campo de busca durante `STU-01`; alteração posterior possível via edição do aluno.

**Fluxos alternativos**: transferência de escola no meio do ano letivo — tratada como uma edição (não um novo cadastro), preservando o histórico de viagens já associado à escola anterior.

**Regras de negócio**: o turno da rota à qual o aluno for vinculado (`ROT-05`) deve ser compatível com um dos turnos ofertados pela escola (`ESC-03`) — validação cruzada, não bloqueante (alerta), pois exceções legítimas existem (ex. aluno com horário especial).

**Permissões**: exclusivo de Gestor.

**Validações**: escola deve pertencer ao mesmo tenant.

**Mensagens exibidas**: aviso — "O turno da rota selecionada não corresponde a nenhum turno cadastrado para esta escola. Deseja continuar mesmo assim?"

**Casos excepcionais**: escola do aluno ainda não cadastrada no tenant — o fluxo de `STU-01` oferece um atalho para cadastrar a escola sem sair do formulário de aluno (Drawer lateral, Dossiê 11 §7.5).

**Critérios de aceite**:
- **Dado** um aluno sendo cadastrado, **quando** o Gestor seleciona uma escola já cadastrada, **então** o vínculo é criado corretamente.
- **Dado** uma incompatibilidade de turno entre aluno e escola, **quando** detectada, **então** o sistema alerta sem bloquear o cadastro.

**Possíveis melhorias futuras**: nenhuma identificada além do já coberto.

---

## STU-03 — Turma do Aluno

**Objetivo**: registrar a turma/ano escolar do aluno, informação de contexto usada em relatórios e comunicação, não em regra operacional de rota.

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: nenhum além de `STU-01`.

**Fluxo principal**: campo de texto livre (ou lista pré-configurada pela escola, quando disponível) preenchido durante o cadastro/edição do aluno.

**Fluxos alternativos**: atualização em massa de turma no início do ano letivo (todos os alunos avançam de série) — ação em lote disponível para o Gestor, com pré-visualização antes de confirmar.

**Regras de negócio**: nenhuma regra operacional depende deste campo (é informativo).

**Permissões**: Gestor.

**Validações**: nenhuma além de tamanho máximo de texto.

**Mensagens exibidas**: "Turmas atualizadas para 45 alunos."

**Casos excepcionais**: nenhum.

**Critérios de aceite**:
- **Dado** uma lista de alunos, **quando** o Gestor executa a atualização em massa de turma, **então** todos os alunos selecionados têm o campo atualizado conforme configurado.

**Possíveis melhorias futuras**: integração com sistema de gestão escolar da própria escola para sincronizar turma automaticamente (V3, Dossiê 4 §18.2).

---

## STU-04 — Turno do Aluno

**Objetivo**: definir o turno em que o aluno estuda, usado para validar coerência com a rota vinculada.

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: nenhum além de `STU-01`.

**Fluxo principal**: seleção de turno (matutino/vespertino/integral) durante o cadastro/edição.

**Fluxos alternativos**: aluno integral que usa transporte apenas em um dos turnos (ex. vai de van de manhã, é buscado pelos pais à tarde) — o turno cadastrado no aluno é informativo; o turno **operacional** relevante é, na prática, o da(s) rota(s) à qual ele está efetivamente vinculado (`STU-02` trata a validação cruzada).

**Regras de negócio**: ver `STU-02`.

**Permissões**: Gestor.

**Validações**: nenhuma além do valor pertencer ao enum válido.

**Mensagens exibidas**: nenhuma específica além das já cobertas.

**Casos excepcionais**: nenhum além de `STU-02`.

**Critérios de aceite**: ver `STU-02`.

**Possíveis melhorias futuras**: nenhuma identificada.

---

## STU-05 — Vínculo do Aluno com Responsáveis

**Objetivo**: gerenciar, ao longo do tempo, quais responsáveis estão associados a um aluno.

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: aluno cadastrado.

**Fluxo principal**:
1. Gestor acessa o perfil do aluno → aba "Responsáveis".
2. Visualiza lista de responsáveis vinculados, com indicação de quem é financeiro/legal.
3. Adiciona novo responsável (convite, `RESP-01`) ou remove um vínculo existente.

**Fluxos alternativos**: remoção de um responsável que é o único financeiro/legal — sistema bloqueia a remoção até que outro responsável seja promovido a essa função, garantindo que o aluno nunca fique sem responsável legal designado.

**Regras de negócio**: um aluno deve ter, a qualquer momento, ao menos um responsável ativo com a flag de responsável legal.

**Permissões**: exclusivo de Gestor.

**Validações**: ver fluxo alternativo (bloqueio de remoção do único responsável legal).

**Mensagens exibidas**: erro — "Não é possível remover o único responsável legal deste aluno. Adicione outro responsável legal primeiro."

**Casos excepcionais**: ver `CASO-20` (Parte 7, aluno com dois responsáveis).

**Critérios de aceite**:
- **Dado** um aluno com dois responsáveis (um financeiro/legal, outro apenas de acompanhamento), **quando** o Gestor tenta remover o responsável financeiro/legal único, **então** o sistema recusa a ação.

**Possíveis melhorias futuras**: transferência de responsabilidade financeira/legal com fluxo guiado dedicado (hoje é uma combinação manual de adicionar+remover).

---

## STU-06 — Pontos de Embarque e Desembarque do Aluno

**Objetivo**: registrar os endereços geolocalizados onde o aluno embarca e desembarca, usados na composição da rota.

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: nenhum além de `STU-01`.

**Fluxo principal**:
1. Durante o cadastro/edição do aluno, Gestor informa o endereço de embarque.
2. Sistema geocodifica o endereço (via adapter Google Maps, Dossiê 9 §2.6) e exibe um pino ajustável no mapa para confirmação/correção fina.
3. Gestor repete o processo para o ponto de desembarque (pode ser o mesmo endereço ou diferente).

**Fluxos alternativos**: aluno com ponto de desembarque variável em dias diferentes da semana (ex. casa da mãe em dias pares, casa do pai em dias ímpares) — tratado como uma exceção pontual por dia da semana (V2, Dossiê 3 §12.5), não suportado como múltiplos pontos fixos simultâneos no MVP.

**Regras de negócio**: o endereço deve ser geocodificável — se a API de geocodificação não encontrar correspondência exata, o Gestor pode ajustar manualmente o pino no mapa como fonte de verdade final (a geocodificação automática é um ponto de partida, nunca a única fonte).

**Permissões**: Gestor.

**Validações**: coordenada resultante deve estar dentro dos limites geográficos plausíveis da operação (ex. dentro do estado/região do tenant) — alerta se muito distante, prevenindo erro grosseiro de digitação de endereço.

**Mensagens exibidas**: "Não encontramos este endereço automaticamente. Ajuste o pino no mapa manualmente."

**Casos excepcionais**: ver `CASO-04` (Parte 7, aluno embarca fora do ponto cadastrado).

**Critérios de aceite**:
- **Dado** um endereço válido e geocodificável, **quando** informado no cadastro do aluno, **então** o sistema posiciona o pino automaticamente no mapa, ajustável pelo Gestor.
- **Dado** um endereço não localizado automaticamente, **quando** isso ocorre, **então** o sistema permite o ajuste manual do pino sem bloquear o cadastro.

**Possíveis melhorias futuras**: múltiplos pontos de desembarque por dia da semana (V2).

---

## STU-07 — Status do Aluno

**Objetivo**: refletir o estado do vínculo do aluno com o tenant (`ativo`, `inativo`, `transferido`, `trancado_temporariamente`).

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: aluno cadastrado.

**Fluxo principal**:
1. Gestor acessa o perfil do aluno → altera o status (ex. para `trancado_temporariamente` durante um período de licença médica).
2. Sistema aplica o efeito correspondente: aluno com status diferente de `ativo` não aparece nas listas de checklist de nenhuma rota até retornar a `ativo`.

**Fluxos alternativos**: transferência (`transferido`) — Gestor indica o motivo, e o histórico do aluno permanece integralmente acessível mesmo após a transferência (nunca excluído, apenas inativado para fins operacionais correntes).

**Regras de negócio**: apenas alunos com status `ativo` são elegíveis a vínculo com rota (`ROT-05`); um aluno `trancado_temporariamente` mantém seu vínculo de rota, mas é automaticamente tratado como "ausência avisada" (`TRIP-checklist`) enquanto durar o trancamento, sem exigir que o responsável registre ausência manualmente todos os dias.

**Permissões**: Gestor.

**Validações**: transição de status sempre exige um motivo textual curto (auditável).

**Mensagens exibidas**: "Status do aluno atualizado. Ele não aparecerá nas rotas até retornar como ativo."

**Casos excepcionais**: aluno com status alterado durante uma viagem já em andamento no dia — a alteração só produz efeito a partir da próxima viagem, nunca interrompe uma viagem em curso.

**Critérios de aceite**:
- **Dado** um aluno `ativo` vinculado a uma rota, **quando** o Gestor o marca como `trancado_temporariamente`, **então** ele deixa de aparecer no checklist de embarque das próximas viagens até o status ser revertido.

**Possíveis melhorias futuras**: agendamento de trancamento/reativação automática por data (ex. "trancar de 10/07 a 20/07"), sem exigir ação manual de reversão.

---

## STU-08 — Histórico do Aluno

**Objetivo**: permitir a consulta do histórico completo de viagens, checklists e ocorrências relacionadas a um aluno específico.

**Usuários envolvidos**: Gestor, Responsável (apenas do próprio filho), Escola (apenas dos próprios alunos).

**Pré-requisitos**: aluno com ao menos uma viagem registrada.

**Fluxo principal**:
1. Usuário acessa o perfil do aluno → aba "Histórico".
2. Sistema lista, por dia, os eventos de embarque/desembarque e eventuais ocorrências, com filtro por período.

**Fluxos alternativos**: exportação para relatório (`REL-02`, Parte 5).

**Regras de negócio**: escopo de visualização segue estritamente RBAC (`RN-08`/`RN-09`, Dossiê 8) — Responsável só vê o histórico do próprio filho, Escola só vê alunos da própria instituição.

**Permissões**: ver acima.

**Validações**: nenhuma.

**Mensagens exibidas**: estado vazio — "Nenhum histórico de viagem ainda para este aluno."

**Casos excepcionais**: aluno transferido entre tenants (trocou de transportador) — o histórico anterior permanece acessível ao Responsável mesmo após a mudança de tenant, mas não fica visível ao novo tenant (isolamento multi-tenant, `RN-07`), preservando a privacidade da relação comercial anterior.

**Critérios de aceite**:
- **Dado** um aluno com 30 dias de histórico, **quando** o Responsável consulta o histórico, **então** vê todos os 30 dias com embarque/desembarque e ocorrências, se houver.
- **Dado** um aluno que mudou de tenant, **quando** o tenant novo consulta o histórico, **então** vê apenas os dados a partir do novo vínculo, nunca do tenant anterior.

**Possíveis melhorias futuras**: visualização em calendário (não apenas lista cronológica), destacando visualmente dias com ocorrência.

---

## ESC-01 — Cadastro de Escola

**Objetivo**: registrar uma escola atendida pelo tenant.

**Usuários envolvidos**: Gestor, Empresa.

**Pré-requisitos**: nenhum.

**Fluxo principal**:
1. Gestor acessa "Escolas" → "+ Nova escola".
2. Informa nome, rede (federal/estadual/municipal/privada), código INEP (opcional, ver `ESC-02`), município, UF, endereço, turnos ofertados, contato.
3. Sistema geocodifica o endereço e cria a escola.

**Fluxos alternativos**: cadastro rápido a partir do fluxo de `STU-01` (atalho sem sair do cadastro de aluno).

**Regras de negócio**: cada tenant mantém seu próprio registro de escola, mesmo quando a escola física é a mesma atendida por um concorrente (Dossiê 8 §6, nota explícita) — não há deduplicação cross-tenant no MVP.

**Permissões**: exclusivo de Gestor/Empresa.

**Validações**: endereço geocodificável (mesma lógica de `STU-06`); código INEP, se informado, deve ter 8 dígitos numéricos.

**Mensagens exibidas**: "Escola cadastrada com sucesso."

**Casos excepcionais**: nenhum além dos já cobertos.

**Critérios de aceite**:
- **Dado** dados válidos, **quando** o Gestor cadastra uma escola, **então** ela fica disponível para vínculo em `STU-02`.

**Possíveis melhorias futuras**: ver `ESC-02`.

---

## ESC-02 — Consulta via INEP

**Objetivo**: permitir que o Gestor localize e importe dados oficiais de uma escola a partir da base pública do Censo Escolar (INEP), reduzindo erro de digitação e padronizando o cadastro.

**Descrição**: funcionalidade de conveniência sobre `ESC-01` — busca por nome/município contra uma base de referência (sincronizada periodicamente ou consultada sob demanda, dependendo da disponibilidade de integração), preenchendo automaticamente nome oficial, código INEP, rede e endereço.

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: conectividade com o serviço de consulta (interno ou externo) de dados do INEP.

**Fluxo principal**:
1. No cadastro de escola, Gestor busca pelo nome da escola e município.
2. Sistema apresenta sugestões da base INEP correspondentes.
3. Gestor seleciona a correspondência correta.
4. Sistema preenche automaticamente os campos oficiais, deixando editáveis os campos operacionais (contato, turnos efetivamente atendidos pelo transportador, que podem ser um subconjunto dos turnos oficiais da escola).

**Fluxos alternativos**: nenhuma correspondência encontrada (escola muito pequena/recente, ou não pública) — Gestor prossegue com cadastro manual completo (`ESC-01`).

**Regras de negócio**: o código INEP, uma vez associado, não é editável livremente (apenas re-selecionável via nova busca), para preservar a integridade da referência oficial.

**Permissões**: Gestor.

**Validações**: nenhuma além da correspondência ser selecionada explicitamente pelo usuário (nunca uma associação automática sem confirmação humana, dado o risco de correspondência incorreta entre escolas de nomes semelhantes).

**Mensagens exibidas**: "Encontramos 3 escolas correspondentes. Selecione a correta."; "Nenhuma escola encontrada na base oficial. Cadastre manualmente."

**Casos excepcionais**: escola que mudou de nome/rede após a última atualização da base de referência — Gestor pode prosseguir com o cadastro manual e corrigir os campos divergentes.

**Critérios de aceite**:
- **Dado** uma busca por nome e município que retorna correspondências, **quando** o Gestor seleciona uma, **então** os campos oficiais são preenchidos automaticamente e permanecem editáveis nos campos operacionais.

**Possíveis melhorias futuras**: sincronização periódica automática da base de referência INEP (V2/V3, dependente de disponibilidade e formato de acesso aos dados públicos).

---

## ESC-03 — Turnos da Escola

**Objetivo**: registrar os turnos ofertados pela escola, usados na validação cruzada de coerência com o turno do aluno/rota (`STU-02`).

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: escola cadastrada.

**Fluxo principal**: seleção múltipla de turnos (matutino/vespertino/integral/noturno) durante `ESC-01` ou em edição posterior.

**Fluxos alternativos**: nenhum.

**Regras de negócio**: usado apenas como validação de alerta (não bloqueante) em `STU-02`.

**Permissões**: Gestor.

**Validações**: ao menos um turno deve ser selecionado.

**Mensagens exibidas**: nenhuma específica além das já cobertas em `STU-02`.

**Casos excepcionais**: nenhum.

**Critérios de aceite**:
- **Dado** uma escola com turnos matutino e vespertino cadastrados, **quando** um aluno integral (turno "integral") é vinculado a ela, **então** o sistema não emite alerta de incoerência, tratando "integral" como compatível com ambos.

**Possíveis melhorias futuras**: horário específico de entrada/saída por turno (não apenas o rótulo do turno), refinando ainda mais a validação cruzada com o horário da rota.
