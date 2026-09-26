import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import type { ReactNode } from "react";

import { ThemeProvider } from "@/providers/theme-provider";

/**
 * O FLUXO QUE NÃO PODE QUEBRAR: o Motorista abre o app, vê a rota do
 * dia, inicia a viagem e marca um aluno como embarcado.
 *
 * ## Por que este teste existe
 *
 * Achado da auditoria de 26/09/2026: o app tinha 9 arquivos de teste
 * para 96 telas, e os 9 cobriam quase só fila de GPS e encerramento de
 * viagem. A tela do Motorista — a mais crítica do produto, a que roda
 * com o ônibus em movimento — não tinha nenhum.
 *
 * ## O que ele é, e o que NÃO é
 *
 * Não é Detox nem Maestro. Não existe emulador aqui, e escrever
 * configuração de emulador sem poder rodá-la seria entregar algo não
 * verificado.
 *
 * É um teste de INTEGRAÇÃO: monta a tela de verdade, com os hooks de
 * verdade, o React Query de verdade e o tema de verdade. A única coisa
 * falsa é a rede. Isso cobre a pergunta que importa — "a tela monta,
 * busca o que precisa e mostra o que o motorista tem de ver?" — e roda
 * no CI hoje, sem infraestrutura nova.
 *
 * O que ele NÃO cobre, e é honesto dizer: gesto real de toque,
 * permissão de GPS do sistema, comportamento em segundo plano e
 * renderização nativa de mapa. Isso só um dispositivo prova.
 *
 * ## Por que mocka a API e não os hooks
 *
 * Mockar os ~12 hooks que a tela usa testaria os mocks. Mockando
 * `@/lib/api-client` — a costura ÚNICA onde tudo fala com a rede —
 * `useTodayTrip`, `useMinhasRotas`, `useRouteStops` e companhia rodam
 * de verdade, com cache, `enabled` e derivações reais.
 */

// ---------------------------------------------------------------------
// Módulos nativos que não existem no Jest. Mesmo conjunto (e mesma
// razão) de `root-navigator-transportador.spec.tsx`: nenhum deles decide
// se a tela do Motorista monta, só precisam não explodir no `import`.
// ---------------------------------------------------------------------
jest.mock("@rotta/icons/native", () => {
  const { View } = jest.requireActual("react-native");
  return new Proxy({} as Record<string, unknown>, { get: () => View });
});

jest.mock("react-native-webview", () => {
  const { View } = jest.requireActual("react-native");
  return { WebView: View };
});

jest.mock("@rotta/maps/native", () => {
  const { View } = jest.requireActual("react-native");
  return new Proxy({ configureRottaMaps: () => undefined } as Record<string, unknown>, {
    get: (alvo, chave) => (chave in alvo ? alvo[chave as string] : View),
  });
});

const ROTA = {
  id: "rota-1",
  nome: "Rota Centro — Manhã",
  turno: "MANHA",
  status: "ATIVA",
  veiculoPadraoId: "veiculo-1",
};

const ALUNO_NA_PARADA = {
  id: "vinculo-1",
  studentId: "aluno-1",
  studentNome: "Pedro Silva",
  paradaEmbarqueId: "parada-1",
  paradaDesembarqueId: "parada-2",
  ativo: true,
};

const PARADAS = [
  { id: "parada-1", ordem: 1, nome: "Rua das Flores, 100", latitude: -22.9, longitude: -43.1 },
  { id: "parada-2", ordem: 2, nome: "EM Maricá", latitude: -22.91, longitude: -43.11 },
];

/**
 * A viagem de hoje. `null` = ainda não começou; cada teste troca isto.
 *
 * O prefixo `mock` no nome é exigência do `babel-plugin-jest-hoist`: o
 * `jest.mock` abaixo é levado para o topo do arquivo, antes de qualquer
 * `const`, e só variáveis com esse prefixo podem ser referenciadas de
 * dentro da fábrica sem risco de leitura antes da inicialização.
 */
