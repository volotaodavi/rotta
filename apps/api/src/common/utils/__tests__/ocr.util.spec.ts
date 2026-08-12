/**
 * `ocr.util.ts` guarda o worker do Tesseract.js num singleton a nível
 * de módulo (reaproveitado entre chamadas) — cada teste aqui usa
 * `jest.isolateModules` + `require` fresco pra começar sem esse estado
 * compartilhado, senão o segundo teste reaproveitaria o worker mockado
 * do primeiro em vez de exercitar `createWorker` de novo.
 */
describe("extractTextFromImage", () => {
  function buildWorker(overrides: Partial<{ recognize: jest.Mock; terminate: jest.Mock }> = {}) {
    return {
      recognize: jest.fn(),
      terminate: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  function loadWithMockedWorker(worker: ReturnType<typeof buildWorker>): {
    extractTextFromImage: (buffer: Buffer) => Promise<string | null>;
    createWorkerMock: jest.Mock;
  } {
    let extractTextFromImage!: (buffer: Buffer) => Promise<string | null>;
    let createWorkerMock!: jest.Mock;
    jest.isolateModules(() => {
      jest.doMock("tesseract.js", () => ({
        createWorker: jest.fn().mockResolvedValue(worker),
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- isolamento de módulo exige require dinâmico, não import estático.
      ({ extractTextFromImage } = require("../ocr.util"));
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- idem, pra inspecionar a mesma instância mockada de createWorker.
      ({ createWorker: createWorkerMock } = require("tesseract.js"));
    });
    return { extractTextFromImage, createWorkerMock };
  }

  it("devolve o texto reconhecido (trim aplicado) e chama createWorker('por')", async () => {
    const worker = buildWorker({
      recognize: jest.fn().mockResolvedValue({ data: { text: "  RENAVAM 12345678901  \n" } }),
    });
    const { extractTextFromImage, createWorkerMock } = loadWithMockedWorker(worker);

    const resultado = await extractTextFromImage(Buffer.from("fake-image"));

    expect(resultado).toBe("RENAVAM 12345678901");
    expect(createWorkerMock).toHaveBeenCalledWith("por");
  });

  it("devolve null (nunca lança) quando o texto reconhecido é vazio", async () => {
    const worker = buildWorker({
      recognize: jest.fn().mockResolvedValue({ data: { text: "   " } }),
    });
    const { extractTextFromImage } = loadWithMockedWorker(worker);

    const resultado = await extractTextFromImage(Buffer.from("fake-image"));

    expect(resultado).toBeNull();
  });

  it("devolve null (nunca lança) quando o worker falha ao reconhecer", async () => {
    const worker = buildWorker({
      recognize: jest.fn().mockRejectedValue(new Error("imagem corrompida")),
    });
    const { extractTextFromImage } = loadWithMockedWorker(worker);

    const resultado = await extractTextFromImage(Buffer.from("fake-image"));

    expect(resultado).toBeNull();
  });

  it("devolve null (nunca lança) quando createWorker falha", async () => {
    let extractTextFromImage!: (buffer: Buffer) => Promise<string | null>;
    jest.isolateModules(() => {
      jest.doMock("tesseract.js", () => ({
        createWorker: jest.fn().mockRejectedValue(new Error("não foi possível iniciar o worker")),
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- isolamento de módulo exige require dinâmico, não import estático.
      ({ extractTextFromImage } = require("../ocr.util"));
    });

    const resultado = await extractTextFromImage(Buffer.from("fake-image"));

    expect(resultado).toBeNull();
  });
});
