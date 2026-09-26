import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DashboardLayout from "./layout";

/**
 * O menu esconde o que a habilitação da empresa não inclui
 * (25/09/2026: "empresa licitada deverá ter uma tag, para ter as
 * funcionalidades que somente a empresa licitada deve ter").
 *
 * Sem este filtro o gestor de uma transportadora só licitada clicaria
 * em "Marketplace", veria a tela montar e só descobriria a recusa ao
 * tentar usar — desconfiando do sistema em vez da habilitação.
 *
 * O teste que mais importa aqui é o TERCEIRO: enquanto a empresa não
 * carregou, o item continua visível. Um item que pisca aparecendo e
 * desaparecendo a cada navegação é pior que um item que o backend
 * recusa, e errar para o lado de mostrar é seguro porque quem barra de
 * verdade é o backend.
 */

let mockTags: string[] | null = ["PRIVADA"];

vi.mock("next/navigation", () => ({
  usePathname: () => "/empresa",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@rotta/auth/web", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: {
      id: "user-1",
      nome: "Gestora",
      role: "empresa",
      companyId: "company-1",
      companyType: "LTDA",
      companyName: "Viação Teste",
    },
    logout: vi.fn(),
  }),
}));

// Modo gestão (nunca "acao"): é o único estado em que o menu de texto
// do Painel aparece — em Modo Ação a navegação vira os 4 ícones.
vi.mock("@/features/driver/hooks/use-app-mode", () => ({
  useAppMode: () => ({
    mode: "gestao",
    canToggle: false,
    setMode: vi.fn(),
    isModeResolved: true,
  }),
}));

vi.mock("@/features/company/hooks/use-company", () => ({
  useMyCompanyTags: () => ({
    tags: mockTags ?? [],
    isLoading: mockTags === null,
    temTag: (tag: string) => (mockTags ? mockTags.includes(tag) : true),
  }),
}));

vi.mock("@/features/driver/hooks/use-my-active-trip", () => ({
  useMyActiveTrip: () => null,
}));

vi.mock("@/features/identity-verification/hooks/use-identity-verification", () => ({
  useMyIdentityVerification: () => ({ data: undefined, isLoading: false }),
}));

vi.mock("@/features/identity-verification/components/identity-verification-block-screen", () => ({
  IdentityVerificationBlockScreen: () => null,
}));

// `@rotta/ui/web` e `@rotta/icons` são stubados: sem isso o React do
// workspace e o pré-empacotado das libs se cruzam no jsdom ("A React
// Element from an older version of React was rendered"). O alvo do
// teste é o FILTRO do menu, não a renderização dos átomos de UI.
vi.mock("@rotta/ui/web", () => ({
  Button: ({ children }: { children?: unknown }) => children,
  Spinner: () => null,
  Typography: ({ children }: { children?: unknown }) => children,
  openTrialLockModalFromOutsideReact: vi.fn(),
}));

vi.mock("@rotta/icons", () => ({
  Lock: () => null,
  Menu: () => null,
  X: () => null,
}));

vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => null }));
vi.mock("@/components/driver-bottom-nav", () => ({ DriverBottomNav: () => null }));
vi.mock("@/components/responsavel-bottom-nav", () => ({ ResponsavelBottomNav: () => null }));
vi.mock("@/components/notification-bell", () => ({ NotificationBell: () => null }));
vi.mock("@/components/plan-notices-banner", () => ({ PlanNoticesBanner: () => null }));
vi.mock("@/components/legal/legal-footer", () => ({ LegalFooter: () => null }));

describe("DashboardLayout: o menu respeita as habilitações da empresa", () => {
  afterEach(() => {
    cleanup();
    mockTags = ["PRIVADA"];
  });

  it("empresa PARTICULAR vê o Marketplace", () => {
    mockTags = ["PRIVADA"];

    render(<DashboardLayout>conteúdo</DashboardLayout>);

    expect(screen.getAllByText("Marketplace").length).toBeGreaterThan(0);
  });

  it("empresa só LICITADA NÃO vê o Marketplace", () => {
    // Quem define quem ela atende é o contrato com o município — a tela
    // não tem o que mostrar, e o backend recusa a solicitação.
    mockTags = ["LICITADA"];

    render(<DashboardLayout>conteúdo</DashboardLayout>);

    expect(screen.queryByText("Marketplace")).toBeNull();
  });

  it("enquanto a empresa não carregou, o Marketplace CONTINUA visível", () => {
    // Errar para o lado de mostrar: um item que pisca faria o gestor
    // achar que o sistema está quebrado.
    mockTags = null;

    render(<DashboardLayout>conteúdo</DashboardLayout>);

    expect(screen.getAllByText("Marketplace").length).toBeGreaterThan(0);
  });

  it("empresa com AS DUAS tags vê o Marketplace — é o caso normal", () => {
    mockTags = ["LICITADA", "PRIVADA"];

    render(<DashboardLayout>conteúdo</DashboardLayout>);

    expect(screen.getAllByText("Marketplace").length).toBeGreaterThan(0);
  });

  it("o resto da operação aparece nas duas — rotas e frota não têm vertente", () => {
    // Guarda contra o filtro vazar. Rotas, Veículos, Despachante e
    // Equipe são iguais nas duas verticais, e se sumirem para a empresa
    // licitada ela perde a operação inteira.
    mockTags = ["LICITADA"];

    render(<DashboardLayout>conteúdo</DashboardLayout>);

    for (const item of ["Rotas", "Veículos", "Despachante", "Equipe", "Escolas"]) {
      expect(screen.getAllByText(item).length).toBeGreaterThan(0);
    }
  });
});
