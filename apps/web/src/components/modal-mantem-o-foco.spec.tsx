import { Input, Modal } from "@rotta/ui/web";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

/**
 * Regressão do relato de 02/10/2026 sobre o Admin: "a cada letra
 * colocada ele buga e tenho que clicar sempre na caixa de escrita".
 *
 * O defeito não era de nenhuma tela: era do `Modal` do design system,
 * usado por todo diálogo com campo de texto da plataforma (empresas,
 * alunos, veículos, rotas, planos, exclusão definitiva, contato do
 * site). O efeito que prende o foco dentro do modal declarava
 * `[isOpen, onClose]` como dependência, e `onClose` é uma arrow
 * function inline em praticamente toda chamada, ou seja, uma
 * referência NOVA a cada renderização. Digitar uma letra re-renderiza
 * quem abriu o modal, o efeito é descartado e remontado, e aí
 * acontecem as duas coisas que tiram o foco do campo: a limpeza
 * devolve o foco para quem abriu o modal, e o efeito novo foca o
 * primeiro elemento focável do painel.
 *
 * O painel aqui tem um botão ANTES do campo porque é isso que todo
 * diálogo real tem (o "x" do `Modal.Header`): sem nada focável antes,
 * o defeito ficaria invisível, já que o primeiro focável seria o
 * próprio campo. O `Modal.Header` de verdade não entra neste teste por
 * um limite do runner, não do componente: o ícone vem de
 * `@rotta/icons`, que o Vitest carrega por resolução do Node (sem
 * passar pelos alias do `vitest.config.ts`) e portanto com a cópia
 * React 18 do pacote, o que o `react-dom` 19 deste app recusa com "A
 * React Element from an older version of React was rendered".
 */
function DialogoDeTeste(): JSX.Element {
  const [valor, setValor] = useState("");

  return (
    <Modal isOpen onClose={() => undefined}>
      <Modal.Body>
        <button type="button">Fechar</button>
        <Input
          aria-label="Confirmação"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
        />
      </Modal.Body>
    </Modal>
  );
}

describe("Modal (design system)", () => {
  it("não rouba o foco do campo a cada letra digitada", async () => {
    const user = userEvent.setup();
    render(<DialogoDeTeste />);

    const campo = screen.getByLabelText("Confirmação");
    await user.click(campo);
    await user.keyboard("Van do Danilo");

    expect(campo).toHaveValue("Van do Danilo");
    expect(campo).toHaveFocus();
  });

  it("foca o primeiro elemento do painel ao abrir", () => {
    render(<DialogoDeTeste />);

    expect(screen.getByRole("button", { name: "Fechar" })).toHaveFocus();
  });
});
