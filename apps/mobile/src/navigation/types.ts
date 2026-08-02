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
  CriarEmpresaWebView: undefined;
  ConviteCodigo: undefined;
  ConvitePreview: { codigo: string };
};

export type DriverTabParamList = {
  Inicio: undefined;
  Historico: undefined;
  Perfil: undefined;
};

export type ParentTabParamList = {
  Inicio: undefined;
  Historico: undefined;
  Notificacoes: undefined;
  Perfil: undefined;
};