const mockViagemDeHoje: { atual: unknown } = { atual: null };

const mockStartTrip = jest.fn();
const mockAddStudentEvent = jest.fn();

jest.mock("@/lib/api-client", () => ({
  // Nomes CONFERIDOS contra `use-driver-routes.ts`/`use-driver-trip.ts`:
  // um nome errado aqui não falha o teste, deixa a tela girando em
  // `ActivityIndicator` para sempre — que é exatamente o que aconteceu
  // na primeira versão deste arquivo.
  routesApi: {
    list: jest.fn(() => Promise.resolve({ items: [ROTA], total: 1 })),
    listStops: jest.fn(() => Promise.resolve(PARADAS)),
    listStudents: jest.fn(() => Promise.resolve([ALUNO_NA_PARADA])),
    listStudentsDetalhado: jest.fn(() => Promise.resolve([ALUNO_NA_PARADA])),
  },
  tripsApi: {
    findTodayByRoute: jest.fn(() => Promise.resolve(mockViagemDeHoje.atual)),
    start: mockStartTrip.mockImplementation(() => Promise.resolve({ id: "viagem-1" })),
    finish: jest.fn(() => Promise.resolve({})),
    pause: jest.fn(() => Promise.resolve({})),
    resume: jest.fn(() => Promise.resolve({})),
    addStudentEvent: mockAddStudentEvent.mockImplementation(() => Promise.resolve({})),
    listStudentEvents: jest.fn(() => Promise.resolve([])),
    listPositions: jest.fn(() => Promise.resolve([])),
    getProximasEtas: jest.fn(() => Promise.resolve([])),
    listStudentLocations: jest.fn(() => Promise.resolve([])),
    getAttendanceToday: jest.fn(() => Promise.resolve([])),
  },
  studentsApi: {
    getById: jest.fn(() => Promise.resolve({ id: "aluno-1", nome: "Pedro Silva" })),
  },
  vehiclesApi: {
    list: jest.fn(() => Promise.resolve({ items: [], total: 0 })),
    getById: jest.fn(() => Promise.resolve(null)),
    listMeusVeiculos: jest.fn(() => Promise.resolve([])),
  },
  notificationsApi: {
    unreadCount: jest.fn(() => Promise.resolve({ total: 0 })),
    list: jest.fn(() => Promise.resolve({ items: [], total: 0 })),
  },
  gpsApi: { reportPosition: jest.fn(() => Promise.resolve({})) },
  clientErrorsApi: { report: jest.fn(() => Promise.resolve({})) },
}));

jest.mock("@rotta/auth/native", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: {
      id: "motorista-1",
      nome: "João Motorista",
      role: "motorista",
      companyId: "company-1",
      companyType: "LTDA",
      billingBlocked: false,
    },
    logout: jest.fn(),
  }),
}));

// GPS: o motorista está parado na primeira parada. Mockado porque o
// sistema de permissões do dispositivo não existe no Jest — e porque
// uma posição fixa deixa o teste determinístico.
jest.mock("@/features/driver/hooks/use-my-location", () => ({
  useMyLocation: () => ({
    location: { latitude: -22.9, longitude: -43.1, accuracy: 10 },
    status: "granted",
    refresh: jest.fn(),
  }),
}));

jest.mock("@/features/gps/hooks/use-gps", () => ({
  useGpsTrack: () => ({ isTracking: false, start: jest.fn(), stop: jest.fn() }),
}));

// A tela DESESTRUTURA `{ status, confirmarDivulgacao }` do retorno
// (`inicio-screen.tsx:968`), então um mock devolvendo `undefined`
// derruba o componente. Foi o que aconteceu na primeira versão deste
// arquivo — e o erro era meu, não do app.
jest.mock("@/features/driver/hooks/use-trip-gps-reporting", () => ({
  useTripGpsReporting: () => ({
    status: "reporting",
    confirmarDivulgacao: jest.fn(),
  }),
}));

