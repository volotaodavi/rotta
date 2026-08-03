import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";


import { TransporterCard } from "../components/transporter-card";
import { useLocation } from "../hooks/use-location";
import { useTransportersSearch } from "../hooks/use-transporters";

import { EnderecoManualScreen } from "./endereco-manual-screen";

import { VehicleButton, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * "Mapa" (briefing "Marketplace" §"MAPA") — tela padrão sempre que o
 * Responsável abre o app (primeira aba do Bottom Navigation). Solicita
 * localização automaticamente ao entrar; se negada, cai no fallback de
 * endereço manual. Sem `packages/maps` configurado ainda (mesmo estado
 * de `features/schools/screens/mapa-screen.tsx`), a "vista de mapa" é a
 * lista de transportadores ordenada por distância — o mapa interativo
 * substitui esta lista assim que o provedor for contratado, sem mudar
 * a busca/filtros por baixo.
 */
export function MapaScreen(): JSX.Element {
  const { theme } = useTheme();
  const { status, coords, requestLocation, setManualCoords } = useLocation();

  useEffect(() => {
    if (status === "idle") {
      void requestLocation();
    }
  }, [status, requestLocation]);

  const searchParams =
    coords && status === "granted"
      ? { ...coords, sortBy: "distancia" as const, pageSize: 20 }
      : null;
  const { data, isLoading, isError } = useTransportersSearch(searchParams);

  if (status === "idle" || status === "requesting") {
    return (
      <VehicleScreen>
        <View style={[styles.center, { gap: theme.spacing[4] }]}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ color: theme.colors.textMuted }}>Obtendo sua localização...</Text>
        </View>
      </VehicleScreen>
    );
  }

  if (status === "denied" || status === "error") {
    return <EnderecoManualScreen onConfirm={setManualCoords} />;
  }

  if (isLoading) {
    return (
      <VehicleScreen>
        <ActivityIndicator color={theme.colors.primary} />
      </VehicleScreen>
    );
  }

  if (isError) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível buscar transportadores agora. Tente novamente mais tarde.
        </Text>
        <VehicleButton label="Tentar novamente" onPress={() => void requestLocation()} />
      </VehicleScreen>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.textMuted }}>
          Nenhum transportador encontrado perto de você ainda.
        </Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <Text style={[styles.titulo, { color: theme.colors.text }]}>Transportadores próximos</Text>
      {data.items.map((transportador) => (
        <TransporterCard key={transportador.id} transportador={transportador} />
      ))}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  titulo: { fontSize: 18, fontWeight: "700" },
});
