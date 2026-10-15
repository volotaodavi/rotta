# Decisões da diretoria

Histórico. Bloco novo sempre no topo. Nada aqui é reescrito nem
apagado: é a memória da companhia entre disparos, e é por isso que um
diretor que acorda sem contexto nenhum consegue continuar de onde a
companhia parou.

## 2026-10-14 — CFO: o aditivo da Lytex, e a meta que é 15x a plataforma

**Pedido do fundador:** analisar o aditivo de Split Payment da Lytex,
dizer se faz sentido, como implementar, e divulgar de imediato.

**O que o documento é:** não é um contrato de split. É um aditivo de
condições comerciais ao Termo de Uso da Lytex (Plano Prime), assinado
pelo CNPJ do MEI do fundador, não por uma pessoa jurídica "Rotta". O
split é uma linha entre dezessete da tabela de taxas.

**Primeiro achado:** em **13 das 17 linhas a taxa incentivada é igual à
padrão**. O valor real está concentrado na isenção da mensalidade
(R$ 99,90/mês, R$ 1.198,80/ano) e no PIX de ticket acima de R$ 186,87,
onde a taxa fixa de R$ 1,85 vence os 0,99%.

**O achado que decide:** a meta é 120 liquidações de boleto e 120 de
PIX por mês, em 3 meses. A Rotta inteira tem **8 alunos cadastrados**,
1 transportadora pagando e 5 contratos responsável/transportadora
**todos com valor R$ 0,00 e nenhum assinado**. A meta é quinze vezes a
base de alunos, e o fluxo que a geraria não existe.

**A conta que ninguém tinha feito:** com o preço atual de R$ 39,90/mês,
operar o split absorvendo a tarifa dá **prejuízo de R$ 7,65 por
transportadora por mês**, e **R$ 61,20/mês no cenário em que a meta é
batida**. Bater a meta faz a Rotta perder mais dinheiro, não menos. O
split não é economia: é serviço novo, com custo próprio, e precisa de
preço próprio. Com 3% sobre a mensalidade intermediada viraria
R$ 699,60/mês de margem, mas isso é projeção e está rotulada como tal.

**Risco contratual registrado:** a cl. 3.1 diz que não bater a meta não
tira o incentivo "automaticamente", e a 3.2 permite **cobrança
retroativa** da diferença. O incentivo é adiantamento condicionado, não
desconto. Exposição calculada: entre R$ 300 e R$ 470. Pequena, e por
isso o risco financeiro NÃO é o motivo da recomendação.

**Enquadramento que mudou a análise:** a Lytex já é a provedora
escolhida da Rotta Pay desde o Dossiê 26, com credenciais configuradas
e integração não implementada porque `docs.lytex.com.br` é inalcançável
deste ambiente. Conferido em 14/10/2026: continua inalcançável. A
cobrança em produção é pela Asaas.

**Recomendação:** não assinar ainda. O relógio de 3 meses começa na
assinatura, e hoje falta o primeiro ingrediente do fluxo. Ordem certa:
decidir o modelo, pôr valor nos contratos, puxar as taxas da Asaas para
comparar, validar a arquitetura de subconta com um contador, e só então
assinar pedindo que o prazo conte da primeira transação.

**Não fiz:** não inventei as taxas da Asaas. É o único número que falta
para a comparação ser honesta, e ele está no painel deles.

**CMO, por decisão conjunta:** nada é publicado sobre pagamento
dividido até a primeira transação liquidar em produção. Material pronto
e guardado. Anunciar função inexistente numa plataforma que transporta
criança gasta a única coisa que vende o produto.

**Preciso do fundador:** confirmar se o aditivo já foi assinado (pelo
PDF recebido, não foi: há o carimbo da Autentique sem página de
certificado em seguida); as taxas da Asaas; e a validação contábil da
subconta.

## 2026-10-13 — CTO: "Erro inesperado ao entrar", e o que o banco provou

**Relato do fundador:** print da tela de login do app com "Erro
inesperado ao entrar", conta `isResponsavel`, senha digitada.

**O que o banco provou, antes de qualquer hipótese:** a conta está
`ATIVO`, sem bloqueio, com `tentativasLoginFalhas` em 0 e a linha do
usuário atualizada no horário da tentativa. Esse contador sobe a cada
senha errada e só é zerado numa entrada bem-sucedida. Ou seja: **a
senha estava certa e o servidor processou o login.** A falha é do lado
do aplicativo, depois da resposta. Sem memberships e com
`isResponsavel`, a API devolve tokens normais, sem seleção de perfil e
sem MFA: nenhum ramo exótico envolvido.

