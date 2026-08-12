import { readImageMetadata } from "../image-metadata.util";

/** Monta um JPEG mínimo válido: SOI + APP0 (JFIF, 14 bytes de payload) + SOF0 (1 componente) com a largura/altura informadas. */
function buildMinimalJpeg(largura: number, altura: number): Buffer {
  const app0Payload = Buffer.from([
    0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  ]);
  const sof0Payload = Buffer.alloc(9);
  sof0Payload.writeUInt8(0x08, 0); // precisão
  sof0Payload.writeUInt16BE(altura, 1);
  sof0Payload.writeUInt16BE(largura, 3);
  sof0Payload.writeUInt8(0x01, 5); // 1 componente
  sof0Payload.writeUIntBE(0x011100, 6, 3); // dados do componente (id, sampling, tabela)

  return Buffer.concat([
    Buffer.from([0xff, 0xd8]), // SOI
    Buffer.from([0xff, 0xe0]),
    uint16be(2 + app0Payload.length),
    app0Payload,
    Buffer.from([0xff, 0xc0]),
    uint16be(2 + sof0Payload.length),
    sof0Payload,
  ]);
}

function uint16be(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value, 0);
  return buffer;
}

/** Monta um PNG mínimo (só o cabeçalho até o IHDR — suficiente pro parser, que nunca lê além do byte 24). */
function buildMinimalPng(largura: number, altura: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrLength = uint32be(13);
  const ihdrType = Buffer.from("IHDR");
  const width = uint32be(largura);
  const height = uint32be(altura);
  return Buffer.concat([signature, ihdrLength, ihdrType, width, height]);
}

function uint32be(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value, 0);
  return buffer;
}

describe("readImageMetadata", () => {
  it("lê largura/altura de um JPEG válido (SOF0), pulando corretamente o segmento APP0", () => {
    const jpeg = buildMinimalJpeg(800, 600);

    const resultado = readImageMetadata(jpeg);

    expect(resultado).toEqual({ formato: "jpeg", larguraPx: 800, alturaPx: 600 });
  });

  it("lê largura/altura de um PNG válido (chunk IHDR)", () => {
    const png = buildMinimalPng(1024, 768);

    const resultado = readImageMetadata(png);

    expect(resultado).toEqual({ formato: "png", larguraPx: 1024, alturaPx: 768 });
  });

  it("devolve formato null para um arquivo que não é JPEG nem PNG (ex. PDF)", () => {
    const pdfHeader = Buffer.from("%PDF-1.4\n", "utf-8");

    const resultado = readImageMetadata(pdfHeader);

    expect(resultado).toEqual({ formato: null, larguraPx: null, alturaPx: null });
  });

  it("devolve formato null para um buffer vazio ou truncado demais para ter uma assinatura", () => {
    expect(readImageMetadata(Buffer.alloc(0))).toEqual({
      formato: null,
      larguraPx: null,
      alturaPx: null,
    });
    expect(readImageMetadata(Buffer.from([0xff]))).toEqual({
      formato: null,
      larguraPx: null,
      alturaPx: null,
    });
  });

  it("um JPEG cortado antes do SOF0 (nunca acha as dimensões) devolve formato detectado mas dimensões null, nunca lança", () => {
    const jpegSemSof = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04]); // SOI + APP0 com length=4 (sem payload) e nada depois

    const resultado = readImageMetadata(jpegSemSof);

    expect(resultado.formato).toBe("jpeg");
    expect(resultado.larguraPx).toBeNull();
    expect(resultado.alturaPx).toBeNull();
  });

  it("um PNG com assinatura válida mas cabeçalho IHDR incompleto devolve formato detectado, dimensões null, nunca lança", () => {
    const pngTruncado = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // só a assinatura

    const resultado = readImageMetadata(pngTruncado);

    expect(resultado.formato).toBe("png");
    expect(resultado.larguraPx).toBeNull();
    expect(resultado.alturaPx).toBeNull();
  });
});
