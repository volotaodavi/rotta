import { useQuery } from "@tanstack/react-query";

import { plataformaApi, type PulsoDaPlataforma } from "@/lib/api-client";

/**
 * O quanto a Rotta está em movimento agora.
 *
 * Alimenta a sala dos agentes no escritório 3D: até 05/10/2026 a
 * intensidade deles era uma barra que o fundador arrastava, o que fazia
 * da cena uma maquete. Com isto, a sala ferve quando tem van na rua.
 *
 * Vinte segundos entre leituras. É uma contagem barata, mas é o Admin
 * inteiro batendo no banco de produção: mais frequente que isso não
 * mudaria nada na tela e só geraria carga.
 */
const INTERVALO_MS = 20_000;

export function usePulso(): { carga: number; dados: PulsoDaPlataforma | undefined } {
  const consulta = useQuery({
    queryKey: ["plataforma", "pulso"],
    queryFn: () => plataformaApi.pulso(),
    refetchInterval: INTERVALO_MS,
    staleTime: INTERVALO_MS,
  });

  return { carga: consulta.data?.carga ?? 0, dados: consulta.data };
}
