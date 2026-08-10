import { Check } from "@rotta/icons/native";
import { RottaMap } from "@rotta/maps/native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";


import { TransporterCard } from "../components/transporter-card";
import { useLocation } from "../hooks/use-location";
import { useTransportersSearch } from "../hooks/use-transporters";

import { EnderecoManualScreen } from "./endereco-manual-screen";

import type { MarketplaceStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { SearchTransportersParams } from "@rotta/api-client";

import { VehicleButton, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<MarketplaceStackParamList, "MapaHome">;

type SortBy = NonNullable<SearchTransportersParams["sortBy"]>;

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "distancia", label: "Mais perto" },
  { value: "avaliacao", label: "Melhor avaliação" },
  { value: "mensalidade", label: "Menor mensalidade" },
];

/**
 * "Mapa" (briefing "Marketplace" §"MAPA"/"FILTROS") — tela padrão sempre
 * que o Responsável abre o app (primeira tela da stack da aba `Mapa`).
 * Solicita localização automaticamente ao entrar; se negada, cai no
 * fallback de endereço manual.
 *
 * Mapa real via `@rotta/maps/native`, mas só com o marcador da própria
 * localização do Responsável — `TransporterCard` (busca de
 * transportadores) não expõe `latitude`/`longitude` do transportador
 * (decisão deliberada de privacidade da busca, não uma lacuna desta
 * tela: a distância já vem calculada pelo backend em `distanciaKm`,
 * sem vazar o endereço-base de cada empresa). A lista abaixo do mapa
 * continua sendo o mecanismo real de descoberta/seleção de
 * transportadores, sem mudar a busca/filtros por baixo.
 */
export function MapaScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { status, coords, requestLocation, setManualCoords } = useLocation();
  const [sortBy, setSortBy] = useState<SortBy>("distancia");
  const [apenasVerificados, setApenasVerificados] = useState(false);

  useEffect(() => {
    if (status === "idle") {
      void requestLocation();
    }
  }, [status, requestLocation]);

  const searchParams =
    coords && status === "granted"
      ? { ...coords, sortBy, apenasVerificados: apenasVerificados || undefined, pageSize: 20 }
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

  const mapaCabecalho = coords && (
    <View style={styles.mapaCabecalho}>
      <RottaMap
        markers={[{ id: "origem", titulo: "Você está aqui", ...coords }]}
        initialCenter={coords}
        initialZoom={13}
      />
    </View>
  );

  const filtros = (
    <View style={{ gap: theme.spacing[2] }}>
      <View style={[styles.filtrosRow, { gap: theme.spacing[2] }]}>
        {SORT_OPTIONS.map((option) => (
          <VehicleButton
            key={option.value}
            label={option.label}
            variant={sortBy === option.value ? "primary" : "secondary"}
            onPress={() => setSortBy(option.value)}
          />
        ))}
      </View>
      <VehicleButton
        label="Somente verificados"
        icon={apenasVerificados ? <Check size={16} color="#FFFFFF" /> : undefined}
        variant={apenasVerificados ? "primary" : "secondary"}
        onPress={() => setApenasVerificados((prev) => !prev)}
      />
    </View>
  );

  if (isLoading) {
    return (
      <VehicleScreen>
        {mapaCabecalho}
        {filtros}
        <ActivityIndicator color={theme.colors.primary} />
      </VehicleScreen>
    );
  }

  if (isError) {
    return (
      <VehicleScreen>
        {mapaCabecalho}
        {filtros}
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
        {mapaCabecalho}
        {filtros}
        <Text style={{ color: theme.colors.textMuted }}>
          Nenhum transportador encontrado perto de você ainda.
        </Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      {mapaCabecalho}
      {filtros}
      <Text style={[styles.titulo, { color: theme.colors.text }]}>Transportadores próximos</Text>
      {data.items.map((transportador) => (
        <Pressable
          key={transportador.id}
          onPress={() =>
            navigation.navigate("TransportadorDetalhes", { transportadorId: transportador.id })
          }
        >
          <TransporterCard transportador={transportador} />
        </Pressable>
      ))}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  filtrosRow: { flexDirection: "row", flexWrap: "wrap" },
  mapaCabecalho: { borderRadius: 12, height: 220, overflow: "hidden" },
  titulo: { fontSize: 18, fontWeight: "700" },
});
