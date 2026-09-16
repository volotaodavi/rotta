import { RottaMap, type RottaMapMarker } from "@rotta/maps/native";
import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import type { MapVehicle } from "@rotta/api-client";

import { useGpsMap } from "@/features/gps/hooks/use-gps";
import { StatusPill, VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * "Mapa da frota" — localizador em tempo real (Frente B do plano
 * "lacunas Empresa/Gestor no app" — pedido do usuário 12/09/2026: "o
 * app é o principal... traga o que tem na Web pro app"). Antes desta
 * Frente não existia NENHUM mapa mostrando a frota inteira em operação
 * no app — só mapa de escola/transportador. Mirror de
 * `apps/web/.../veiculos/mapa/page.tsx`: um marcador por VIAGEM em
 * andamento agora (`GET /gps/map`, `useGpsMap`, polling a cada 3s), a
 * última posição estática de um veículo sem viagem não aparece aqui
 * (nunca inventa uma posição "ao vivo" que não existe).
 *
 * Faz mais sentido no mobile que na própria Web — o dono/gestor
 * conferindo a frota andando na rua, não sentado no computador.
 */
export function EmpresaFrotaMapaScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data, isLoading } = useGpsMap();
  const [selecionado, setSelecionado] = useState<MapVehicle | null>(null);

  const markers = useMemo<RottaMapMarker[]>(
    () =>
      (data ?? [])
        .filter(
          (v): v is MapVehicle & { latitude: number; longitude: number } =>
            v.latitude !== null && v.longitude !== null,
        )
        .map((v) => ({
          id: v.tripId,
          titulo: `${v.placa}: ${v.routeNome} (${v.motoristaNome})`,
          latitude: v.latitude,
          longitude: v.longitude,
          // Todo marcador aqui é uma viagem EM_ANDAMENTO agora — sempre
          // um veículo em movimento, nunca uma posição estática.
          emMovimento: true,
        })),
    [data],
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <VehicleScreen>
      <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
        {data?.length ?? 0} veículo(s) em viagem agora. Atualiza automaticamente a cada poucos
        segundos.
      </Text>

      {markers.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhum veículo em viagem no momento.</Text>
      ) : (
        <View style={styles.mapa}>
          <RottaMap
            markers={markers}
            onMarkerPress={(marker) =>
              setSelecionado(data?.find((v) => v.tripId === marker.id) ?? null)
            }
          />
        </View>
      )}

      {selecionado ? (
        <VehicleCard style={styles.card}>
          <View style={styles.linha}>
            <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{selecionado.placa}</Text>
            <StatusPill label="Em viagem" tone="success" />
          </View>
          <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>
            {selecionado.routeNome} ({selecionado.turno}), motorista {selecionado.motoristaNome}
            {selecionado.monitorNome ? `, monitor ${selecionado.monitorNome}` : ""}
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            {selecionado.ultimaPosicaoEm
              ? `Última posição: ${new Date(selecionado.ultimaPosicaoEm).toLocaleTimeString("pt-BR")}`
              : "Aguardando primeira posição"}
          </Text>
        </VehicleCard>
      ) : null}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4 },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  linha: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  mapa: { borderRadius: 16, height: 420, overflow: "hidden" },
});