**O que a mensagem diz:** a tela só usa essa frase quando o erro NÃO é
`ApiError`. Credencial errada é 401 com texto próprio. E, importante
contra a hipótese fácil: tempo esgotado TAMBÉM vira `ApiError`, porque
o cliente HTTP traduz o próprio abort em "O servidor demorou demais
para responder". Então o que o fundador viu não foi o nosso abort, foi
a conexão caindo sem resposta nenhuma.

**Defeito achado e consertado, mas sem prova de ser a causa dele:** o
`login` não pedia o teto da partida fria. Pior, o comentário do
`refresh`, escrito por mim em 06/10, já dizia com todas as letras que
"o login falhava igual" — e mesmo assim só o `refresh` recebeu o teto
maior. Sessenta segundos contra uma partida fria de noventa, na
requisição que é literalmente a primeira de quem abre o app deslogado.
É um defeito real, consertado e travado por teste. Não afirmo que era o
dele.

**O conserto que de fato responde a pergunta:** o `catch` da tela
trocava o erro real por uma frase genérica e seguia adiante, então o
plantão não tinha absolutamente nada sobre login. É a mesma cegueira de
06/10, repetida porque naquela vez eu a corrigi só no caminho da
renovação de sessão. Agora uma falha sem resposta do servidor vira
registro (`source: "login-falhou"`), com o nome do erro, que é o que
separa rede de abort de defeito nosso. Senha errada continua não
reportando: plantão cheio de ruído esconde o sinal tão bem quanto
plantão vazio.

**Também mudou para o usuário:** em vez de "Erro inesperado ao entrar",
a tela passa a dizer "Não foi possível falar com o servidor. Verifique
sua conexão e tente de novo." Nós sabemos a categoria da falha; o que
não sabemos é o motivo.

**Prova:** três testes novos; os dois que importam falham no código
anterior. Mobile 105/105, api-client 10/10, `tsc` limpo.

**Preciso do fundador:** trocar a senha da conta, porque ela apareceu
legível num print enviado pelo chat. E instalar o build novo: na
próxima falha de login o plantão vai dizer o erro real.

## 2026-10-13 — CTO: o erro voltou, e o problema agora é que eu estou cego

**Relato do fundador:** "no app deu erro na hora de entrar na aba de
notificações", para autônomo, MEI e responsável.

**O fato desconfortável:** o plantão mostra seis ocorrências de "Element
type is invalid ... got: undefined" entre 07/10 e 12/10, quatro delas
nas últimas 24 horas. A mais recente veio de um bundle DIFERENTE do de
07/10 (`createFiberFromTypeAndProps` em 345038 contra 345165), ou seja,
de um pacote que JÁ CONTÉM o conserto dos mapas de ícone de 08/10.

Então o conserto de 08/10 não era a causa do que o fundador está
vendo, ou não era a única. Os mapas estavam de fato incompletos e de
fato quebrariam a tela, e o teste reproduziu isso com a mensagem
literal — mas reproduzir UMA causa não prova que era A causa. Fica
registrado como erro de leitura meu.

**O que foi descartado hoje, com prova e não com opinião:** nenhum dos
44 ícones usados na aba falta no lucide 1.31.0 (conferido contra os
6067 exports reais do pacote); nenhum deles falta no bundle de produção
que está no aparelho (conferido dentro do `.aab`); não existe ciclo de
import (Tarjan sobre 328 módulos, com 251 dos 253 arquivos do app
cobertos); `NotificationPriority`, `CommunicationChannel` e
`DeviceTokenPlatform` batem com o api-client (5, 5 e 3); e a aba
inteira monta no jest com dez tipos e as cinco prioridades, dentro de
um `NavigationContainer` de verdade e com os ícones reais, sem mock.

**Por que não achei:** porque o instrumento é cego, e a culpa é do
instrumento. Os seis relatórios chegaram com `telas: ["(mobile)"]` —
uma constante, igual para as 96 telas — e com `buildId` vazio. Pior:
`montarRastro` DESCARTAVA a árvore de componentes quando o React não a
fornecia, e `identidadeDoBuild` devolvia `undefined` quando
`Constants.expoConfig` vinha nulo. Nos dois casos a saída era idêntica
à de um app que não tem esse código. Passei a noite sem conseguir
distinguir "o React não deu a árvore" de "o aparelho está com versão
antiga", e as duas levam a investigações opostas.

