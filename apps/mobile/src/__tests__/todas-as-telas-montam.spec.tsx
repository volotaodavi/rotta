import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppModeProvider } from "@/providers/app-mode-provider";
import { ThemeProvider } from "@/providers/theme-provider";

/**
 * Toda tela do app monta sem quebrar.
 *
 * ## Por que este teste existe
 *
 * Porque não há emulador nesta máquina, e "o app funciona" não se
 * verifica lendo código. O mais perto que dá pra chegar é montar cada
 * tela no renderer de verdade do React Native, com os dados vazios —
 * que é o estado em que toda tela aparece no primeiro segundo, antes de
 * qualquer resposta da API chegar.
 *
 * É justamente aí que mora o erro que derruba o app na mão de quem usa:
 * `undefined.map`, `dados.items[0].nome` sem lista, um ícone importado
 * com o nome errado. Nada disso aparece no `tsc` quando o tipo diz
 * `T | undefined` e alguém escreveu `!`.
 *
 * O teste não prova que a tela está CERTA, prova que ela ABRE. É o piso,
 * não o teto.
 */

/* Tudo que fala com o mundo responde vazio: o alvo é o primeiro render. */
jest.mock("@rotta/auth/native", () => ({
  useAuth: () => ({
    user: {
      id: "u1",
      nome: "Ana Souza",
      email: "ana@rotta.com.br",
      telefone: "21997099557",
      role: "responsavel",
    },
    status: "authenticated",
    logout: jest.fn(),
    login: jest.fn(),
  }),
}));

jest.mock("@rotta/maps/native", () => ({
  RottaMap: () => null,
  __esModule: true,
}));

/* `react-native-webview` exige um módulo nativo que não existe no Jest
   (`RNCWebViewModule`). No aparelho ele existe; aqui, mockar é a única
   forma de montar as telas de entrada, que abrem os termos numa
   WebView. Isto é limitação do ambiente, não defeito do app. */
jest.mock("react-native-webview", () => ({ WebView: () => null }));

/* eslint-disable @typescript-eslint/no-require-imports -- `import()` dinâmico
   não roda neste Jest (sem --experimental-vm-modules); `require` é o
   jeito suportado de carregar o módulo dentro do caso de teste. */
