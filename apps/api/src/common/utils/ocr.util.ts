import { createWorker, type Worker } from "tesseract.js";

/**
 * OCR real via Tesseract.js (WASM, roda no próprio processo — sem
 * provedor pago, sem API key) — usado por `RottaAiService.
 * analyzeVehicleDocument`/`analyzeDriverDocument` (Frentes G/H) para
 * extrair o texto de CRLV/Seguro/Vistoria/EAR/Curso e checar se os
 * campos esperados aparecem no documento (`document-field-detection.
 * util.ts`). NÃO detecta adulteração/fraude — só lê o texto que está
 * visível na imagem, exatamente o que uma pessoa leria; autenticidade
 * continua exigindo um provedor de visão computacional contratado.
 *
 * Nunca lança — falha (imagem ilegível, timeout, worker indisponível)
 * sempre vira `null`, tratado por quem chama como "OCR não conseguiu
 * extrair texto desta vez", nunca um erro fatal que derrubaria a
 * análise best-effort de `analyzeVehicleDocument`.
 */

let workerPromise: Promise<Worker> | null = null;

/** Worker reaproveitado entre chamadas (inicializar um novo custa caro) — resetado sozinho se travar ou falhar. */
function getWorker(): Promise<Worker> {
  workerPromise ??= createWorker("por");
  return workerPromise;
}

async function resetWorker(): Promise<void> {
  const current = workerPromise;
  workerPromise = null;
  try {
    await (await current)?.terminate();
  } catch {
    // Já estava quebrado — nada a fazer além de garantir que a próxima chamada crie um worker novo.
  }
}

/** Acima disso, mais vale devolver "OCR indisponível agora" do que segurar a resposta da API — best-effort, nunca bloqueante (mesmo raciocínio do restante de `RottaAiService`). */
const OCR_TIMEOUT_MS = 20_000;

export async function extractTextFromImage(buffer: Buffer): Promise<string | null> {
  // `clearTimeout` explícito — sem isso o timer perdedor da corrida
  // (recognize resolveu antes) segura o processo Node vivo até os 20s
  // completarem, mesmo depois da função já ter retornado (some com
  // testes que verificam o processo encerrar limpo, e em produção
  // atrasa um graceful shutdown à toa).
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const worker = await getWorker();
    const result = await Promise.race([
      worker.recognize(buffer),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("Timeout no OCR (Tesseract.js).")),
          OCR_TIMEOUT_MS,
        );
      }),
    ]);
    const texto = result.data.text.trim();
    return texto || null;
  } catch {
    void resetWorker();
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