**Fiz, e é tudo sobre o instrumento:** `lib/tela-atual.ts` com um
`navigationRef` no `NavigationContainer`, e o relatório passa a mandar
o caminho real (`Notificacoes > Central`) em vez da constante — a nota
antiga dizia que isso "seria uma mudança maior/mais arriscada" e que a
pilha teria a tela real; a pilha não tem, em produção ela é endereço de
bytecode. `identidadeDoBuild` nunca mais devolve vazio e carrega um
sufixo dizendo qual fonte respondeu (`cfg`, `cfg-sem-codigo`,
`codigo`), com a versão travada contra o `app.config.ts` por teste. A
seção de árvore de componentes agora existe sempre, e quando o React
não dá nada ela diz isso com todas as letras.

**Regra que fica:** um instrumento que, ao falhar, produz exatamente a
mesma saída de "não instalado" não é um instrumento. Toda falha de
leitura tem que se identificar.

**Preciso do fundador:** instalar o build novo. A próxima vez que a aba
quebrar, o relatório vai dizer a tela e o build, e aí o conserto é
direto. Fundir ou recusar o PR #3 e o PR #4.

## 2026-10-08 — CTO: a Central de Notificações não abria, e o motivo era 26 contra 45

**Relato do fundador:** "ao quererem entrar nas notificações, aparece
erro".

**O que era:** o `enum NotificationEventType` no `schema.prisma` tem 45
valores. Os mapas de ícone, cor e rótulo das telas de notificação
tinham 26. A Central do app fazia `NOTIFICATION_TYPE_ICON[tipo]` e
usava o resultado como componente, então uma notificação de qualquer um
dos 19 tipos ausentes virava `<undefined />` e derrubava a tela com
"Element type is invalid: expected a string (for built-in components) or
a class/function (for composite components) but got: undefined".

É o MESMO erro que o plantão registrou em 07/10/2026 às 21:50, duas
vezes em doze segundos. Entre os 19 que faltavam estão
`CADASTRO_CONCLUIDO` e `IDENTIDADE_APROVADA`: bastava criar uma conta
para a Central ficar inabrível.

**Por que o compilador não pegou:** a união `NotificationEventType` do
`packages/api-client` também declarava 26 valores. Um
`Record<NotificationEventType, ...>` de 26 chaves estava, para o
TypeScript, completo. Pior: o arquivo carregava uma nota admitindo a
defasagem e chamando-a de inofensiva, dizendo que "uma notificação de
tipo desconhecido continua aparecendo na Central, só não cai em nenhum
filtro de categoria". Essa frase estava errada, e foi ela que fez o
adiamento parecer seguro.

**Por que não havia teste:** `lucide-react-native` publica ESM e
resolve para `.mjs` pela condição `react-native`; o transform do
`jest-expo` só casa `\.[jt]sx?$`. Nada que importasse
`@rotta/icons/native` podia ser testado, e é embaixo desse barrel que
os mapas vivem. A lacuna não foi descuido: era impossível escrever o
teste que teria pegado.

**Fiz, na ordem da causa:** completei a união para os 45 valores, que
transformou cada mapa incompleto em erro de compilação (o `tsc` apontou
sete, em mobile e web); preenchi os sete; troquei o acesso direto por
`iconeDoTipo`/`tomDoTipo`/`rotuloDoTipo` com saída garantida, porque a
API sobe sozinha e o aplicativo instalado não, e compilador nenhum
alcança um binário já na mão do usuário; abri o caminho do Jest para o
lucide via `moduleNameMapper` para o build CommonJS.

**Diferença entre os dois apps, para o registro:** no mobile o mapa
guarda o COMPONENTE e `<undefined />` derruba a árvore. Na web ele
guarda um ELEMENTO já construído, e elemento `undefined` o React só não
desenha: lá o efeito era círculo vazio e linha sem o nome do tipo,
degradação silenciosa e não queda. Os dois foram consertados.