const TELAS: Array<[string, () => { [k: string]: unknown }, string]> = [
  [
    "admin-approvals-screen",
    () => require("@/features/admin/screens/admin-approvals-screen"),
    "AdminApprovalsScreen",
  ],
  [
    "admin-chamados-screen",
    () => require("@/features/admin/screens/admin-chamados-screen"),
    "AdminChamadosScreen",
  ],
  [
    "admin-financeiro-cobranca-pix-screen",
    () => require("@/features/admin/screens/admin-financeiro-cobranca-pix-screen"),
    "AdminFinanceiroCobrancaPixScreen",
  ],
  [
    "admin-financeiro-empresa-screen",
    () => require("@/features/admin/screens/admin-financeiro-empresa-screen"),
    "AdminFinanceiroEmpresaScreen",
  ],
  [
    "admin-financeiro-extrato-screen",
    () => require("@/features/admin/screens/admin-financeiro-extrato-screen"),
    "AdminFinanceiroExtratoScreen",
  ],
  [
    "admin-financeiro-overview-screen",
    () => require("@/features/admin/screens/admin-financeiro-overview-screen"),
    "AdminFinanceiroOverviewScreen",
  ],
  [
    "admin-financeiro-transferencia-screen",
    () => require("@/features/admin/screens/admin-financeiro-transferencia-screen"),
    "AdminFinanceiroTransferenciaScreen",
  ],
  [
    "admin-home-screen",
    () => require("@/features/admin/screens/admin-home-screen"),
    "AdminHomeScreen",
  ],
  [
    "admin-perfil-screen",
    () => require("@/features/admin/screens/admin-perfil-screen"),
    "AdminPerfilScreen",
  ],
  ["auth-screen", () => require("@/features/auth/components/auth-screen"), "AuthScreen"],
  [
    "area-pessoal-screen",
    () => require("@/features/auth/screens/area-pessoal-screen"),
    "AreaPessoalScreen",
  ],
  [
    "area-profissional-screen",
    () => require("@/features/auth/screens/area-profissional-screen"),
    "AreaProfissionalScreen",
  ],
  [
    "convite-codigo-screen",
    () => require("@/features/auth/screens/convite-codigo-screen"),
    "ConviteCodigoScreen",
  ],
  [
    "convite-preview-screen",
    () => require("@/features/auth/screens/convite-preview-screen"),
    "ConvitePreviewScreen",
  ],
  [
    "convite-transportadora-screen",
    () => require("@/features/auth/screens/convite-transportadora-screen"),
    "ConviteTransportadoraScreen",
  ],
  [
    "criar-conta-autonomo-screen",
    () => require("@/features/auth/screens/criar-conta-autonomo-screen"),
    "CriarContaAutonomoScreen",
  ],
  [
    "criar-conta-pessoal-screen",
    () => require("@/features/auth/screens/criar-conta-pessoal-screen"),
    "CriarContaPessoalScreen",
  ],
  [
    "criar-conta-screen",
    () => require("@/features/auth/screens/criar-conta-screen"),
    "CriarContaScreen",
  ],
  [
    "criar-empresa-webview-screen",
    () => require("@/features/auth/screens/criar-empresa-webview-screen"),
    "CriarEmpresaWebViewScreen",
  ],
  ["entrada-screen", () => require("@/features/auth/screens/entrada-screen"), "EntradaScreen"],
  [
    "esqueci-senha-screen",
    () => require("@/features/auth/screens/esqueci-senha-screen"),
    "EsqueciSenhaScreen",
  ],
  ["login-screen", () => require("@/features/auth/screens/login-screen"), "LoginScreen"],
  [
    "painel-web-only-screen",
    () => require("@/features/auth/screens/painel-web-only-screen"),
    "PainelWebOnlyScreen",
  ],
  ["pin-lock-screen", () => require("@/features/auth/screens/pin-lock-screen"), "PinLockScreen"],
  ["alunos-screen", () => require("@/features/driver/screens/alunos-screen"), "DriverAlunosScreen"],
  [
    "historico-screen",
    () => require("@/features/driver/screens/historico-screen"),
    "DriverHistoricoScreen",
  ],
  [
    "identity-verification-blocked-screen",
    () => require("@/features/driver/screens/identity-verification-blocked-screen"),
    "IdentityVerificationBlockedScreen",
  ],
  [
    "identity-verification-screen",
    () => require("@/features/driver/screens/identity-verification-screen"),
    "DriverIdentityVerificationScreen",
  ],
  ["inicio-screen", () => require("@/features/driver/screens/inicio-screen"), "DriverInicioScreen"],
  ["perfil-screen", () => require("@/features/driver/screens/perfil-screen"), "DriverPerfilScreen"],
  [
    "empresa-alunos-pre-cadastro-screen",
    () => require("@/features/empresa/screens/empresa-alunos-pre-cadastro-screen"),
    "EmpresaAlunosPreCadastroScreen",
  ],
  [
    "empresa-assinatura-screen",
    () => require("@/features/empresa/screens/empresa-assinatura-screen"),
    "EmpresaAssinaturaScreen",
  ],
  [
    "empresa-billing-blocked-screen",
    () => require("@/features/empresa/screens/empresa-billing-blocked-screen"),
    "EmpresaBillingBlockedScreen",
  ],
  [
    "empresa-equipe-screen",
    () => require("@/features/empresa/screens/empresa-equipe-screen"),
    "EmpresaEquipeScreen",
  ],
  [
    "empresa-frota-lista-screen",
    () => require("@/features/empresa/screens/empresa-frota-lista-screen"),
    "EmpresaFrotaListaScreen",
  ],
  [
    "empresa-frota-mapa-screen",
    () => require("@/features/empresa/screens/empresa-frota-mapa-screen"),
    "EmpresaFrotaMapaScreen",
  ],
  [
    "empresa-home-screen",
    () => require("@/features/empresa/screens/empresa-home-screen"),
    "EmpresaHomeScreen",
  ],
  [
    "empresa-marketplace-contrato-detalhe-screen",
    () => require("@/features/empresa/screens/empresa-marketplace-contrato-detalhe-screen"),
    "EmpresaMarketplaceContratoDetalheScreen",
  ],
  [
    "empresa-marketplace-contratos-screen",
    () => require("@/features/empresa/screens/empresa-marketplace-contratos-screen"),
    "EmpresaMarketplaceContratosScreen",
  ],
  [
    "empresa-marketplace-solicitacao-detalhe-screen",
    () => require("@/features/empresa/screens/empresa-marketplace-solicitacao-detalhe-screen"),
    "EmpresaMarketplaceSolicitacaoDetalheScreen",
  ],
  [
    "empresa-marketplace-solicitacoes-screen",
    () => require("@/features/empresa/screens/empresa-marketplace-solicitacoes-screen"),
    "EmpresaMarketplaceSolicitacoesScreen",
  ],
  [
    "empresa-perfil-screen",
    () => require("@/features/empresa/screens/empresa-perfil-screen"),
    "EmpresaPerfilScreen",
  ],
  [
    "empresa-rota-detalhe-screen",
    () => require("@/features/empresa/screens/empresa-rota-detalhe-screen"),
    "EmpresaRotaDetalheScreen",
  ],
  [
    "empresa-rota-nova-screen",
    () => require("@/features/empresa/screens/empresa-rota-nova-screen"),
    "EmpresaRotaNovaScreen",
  ],
  [
    "empresa-rotas-lista-screen",
    () => require("@/features/empresa/screens/empresa-rotas-lista-screen"),
    "EmpresaRotasListaScreen",
  ],
  [
    "empresa-veiculo-auditoria-screen",
    () => require("@/features/empresa/screens/empresa-veiculo-auditoria-screen"),
    "EmpresaVeiculoAuditoriaScreen",
  ],
  [
    "empresa-veiculo-checklist-screen",
    () => require("@/features/empresa/screens/empresa-veiculo-checklist-screen"),
    "EmpresaVeiculoChecklistScreen",
  ],
  [
    "empresa-veiculo-detalhe-screen",
    () => require("@/features/empresa/screens/empresa-veiculo-detalhe-screen"),
    "EmpresaVeiculoDetalheScreen",
  ],
  [
    "empresa-veiculo-documentos-screen",
    () => require("@/features/empresa/screens/empresa-veiculo-documentos-screen"),
    "EmpresaVeiculoDocumentosScreen",
  ],
  [
    "empresa-veiculo-lembretes-screen",
    () => require("@/features/empresa/screens/empresa-veiculo-lembretes-screen"),
    "EmpresaVeiculoLembretesScreen",
  ],
  [
    "empresa-veiculo-manutencoes-screen",
    () => require("@/features/empresa/screens/empresa-veiculo-manutencoes-screen"),
    "EmpresaVeiculoManutencoesScreen",
  ],
  [
    "empresa-veiculo-novo-screen",
    () => require("@/features/empresa/screens/empresa-veiculo-novo-screen"),
    "EmpresaVeiculoNovoScreen",
  ],
  [
    "empresa-veiculo-ocorrencias-screen",
    () => require("@/features/empresa/screens/empresa-veiculo-ocorrencias-screen"),
    "EmpresaVeiculoOcorrenciasScreen",
  ],
  [
    "empresa-veiculo-vinculos-screen",
    () => require("@/features/empresa/screens/empresa-veiculo-vinculos-screen"),
    "EmpresaVeiculoVinculosScreen",
  ],
  [
    "onboarding-screen",
    () => require("@/features/intro/screens/onboarding-screen"),
    "OnboardingScreen",
  ],
  [
    "role-selection-screen",
    () => require("@/features/intro/screens/role-selection-screen"),
    "RoleSelectionScreen",
  ],
  [
    "legal-webview-screen",
    () => require("@/features/legal/screens/legal-webview-screen"),
    "LegalWebViewScreen",
  ],
  [
    "endereco-manual-screen",
    () => require("@/features/marketplace/screens/endereco-manual-screen"),
    "EnderecoManualScreen",
  ],
  [
    "informar-codigo-screen",
    () => require("@/features/marketplace/screens/informar-codigo-screen"),
    "InformarCodigoScreen",
  ],
  [
    "inicio-screen",
    () => require("@/features/marketplace/screens/inicio-screen"),
    "ParentInicioScreen",
  ],
  ["mapa-screen", () => require("@/features/marketplace/screens/mapa-screen"), "MapaScreen"],
  [
    "marketplace-coming-soon-screen",
    () => require("@/features/marketplace/screens/marketplace-coming-soon-screen"),
    "MarketplaceComingSoonScreen",
  ],
  [
    "solicitar-transporte-screen",
    () => require("@/features/marketplace/screens/solicitar-transporte-screen"),
    "SolicitarTransporteScreen",
  ],
  [
    "transportador-detalhes-screen",
    () => require("@/features/marketplace/screens/transportador-detalhes-screen"),
    "TransportadorDetalhesScreen",
  ],
  [
    "transporte-inicio-screen",
    () => require("@/features/marketplace/screens/transporte-inicio-screen"),
    "TransporteInicioScreen",
  ],
  [
    "central-screen",
    () => require("@/features/notifications/screens/central-screen"),
    "CentralScreen",
  ],
  [
    "detalhes-screen",
    () => require("@/features/notifications/screens/detalhes-screen"),
    "DetalhesScreen",
  ],
  [
    "historico-screen",
    () => require("@/features/notifications/screens/historico-screen"),
    "HistoricoScreen",
  ],
  [
    "preferencias-screen",
    () => require("@/features/notifications/screens/preferencias-screen"),
    "PreferenciasScreen",
  ],
  [
    "converter-em-transportadora-screen",
    () => require("@/features/onboarding-autonomo/screens/converter-em-transportadora-screen"),
    "ConverterEmTransportadoraScreen",
  ],
  [
    "informar-codigo-vinculo-screen",
    () => require("@/features/onboarding-autonomo/screens/informar-codigo-vinculo-screen"),
    "InformarCodigoVinculoScreen",
  ],
  [
    "vinculo-pendente-status-screen",
    () => require("@/features/onboarding-autonomo/screens/vinculo-pendente-status-screen"),
    "VinculoPendenteStatusScreen",
  ],
  [
    "pagamentos-screen",
    () => require("@/features/parent/screens/pagamentos-screen"),
    "PagamentosScreen",
  ],
  [
    "pagamentos-container",
    () => require("@/features/parent/screens/pagamentos-container"),
    "PagamentosContainer",
  ],
  ["perfil-screen", () => require("@/features/parent/screens/perfil-screen"), "ParentPerfilScreen"],
  [
    "detalhes-screen",
    () => require("@/features/schools/screens/detalhes-screen"),
    "EscolaDetalhesScreen",
  ],
  ["escolas-screen", () => require("@/features/schools/screens/escolas-screen"), "EscolasScreen"],
  [
    "horarios-screen",
    () => require("@/features/schools/screens/horarios-screen"),
    "EscolaHorariosScreen",
  ],
  ["mapa-screen", () => require("@/features/schools/screens/mapa-screen"), "EscolaMapaScreen"],
  [
    "rotas-vinculadas-screen",
    () => require("@/features/schools/screens/rotas-vinculadas-screen"),
    "EscolaRotasVinculadasScreen",
  ],
  [
    "aluno-detalhe-screen",
    () => require("@/features/students/screens/aluno-detalhe-screen"),
    "AlunoDetalheScreen",
  ],
  [
    "aluno-endereco-do-dia-screen",
    () => require("@/features/students/screens/aluno-endereco-do-dia-screen"),
    "AlunoEnderecoDoDiaScreen",
  ],
  [
    "aluno-novo-screen",
    () => require("@/features/students/screens/aluno-novo-screen"),
    "AlunoNovoScreen",
  ],
  [
    "alunos-lista-screen",
    () => require("@/features/students/screens/alunos-lista-screen"),
    "AlunosListaScreen",
  ],
  [
    "chamado-detalhes-screen",
    () => require("@/features/support/screens/chamado-detalhes-screen"),
    "ChamadoDetalhesScreen",
  ],
  [
    "chamados-screen",
    () => require("@/features/support/screens/chamados-screen"),
    "ChamadosScreen",
  ],
  [
    "novo-chamado-screen",
    () => require("@/features/support/screens/novo-chamado-screen"),
    "NovoChamadoScreen",
  ],
  [
    "vehicle-screen",
    () => require("@/features/vehicles/components/vehicle-screen"),
    "VehicleScreen",
  ],
  [
    "checklist-screen",
    () => require("@/features/vehicles/screens/checklist-screen"),
    "ChecklistScreen",
  ],
  [
    "documentos-screen",
    () => require("@/features/vehicles/screens/documentos-screen"),
    "DocumentosScreen",
  ],
  ["fotos-screen", () => require("@/features/vehicles/screens/fotos-screen"), "FotosScreen"],
  [
    "historico-screen",
    () => require("@/features/vehicles/screens/historico-screen"),
    "HistoricoScreen",
  ],
  [
    "meu-veiculo-screen",
    () => require("@/features/vehicles/screens/meu-veiculo-screen"),
    "MeuVeiculoScreen",
  ],
  [
    "ocorrencias-screen",
    () => require("@/features/vehicles/screens/ocorrencias-screen"),
    "OcorrenciasScreen",
  ],
  ["carteira-screen", () => require("@/features/wallet/screens/carteira-screen"), "CarteiraScreen"],
  [
    "wallet-coming-soon-screen",
    () => require("@/features/wallet/screens/wallet-coming-soon-screen"),
    "WalletComingSoonScreen",
  ],
];

