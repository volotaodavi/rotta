import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

import { TraccarForwardDto } from "./dto/traccar-forward.dto";

/**
 * O resultado de tentar entender o que o Traccar mandou.
 *
 * Nunca lança. Quem chama é um controller que PRECISA responder 200 ao
 * Traccar mesmo quando recusa a posição, e uma exceção aqui viraria
 * 500, que é justamente o código que faz o Traccar reentregar para
 * sempre.
 */
export type LeituraDoEncaminhamento =
  { aceita: true; payload: TraccarForwardDto } | { aceita: false; motivo: string };

/** As únicas chaves de `attributes` que a Rotta usa. O resto do que o Teltonika manda é descartado aqui. */
const ATRIBUTOS_CONHECIDOS = ["ignition", "batteryLevel", "motion"] as const;

/**
 * Lê o corpo de um encaminhamento do Traccar, nos dois formatos que
 * chegam de verdade.
 *
 * ## O defeito que isto conserta
 *
 * Com `forward.type=json`, o Traccar NÃO manda a posição achatada. O
 * corpo é, literalmente (`PositionData.java`, `PositionForwarderJson`):
 *
 * ```json
 * { "position": { "id", "deviceId", "protocol", "serverTime",
 *                 "deviceTime", "fixTime", "valid", "latitude",
 *                 "longitude", "altitude", "speed", "course",
 *                 "accuracy", "attributes": { … } },
 *   "device":   { "id", "name", "uniqueId", "status", "lastUpdate",
 *                 "positionId", "attributes", … } }
 * ```
 *
 * O `ValidationPipe` global da API roda com `whitelist` **e**
 * `forbidNonWhitelisted`, então ele recusava esse corpo três vezes:
 * pela chave `position`, que o DTO não declara; por `device.id` e
 * `device.status`; e por qualquer atributo do Teltonika além dos três
 * que nos interessam (`sat`, `power`, `io239`, `distance`, dezenas
 * deles). Resultado: **400 em 100% das posições reais**, o Traccar
 * retentando dez vezes e descartando. O `curl` do README passava porque
 * era um JSON achatado escrito à mão, que nenhum aparelho produz.
 *
 * ## As três decisões desta função
 *
 * 1. **Aceita os dois formatos.** O aninhado é o real; o achatado
 *    continua valendo porque é o que o `curl` de diagnóstico manda, e
 *    tirar isso quebraria o único teste de fumaça que existe em campo.
 * 2. **Campo extra NUNCA custa uma posição.** A validação roda com
 *    `forbidNonWhitelisted: false`: o que não é do contrato é
 *    descartado em silêncio, não recusado. O Traccar muda de versão e
 *    acrescenta campo sem avisar ninguém, e uma posição perdida é um
 *    ônibus sumido do mapa de uma família.
 * 3. **Os atributos são normalizados antes de validar.** `attributes`
 *    é um mapa livre no Traccar, e protocolo que mande `ignition` como
 *    texto não pode derrubar a posição inteira. Aqui ficam só as três
 *    chaves conhecidas, convertidas com cuidado.
 */
export function lerEncaminhamentoTraccar(corpo: unknown): LeituraDoEncaminhamento {
  if (!ehObjeto(corpo)) {
    return { aceita: false, motivo: "Corpo do encaminhamento não é um objeto JSON." };
  }

  // O formato real do Traccar: posição dentro de `position`, aparelho
  // ao lado em `device`. O achatado é o do `curl` de diagnóstico.
  const aninhado = ehObjeto(corpo.position);
  const posicao = aninhado ? (corpo.position as Record<string, unknown>) : corpo;

  const bruto: Record<string, unknown> = {
    ...posicao,
    device: corpo.device ?? posicao.device,
    attributes: normalizarAtributos(posicao.attributes),
  };

  const instancia = plainToInstance(TraccarForwardDto, bruto);
  const erros = validateSync(instancia, {
    // Tira o que não está no contrato, em vez de recusar o corpo
    // inteiro por causa disso. É a diferença entre ignorar um campo
    // novo do Traccar e perder a posição de um ônibus com crianças
    // dentro.
    whitelist: true,
    forbidNonWhitelisted: false,
    // Sem isto, `attributes: undefined` em aparelho que não reporta
    // ignição seria tratado como erro de tipo em vez de ausência.
    skipMissingProperties: false,
  });

  if (erros.length > 0) {
    return { aceita: false, motivo: `Formato inesperado: ${descreverErros(erros)}.` };
  }

  return { aceita: true, payload: instancia };
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Reduz o mapa livre de atributos do Traccar às três chaves que a Rotta
 * lê, convertendo o que der e ignorando o que não der.
 *
 * Devolve `undefined` quando nenhuma das três veio, e isso é
 * significativo: o serviço trata ignição ausente como "não sei", nunca
 * como "desligado". Inventar `false` aqui encerraria a viagem de um
 * ônibus andando.
 */
function normalizarAtributos(atributos: unknown): Record<string, unknown> | undefined {
  if (!ehObjeto(atributos)) return undefined;

  const normalizados: Record<string, unknown> = {};
  for (const chave of ATRIBUTOS_CONHECIDOS) {
    const valor = atributos[chave];
    if (valor === undefined || valor === null) continue;
    const convertido = chave === "batteryLevel" ? comoNumero(valor) : comoBooleano(valor);
    if (convertido !== undefined) normalizados[chave] = convertido;
  }

  return Object.keys(normalizados).length > 0 ? normalizados : undefined;
}

/**
 * `true`/`false`, e também os textos e os números que alguns protocolos
 * usam no lugar deles.
 *
 * `undefined` para o que não der para converter, e isso é deliberado:
 * um atributo que não dá para ler vira ausência de informação, não um
 * palpite. O serviço sabe lidar com ausência.
 */
function comoBooleano(valor: unknown): boolean | undefined {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor === 1 ? true : valor === 0 ? false : undefined;
  if (typeof valor === "string") {
    const texto = valor.trim().toLowerCase();
    if (texto === "true" || texto === "1") return true;
    if (texto === "false" || texto === "0") return false;
  }
  return undefined;
}

function comoNumero(valor: unknown): number | undefined {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : undefined;
  if (typeof valor === "string" && valor.trim() !== "") {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : undefined;
  }
  return undefined;
}

/**
 * Os erros em uma linha, para o log de quem estiver depurando um
 * aparelho novo às seis da manhã.
 *
 * Só os nomes das propriedades, nunca os valores: o corpo pode conter o
 * IMEI e a coordenada de um ônibus escolar, e log não é lugar para
 * isso.
 */
function descreverErros(erros: { property: string; children?: unknown[] }[]): string {
  return erros.map((erro) => erro.property).join(", ");
}