**Prova:** o teste de integração monta a `CentralScreen` de verdade com
uma notificação de tipo desconhecido. Revertendo a tela ao acesso
direto, ele falha com a mensagem literal do crash de produção;
restaurado o conserto, passa. `notification-event-type.spec.ts` tranca
a união contra o `schema.prisma`, para a próxima adição ao enum quebrar
um teste em vez de uma tela. Mobile 95/95, api-client 7/7, `tsc` limpo
nos dois apps, `next build` verde.

**Preciso do fundador:** instalar um build novo do app para o conserto
chegar ao celular. Fundir ou recusar o PR #3 e o PR #4.

## 2026-10-08 — CTO: o crash que chegou sem nome, e o token dos quatro

**O que o plantão achou:** com o token de leitura finalmente no lugar,
`GET /v1/client-errors/plantao?horas=168` parou de responder zero e
mostrou um crash real: `app: MOBILE`, "Element type is invalid:
expected a string (for built-in components) or a class/function (for
composite components) but got: undefined", duas vezes em doze
segundos, em 07/10/2026 às 21:50. Antes disso a janela de 168 horas
vinha vazia, numa semana em que o app não abria para ninguém.

**Por que ele não dava para consertar:** o relatório tinha doze quadros
de pilha, todos de dentro do reconciliador do React, nenhum do produto,
em endereço de bytecode Hermes (`index.android.bundle:1:345165`). E
`buildId` vazio. Dava para saber que algo quebrou, não o quê nem em
qual build.

**Investigação, com o que foi descartado:** o grafo de 327 módulos que
o app carrega na partida não tem nenhum ciclo de import (Tarjan sobre
os imports de valor, ignorando `import type`); não existe variante por
plataforma (`.native.`/`.android.`/`.web.`) que o `tsc` não veja; não
existe `React.lazy` nem import dinâmico; `@maplibre/maplibre-react-native`
10.4.2 exporta de fato os seis nomes que `packages/maps` importa
(`Camera`, `Callout`, `LineLayer`, `MapView`, `PointAnnotation`,
`ShapeSource`); `tsc --noEmit` passa. O `.aab` instalado é bytecode
Hermes, então os deslocamentos da pilha não viram nome de função sem o
disassembler.

**Fiz:** o conserto é no instrumento, não um chute no defeito.
`AppErrorBoundary` passou a usar o segundo argumento de
`componentDidCatch`, que é exatamente o que nomeia a tela quebrada e
sobrevive à minificação, e a mandar a identidade do build
(`apps/mobile/src/lib/identidade-do-build.ts`, `version` +
`versionCode`). `apps/web` já fazia isso desde 03/09/2026
(`section-error-boundary.tsx`); o app tinha ficado de fora, e o preço
foi um crash de produção não diagnosticável. Quatro testes novos em
`app-error-boundary.spec.tsx`; os dois que importam falham no código
anterior e passam no consertado. Mobile 91/91.

**Também fiz:** `DIRETORIA_READ_SECRET` chegou ao CEO, ao CTO e ao CFO,
que rodavam sem ele (só o CMO tinha). As três escalas foram recriadas,
porque o texto de uma escala presa a uma sessão não pode ser editado de
fora dela. Cada uma agora confere se o endpoint respondeu 200 de
verdade antes de encerrar em branco, e cruza com
`/v1/plataforma/pulso/diretoria`: zero erro com a plataforma em
movimento é suspeita, não boa notícia. O CFO ganhou a régua de cobrança
(`/v1/cobranca/pendencias` e `/v1/cobranca/cobrar`) e o CEO ganhou as
quatro leituras juntas, que é o cruzamento que só ele faz.

**Errei:** escrevi `/v1/plataforma/pulso` nos três prompts primeiro, e
essa rota exige sessão de Admin (a da diretoria termina em
`/diretoria`). Peguei no teste e corrigi antes de qualquer turno rodar
com ela. E ao apagar a escala antiga do CTO apaguei junto a sessão que
ela havia criado às 08:22 de hoje, perdendo o relatório daquele turno.

**Preciso do fundador:** fundir ou recusar o PR #3 (CTO, testes do Audit
Engine) e o PR #4 (CMO). O crash do mobile só fica identificado quando
um build com este conserto estiver instalado: o próximo relatório dirá
a tela e o build.
## 2026-10-07 — CMO: funil parado, anúncio sem base para otimizar