function Moldura({ children }: { children: React.ReactNode }): JSX.Element {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <QueryClientProvider client={cliente}>
        <ThemeProvider>
          {/* `AppModeProvider` entra aqui porque o `RootNavigator` o
              monta de verdade em volta de toda a árvore: os Perfis de
              Empresa e de Motorista leem o modo por contexto. */}
          <AppModeProvider
            value={{
              mode: "completo",
              canToggle: true,
              setMode: jest.fn(),
              isModeResolved: true,
            }}
          >
            <NavigationContainer>{children}</NavigationContainer>
          </AppModeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

describe("toda tela monta", () => {
  it.each(TELAS)("%s", (_nome, importar, exportado) => {
    const modulo = importar();
    const Tela = modulo[exportado] as React.ComponentType<Record<string, unknown>>;
    expect(Tela).toBeDefined();

    /* `navigation`/`route` falsos: o alvo é o primeiro render da tela,
       não a navegação. Qualquer tela que precise de um parâmetro real
       recebe `undefined` e tem que aguentar — é o mesmo que acontece
       num deep link malformado. */
    const navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
      getParent: jest.fn(() => ({ navigate: jest.fn() })),
    };

    expect(() =>
      render(
        <Moldura>
          <Tela navigation={navigation} route={{ params: {}, key: "k", name: "n" }} />
        </Moldura>,
      ),
    ).not.toThrow();
  });
});
