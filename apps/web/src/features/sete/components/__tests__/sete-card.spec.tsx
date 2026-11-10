import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SeteCard } from "../sete-card";

import type { SetePendencia } from "@rotta/shared-contracts";
import type { JSX, ReactNode } from "react";

/**
 * O cartão "SETE / FNDE" do painel da empresa (SETE-05).
 *
 * ## O que estes testes trancam
 *
 * Três coisas que erram CALADO, cada uma de um jeito:
 *
 * 1. **O recorte por habilitação.** Uma transportadora só privada não
 *    presta contas ao FNDE. Se o cartão aparecer para ela, ela clica,
 *    toma 403 e passa a desconfiar do sistema — e o 403 entra no
 *    monitoramento como se algo estivesse quebrado.
 *
 * 2. **O código IBGE preenchido sobrescrevendo o digitado.** O código
 *    sugerido chega depois da primeira renderização. Um `useEffect` sem
 *    trava reescreve o campo a cada `refetch` — inclusive em cima do
 *    código que a pessoa acabou de corrigir à mão, que é justamente o
 *    caso em que a sugestão estava errada.
 *
 * 3. **Pendência bloqueando a exportação.** O SETE aceita cadastro
 *    incompleto em vários campos, e a prefeitura às vezes pede o envio
 *    parcial. Um botão desabilitado "até resolver tudo" seria uma regra
 *    que a Rotta inventou e o SETE não tem.
 */

const municipio = vi.fn();
const pendencias = vi.fn();
const exportar = vi.fn();

vi.mock("@/lib/api-client", () => ({
  seteApi: {
    sugerirMunicipio: () => municipio(),
    listarPendencias: () => pendencias(),
    exportar: (params: unknown) => exportar(params),
  },
}));

let mockTags: string[] = ["LICITADA"];

vi.mock("@/features/company/hooks/use-company", () => ({
  useMyCompanyTags: () => ({
    tags: mockTags,
    isLoading: false,
    temTag: (tag: string) => mockTags.includes(tag),
  }),
}));

vi.mock("@rotta/auth/web", () => ({
  useAuth: () => ({ user: { id: "user-1", companyId: "company-1" } }),
}));

