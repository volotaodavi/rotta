/**
 * @rotta/maps — abstracao de mapas da Rotta (Dossie 9, Secao 2.6 e
 * Dossie 22, Secao 5.11).
 *
 * Decisao ja tomada (nao revisitar sem novo ADR): hibrido entre Google
 * Maps Platform (Geocoding/Directions — qualidade de dado no Brasil) e
 * Mapbox (renderizacao visual — controle de estilo escuro + custo em
 * escala). Cada app consumira uma interface unica (`<RottaMap />`,
 * `geocode(endereco)`), nunca os SDKs de fornecedor diretamente.
 *
 *   providers/   Implementacoes concretas por fornecedor (adapter pattern,
 *                Dossie 4 Secao 18.3) — a implementar quando o primeiro
 *                fluxo real de geocodificacao/mapa for construido.
 */

export {};