**Fiz:** li `GET /v1/marketing/funil`: idêntico a 05/10 (3 checkouts, 3
abandonados, 0 pagos, `pagosVindosDeAnuncio` 0, `comprasNaoEnviadas` 0).
Campanhas: 502, falta `META_ADS_ACCESS_TOKEN` com `ads_read` ou
`META_AD_ACCOUNT_ID`. O PR do turno de 05/10 já foi fundido.

**Entreguei:** `marketing/2026-10-07-anuncios-o-que-o-dado-sustenta.md`,
com o que dá e o que não dá para fazer em anúncio com este dado. Recado
ao CFO mantido e atualizado.

**Decidi sozinho:** não mexer em `apps/web` neste turno. O número não
mudou, então não há nova perda para atacar, e instrumentar
`cadastro_iniciado` agora daria métrica enviesada (dispara antes do
aceite de cookies e é descartado).

**Preciso do fundador:** as duas variáveis do Meta no Render e token da
API de Conversões com escrita. O segredo de leitura foi usado só na
sessão, nunca gravado.
## 2026-10-06 — CTO: auditoria dos agentes de IA, e o Audit Engine sai do zero de testes

**Fiz:** varri os módulos dos agentes de IA atrás do que não tem rede de
proteção. Geo (Geocoding, Validation, Map Intelligence, Education Sync),
Rotta AI e Didit têm teste. O Audit Engine (`apps/api/src/modules/audit`)
tinha zero, e é a trilha que a RN-32 exige para toda alteração sensível.
Escrevi 8 testes que prendem o que mais custa se quebrar: gravação sob o
tenant da requisição quando há `companyId`, gravação com bypass quando o
ator não tem empresa, listagem por empresa sempre filtrada por
`companyId` e sob tenant (nunca bypass), listagem de catálogo
compartilhado com bypass, paginação padrão (página 1, 20 itens) e falha
de gravação que sobe para o serviço chamador. Nenhum código de produção
mudou.

**Não fiz:** `infra/whatsapp` e `infra/sms` (Communication Engine) também
estão sem teste; ficam para o próximo turno cheio. Plantão cego: o
`DIRETORIA_READ_SECRET` não existe no ambiente deste turno (a variável
vem vazia), então não li os erros de cliente.

**Verifiquei:** `jest src/modules/audit` 8 de 8; eslint e prettier limpos
nos arquivos novos. O `tsc -p tsconfig.build.json` da API acusa
`@rotta/validators` não encontrado em arquivos que não toquei, porque os
pacotes do workspace não foram compilados neste ambiente; nada em
`modules/audit`.

**Preciso do fundador:** conferir se `DIRETORIA_READ_SECRET` está no
ambiente dos turnos agendados (o ACESSOS.md diz "ligado", mas a sessão
não enxerga o valor).

## 2026-10-05 — CMO: funil lido, checkout de `/planos/assinar` reescrito

**Fiz:** com o segredo de leitura entregue pelo fundador neste turno,
li `GET /v1/marketing/funil`: 3 checkouts iniciados, 3 abandonados, 0
pagos; 6 transportadoras em teste, 1 pagando; `pagosVindosDeAnuncio` 0;
`comprasNaoEnviadas` 0. `GET /v1/marketing/campanhas` respondeu 502
(falta `META_ADS_ACCESS_TOKEN` com `ads_read` ou `META_AD_ACCOUNT_ID`).
Análise completa em `marketing/2026-10-05-funil.md`.

**Mudei no site:** `apps/web/src/app/(marketing)/planos/assinar/page.tsx`
agora diz, antes do formulário, o reembolso automático em 48 horas, o
teste grátis sem cartão e o que acontece depois de pagar; ajuda dos
campos de contato reescrita. Teste novo em `page.spec.tsx`. Preço,
plano e promessa não mudaram.

**Decidi sozinho:** atacar o checkout porque é onde o número mostra a
perda (3 de 3). Amostra pequena: é direção, não prova.

**Não fiz:** nenhum número de campanha, porque o Meta recusou a leitura.
Nada publicado em lugar nenhum.

**Preciso do fundador:** as duas variáveis do Meta no Render; fundir ou
recusar o PR #2. O segredo de leitura foi usado só na sessão e não foi
gravado no repositório.

## 2026-10-05 — CMO: funil cego, análise não escrita

