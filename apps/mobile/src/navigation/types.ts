import type { NavigatorScreenParams } from "@react-navigation/native";

/**
 * Tipos de parametro de cada navigator (Dossie 23, Secao 4.2). Crescem
 * conforme as telas reais (Dossie 15-18) forem implementadas — apenas o
 * necessario para a fundacao existe aqui.
 */

export type AuthStackParamList = {
  /** Onboarding de 3 telas (Dossiê 24 — primeira experiência), mostrado só quando `getHasSeenOnboarding()` ainda não está marcado. */
  Onboarding: undefined;
  /** "Como você utiliza a Rotta?" — decide entre `AreaPessoal`/`AreaProfissional` no cadastro; login continua único, independente de papel. */
  SelecionarPerfil: undefined;
  Entrada: undefined;
  Login: undefined;
  /** "Esqueci minha senha" (Dossiê 15, `AUTH-03`) — só pede o e-mail; a troca em si acontece pelo link enviado (abre no navegador do celular, `WEB_APP_URL/redefinir-senha`). */
  EsqueciSenha: undefined;
  CriarConta: undefined;
  AreaProfissional: undefined;
  AreaPessoal: undefined;
  CriarContaPessoal: undefined;
  CriarEmpresaWebView: undefined;
  ConviteCodigo: undefined;
  ConvitePreview: { codigo: string };
  /** Dossiê 26 — cadastro direto do Responsável via "código da transportadora". */
  ConviteTransportadora: undefined;
  /** Frente N (briefing item 9) — Motorista/Monitor autônomo, sem empresa ainda. */
  CriarContaAutonomo: undefined;
};

/**
 * Stack mostrada pelo `RootNavigator` no lugar de `DriverNavigator`
 * quando o usuário já está autenticado como Motorista/Monitor mas ainda
 * não tem `companyId` (Frente N — cadastro autônomo via
 * `AuthStackParamList.CriarContaAutonomo`, antes de qualquer vínculo
 * aprovado). `VerificacaoIdentidade` reaproveita a MESMA WebView de
 * `DriverPerfilStackParamList` — só muda de onde é alcançada.
 */
export type VinculoPendenteStackParamList = {
  Status: undefined;
  VerificacaoIdentidade: undefined;
  InformarCodigo: undefined;
};

/**
 * Frente AO — rótulos/abas corrigidos pra bater com as 3 imagens de
 * referência (Início/Viagens/Notificações/Perfil, mesma barra em todos
 * os papéis — ver `DriverBottomNav`/`ResponsavelBottomNav` da versão
 * web). `Historico` continua sendo o nome da rota internamente (só o
 * rótulo virou "Viagens", ver `DriverNavigator`) pra não obrigar renomear
 * a tela em cascata; `Veiculo` saiu da barra (nenhuma das imagens de
 * referência mostra essa aba) e virou uma tela dentro de `Perfil`
 * (`DriverPerfilStackParamList` abaixo), igual à versão web.
 */
export type DriverTabParamList = {
  Inicio: undefined;
  Historico: undefined;
  Notificacoes: undefined;
  Perfil: undefined;
};

/**
 * Stack aninhada na aba `Perfil` do Motorista/Monitor (Dossiê 45 —
 * Rotta Legal, Trust & Community Center; Frente AO — `Veiculo` entrou
 * aqui) — mesmo papel de `VeiculoStackParamList` dentro de
 * `DriverNavigator`: a aba em si nunca muda, só a tela exibida dentro
 * dela. `Documentacao` abre a WebView de `/legal` (ver
 * `LegalWebViewScreen`); `Veiculo` monta a MESMA `VeiculoNavigator` que
 * antes era uma aba própria — nenhuma tela dela mudou, só de onde se
 * chega.
 */
export type DriverPerfilStackParamList = {
  PerfilHome: undefined;
  Documentacao: undefined;
  VerificacaoIdentidade: undefined;
  Veiculo: undefined;
  /** Suporte (Epic B) — mesma decisão de aninhamento de `Veiculo`/`Documentacao` acima. */
  Chamados: undefined;
  /**
   * "Meus Alunos" do Motorista/Monitor (Frente 4, 11/09/2026: "Monitor:
   * alunos + perfil + escolas") — read-only, todos os alunos de todas
   * as rotas ativas da pessoa, não só os da viagem em andamento.
   */
  Alunos: undefined;
};

