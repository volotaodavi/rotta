import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DashboardLayout from "./layout";

/**
 * BUG corrigido (pedido do usuário): alternar pra "Modo Ação" (ou ser
 * Motorista/Monitor funcionário) só trocava a NAVEGAÇÃO exibida —
 * nenhuma rota respeitava esse mesmo alternador, então quem já estava
 * numa página de gestão (ex. `/empresa`) continuava vendo todas as
 * funcionalidades mesmo com o alternador marcado como "Modo Ação". Este
 * teste prova o guard de rota adicionado em `layout.tsx`: fora das 4
 * rotas do `DriverBottomNav`, redireciona pra `/minha-rota`.
 *
 * Todas as dependências pesadas (auth, hooks de API, subcomponentes com
 * contexto próprio) são mockadas — o alvo deste teste é só a lógica do
 * guard, não uma integração de ponta a ponta.
 */

const replaceMock = vi.fn();
let mockPathname = "/minha-rota";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));

vi.mock("@rotta/auth/web", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: {
      id: "user-1",
      nome: "Zé Motorista",
      role: "empresa",
      companyType: "MEI",
      companyName: "Zé Transportes MEI",
    },
    logout: vi.fn(),
  }),
}));

vi.mock("@/features/driver/hooks/use-app-mode", () => ({
  useAppMode: () => ({ mode: "acao", canToggle: true, setMode: vi.fn() }),
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

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => null,
}));

vi.mock("@/components/driver-bottom-nav", () => ({
  DriverBottomNav: () => null,
}));

describe("DashboardLayout — guard de rota do Modo Ação", () => {
  afterEach(() => {
    cleanup();
    replaceMock.mockClear();
    mockPathname = "/minha-rota";
  });

  it("redireciona pra /minha-rota quando em Modo Ação e a rota atual não é uma das 4 permitidas", async () => {
    mockPathname = "/empresa";

    render(<DashboardLayout>conteúdo</DashboardLayout>);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/minha-rota");
    });
  });

  it("não redireciona quando já está numa das 4 rotas permitidas (Minha Rota)", async () => {
    mockPathname = "/minha-rota";

    render(<DashboardLayout>conteúdo</DashboardLayout>);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("não redireciona quando já está em Atividades/Veículo/Perfil", async () => {
    for (const rota of ["/atividades", "/veiculo", "/perfil"]) {
      mockPathname = rota;
      const { unmount } = render(<DashboardLayout>conteúdo</DashboardLayout>);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(replaceMock).not.toHaveBeenCalled();
      unmount();
    }
  });
});
