/**
 * Ícone de veículo (visto de cima, estilo van/ônibus escolar) usado
 * para marcadores `emMovimento` (ver `types.ts`) — troca o pino de
 * localização padrão sempre que o marcador representa um veículo em
 * viagem, não uma posição estática. Markup puro (sem dependência de
 * ícone externo) para funcionar tanto como `innerHTML` de um elemento
 * DOM (web) quanto, futuramente, como `react-native-svg` se este
 * pacote vier a adotar essa dependência.
 */
export function vehicleIconMarkup(color: string): string {
  return `<svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="15" r="14" fill="${color}" stroke="#ffffff" stroke-width="2"/>
    <rect x="9" y="7" width="12" height="16" rx="3" fill="#ffffff"/>
    <rect x="11" y="10" width="8" height="4" rx="1" fill="${color}"/>
    <rect x="11" y="16" width="8" height="4" rx="1" fill="${color}"/>
  </svg>`;
}