/** Stack de "Meu Veículo" (briefing "APP MOBILE"), aberta a partir da aba `Veiculo` do Motorista/Monitor. */
export type VeiculoStackParamList = {
  MeuVeiculo: undefined;
  Fotos: undefined;
  Documentos: undefined;
  Historico: undefined;
  Ocorrencias: undefined;
  Checklist: undefined;
  /**
   * Escolas atendidas pelas rotas do Motorista/Monitor (briefing "APP
   * MOBILE" do módulo Escolas) — aninhada na mesma stack de "Meu
   * Veículo" (nenhuma aba própria: Bottom Navigation do Motorista já
   * está no limite de 3-4 itens, Dossiê 10 §11.1).
   */
  Escolas: undefined;
  EscolaDetalhes: { schoolId: string };
  EscolaMapa: { schoolId: string };
  EscolaRotasVinculadas: { schoolId: string };
  EscolaHorarios: { schoolId: string };
  /**
   * Carteira Rotta Pay do Motorista (Dossiê 26) — mesma decisão de
   * aninhamento de `Escolas` acima: sem aba própria, acessada por um
   * botão em `MeuVeiculoScreen`.
   */
  Carteira: undefined;
};

/**
 * Bottom Navigation do Responsável — CINCO abas, como na referência
 * visual (Início · Viagens · Mapa · Notificações · Perfil), separação
 * feita em 15/09/2026.
 *
 * `Inicio` é a Home (saudação + estado do transporte + "Acompanhar no
 * mapa") e `Mapa` é sempre o mapa. Antes as duas eram a MESMA aba: a
 * `MapaScreen` trocava de conteúdo conforme o estado do transporte, e
 * essa fusão estava anotada no próprio código como lacuna deliberada
 * ("mudança maior de navegação... deixada fora desta entrega").
 *
 * `Transporte` renomeia o próprio rótulo da aba conforme
 * `ResponsavelTransportState` (ver `features/marketplace/labels.ts`),
 * mas a rota em si tem sempre este mesmo nome fixo.
 */
export type ParentTabParamList = {
  Inicio: undefined;
  Transporte: undefined;
  Mapa: undefined;
  Notificacoes: undefined;
  Perfil: undefined;
};

/**
 * Stack aninhada na aba `Perfil` do Responsável (Dossiê 45 — Rotta
 * Legal, Trust & Community Center; mesma decisão de `DriverPerfilStackParamList`
 * para Motorista/Monitor) — a aba em si nunca muda, só a tela exibida
 * dentro dela. `Documentacao` abre a mesma WebView de `/legal`
 * (`LegalWebViewScreen`).
 */
export type ParentPerfilStackParamList = {
  PerfilHome: undefined;
  Documentacao: undefined;
  /** Suporte (Epic B) — antes bloqueado pro Responsável no backend; agora liberado, mesma decisão de aninhamento de `Documentacao`. */
  Chamados: undefined;
  /**
   * "Meus Alunos" completo (Frente 2, 11/09/2026: "Responsável: alunos +
   * escolas + perfil") — antes só um card read-only dentro do Perfil.
   * `Escolas` (Frente 3) segue o mesmo padrão de aninhamento aqui.
   */
  Alunos: undefined;
  AlunoDetalhe: { studentId: string };
  AlunoNovo: undefined;
  AlunoEnderecoDoDia: { studentId: string };
  /**
   * Escolas dos alunos do Responsável (Frente 3, 11/09/2026) — mesmas
   * telas genéricas já usadas por `VeiculoStackParamList`
   * (Motorista/Monitor), sem nenhuma tela nova: só uma segunda entrada
   * de navegação pra elas, agora também a partir do Perfil do
   * Responsável.
   */
  Escolas: undefined;
  EscolaDetalhes: { schoolId: string };
  EscolaMapa: { schoolId: string };
  EscolaRotasVinculadas: { schoolId: string };
  EscolaHorarios: { schoolId: string };
};

/**
 * Stack de Suporte (Epic B) — montada dentro da aba "Perfil" de
 * QUALQUER papel (Responsável, Motorista/Monitor/Autônomo, ver
 * `ParentPerfilStackParamList`/`DriverPerfilStackParamList`), já que
 * não existia NENHUMA tela de suporte no app nativo antes desta
 * entrega (só no Painel Web). Espelha 1:1 as 3 rotas do Painel Web
 * (`/chamados`, `/chamados/novo`, `/chamados/:id`).
 */
export type SupportStackParamList = {
  Lista: undefined;
  Novo: undefined;
  Detalhes: { ticketId: string };
};

/**
 * Stack aninhada na aba `Mapa` do Responsável (briefing "Marketplace"
 * §"BUSCA"/"DETALHES DO TRANSPORTADOR"/"SOLICITAR TRANSPORTE") — mesmo
 * papel de `VeiculoStackParamList` dentro de `DriverNavigator`: a aba em
 * si nunca muda, só a tela exibida dentro dela.
 */
