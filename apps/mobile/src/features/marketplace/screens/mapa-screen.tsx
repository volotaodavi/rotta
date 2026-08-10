import { Check, MapPin, Search, X } from "@rotta/icons/native";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/native";
import { BottomSheet, Timeline } from "@rotta/ui/native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TransporterCard } from "../components/transporter-card";
import { useLocation } from "../hooks/use-location";
import { useSchoolsSearch } from "../hooks/use-school-picker";
import { useResponsavelTransportState } from "../hooks/use-transport-state";
import { useTransportersSearch } from "../hooks/use-transporters";
import { buildContratoSteps, buildSolicitacaoSteps } from "../timeline-steps";

import { EnderecoManualScreen } from "./endereco-manual-screen";
import { AcompanhamentoSection } from "./transporte-inicio-screen";

import type { ParentTabParamList, MarketplaceStackParamList } from "@/navigation/types";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { School, SearchTransportersParams } from "@rotta/api-client";

import { VehicleButton, VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<MarketplaceStackParamList, "MapaHome">;

type SortBy = NonNullable<SearchTransportersParams["sortBy"]>;

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "distancia", label: "Mais perto" },
  { value: "avaliacao", label: "Melhor avaliação" },
  { value: "mensalidade", label: "Menor mensalidade" },
];

/**
 * "Mapa" — Home do Responsável (Prompt "UX/UI Master do Marketplace da
 * Rotta": "o mapa sempre será o protagonista"). Reescrita a partir da
 * versão anterior (busca por proximidade + filtros dentro de uma
 * ScrollView com um mapa pequeno de 220px no topo) para o fluxo
 * "busca-primeiro-pela-escola" pedido pelo Prompt — mesma navegação,
 * mesmos hooks/dados: `escolaId` já era um filtro real de
 * `SearchTransportersParams`/`GET /marketplace/transporters` (Dossiê
 * 16, nunca usado por esta tela até agora) e `School.latitude/longitude`
 * já existiam — nenhuma mudança de backend foi necessária para este
 * fluxo.
 *
 * O mapa agora ocupa a tela inteira (nunca reduzido a um card); a busca
 * de escola e a lista de transportadores flutuam por cima dele (barra
 * de busca fixa no topo, `BottomSheet` na base) — ver Dossiê 37 §3 para
 * o raciocínio completo e o que fica de fora desta primeira entrega
 * (ex.: múltiplos snap-points do Bottom Sheet, câmera acompanhando o
 * veículo).
 */
