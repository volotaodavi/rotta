import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useRemoveVehicleDocument, useUploadVehicleDocument } from "../hooks/use-empresa-vehicles";

import type { EmpresaFrotaStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { VehicleDocumentType } from "@rotta/api-client";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useVehicleDocuments } from "@/features/vehicles/hooks/use-vehicles";
import {
  VEHICLE_DOCUMENT_AI_STATUS_LABEL,
  VEHICLE_DOCUMENT_AI_STATUS_TONE,
  VEHICLE_DOCUMENT_TYPE_LABEL,
} from "@/features/vehicles/labels";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaFrotaStackParamList, "Documentos">;

const TIPOS = Object.keys(VEHICLE_DOCUMENT_TYPE_LABEL) as VehicleDocumentType[];

/**
 * Frota — documentos do veículo (Frente 3b) — primeiro upload de
 * arquivo de todo o app mobile. Espelha `apps/web/.../veiculos/[id]`
 * (aba Documentos) em escopo reduzido: só fotos (câmera/galeria via
 * `expo-image-picker`, ver `app.config.ts`), a Web também aceita PDF
 * pros documentos maiores (laudo/CRLV) — fica de fora aqui de
 * propósito, não é o caminho mais comum no dia a dia pelo celular.
 *
 * `uploadDocument`/`removeDocument` esperam `File | Blob` (tipo
 * compartilhado com a Web) — o objeto `{uri, name, type}` que o
 * `expo-image-picker` devolve não é um `Blob` de verdade, mas é
 * exatamente o formato que o `FormData` do React Native sabe tratar
 * como arquivo (mesmo padrão usado em qualquer app RN com upload); o
 * cast abaixo só ajusta o tipo pro TypeScript aceitar.
 */
export function EmpresaVeiculoDocumentosScreen({ route }: Props): JSX.Element {
  const { theme } = useTheme();
  const { vehicleId } = route.params;
  const { data, isLoading, isError, refetch } = useVehicleDocuments(vehicleId);
  const uploadDocument = useUploadVehicleDocument(vehicleId);
  const removeDocument = useRemoveVehicleDocument(vehicleId);

  const [tipo, setTipo] = useState<VehicleDocumentType>("CRLV");
  const [vencimentoEm, setVencimentoEm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleEscolherArquivo(): Promise<void> {
    setError(null);
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setError("Permita o acesso às fotos pra anexar um documento.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    const asset = resultado.canceled ? undefined : resultado.assets[0];
    if (!asset) return;

    const file = {
      uri: asset.uri,
      name: asset.fileName ?? `documento-${Date.now()}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
    } as unknown as Blob;

    uploadDocument.mutate(
      { meta: { tipo, vencimentoEm: vencimentoEm.trim() || undefined }, file },
      {
        onSuccess: () => setVencimentoEm(""),
        onError: () => setError("Não foi possível enviar o documento. Tente novamente."),
      },
    );
  }

  return (
    <VehicleScreen>
      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Novo documento
        </Text>
        <View style={styles.chips}>
          {TIPOS.map((value) => (
            <VehicleButton
              key={value}
              label={VEHICLE_DOCUMENT_TYPE_LABEL[value]}
              variant={tipo === value ? "primary" : "secondary"}
              onPress={() => setTipo(value)}
            />
          ))}
        </View>
        <VehicleTextField
          label="Vencimento (opcional, AAAA-MM-DD)"
          value={vencimentoEm}
          onChangeText={setVencimentoEm}
          placeholder="2026-12-31"
        />
        {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
        <VehicleButton
          label="Escolher foto e enviar"
          onPress={() => void handleEscolherArquivo()}
          isLoading={uploadDocument.isPending}
        />
      </VehicleCard>

      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : isError ? (
        <View>
          <Text style={{ color: theme.colors.danger }}>
            Não foi possível carregar os documentos.
          </Text>
          <VehicleButton label="Tentar novamente" onPress={() => void refetch()} />
        </View>
      ) : !data || data.length === 0 ? (
        <Text style={{ color: theme.colors.textMuted }}>Nenhum documento enviado ainda.</Text>
      ) : (
        data.map((document) => (
          <VehicleCard key={document.id}>
            <View style={styles.linha}>
              <Text style={[styles.tipo, { color: theme.colors.text }]}>
                {VEHICLE_DOCUMENT_TYPE_LABEL[document.tipo]}
              </Text>
              <StatusPill
                label={VEHICLE_DOCUMENT_AI_STATUS_LABEL[document.rottaAiStatus]}
                tone={VEHICLE_DOCUMENT_AI_STATUS_TONE[document.rottaAiStatus]}
              />
            </View>
            {document.vencimentoEm ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                Vence em {new Date(document.vencimentoEm).toLocaleDateString("pt-BR")}
              </Text>
            ) : null}
            <VehicleButton
              label="Remover"
              variant="danger"
              isLoading={removeDocument.isPending && removeDocument.variables === document.id}
              onPress={() => removeDocument.mutate(document.id)}
            />
          </VehicleCard>
        ))
      )}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  linha: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  tipo: { fontSize: 15, fontWeight: "600" },
});
