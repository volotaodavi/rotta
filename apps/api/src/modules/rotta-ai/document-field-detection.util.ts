import { isValidPlate } from "@rotta/validators";

/**
 * Heurísticas de presença de campo sobre o texto extraído por OCR
 * (`extractTextFromImage`, `ocr.util.ts`) — Frentes G/H. Só relata o
 * que de fato apareceu no texto lido; nunca confirma autenticidade nem
 * detecta adulteração (isso continua exigindo um provedor de visão
 * computacional contratado — ver `RottaAiService`).
 */

const RENAVAM_REGEX = /\b\d{11}\b/;
/** Sequências candidatas a placa dentro do texto solto do OCR — `isValidPlate` (`@rotta/validators`) confirma o formato real (antigo ou Mercosul). */
const PLATE_CANDIDATE_REGEX = /[A-Z0-9]{7}/g;

function contains(texto: string, padrao: RegExp): boolean {
  return padrao.test(texto);
}

/** CRLV/Licenciamento, Seguro, Laudo/Vistoria — cada tipo tem palavras/números que só aparecem nele. */
export function detectVehicleDocumentFields(texto: string, tipo: string): string[] {
  const encontrados: string[] = [];
  const textoNormalizado = texto.toUpperCase();
  // Remove só "." e "-" (separadores comuns DENTRO de um número, ex.
  // "123.456.789-01") — nunca espaço, que é o que preserva a fronteira
  // de palavra entre um rótulo tipo "RENAVAM" e o número em si.
  const semSeparadoresInternos = texto.replace(/[.-]/g, "");

  switch (tipo) {
    case "CRLV":
    case "LICENCIAMENTO": {
      if (contains(semSeparadoresInternos, RENAVAM_REGEX)) encontrados.push("RENAVAM (11 dígitos)");
      const candidatas = textoNormalizado.match(PLATE_CANDIDATE_REGEX) ?? [];
      if (candidatas.some((candidata) => isValidPlate(candidata))) {
        encontrados.push("Placa em formato válido");
      }
      break;
    }
    case "SEGURO": {
      if (contains(textoNormalizado, /AP[ÓO]LICE/)) encontrados.push('Palavra "apólice"');
      if (contains(textoNormalizado, /SEGURADORA/)) encontrados.push('Palavra "seguradora"');
      if (contains(textoNormalizado, /VIG[ÊE]NCIA/)) encontrados.push('Palavra "vigência"');
      break;
    }
    case "LAUDO":
    case "VISTORIA": {
      if (contains(textoNormalizado, /VISTORIA/)) encontrados.push('Palavra "vistoria"');
      if (contains(textoNormalizado, /LAUDO/)) encontrados.push('Palavra "laudo"');
      if (contains(textoNormalizado, /APROVAD[OA]|REPROVAD[OA]/)) {
        encontrados.push("Resultado (aprovado/reprovado)");
      }
      break;
    }
    default:
      break;
  }

  return encontrados;
}

/** EAR (Autorização para Conduzir Veículos de Emergência/Escolar) e Curso especializado — nenhum dos dois tem um formato numérico fixo como RENAVAM/placa, só palavras-chave esperadas. */
export function detectDriverDocumentFields(texto: string, tipo: "EAR" | "CURSO"): string[] {
  const encontrados: string[] = [];
  const textoNormalizado = texto.toUpperCase();

  if (tipo === "EAR") {
    if (contains(textoNormalizado, /\bEAR\b/)) encontrados.push('Sigla "EAR"');
    if (contains(textoNormalizado, /ESPECIALIZAD[OA]/)) encontrados.push('Palavra "especializado"');
    if (contains(textoNormalizado, /TRANSPORTE ESCOLAR/)) {
      encontrados.push('Expressão "transporte escolar"');
    }
  } else {
    if (contains(textoNormalizado, /CURSO/)) encontrados.push('Palavra "curso"');
    if (contains(textoNormalizado, /CONCLUS[ÃA]O|CERTIFICADO/)) {
      encontrados.push('Palavra "conclusão"/"certificado"');
    }
    if (contains(textoNormalizado, /CARGA HOR[ÁA]RIA/))
      encontrados.push('Expressão "carga horária"');
  }

  return encontrados;
}
