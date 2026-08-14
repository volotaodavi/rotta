/**
 * Ícone de veículo (visto de cima, estilo van/ônibus escolar) usado
 * para marcadores `emMovimento` (ver `types.ts`) — troca o pino de
 * localização padrão sempre que o marcador representa um veículo em
 * viagem, não uma posição estática. Markup puro (sem dependência de
 * ícone externo) para funcionar tanto como `innerHTML` de um elemento
 * DOM (web) quanto, futuramente, como `react-native-svg` se este
 * pacote vier a adotar essa dependência.
 *
 * O anel pulsante (primeiro `<circle>`, animado via SMIL nativo do SVG
 * — sem CSS externo nem JS de animação) deixa visualmente óbvio que a
 * posição está viva/atualizando (pedido do usuário: "o veículo deve ter
 * a funcionalidade de ficar em movimento"), mesmo padrão "ponto
 * pulsante" de apps de rastreamento. Contraparte nativa em
 * `native/index.tsx` (`VehiclePulseRing`, `Animated.loop`).
 */
export function vehicleIconMarkup(color: string): string {
  return `<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
    <circle cx="22" cy="22" r="14" fill="${color}" opacity="0.35">
      <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.35;0;0.35" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx="22" cy="22" r="14" fill="${color}" stroke="#ffffff" stroke-width="2"/>
    <rect x="16" y="14" width="12" height="16" rx="3" fill="#ffffff"/>
    <rect x="18" y="17" width="8" height="4" rx="1" fill="${color}"/>
    <rect x="18" y="23" width="8" height="4" rx="1" fill="${color}"/>
  </svg>`;
}
