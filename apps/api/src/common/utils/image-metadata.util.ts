/**
 * Metadados reais de imagem (formato + dimensões), lidos direto dos
 * bytes do arquivo (assinatura de magic number + cabeçalhos JPEG/PNG) —
 * usado por `RottaAiService.analyzeVehicleDocument` (Frente E) para
 * "verificar qualidade das imagens, detectar documentos ilegíveis"
 * (briefing "ROTTA AI" do módulo Veículos) sem depender de nenhum
 * provedor externo (nem credencial, nem chamada de rede): só leitura de
 * cabeçalho de arquivo, mesmo princípio de `parseJsonSafely` em
 * `didit.service.ts` — nunca lança em entrada malformada, sempre
 * devolve um resultado que o chamador consegue tratar.
 *
 * Cobre os dois formatos que o app (câmera do celular/upload web)
 * realmente produz — JPEG e PNG. Qualquer outro formato (PDF, HEIC não
 * convertido, etc.) devolve `formato: null` — não é um erro, é
 * informação real que falta suporte de decodificação para esse tipo.
 *
 * NÃO faz OCR nem decodifica pixels (não detecta blur/nitidez nem lê o
 * conteúdo do documento) — ver a ressalva explícita em
 * `analyzeVehicleDocument`.
 */

export type ImageFormat = "jpeg" | "png";

export interface ImageMetadata {
  formato: ImageFormat | null;
  larguraPx: number | null;
  alturaPx: number | null;
}

const JPEG_SOI = 0xffd8;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Marcadores JPEG "standalone" (sem payload de tamanho) — TEM que ser pulados sem ler um comprimento depois deles. */
const JPEG_MARKERS_SEM_PAYLOAD = new Set([0xd8, 0xd9, 0x01, ...range(0xd0, 0xd7)]);

function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
}

/** SOFn (Start Of Frame) — os únicos marcadores JPEG que carregam largura/altura. Exclui DHT(C4)/JPG(C8)/DAC(CC), que não são SOF apesar de caírem no range 0xC0–0xCF. */
function isStartOfFrameMarker(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function readJpegDimensions(buffer: Buffer): { largura: number; altura: number } | null {
  let offset = 2; // pula o SOI (0xFFD8)
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) return null; // stream corrompido/inesperado

    const marker = buffer[offset + 1]!;
    if (JPEG_MARKERS_SEM_PAYLOAD.has(marker)) {
      offset += 2;
      continue;
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (isStartOfFrameMarker(marker)) {
      // layout do segmento SOF: [precisão(1)][altura(2)][largura(2)]
      const altura = buffer.readUInt16BE(offset + 5);
      const largura = buffer.readUInt16BE(offset + 7);
      return { largura, altura };
    }

    offset += 2 + segmentLength;
  }
  return null;
}

function readPngDimensions(buffer: Buffer): { largura: number; altura: number } | null {
  // IHDR é sempre o primeiro chunk: 8 bytes de assinatura + 4 (length) + 4 ("IHDR") + largura(4) + altura(4).
  if (buffer.length < 24) return null;
  const largura = buffer.readUInt32BE(16);
  const altura = buffer.readUInt32BE(20);
  return { largura, altura };
}

/** Lê formato + dimensões a partir dos bytes brutos do arquivo — nunca lança, formato desconhecido/arquivo corrompido vira `{ formato: null, ... }`. */
export function readImageMetadata(buffer: Buffer): ImageMetadata {
  if (buffer.length >= 2 && buffer.readUInt16BE(0) === JPEG_SOI) {
    const dimensoes = readJpegDimensions(buffer);
    return {
      formato: "jpeg",
      larguraPx: dimensoes?.largura ?? null,
      alturaPx: dimensoes?.altura ?? null,
    };
  }

  if (buffer.length >= PNG_SIGNATURE.length && buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    const dimensoes = readPngDimensions(buffer);
    return {
      formato: "png",
      larguraPx: dimensoes?.largura ?? null,
      alturaPx: dimensoes?.altura ?? null,
    };
  }

  return { formato: null, larguraPx: null, alturaPx: null };
}