export function MapaScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { status, coords, requestLocation, setManualCoords } = useLocation();
  const transportState = useResponsavelTransportState();
  const [sortBy, setSortBy] = useState<SortBy>("distancia");
  const [apenasVerificados, setApenasVerificados] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [sheetOpen, setSheetOpen] = useState(true);

  useEffect(() => {
    if (status === "idle") {
      void requestLocation();
    }
  }, [status, requestLocation]);

  const { data: schoolResults } = useSchoolsSearch(schoolQuery);
  const schoolsComCoordenada = useMemo(
    () => (schoolResults?.items ?? []).filter((school) => school.latitude && school.longitude),
    [schoolResults],
  );

  const searchParams: SearchTransportersParams | null =
    coords && status === "granted"
      ? {
          ...coords,
          sortBy,
          apenasVerificados: apenasVerificados || undefined,
          escolaId: selectedSchool?.id,
          pageSize: 20,
        }
      : null;
  const { data, isLoading, isError } = useTransportersSearch(searchParams);

  // Estado 2 — painel operacional (Prompt "UX/UI Master do Marketplace"
  // §HOME): quando o Responsável já tem uma solicitação/contrato em
  // andamento, a aba "Mapa" deixa de ser busca-primeiro e passa a
  // resumir o estado real do transporte — antes do gate de localização
  // abaixo, já que acompanhar o transporte não depende da localização
  // do próprio Responsável.
  if (
    !transportState.isLoading &&
    transportState.state !== "SEM_TRANSPORTE" &&
    transportState.state !== "CONTRATO_ENCERRADO"
  ) {
    return <MapaEstadoOperacional navigation={navigation} />;
  }

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

  function handleSelectSchool(school: School): void {
    setSelectedSchool(school);
    setSchoolQuery("");
    setSheetOpen(true);
  }

  function handleClearSchool(): void {
    setSelectedSchool(null);
    setSchoolQuery("");
  }

  const markers: RottaMapMarker[] = coords
    ? [
        { id: "origem", titulo: "Você está aqui", ...coords },
        ...(schoolQuery.trim().length > 0
          ? schoolsComCoordenada.map((school) => ({
              id: school.id,
              titulo: school.nomeOficial,
              latitude: school.latitude as number,
              longitude: school.longitude as number,
            }))
          : selectedSchool && selectedSchool.latitude && selectedSchool.longitude
            ? [
                {
                  id: selectedSchool.id,
                  titulo: selectedSchool.nomeOficial,
                  latitude: selectedSchool.latitude,
                  longitude: selectedSchool.longitude,
                },
              ]
            : []),
      ]
    : [];

  const sheetTitle = selectedSchool
    ? `Transportadores que atendem ${selectedSchool.nomeFantasia ?? selectedSchool.nomeOficial}`
    : "Transportadores próximos";

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <RottaMap
        markers={markers}
        initialCenter={
          selectedSchool?.latitude && selectedSchool.longitude
            ? { latitude: selectedSchool.latitude, longitude: selectedSchool.longitude }
            : (coords ?? undefined)
        }
        initialZoom={13}
        onMarkerPress={(marker) => {
          const school = schoolsComCoordenada.find((item) => item.id === marker.id);
          if (school) handleSelectSchool(school);
        }}
      />

      <View style={[styles.topOverlay, { paddingTop: insets.top + theme.spacing[3] }]}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.full },
          ]}
        >
          <Search size={18} color={theme.colors.textMuted} />
          <TextInput
            value={
              selectedSchool
                ? (selectedSchool.nomeFantasia ?? selectedSchool.nomeOficial)
                : schoolQuery
            }
            onChangeText={(text) => {
              if (selectedSchool) setSelectedSchool(null);
              setSchoolQuery(text);
            }}
            placeholder="Para qual escola seu filho vai?"
            placeholderTextColor={theme.colors.placeholder}
            style={[styles.searchInput, { color: theme.colors.text }]}
          />
          {selectedSchool || schoolQuery.length > 0 ? (
            <Pressable
              onPress={handleClearSchool}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
            >
              <X size={18} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {schoolQuery.trim().length > 0 && !selectedSchool ? (
          <View
            style={[
              styles.resultsCard,
              { backgroundColor: theme.colors.surfaceElevated, borderRadius: theme.radius.lg },
            ]}
          >
            {(schoolResults?.items ?? []).length === 0 ? (
              <Text style={[styles.resultsEmpty, { color: theme.colors.textMuted }]}>
                Nenhuma escola encontrada com esse nome.
              </Text>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" style={styles.resultsList}>
                {(schoolResults?.items ?? []).map((school) => (
                  <Pressable
                    key={school.id}
                    onPress={() => handleSelectSchool(school)}
                    style={[styles.resultRow, { borderColor: theme.colors.border }]}
                  >
                    <MapPin size={16} color={theme.colors.textMuted} />
                    <View style={styles.resultText}>
                      <Text style={[styles.resultNome, { color: theme.colors.text }]}>
                        {school.nomeOficial}
                      </Text>
                      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                        {school.cidade}/{school.estado}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        ) : null}
      </View>

      {!sheetOpen ? (
        <Pressable
          onPress={() => setSheetOpen(true)}
          style={[
            styles.reabrirPill,
            { backgroundColor: theme.colors.primary, borderRadius: theme.radius.full },
          ]}
        >
          <Text style={styles.reabrirLabel}>Ver lista</Text>
        </Pressable>
      ) : null}

      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        theme={theme}
        title={sheetTitle}
      >
        <ScrollView contentContainerStyle={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
          {!selectedSchool ? (
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
          ) : null}

          {isLoading ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : isError ? (
            <>
              <Text style={{ color: theme.colors.danger }}>
                Não foi possível buscar transportadores agora. Tente novamente mais tarde.
              </Text>
              <VehicleButton label="Tentar novamente" onPress={() => void requestLocation()} />
            </>
          ) : !data || data.items.length === 0 ? (
            <Text style={{ color: theme.colors.textMuted }}>
              {selectedSchool
                ? "Nenhum transportador atende esta escola ainda."
                : "Nenhum transportador encontrado perto de você ainda."}
            </Text>
          ) : (
            data.items.map((transportador) => (
              <Pressable
                key={transportador.id}
                onPress={() =>
                  navigation.navigate("TransportadorDetalhes", {
                    transportadorId: transportador.id,
                  })
                }
              >
                <TransporterCard transportador={transportador} />
              </Pressable>
            ))
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

/**
 * Home Estado 2 — "painel operacional" (Prompt "UX/UI Master do
 * Marketplace" §HOME: "quando o Responsável já tem transporte
 * contratado... o mapa mostra veículo/rota/motorista/monitor/ETA em
 * tempo real"). Em vez de fundir literalmente as abas "Mapa" e
 * "Transporte" numa única Home (mudança maior de navegação, registrada
 * como gap no Dossiê 37 §4 e deixada fora desta entrega), o conteúdo da
 * própria aba "Mapa" se adapta ao estado real do Responsável
 * (`useResponsavelTransportState`) e reaproveita a mesma
 * `AcompanhamentoSection`/`Timeline`/`buildSolicitacaoSteps`/
 * `buildContratoSteps` já usadas pela aba "Transporte" — nunca duas
 * fontes de verdade divergentes sobre em que etapa o Responsável está.
 * "Ver detalhes completos" leva para a aba "Transporte" (mesmo padrão
 * de navegação cross-tab de `solicitar-transporte-screen.tsx`).
 */
function MapaEstadoOperacional({ navigation }: { navigation: Props["navigation"] }): JSX.Element {
  const { theme } = useTheme();
  const {
    state,
    contratoAtivo,
    ultimoContrato,
    solicitacoesPendentes,
    solicitacaoAprovadaSemContrato,
  } = useResponsavelTransportState();

  function handleVerDetalhes(): void {
    navigation.getParent<BottomTabNavigationProp<ParentTabParamList>>()?.navigate("Transporte");
  }

  return (
    <VehicleScreen>
      <Text style={[styles.tituloEstado, { color: theme.colors.text }]}>
        {state === "TRANSPORTE_ATIVO" ? "Transporte a caminho" : "Seu transporte"}
      </Text>

      {state === "SOLICITACAO_PENDENTE"
        ? solicitacoesPendentes.map((request) => (
            <VehicleCard key={request.id}>
              <Timeline steps={buildSolicitacaoSteps(request)} theme={theme} />
            </VehicleCard>
          ))
        : null}

      {state === "AGUARDANDO_CONTRATO" ? (
        <VehicleCard>
          <Timeline steps={buildContratoSteps(ultimoContrato ?? null)} theme={theme} />
          {solicitacaoAprovadaSemContrato ? (
            <Text style={{ color: theme.colors.textMuted, marginTop: theme.spacing[2] }}>
              Sua solicitação foi aprovada. O transportador vai gerar o contrato em breve.
            </Text>
          ) : null}
        </VehicleCard>
      ) : null}

      {state === "TRANSPORTE_ATIVO" && contratoAtivo ? (
        <AcompanhamentoSection contrato={contratoAtivo} />
      ) : null}

      <VehicleButton label="Ver detalhes completos" onPress={handleVerDetalhes} />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  container: { flex: 1 },
  filtrosRow: { flexDirection: "row", flexWrap: "wrap" },
  reabrirLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  reabrirPill: {
    alignSelf: "center",
    bottom: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    position: "absolute",
  },
  resultNome: { fontWeight: "600" },
  resultRow: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingVertical: 10,
  },
  resultText: { flex: 1 },
  resultsCard: { marginTop: 8, maxHeight: 260, padding: 8 },
  resultsEmpty: { padding: 12, textAlign: "center" },
  resultsList: {},
  searchBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 15 },
  tituloEstado: { fontSize: 18, fontWeight: "700" },
  topOverlay: { left: 16, position: "absolute", right: 16, top: 0 },
});
