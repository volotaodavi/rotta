import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import type { Coords } from "../hooks/use-location";

import { VehicleButton, VehicleScreen, VehicleTextField } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * Fallback de endereço manual (briefing "Marketplace" §"MAPA" —
 * "endereço manual: CEP, rua, número, cidade, estado") quando o
 * Responsável nega a permissão de localização. Sem provedor de
 * geocodificação contratado (mesmo stub honesto de
 * `RottaAiService.analyzeSchoolAddress`), o endereço digitado sozinho
 * NÃO produz coordenadas — por isso os campos de latitude/longitude
 * aqui são opcionais e explicitamente rotulados como "se você souber",
 * nunca calculados a partir do endereço. Sem eles, a busca por
 * transportadores próximos permanece indisponível — o motivo é exibido
 * de forma clara, nunca escondido.
 */
export function EnderecoManualScreen({
  onConfirm,
}: {
  onConfirm: (coords: Coords) => void;
}): JSX.Element {
  const { theme } = useTheme();
  const [cep, setCep] = useState("");
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const coordsValidas =
    latitude.trim().length > 0 &&
    longitude.trim().length > 0 &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude));

  return (
    <VehicleScreen>
      <Text style={[styles.titulo, { color: theme.colors.text }]}>Informe seu endereço</Text>
      <Text style={{ color: theme.colors.textMuted }}>
        Não conseguimos acessar sua localização automaticamente. Preencha seu endereço abaixo. Se
        você souber as coordenadas (latitude/longitude), informe-as para já poder buscar
        transportadores próximos.
      </Text>

      <VehicleTextField label="CEP" value={cep} onChangeText={setCep} keyboardType="numeric" />
      <VehicleTextField label="Rua" value={rua} onChangeText={setRua} />
      <VehicleTextField
        label="Número"
        value={numero}
        onChangeText={setNumero}
        keyboardType="numeric"
      />
      <VehicleTextField label="Cidade" value={cidade} onChangeText={setCidade} />
      <VehicleTextField label="Estado (UF)" value={estado} onChangeText={setEstado} maxLength={2} />

      <Text style={{ color: theme.colors.textMuted, fontSize: theme.typography.caption.fontSize }}>
        Coordenadas (opcional: a Rotta ainda não geocodifica endereços automaticamente)
      </Text>
      <VehicleTextField
        label="Latitude"
        value={latitude}
        onChangeText={setLatitude}
        keyboardType="numeric"
        placeholder="ex: -23.561684"
      />
      <VehicleTextField
        label="Longitude"
        value={longitude}
        onChangeText={setLongitude}
        keyboardType="numeric"
        placeholder="ex: -46.655981"
      />

      {!coordsValidas ? (
        <Text style={{ color: theme.colors.warning }}>
          Sem coordenadas, ainda não é possível buscar transportadores próximos ao seu endereço.
        </Text>
      ) : null}

      <VehicleButton
        label="Buscar transportadores"
        disabled={!coordsValidas}
        onPress={() => onConfirm({ latitude: Number(latitude), longitude: Number(longitude) })}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: 18, fontWeight: "700" },
});