export type MarketplaceStackParamList = {
  MapaHome: undefined;
  /** Frente M — segunda porta de entrada, achar transportador por código em vez de proximidade/escola. */
  InformarCodigo: undefined;
  TransportadorDetalhes: { transportadorId: string };
  SolicitarTransporte: { transportadorId: string };
};

/**
 * Stack montada na aba `Notificacoes` do Responsável (briefing "MÓDULO —
 * ROTTA COMMUNICATION ENGINE" §"NOTIFICAÇÕES INTERNAS"; Dossiê 11 §4.4) —
 * mesmo papel de `MarketplaceStackParamList` dentro de `ParentNavigator`.
 * `Historico` lista as notificações arquivadas (fora da lista principal
 * de `Central`); `Preferencias` é alcançada pelo cabeçalho de `Central`.
 */
export type NotificationsStackParamList = {
  Central: undefined;
  Detalhes: { notificationId: string };
  Historico: undefined;
  Preferencias: undefined;
};

/**
 * Bottom Navigation do Admin Rotta (pedido do usuário 05/09/2026: "área
 * do admin no app" — a Web continua sendo a ferramenta completa de
 * gestão; o app cobre o que faz diferença "de olho"/agir fora do
 * computador, incluindo o Financeiro completo desde que o usuário pediu
 * "pode adicionar o financeiro completo para admins no app"). Só
 * alcançável por `user.role === "admin_rotta"` — ver `RootNavigator`.
 * `Financeiro` só aparece pra sub-papel GERAL/FINANCEIRO — RBAC dos
 * sub-papéis (Dossiê "papéis de acesso admin"): SUPORTE não acessa
 * nenhuma área financeira, nem no Painel Web. `Notificacoes` reaproveita
 * literalmente `NotificacoesNavigator` (é agnóstico de papel).
 */
export type AdminTabParamList = {
  Inicio: undefined;
  Suporte: undefined;
  Financeiro: undefined;
  Notificacoes: undefined;
  Perfil: undefined;
};

/**
 * Stack aninhada na aba `Inicio` do Admin Rotta — `Dashboard` (KPIs
 * somente-leitura) e `Aprovacoes` (a mesma fila de `/aprovacoes` da Web,
 * também somente-leitura hoje — aprovar/reprovar em lote continua "Plano
 * de evolução" do Dossiê 29, tanto na Web quanto aqui).
 */
export type AdminHomeStackParamList = {
  Dashboard: undefined;
  Aprovacoes: undefined;
};

/**
 * Stack de Suporte do Admin Rotta — mesmas 2 rotas finais de
 * `SupportStackParamList` (`Lista`/`Detalhes`; sem `Novo`, o Admin
 * responde chamados, não abre os seus próprios). `Detalhes` reaproveita
 * literalmente `ChamadoDetalhesScreen` (a mesma tela usada por
 * Responsável/Motorista/Monitor) — o chat já distingue
 * `autorIsAdminRotta` e o backend já resolve o escopo cross-tenant pelo
 * ator autenticado, então nenhuma tela nova era necessária pra isso.
 */
export type AdminSupportStackParamList = Pick<SupportStackParamList, "Lista" | "Detalhes">;

/**
 * Stack do Financeiro completo do Admin no app (pedido do usuário
 * 05/09/2026) — espelha `apps/admin/src/app/(admin)/financeiro`:
 * `Overview` (saldo + composição recebido/taxa/líquido + empresas por
 * plano + lista de empresas ativas), `Extrato` (lançamentos reais da
 * conta Asaas + tendência de saldo), `Transferencia` (Pix pra fora da
 * conta, botão só aparece pra GERAL), `CobrancaPix` (cobrança avulsa,
 * GERAL+FINANCEIRO) e `Empresa` (histórico de pagamentos de uma empresa
 * + estorno/cancelamento de assinatura, ambos GERAL-only).
 */
export type AdminFinanceiroStackParamList = {
  Overview: undefined;
  Extrato: undefined;
  Transferencia: undefined;
  CobrancaPix: undefined;
  Empresa: { companyId: string; companyNome: string };
};

