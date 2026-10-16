import { fireEvent, render, screen } from "@testing-library/react-native";

import type { AdminFinanceiroStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ThemeProvider } from "@/providers/theme-provider";

/**
 * O início do Financeiro do Admin no app.
 *
 * ## O que estes testes protegem
 *
 * Esta tela mostra o saldo da conta da Rotta inteira e dá acesso, na
 * mesma grade, a receber dinheiro e a mandar dinheiro para fora. Três
 * coisas aqui não são de layout:
 *
 * 1. **O saldo precisa poder ser escondido**, porque o Admin abre isto
 *    em mesa de café e em reunião com a tela virada para terceiro.
 * 2. **Saldo que a API não devolveu não pode virar número.** Sem
 *    `ASAAS_API_KEY`, um "R$ 0,00" faria o Admin achar que a conta
 *    zerou. A regra é de `empresa/dados/FORMULAS.md`: dado que falta
 *    aparece como falta.
 * 3. **Transferência é restrita ao papel Geral.** O backend
 *    (`AdminAreaGuard`) é quem barra de verdade; a tela não pode
 *    oferecer o caminho a quem vai levar 403 no fim dele.
 */

const mockUser: { papel: string | null } = { papel: "GERAL" };

jest.mock("@rotta/auth/native", () => ({
  useAuth: () => ({ user: { adminPapel: mockUser.papel } }),
}));

const mocks = {
  overview: {
    data: {
      asaas: { configured: true },
      totalRecebidoCentavos: 39_900,
      totalTaxaRetidaCentavos: 1_990,
      lucroLiquidoCentavos: 37_910,
      quantidadeCobrancasPagas: 1,
      quantidadeEmpresasAtivas: 1,
      planos: [{ nome: "Essencial", quantidadeEmpresas: 1 }],
      empresasAtivas: [
        {
          id: "c1",
          nomeFantasia: "Transportes Silva",
          ativaDesde: "2026-03-12T00:00:00.000Z",
          planoNome: "Essencial",
          asaasSubscriptionId: "sub_1",
        },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  },
  balance: { data: { saldoCentavos: 124_800 } as { saldoCentavos: number | null } | undefined },
};

jest.mock("../../hooks/use-admin-billing", () => ({
  useAdminBillingOverview: () => mocks.overview,
  useAdminBillingBalance: () => mocks.balance,
}));

// eslint-disable-next-line import/first -- os mocks precisam existir antes do import da tela.
import { AdminFinanceiroOverviewScreen } from "../admin-financeiro-overview-screen";

type Props = NativeStackScreenProps<AdminFinanceiroStackParamList, "Overview">;
const navigate = jest.fn();
const navigation = { navigate } as unknown as Props["navigation"];
const route = { key: "Overview", name: "Overview" } as unknown as Props["route"];

function montar() {
  return render(
    <ThemeProvider>
      <AdminFinanceiroOverviewScreen navigation={navigation} route={route} />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  mockUser.papel = "GERAL";
  mocks.balance.data = { saldoCentavos: 124_800 };
  navigate.mockClear();
});

describe("Financeiro do Admin, início", () => {
  it("o saldo da conta da Rotta pode ser escondido", () => {
    montar();

    expect(screen.getByText("R$ 1.248,00")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Esconder saldo"));

    expect(screen.queryByText("R$ 1.248,00")).toBeNull();
    expect(screen.getByLabelText("Saldo oculto")).toBeTruthy();
  });

  it("saldo que a API não devolveu não vira R$ 0,00", () => {
    mocks.balance.data = { saldoCentavos: null };
    montar();

    expect(screen.getByText("Não foi possível consultar o saldo agora.")).toBeTruthy();
    expect(screen.queryByText("R$ 0,00")).toBeNull();
  });

  it("transferência fica apagada, com o motivo, fora do papel Geral", () => {
    mockUser.papel = "FINANCEIRO";
    montar();

    const atalho = screen.getByLabelText("Transferir, restrito ao papel Geral");
    expect(atalho.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(atalho);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("no papel Geral, transferir abre a tela de transferência", () => {
    montar();

    fireEvent.press(screen.getByLabelText("Transferir"));

    expect(navigate).toHaveBeenCalledWith("Transferencia");
  });

  it("a empresa da lista abre o próprio histórico de pagamentos", () => {
    montar();

    fireEvent.press(screen.getByLabelText("Transportes Silva"));

    expect(navigate).toHaveBeenCalledWith("Empresa", {
      companyId: "c1",
      companyNome: "Transportes Silva",
    });
  });
});
