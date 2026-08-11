/**
 * Tipos de parametro de cada navigator (Dossie 23, Secao 4.2). Crescem
 * conforme as telas reais (Dossie 15-18) forem implementadas — apenas o
 * necessario para a fundacao existe aqui.
 */

export type AuthStackParamList = {
  Entrada: undefined;
  Login: undefined;
  CriarConta: undefined;
  AreaProfissional: undefined;
  AreaPessoal: undefined;
  CriarContaPessoal: undefined;
  CriarEmpresaWebView: undefined;
  ConviteCodigo: undefined;
  ConvitePreview: { codigo: string };
};

export type DriverTabParamList = {
  Inicio: undefined;
  Historico: undefined;
  Veiculo: undefined;
  Perfil: undefined;
};

/**
 * Stack aninhada na aba `Perfil` do Motorista/Monitor (Dossiê 45 —
 * Rotta Legal, Trust & Community Center) — mesmo papel de
 * `VeiculoStackParamList` dentro de `DriverNavigator`: a aba em si
 * nunca muda, só a tela exibida dentro dela. `Documentacao` abre a
 * WebView de `/legal` (ver `LegalWebViewScreen`).
 */
export type DriverPerfilStackParamList = {
  PerfilHome: undefined;
  Documentacao: undefined;
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
 * Bottom Navigation do Responsável (briefing "Marketplace" §"NAVEGAÇÃO"):
 * `Mapa` é sempre a tela padrão ao abrir o app; `Transporte` renomeia o
 * próprio rótulo da aba conforme `ResponsavelTransportState` (ver
 * `features/marketplace/labels.ts`), mas a rota em si tem sempre este
 * mesmo nome fixo.
 */
export type ParentTabParamList = {
  Mapa: undefined;
  Transporte: undefined;
  Notificacoes: undefined;
  Perfil: undefined;
};

/**
 * Stack aninhada na aba `Mapa` do Responsável (briefing "Marketplace"
 * §"BUSCA"/"DETALHES DO TRANSPORTADOR"/"SOLICITAR TRANSPORTE") — mesmo
 * papel de `VeiculoStackParamList` dentro de `DriverNavigator`: a aba em
 * si nunca muda, só a tela exibida dentro dela.
 */
export type MarketplaceStackParamList = {
  MapaHome: undefined;
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
