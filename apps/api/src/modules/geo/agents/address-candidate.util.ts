import type { School } from "@prisma/client";

/**
 * Achado real investigando a Fila de Revisão Manual (pedido do usuário:
 * "investigue e faça as IAs trabalharem"): antes desta escada, TODA
 * tentativa de reprocessamento (`ValidationAiAgentService.enderecoCompleto`)
 * montava a MESMA string de endereço completo em toda tentativa — as 3
 * "tentativas automáticas" eram, na prática, a mesma pergunta repetida 3x
 * pro Nominatim, que é determinístico: nunca podiam dar resultado
 * diferente. 501 escolas caíram em Revisão Manual por causa exatamente
 * disso ("3 tentativas automáticas reprovadas"), sem nenhuma chance real
 * de sucesso.
 *
 * Dado real do Censo Escolar (INEP): número e bairro do logradouro
 * frequentemente não batem com o OpenStreetMap (área rural, loteamento
 * não mapeado, nomenclatura divergente), mas a RUA em si costuma bater.
 * Esta escada simplifica progressivamente o endereço a cada tentativa —
 * cada uma pergunta algo genuinamente diferente ao Nominatim, com chance
 * real de um resultado diferente:
 *   1. endereço completo (logradouro, número, bairro, cidade - estado, CEP)
 *   2. sem número (o CEP/bairro já localizam a via o bastante)
 *   3. sem bairro (só logradouro + cidade — último grau antes de desistir do endereço exato)
 */
export function buildAddressCandidate(school: School, tentativa: number): string {
  if (tentativa <= 1) {
    return `${school.logradouro}, ${school.numero}, ${school.bairro}, ${school.cidade} - ${school.estado}, ${school.cep}`;
  }
  if (tentativa === 2) {
    return `${school.logradouro}, ${school.bairro}, ${school.cidade} - ${school.estado}`;
  }
  return `${school.logradouro}, ${school.cidade} - ${school.estado}`;
}

/**
 * Último recurso quando nenhuma variação do endereço exato resolve
 * (nem o Nominatim acha o logradouro, nem uma versão simplificada dele) —
 * aproxima pelo município, uma entidade administrativa grande que o
 * Nominatim praticamente sempre reconhece. Nunca finge a precisão de um
 * endereço exato: quem chama isto SEMPRE marca o resultado como
 * `REVISAO_MANUAL`, nunca passa pelo Validation AI Agent (que aprovaria
 * trivialmente uma coordenada de cidade contra `School.cidade`/`estado`,
 * dando falsa confiança a um pino que só está no bairro certo por acaso).
 */
export function buildMunicipioFallback(school: School): string {
  return `${school.cidade} - ${school.estado}, Brasil`;
}