**Fiz:** o turno pediu a análise de funil. Confirmei o ambiente:
`DIRETORIA_READ_SECRET` e `RENDER_API_KEY` ausentes na sessão. Chamei
`GET https://rotta-vt7i.onrender.com/v1/marketing/funil` e a resposta foi
HTTP 401. Pela carta do cargo, parei ali: não escrevi
`empresa/marketing/AAAA-MM-DD-funil.md` e não mexi em `apps/web`, porque
nenhuma das quatro perguntas (onde o cadastro morre, receita vinda de
anúncio, compras não enviadas ao Meta, o que mudar nas páginas) tem
número para ancorar.

**Entreguei:** o recado do CMO para o CFO em `BACKLOG.md` (teto de custo
por transportadora nova), e o pedido ao fundador para colocar a variável
no ambiente do CMO.

**Decidi sozinho:** não abrir frente de texto de página no escuro, mesmo
com o turno fora de calendário. O item "Onde o cadastro morre" continua
aberto no backlog.

**Preciso do fundador:** `DIRETORIA_READ_SECRET` no ambiente da sessão do
CMO, mesmo valor do Render. Valor nunca pelo chat.

## 2026-10-05 — CEO

**Fiz:** organizei a primeira semana. Marquei `[prioridade]` em um item por cargo no backlog e limpei o que já estava feito ou desatualizado.
**Por que isso e não outra coisa:** o fio da semana é "quem pagou e não chegou". O backlog já registra pré-cadastro pago sem conta e conta criada sem cadastro terminado: dinheiro e família reais parados no funil. Ver isso de lados diferentes rende mais que quatro assuntos soltos.

- CFO: quantificar os pré-cadastros pagos sem conta (quantos, quanto dinheiro, completar ou devolver). Só com dado da fonte.
- CMO: onde o cadastro morre (texto, campo ou passo faltando). Cruza com o número do CFO, sem inventar taxa.
- CTO: começar a auditoria dos agentes de IA pelo que toca dinheiro ou segurança. Fora disso, o plantão de erro segue como manda a carta.
- CEO: escrever o que falta para vender a uma transportadora grande sem o fundador ao lado, no próximo turno.

**Decidi sozinho:**

- Tirei do backlog o travessão da API (feito em 36da054) e a organização da primeira semana (esta). Reduzi o item de testes ao `packages/ui`, porque o `apps/admin` já ganhou o primeiro teste em da467bd.
- Não marquei o item do Vitest com ícone nem os de turno e escala: o primeiro é infraestrutura sem dor atual, e os dois últimos são pendências antigas que ninguém detalhou.
- Nenhum PR de diretor estava aberto nem aguardando resposta, então não houve fila para cobrar. Também não há entrega anterior de ninguém para avaliar: é a primeira semana.

**Preciso do fundador:** nada trava a semana. Os itens da seção "Só o fundador pode fazer" seguem valendo. Dois deles mudam o que a semana consegue: `DIRETORIA_READ_SECRET` (sem ele o plantão do CTO acorda cego) e o Pixel do Meta na Vercel (sem ele o CMO não mede nada).

**Verificado:** calendário conferido pelo relógio do sistema (segunda, 08:08 de Brasília), `MODO: NORMAL`, sem ordem do fundador. Li o backlog e `DECISOES.md` inteiros e o `git log`. Conferi com `grep` que a limpeza de travessão cobre a API. Não rodei teste: o turno só mexe em documentos.
**Descobri:** nada novo para o backlog.

## 2026-10-05 — FUNDAÇÃO (correção)

**Fiz:** troquei a montagem da diretoria. Cada cargo agora tem uma
sessão própria e permanente, criada com o repositório da Rotta
anexado, e a Routine do cargo acorda ESSA sessão em vez de abrir uma
sessão nova a cada turno.

**Por que isso e não outra coisa:** a montagem anterior não funcionava,
e levou três turnos para ficar claro. Dois turnos do CTO terminaram em
28 e 60 segundos sem entregar nada. A documentação do ambiente explica:
os repositórios de uma sessão são escolhidos quando ela começa, e uma
sessão aberta por agendamento nasce com a lista vazia. Os dois turnos
acordaram num container sem o código da Rotta e sem credencial para
empurrar nada, leram o que tinham, escreveram um recado curto e
encerraram. Não era o prompt, não era permissão, não era o agendador.

**Decidi sozinho:**

- Sessão permanente por cargo, em vez de sessão nova por turno. Além de
  resolver o repositório, isso dá memória ao diretor entre turnos, o
  que baratea cada turno seguinte.
