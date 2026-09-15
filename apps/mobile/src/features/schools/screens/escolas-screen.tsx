import { ChevronRight, School as SchoolIcon } from "@rotta/icons/native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useSchoolsList } from "../hooks/use-schools";
import { SCHOOL_STATUS_LABEL, SCHOOL_STATUS_TONE } from "../labels";

import type { VeiculoStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { School } from "@rotta/api-client";

import { useLocation } from "@/features/marketplace/hooks/use-location";
import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * Distância em km entre duas coordenadas (fórmula de Haversine). A
 * referência mostra "Centro · 1,2 km" em cada escola, e o endpoint de
 * LISTA não devolve distância (só o de BUSCA por proximidade,
 * `distanciaKm`, que exige mandar coordenadas) — mas a escola já traz
 * `latitude`/`longitude` e o app já sabe a posição do usuário, então o
 * cálculo é feito aqui com dado real, sem consulta nova.
 */
function distanciaKm(
  origem: { latitude: number; longitude: number },
  destino: { latitude: number; longitude: number },
): number {
  const RAIO_TERRA_KM = 6371;
  const rad = (grau: number): number => (grau * Math.PI) / 180;
  const dLat = rad(destino.latitude - origem.latitude);
  const dLon = rad(destino.longitude - origem.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(origem.latitude)) * Math.cos(rad(destino.latitude)) * Math.sin(dLon / 2) ** 2;
  return RAIO_TERRA_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatarDistancia(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace(".", ",")} km`;
}

type Props = NativeStackScreenProps<VeiculoStackParamList, "Escolas">;

/**
 * "Escolas" (briefing "APP MOBILE" do módulo Escolas) — lista as
 * escolas vinculadas às rotas de quem está logado. Somente leitura
 * (briefing "PERMISSÕES") — reutiliza `VehicleCard`/`VehicleScreen`/
 * `StatusPill` de `features/vehicles` (componentes genéricos de UI, sem
 * lógica de veículo) em vez de duplicá-los. A mesma tela atende
 * Motorista/Monitor e Responsável (ver `ParentPerfilStackParamList`).
 *
 * Layout da referência (tela 14, 15/09/2026): campo de busca no topo e
 * uma LINHA por escola — ícone em quadrado tingido + nome + "bairro ·
 * distância" + seta —, em vez de um cartão por escola com cidade/UF e
 * selo de status.
 *
 * Duas diferenças deliberadas em relação à imagem:
 *
 * - A pill "Favoritas" NÃO entrou: favoritar escola não existe no
 *   produto (nem campo na API, nem nada no módulo do backend). Uma pill
 *   que não filtra nada é pior que a ausência dela.
 * - O selo de status só aparece quando a escola NÃO está ativa. A
 *   referência não mostra status nenhum, mas esconder "inativa" de quem
 *   depende da escola seria perder informação real; mostrar só a exceção
 *   mantém a lista limpa sem omitir o que importa.
 */
export function EscolasScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useSchoolsList();
  const [busca, setBusca] = useState("");
  const { status: statusLocalizacao, coords, requestLocation } = useLocation();

  useEffect(() => {
    if (statusLocalizacao === "idle") {
      void requestLocation();
    }
  }, [statusLocalizacao, requestLocation]);

  const escolas = useMemo(() => {
    const todas = data?.items ?? [];
    const termo = busca.trim().toLowerCase();
    const filtradas = termo
      ? todas.filter((escola) =>
          [escola.nomeOficial, escola.nomeFantasia, escola.bairro, escola.cidade]
            .filter(Boolean)
            .some((campo) => (campo as string).toLowerCase().includes(termo)),
        )
      : todas;

    // "Próximas" é a ordem da referência — só dá pra ordenar assim com a
    // localização concedida; sem ela a lista fica na ordem da API, nunca
    // uma distância inventada pra poder ordenar.
    if (!coords) return filtradas;
    return [...filtradas].sort((a, b) => {
      const da =
        a.latitude && a.longitude
          ? distanciaKm(coords, { latitude: a.latitude, longitude: a.longitude })
          : Infinity;
      const db =
        b.latitude && b.longitude
          ? distanciaKm(coords, { latitude: b.latitude, longitude: b.longitude })
          : Infinity;
      return da - db;
    });
  }, [data?.items, busca, coords]);

  function subtitulo(escola: School): string {
    const partes = [escola.bairro];
    if (coords && escola.latitude && escola.longitude) {
      partes.push(
        formatarDistancia(
          distanciaKm(coords, { latitude: escola.latitude, longitude: escola.longitude }),
        ),
      );
    }
    return partes.filter(Boolean).join(" · ");
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>
          Não foi possível carregar as escolas. Tente novamente mais tarde.
        </Text>
        <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <VehicleTextField
        label="Buscar escola"
        value={busca}
        onChangeText={setBusca}
        placeholder="Nome, bairro ou cidade"
      />

      {escolas.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>
          {busca.trim()
            ? "Nenhuma escola encontrada para essa busca."
            : "Nenhuma escola vinculada às suas rotas ainda."}
        </Text>
      ) : (
        <VehicleCard style={styles.lista}>
          {escolas.map((escola, index) => (
            <Pressable
              key={escola.id}
              onPress={() => navigation.navigate("EscolaDetalhes", { schoolId: escola.id })}
              accessibilityRole="button"
              style={[
                styles.linha,
                index > 0
                  ? {
                      borderTopColor: theme.colors.border,
                      borderTopWidth: StyleSheet.hairlineWidth,
                    }
                  : null,
              ]}
            >
              <View style={[styles.iconeQuadrado, { backgroundColor: theme.colors.primaryMuted }]}>
                <SchoolIcon size={20} color={theme.colors.primary} />
              </View>

              <View style={styles.linhaTexto}>
                <Text style={[styles.nome, { color: theme.colors.text }]} numberOfLines={1}>
                  {escola.nomeFantasia ?? escola.nomeOficial}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 12 }} numberOfLines={1}>
                  {subtitulo(escola)}
                </Text>
              </View>

              {escola.status !== "ATIVA" ? (
                <StatusPill
                  label={SCHOOL_STATUS_LABEL[escola.status]}
                  tone={SCHOOL_STATUS_TONE[escola.status]}
                />
              ) : null}
              <ChevronRight size={18} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </VehicleCard>
      )}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  iconeQuadrado: {
    alignItems: "center",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  linha: { alignItems: "center", flexDirection: "row", gap: 12, paddingVertical: 12 },
  linhaTexto: { flex: 1, gap: 2 },
  lista: { gap: 0, paddingVertical: 0 },
  nome: { fontSize: 15, fontWeight: "600" },
});
