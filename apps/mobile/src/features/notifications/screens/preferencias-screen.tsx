import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Switch, Text, View } from "react-native";

import {
  useNotificationPreference,
  useUpdateNotificationPreference,
} from "../hooks/use-notifications";

import {
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";


interface FormState {
  receberPush: boolean;
  receberWhatsapp: boolean;
  receberSms: boolean;
  receberEmail: boolean;
  silenciarFinsDeSemana: boolean;
  quietHoursInicio: string;
  quietHoursFim: string;
}

const CANAIS: {
  key: "receberPush" | "receberWhatsapp" | "receberSms" | "receberEmail";
  label: string;
}[] = [
  { key: "receberPush", label: "Push" },
  { key: "receberWhatsapp", label: "WhatsApp" },
  { key: "receberSms", label: "SMS" },
  { key: "receberEmail", label: "E-mail" },
];

/**
 * Preferências de canal + Quiet Hours (briefing "MÓDULO — ROTTA
 * COMMUNICATION ENGINE" §"PREFERÊNCIAS DE USUÁRIO"; Dossiê 11 §4.4/4.6)
 * — alcançada pelo cabeçalho de `Central` (Responsável) ou pelo Perfil
 * (demais papéis). Notificações de prioridade `EMERGENCIA` sempre
 * ignoram estas preferências (RN-17, aplicado no backend).
 */
export function PreferenciasScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data: preference, isLoading, isError } = useNotificationPreference();
  const updatePreference = useUpdateNotificationPreference();

  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (preference && form === null) {
      setForm({
        receberPush: preference.receberPush,
        receberWhatsapp: preference.receberWhatsapp,
        receberSms: preference.receberSms,
        receberEmail: preference.receberEmail,
        silenciarFinsDeSemana: preference.silenciarFinsDeSemana,
        quietHoursInicio: preference.quietHoursInicio ?? "",
        quietHoursFim: preference.quietHoursFim ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preference]);

  function handleSalvar(): void {
    if (!form) return;
    updatePreference.mutate({
      receberPush: form.receberPush,
      receberWhatsapp: form.receberWhatsapp,
      receberSms: form.receberSms,
      receberEmail: form.receberEmail,
      silenciarFinsDeSemana: form.silenciarFinsDeSemana,
      quietHoursInicio: form.quietHoursInicio.trim() || null,
      quietHoursFim: form.quietHoursFim.trim() || null,
    });
  }

  if (isLoading || !form) {
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
          Não foi possível carregar suas preferências. Tente novamente mais tarde.
        </Text>
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <VehicleCard>
        <Text style={[styles.secaoTitulo, { color: theme.colors.text }]}>
          Canais de recebimento
        </Text>
        {CANAIS.map((canal) => (
          <View key={canal.key} style={styles.switchRow}>
            <Text style={{ color: theme.colors.text }}>{canal.label}</Text>
            <Switch
              value={form[canal.key]}
              onValueChange={(value) =>
                setForm((current) => (current ? { ...current, [canal.key]: value } : current))
              }
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            />
          </View>
        ))}
      </VehicleCard>

      <VehicleCard>
        <Text style={[styles.secaoTitulo, { color: theme.colors.text }]}>Quiet Hours</Text>
        <View style={styles.switchRow}>
          <Text style={{ color: theme.colors.text }}>Silenciar aos fins de semana</Text>
          <Switch
            value={form.silenciarFinsDeSemana}
            onValueChange={(value) =>
              setForm((current) =>
                current ? { ...current, silenciarFinsDeSemana: value } : current,
              )
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
          Deixe os dois horários em branco para desativar o silêncio noturno. Notificações de
          emergência nunca são silenciadas.
        </Text>
        <VehicleTextField
          label="Início (HH:mm)"
          value={form.quietHoursInicio}
          onChangeText={(value) =>
            setForm((current) => (current ? { ...current, quietHoursInicio: value } : current))
          }
          placeholder="22:00"
          keyboardType="numbers-and-punctuation"
        />
        <VehicleTextField
          label="Fim (HH:mm)"
          value={form.quietHoursFim}
          onChangeText={(value) =>
            setForm((current) => (current ? { ...current, quietHoursFim: value } : current))
          }
          placeholder="06:00"
          keyboardType="numbers-and-punctuation"
        />
      </VehicleCard>

      <VehicleButton
        label="Salvar preferências"
        onPress={handleSalvar}
        isLoading={updatePreference.isPending}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  secaoTitulo: { fontSize: 15, fontWeight: "700" },
  switchRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
});