- Modelo fixado em Sonnet nas quatro sessões. O turno de teste que
  finalmente teve repositório rodou em Opus por herança e consumiu US$
  2,95 em cinco minutos, contra US$ 0,13 e US$ 0,16 dos dois turnos
  vazios. Trabalho de diretoria não justifica o modelo mais caro.
- As quatro Routines antigas foram apagadas e refeitas. Apagar uma
  Routine apaga as sessões que ela criou, então as duas sessões de
  teste vazias do CTO foram embora junto; a que importa, a que teve
  repositório e provou o diagnóstico, foi criada à mão e continua lá.

**Preciso do fundador:** nada agora. O primeiro turno de verdade é o
CEO, segunda 08:07.

**Verificado:** o turno de teste com repositório anexado leu 142 mil
tokens de contexto e produziu 25 mil tokens de saída (contra 1,3 mil
dos turnos sem repositório), ou seja, trabalhou de verdade. Ele não
chegou a abrir o PR porque esbarrou no limite semanal do plano do
fundador, que zerou no domingo às 21h de Brasília. Esse limite é o
motivo de a cadência ser de cinco turnos por semana e de existir a
linha `MODO:`.

**Descobri:** uma Routine amarrada a uma sessão permanente não aceita
notificação por e-mail (o servidor recusa; e-mail só existe para
Routine que abre sessão nova a cada disparo). Então o aviso de fim de
turno passa a ser o Pull Request e a tela Diretoria do Admin, que
mostra quantos estão esperando merge. Se o fundador quiser o e-mail de
volta, dá para criar um boletim semanal separado, que lê o repositório
público e resume a semana.

## 2026-10-03 — FUNDAÇÃO

**Fiz:** criei a diretoria da Rotta, a pedido do fundador: CEO, CTO,
CMO e CFO, cada um com uma Routine própria que abre uma sessão sozinha
no horário dele, sem ninguém mandar prompt.

**Por que isso e não outra coisa:** o fundador pediu agentes que
trabalhem de verdade, sem ele mandar. O que separa isso de um chat é
uma coisa só, um agendador que dispara a sessão. Tudo o mais (carta de
cargo, backlog, log) existe para que o agente que acorda saiba onde a
companhia parou em vez de inventar uma empresa nova a cada disparo.

**Decidi sozinho:**

- O comportamento da diretoria vive no repositório, não no texto das
  Routines. O prompt agendado é curto e só manda ler `FUNDADOR.md`,
  `PROTOCOLO.md` e a carta do cargo. Mudar o que um diretor faz passa a
  ser editar um arquivo e dar commit, não mexer em agendador.
- Departamento é subagente dentro da sessão do chefe, não uma sessão
  por funcionário. Uma sessão por funcionário custaria várias vezes
  mais e entregaria o mesmo.
- Toda entrega sai como Pull Request em branch própria. A branch padrão
  deste repositório é a que a Vercel e o Render publicam: um diretor
  empurrando ali estaria publicando na plataforma que famílias e
  motoristas usam.
- `FUNDADOR.md` vence qualquer carta de cargo, e o bloco
  `## ORDEM DO FUNDADOR` naquele arquivo vira a tarefa do próximo
  disparo, acima do backlog. É o mecanismo da palavra final sem
  depender de o fundador estar presente.

**Preciso do fundador:**

- Fundir (ou recusar) os Pull Requests. Nenhum diretor funde nada.
- Decidir se quer mais cadência depois de ver as primeiras entregas. A
  cadência começa enxuta, 7 disparos por semana, porque cada disparo
  consome o mesmo limite de plano que ele usa para trabalhar.
- Os três itens da seção "Só o fundador pode fazer" do backlog.

**Verificado:** as quatro Routines criadas e listadas no agendador, com
horário e prompt conferidos. O primeiro disparo real do CTO foi
executado à mão para provar a corrente inteira: a Routine abriu sessão
sozinha, com o repositório clonado, leu as cartas e trabalhou.

**Descobri:** quatro limites que não existem por preguiça de montagem,
e sim por falta de credencial, e que o fundador precisa conhecer para
não esperar o que não vai acontecer. O CFO não move dinheiro. O CMO não
publica nada. O CEO não assina nem contrata. Nenhum deles fala com
pessoa de fora. Tudo isso para no fundador, de propósito.