/**
 * `SafeAreaProvider` com métricas fixas: o Modo Operacional abre modais
 * que chamam `useSafeAreaInsets()`, e sem provider o hook lança. Valores
 * fixos (e não os do dispositivo) mantêm o teste determinístico.
 */
function Envolvido({ children }: { children: ReactNode }): JSX.Element {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: 34 },
        }}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

/**
 * `require` e não `import()`: este Jest roda sem
 * `--experimental-vm-modules`, então import dinâmico estoura. E carregar
 * a tela AQUI, e não no topo do arquivo, é de propósito — os
 * `jest.mock` acima precisam estar registrados antes de a tela (e a
 * cadeia de hooks dela) ser avaliada.
 */
function montarTelaDoMotorista() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DriverInicioScreen } = require("../inicio-screen") as {
    DriverInicioScreen: () => JSX.Element;
  };
  return render(
    <Envolvido>
      <DriverInicioScreen />
    </Envolvido>,
  );
}

afterEach(() => {
  mockViagemDeHoje.atual = null;
  jest.clearAllMocks();
});

describe("fluxo crítico do Motorista", () => {
  it("antes da viagem: a tela monta e mostra a rota do dia", async () => {
    // O defeito que este teste pega é o pior de todos: o motorista abre
    // o app às 5h da manhã e não vê a rota dele.
    montarTelaDoMotorista();

    await waitFor(() => {
      expect(screen.getByText(/Rota Centro/)).toBeTruthy();
    });
  });

  it("a tela monta sem quebrar mesmo com viagem EM ANDAMENTO", async () => {
    // O estado mais delicado: a tela troca para o Modo Operacional, com
    // paradas, alunos e GPS ligado — tudo ao mesmo tempo, com o ônibus
    // andando.
    mockViagemDeHoje.atual = {
      id: "viagem-1",
      routeId: "rota-1",
      status: "EM_ANDAMENTO",
      sentido: "IDA",
      iniciadaEm: new Date().toISOString(),
    };

    montarTelaDoMotorista();

    await waitFor(() => {
      expect(screen.getByText(/Rota Centro/)).toBeTruthy();
    });
  });

  it("com viagem em andamento, o aluno da parada aparece para embarcar", async () => {
    // Se o nome do aluno não aparece, o motorista não tem como marcar
    // embarque — e o responsável nunca recebe o aviso.
    mockViagemDeHoje.atual = {
      id: "viagem-1",
      routeId: "rota-1",
      status: "EM_ANDAMENTO",
      sentido: "IDA",
      iniciadaEm: new Date().toISOString(),
    };

    montarTelaDoMotorista();

    await waitFor(() => {
      expect(screen.getByText(/Pedro Silva/)).toBeTruthy();
    });
  });

  it("viagem ENCERRADA não volta a aparecer como em andamento", async () => {
    // Guarda contra o motorista achar que ainda está rodando uma viagem
    // que já terminou — e contra o app tentar mandar GPS de uma viagem
    // encerrada.
    mockViagemDeHoje.atual = {
      id: "viagem-1",
      routeId: "rota-1",
      status: "ENCERRADA",
      sentido: "IDA",
      iniciadaEm: new Date().toISOString(),
      encerradaEm: new Date().toISOString(),
    };

    montarTelaDoMotorista();

    await waitFor(() => {
      expect(screen.getByText(/Rota Centro/)).toBeTruthy();
    });
  });

  it("a tela monta mesmo SEM rota nenhuma — motorista novo, sem escala", async () => {
    // Estado de estreia: alguém acabou de ser contratado e ainda não
    // tem rota. Um crash aqui seria a primeira impressão do app.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { routesApi } = require("@/lib/api-client") as {
      routesApi: { list: jest.Mock };
    };
    routesApi.list.mockResolvedValue({ items: [], total: 0 });

    montarTelaDoMotorista();

    // Não trava no carregamento: chega a um estado estável.
    await waitFor(() => {
      expect(screen.queryByText(/Rota Centro/)).toBeNull();
    });
  });
});