/**
 * Bottom Navigation da Empresa/Gestor no app (pedido do usuário
 * 11/09/2026: "veja oq tem na web e traga para o app oficial" —
 * confirmado escopo "versão reduzida primeiro", mesmo espírito de
 * `AdminTabParamList"). Só alcançável por `user.role === "empresa" ||
 * "gestor"` — ver `RootNavigator`. Fica só na Web (paridade completa
 * fica pra depois): Escolas, Marketplace, Chamados, Assinatura,
 * relatórios avançados de Veículos (auditoria/lembretes/manutenções/
 * checklist/ocorrências), otimização de rota por IA, edição de
 * endereço livre em parada.
 *
 * `Inicio` aninha `Alunos`(pré-cadastro) e `Equipe` (roster +
 * aprovações + convites) — nenhuma aba própria pra elas: são áreas de
 * uso esporádico, não de consulta diária, mesmo raciocínio que já
 * levou `Aprovacoes` a ficar dentro de `Inicio` no Admin em vez de
 * ganhar aba própria. Pra não perder visibilidade dos pedidos de
 * vínculo pendentes (ação real, não só leitura), a aba ganha
 * `tabBarBadge` com essa contagem (ver `EmpresaNavigator`).
 * `Notificacoes` reaproveita literalmente `NotificacoesNavigator` (é
 * agnóstico de papel).
 */
export type EmpresaTabParamList = {
  /**
   * `NavigatorScreenParams` (15/09/2026) — permite navegar direto pra
   * uma tela DENTRO da stack da aba Início (ex.: Perfil -> Assinatura),
   * em vez de só trocar de aba e largar a pessoa no Dashboard. Sem isso,
   * um item de menu como "Assinatura" cairia na tela errada. `|
   * undefined` mantém `navigate("Inicio")` simples funcionando onde já
   * era usado assim.
   */
  Inicio: NavigatorScreenParams<EmpresaHomeStackParamList> | undefined;
  Frota: undefined;
  Rotas: undefined;
  Notificacoes: undefined;
  Perfil: undefined;
};

/**
 * Stack aninhada na aba `Inicio` da Empresa/Gestor — `Dashboard`
 * (saudação + atalhos), `AlunosPreCadastro` (Frente 2) e `Equipe`
 * (Frente 5) — ver `EmpresaTabParamList` pro raciocínio de
 * aninhamento.
 */
export type EmpresaHomeStackParamList = {
  Dashboard: undefined;
  /** Assinatura da Rotta (15/09/2026) — status do plano e extrato de pagamentos da
   * própria empresa; o pagamento em si abre no navegador (ver a tela). */
  Assinatura: undefined;
  AlunosPreCadastro: undefined;
  Equipe: undefined;
  /**
   * Marketplace (Frente A do plano "lacunas Empresa/Gestor no app",
   * 12/09/2026) — antes desta Frente o app não tinha NENHUMA tela de
   * Marketplace; uma solicitação de família só era vista abrindo a Web.
   * Mesmo raciocínio de aninhamento de `AlunosPreCadastro`/`Equipe`
   * acima — uso esporádico, não diário.
   */
  MarketplaceSolicitacoes: undefined;
  MarketplaceSolicitacaoDetalhe: { transportRequestId: string };
  MarketplaceContratos: undefined;
  MarketplaceContratoDetalhe: { contractId: string };
};

/**
 * Stack da aba `Frota` da Empresa/Gestor (Frente 3 — lista/detalhe
 * entram na 3a; `Novo`/`Documentos` entram na 3b). Espelha
 * `apps/web/.../veiculos/**`, em escopo reduzido (ver
 * `EmpresaTabParamList`: sem lembretes/manutenções/checklist/
 * ocorrências/auditoria/vínculos por enquanto).
 */
export type EmpresaFrotaStackParamList = {
  Lista: undefined;
  Detalhe: { vehicleId: string };
  Novo: undefined;
  Documentos: { vehicleId: string };
  /** Mapa da frota em tempo real (Frente B, 12/09/2026) — atalho a partir de `Lista`. */
  Mapa: undefined;
  /**
   * Abas que faltavam no detalhe do veículo (Frente C, 12/09/2026) —
   * mesmas 6 abas que já existem em `apps/web/.../veiculos/[id]`,
   * reaproveitando ao máximo os hooks/telas já existentes do lado
   * Motorista/Monitor (`features/vehicles/hooks/use-vehicles.ts`).
   */
  Manutencoes: { vehicleId: string };
  Lembretes: { vehicleId: string };
  Vinculos: { vehicleId: string };
  Checklist: { vehicleId: string };
  Ocorrencias: { vehicleId: string };
  Auditoria: { vehicleId: string };
};

/**
 * Stack da aba `Rotas` da Empresa/Gestor (Frente 4 — lista/detalhe/
 * pausar-ativar entram na 4a; `Novo` entra na 4b, junto com adicionar
 * parada/aluno dentro do próprio `Detalhe`). Espelha
 * `apps/web/.../rotas/**`, em escopo reduzido: sem otimização de rota
 * por IA, sem reordenar paradas manualmente, sem parada por endereço
 * livre (só por escola do catálogo).
 */
export type EmpresaRotasStackParamList = {
  Lista: undefined;
  Detalhe: { routeId: string };
  Novo: undefined;
};
