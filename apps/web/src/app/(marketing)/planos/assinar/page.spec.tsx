import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AssinarAntesDaContaPage from "./page";

import type { ReactNode } from "react";

vi.mock("@/features/company/hooks/use-company", () => ({
  useCreatePreSignupPixCheckout: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreatePreSignupAsaasCheckout: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePreSignupStatus: () => ({ data: undefined }),
}));

// Mesmo motivo do `layout-nav-tags.spec.tsx`: sem stub, o React do
// workspace e o das libs se cruzam no jsdom. O alvo aqui é o TEXTO.
vi.mock("@rotta/ui/web", async () => {
  const { createElement } = await import("react");
  const passa = (tag: string) => {
    const Comp = ({ children }: { children?: ReactNode }) => createElement(tag, null, children);
    return Comp;
  };
  const Card = Object.assign(passa("div"), {
    Body: passa("div"),
    Header: () => null,
    Footer: passa("div"),
  });
  return {
    Button: passa("button"),
    Card,
    FormField: passa("div"),
    Input: () => createElement("input"),
    Typography: passa("p"),
    useToast: () => ({ error: vi.fn(), success: vi.fn() }),
  };
});

vi.mock("@rotta/icons", () => ({ Check: () => null, Copy: () => null }));

vi.mock("@/components/asaas-security-badge", () => ({ AsaasSecurityBadge: () => null }));

/**
 * Funil de 05/10/2026: 3 checkouts iniciados, 3 abandonados, 0 pagos.
 * A página precisa responder, antes do formulário, as duas dúvidas de
 * quem paga sem ter conta: "e se der errado?" e "posso testar antes?".
 */
describe("/planos/assinar", () => {
  afterEach(cleanup);

  it("promete o reembolso de 48h e oferece o teste grátis antes do formulário", () => {
    render(<AssinarAntesDaContaPage />);

    expect(screen.getByText(/devolvido automaticamente/)).toBeTruthy();
    const teste = screen.getByRole("link", { name: "Criar conta e testar grátis" });
    expect(teste.getAttribute("href")).toBe("/criar-conta");
  });

  it("não usa travessão em texto visível", () => {
    const { container } = render(<AssinarAntesDaContaPage />);
    expect(container.textContent).not.toMatch(/[—–]/);
  });
});
