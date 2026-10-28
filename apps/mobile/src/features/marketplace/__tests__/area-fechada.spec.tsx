import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { MapaScreen } from "../screens/mapa-screen";

import { ThemeProvider } from "@/providers/theme-provider";

/**
 * A aba "Mapa" do Responsável com o Marketplace fechado.
 *
 * ## O que este teste protege, e não é a flag
 *
 * É o mapa de ACOMPANHAMENTO. Em 01/09/2026 esta aba inteira virou um
 * "em breve", e dez dias depois o sócio desfez isso com uma frase:
 * "TODOS DEVERÃO TER MAPA". Quem tem contrato ativo usa esta aba para
 * ver onde está o ônibus do filho — fechar a busca de transportador
 * não pode levar isso junto, e é exatamente o erro fácil de cometer
 * quando a flag entra no lugar errado do arquivo.
 *
 * Daí a ordem no componente ser a regra: o `return` do contrato ativo
 * vem ANTES do `return` da área fechada. Estes dois testes travam essa
 * ordem.
 */

/* Jest exige o prefixo `mock` em variavel usada dentro de `jest.mock`. */
let mockMarketplaceAberto = false;
let mockTemContratoAtivo = false;

jest.mock("@/lib/funcionalidades", () => ({
  FUNCIONALIDADES: {
    get marketplace() {
      return mockMarketplaceAberto;
    },
    rottaPay: false,
  },
}));

const mockPedirLocalizacao = jest.fn();

jest.mock("../hooks/use-location", () => ({
  useLocation: () => ({
    status: "granted",
    coords: { latitude: -22.9, longitude: -42.8 },
    requestLocation: mockPedirLocalizacao,
    setManualCoords: jest.fn(),
  }),
}));

jest.mock("../hooks/use-transport-state", () => ({
  useResponsavelTransportState: () => ({
    state: "sem_transporte",
    isLoading: false,
    contratoAtivo: mockTemContratoAtivo ? { id: "contrato-1", routeId: "rota-1" } : null,
  }),
}));

jest.mock("../hooks/use-school-picker", () => ({
  useSchoolsSearch: () => ({ data: { items: [] } }),
}));

jest.mock("../hooks/use-transporters", () => ({
  useTransportersSearch: () => ({
    data: { items: [], total: 0 },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

/** O acompanhamento é o outro arquivo; aqui só precisa ser identificável. */
jest.mock("../screens/transporte-inicio-screen", () => ({
  TripTrackingOverlay: () => null,
  TRIP_TRACKING_TEST_ID: "acompanhamento",
}));

jest.mock("@rotta/maps/native", () => ({ RottaMap: () => null, __esModule: true }));

const navigation = {
  navigate: jest.fn(),
  getParent: () => ({ navigate: jest.fn() }),
} as never;

function montar(): void {
  render(
    // `initialMetrics` em vez de medir a tela: sem isto o
    // `useSafeAreaInsets` do componente nao tem valor nenhum no Jest.
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <ThemeProvider>
        <MapaScreen navigation={navigation} route={{ key: "k", name: "MapaHome" } as never} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe("Marketplace fechado", () => {
  beforeEach(() => {
    mockMarketplaceAberto = false;
    mockTemContratoAtivo = false;
    mockPedirLocalizacao.mockClear();
  });

  it("quem ainda não contratou vê o aviso, com a instrução do código de convite", () => {
    montar();

    expect(screen.getByText(/código de convite/i)).toBeTruthy();
  });

  it("não pede a localização de ninguém", () => {
    // A permissão só serve para achar transportador perto; com a busca
    // fechada, pedi-la é pedir acesso ao celular para nada.
    montar();

    expect(mockPedirLocalizacao).not.toHaveBeenCalled();
  });

  it("quem TEM contrato ativo continua no acompanhamento, não no aviso", () => {
    // "TODOS DEVERÃO TER MAPA" (sócio, 11/09/2026). Se este teste
    // falhar, a família perdeu de ver o ônibus do filho.
    mockTemContratoAtivo = true;

    montar();

    expect(screen.queryByText(/código de convite/i)).toBeNull();
  });
});

describe("Marketplace aberto", () => {
  beforeEach(() => {
    mockMarketplaceAberto = true;
    mockTemContratoAtivo = false;
    mockPedirLocalizacao.mockClear();
  });

  it("a busca de transportador volta, sem nenhum aviso de área fechada", () => {
    montar();

    expect(screen.queryByText(/código de convite/i)).toBeNull();
  });
});