function Envolvido({ children }: { children: ReactNode }): JSX.Element {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function montar(): void {
  render(
    <Envolvido>
      <SeteCard />
    </Envolvido>,
  );
}

const PENDENCIA_DE_ESCOLA: SetePendencia = {
  tipo: "ESCOLA_SEM_INEP",
  descricao: 'A escola "Municipal Itaipuaçu" não tem código INEP.',
  caminhoDeCorrecao: "/escolas/escola-1",
};

beforeEach(() => {
  mockTags = ["LICITADA"];
  municipio.mockResolvedValue({ cidade: "Maricá", estado: "RJ", codigoIbge: "3302700" });
  pendencias.mockResolvedValue([]);
  exportar.mockResolvedValue(new Blob(["pacote"], { type: "application/zip" }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("recorte por habilitação", () => {
  it("empresa só PRIVADA não vê o cartão, e nenhuma chamada é feita", async () => {
    mockTags = ["PRIVADA"];

    montar();

    expect(screen.queryByText("SETE / FNDE")).not.toBeInTheDocument();
    // `enabled: false` nos dois hooks: nem a busca de município nem a de
    // pendências sai. Sem isso, todo painel privado colecionaria 403.
    await waitFor(() => {
      expect(municipio).not.toHaveBeenCalled();
      expect(pendencias).not.toHaveBeenCalled();
    });
  });

  it("empresa LICITADA vê o cartão", async () => {
    montar();

    expect(await screen.findByText("SETE / FNDE")).toBeInTheDocument();
  });

  it("enquanto a empresa não carregou, o cartão aparece — não pisca", async () => {
    // `temTag` devolvendo `true` sem dados é a decisão de
    // `useMyCompanyTags`, e este teste a amarra ao cartão: quem barra de
    // verdade é o backend.
    mockTags = ["LICITADA", "PRIVADA"];

    montar();

    expect(await screen.findByText("SETE / FNDE")).toBeInTheDocument();
  });
});

describe("código do município", () => {
  it("vem preenchido com a sugestão da área de atuação", async () => {
    montar();

    const campo = await screen.findByDisplayValue("3302700");
    expect(campo).toBeInTheDocument();
    expect(screen.getByText(/Maricá\/RJ/)).toBeInTheDocument();
  });

  it("o que a pessoa digita sobrevive a uma nova resposta do servidor", async () => {
    const usuario = userEvent.setup();
    montar();

    const campo = await screen.findByDisplayValue("3302700");
    await usuario.clear(campo);
    await usuario.type(campo, "3303302");

    // Uma segunda resposta chegando (refetch, foco na janela, retry) não
    // pode desfazer a correção manual.
    municipio.mockResolvedValue({ cidade: "Maricá", estado: "RJ", codigoIbge: "3302700" });
    await waitFor(() => {
      expect(screen.getByDisplayValue("3303302")).toBeInTheDocument();
    });
  });

  it("município sem código conhecido não inventa número e diz o que fazer", async () => {
    municipio.mockResolvedValue({ cidade: "Saquarema", estado: "RJ", codigoIbge: null });

    montar();

    expect(await screen.findByText(/não tem o código dessa cidade/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("3302700")).toHaveValue("");
  });

  it("código com menos de 7 dígitos não exporta", async () => {
    const usuario = userEvent.setup();
    municipio.mockResolvedValue({ cidade: null, estado: null, codigoIbge: null });

    montar();

    const campo = await screen.findByPlaceholderText("3302700");
    await usuario.type(campo, "33027");

    expect(screen.getByText("O código tem 7 números.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Baixar arquivo/ })).toBeDisabled();
  });

  it("recusa letra no campo, em vez de mandar ao servidor e esperar o 400", async () => {
    const usuario = userEvent.setup();
    municipio.mockResolvedValue({ cidade: null, estado: null, codigoIbge: null });

    montar();

    const campo = await screen.findByPlaceholderText("3302700");
    await usuario.type(campo, "33a027b00");

    expect(campo).toHaveValue("3302700");
  });
});

describe("pendências", () => {
  it("cada pendência leva para a tela do conserto", async () => {
    pendencias.mockResolvedValue([PENDENCIA_DE_ESCOLA]);

    montar();

    expect(await screen.findByText(/Municipal Itaipuaçu/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Corrigir" })).toHaveAttribute(
      "href",
      "/escolas/escola-1",
    );
  });

  it("pendência NÃO bloqueia a exportação", async () => {
    pendencias.mockResolvedValue([PENDENCIA_DE_ESCOLA, PENDENCIA_DE_ESCOLA]);

    montar();

    await screen.findByText("2 pendências");
    expect(screen.getByRole("button", { name: /Baixar arquivo/ })).toBeEnabled();
    expect(screen.getByText(/aceita cadastro incompleto/)).toBeInTheDocument();
  });

  it("cadastro completo diz que está completo, em vez de ficar em branco", async () => {
    montar();

    expect(await screen.findByText("Cadastro completo")).toBeInTheDocument();
    expect(screen.getByText(/Nada pendente/)).toBeInTheDocument();
  });
});

describe("exportação", () => {
  it("manda o código digitado e o formato escolhido", async () => {
    const usuario = userEvent.setup();
    montar();

    await screen.findByDisplayValue("3302700");
    await usuario.selectOptions(screen.getByRole("combobox"), "csv");
    await usuario.click(screen.getByRole("button", { name: /Baixar arquivo/ }));

    await waitFor(() => {
      expect(exportar).toHaveBeenCalledWith({ codigoIbge: "3302700", formato: "csv" });
    });
  });

  it("falha do servidor aparece na tela, não só no console", async () => {
    const usuario = userEvent.setup();
    exportar.mockRejectedValue(new Error("qualquer coisa"));

    montar();

    await screen.findByDisplayValue("3302700");
    await usuario.click(screen.getByRole("button", { name: /Baixar arquivo/ }));

    expect(await screen.findByText(/Não foi possível gerar o arquivo agora/)).toBeInTheDocument();
  });
});
