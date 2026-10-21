import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MarcoLegalPage from "./page";

import { LEGAL_DOCUMENTS, getLegalDocumentMeta } from "@/features/legal/documents";

/**
 * O Marco Legal é página pública que cita norma. Três erros aqui são de
 * consequência, não de layout:
 *
 * 1. **Afirmar conformidade.** A Rotta não inspeciona veículo, não emite
 *    autorização e não consulta prontuário no DETRAN. Um texto que
 *    sugira que ela atesta conformidade transfere a ela uma garantia que
 *    não tem meio de dar, e é o primeiro documento apontado contra ela
 *    no dia de um acidente.
 * 2. **Citar resolução do CONTRAN por número.** As resoluções que
 *    regulam a condução de escolares não foram localizadas no acervo
 *    consultado. Número não conferido em página pública é o erro que
 *    este documento existe para evitar.
 * 3. **Nascer com selo de revisado.** O registro só admite `REVISADO`
 *    com revisão jurídica real registrada em `revisadoEm`.
 */
describe("Marco Legal do Transporte Escolar", () => {
  it("esta registrado no hub, com selo de pendente de revisao juridica", () => {
    const meta = getLegalDocumentMeta("marco-legal");

    expect(meta).toBeDefined();
    expect(meta?.status).toBe("PENDENTE_REVISAO_JURIDICA");
    expect(meta?.revisadoEm).toBeUndefined();
    /* O registro alimenta sidebar, hub, busca e sitemap de uma vez: se
       o documento está na lista, ele aparece nos quatro. */
    expect(LEGAL_DOCUMENTS.some((doc) => doc.href === "/legal/marco-legal")).toBe(true);
  });

  it("diz, com todas as letras, que a Rotta nao atesta conformidade", () => {
    render(<MarcoLegalPage />);

    expect(screen.getByText(/não inspeciona veículos/)).toBeInTheDocument();
    expect(
      screen.getByText(/não atesta, não certifica e não garante a conformidade/),
    ).toBeInTheDocument();
  });

  it("nao cita resolucao do CONTRAN por numero", () => {
    const { container } = render(<MarcoLegalPage />);
    const texto = container.textContent ?? "";

    expect(texto).toMatch(/CONTRAN/);
    /* "Resolução nº 123" ou "Resolução 123" em qualquer forma. */
    expect(texto).not.toMatch(/Resolu[çc][ãa]o\s+(n[º°.]?\s*)?\d/i);
  });

  /* As referências são a razão de a página existir: sem elas, é só
     texto afirmando coisa sobre lei. */
  it("traz as referencias em forma ABNT, com fonte oficial e data de acesso", () => {
    const { container } = render(<MarcoLegalPage />);
    const texto = container.textContent ?? "";

    for (const norma of [
      "Lei nº 9.503, de 23 de setembro de 1997",
      "Lei nº 8.069, de 13 de julho de 1990",
      "Lei nº 13.709, de 14 de agosto de 2018",
      "Lei nº 8.078, de 11 de setembro de 1990",
      "Lei Complementar nº 123, de 14 de dezembro de 2006",
      "Decreto-Lei nº 5.452, de 1º de maio de 1943",
    ]) {
      expect(texto).toContain(norma);
    }

    expect(texto).toContain("ABNT NBR 6023");
    expect(texto).toContain("normas.leg.br");
    expect(texto).toContain("Acesso em: 21 out. 2026");
  });

  /* O art. 137 proíbe passar da lotação, e o art. 139 é o que manda
     consultar o município: os dois sustentam decisões de produto. */
  it("cobre a lotacao e a competencia municipal", () => {
    const { container } = render(<MarcoLegalPage />);
    const texto = container.textContent ?? "";

    expect(texto).toMatch(/número superior à capacidade estabelecida pelo fabricante/);
    expect(texto).toMatch(/não exclui a competência municipal/);
  });

  it("avisa que nao e parecer juridico", () => {
    render(<MarcoLegalPage />);

    expect(screen.getByText(/não constitui parecer jurídico/)).toBeInTheDocument();
  });
});
