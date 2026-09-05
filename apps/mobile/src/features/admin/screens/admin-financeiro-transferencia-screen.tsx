import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";


import { useCreateAdminTransfer } from "../hooks/use-admin-billing";
import { PIX_KEY_TYPE_LABEL } from "../labels";

import type { PixKeyType } from "@rotta/api-client";

import {
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

const TIPOS: PixKeyType[] = ["EMAIL", "CPF", "CNPJ", "PHONE", "EVP"];

/**
 * Transferência Pix pra fora da conta da Rotta (pedido do usuário
 * 05/09/2026: "financeiro completo") — espelha `TransferForm`
 * (apps/admin): confirmação em duas etapas (dinheiro de verdade não
 * sai de um toque só) e mesma mensagem de acompanhamento por webhook.
 * Só chega aqui quem já é `AdminRottaPapel.GERAL` (botão só aparece pra
 * esse papel em `AdminFinanceiroOverviewScreen`) — o backend
 * (`AdminAreaGuard`) é quem realmente barra o papel Financeiro, esta
 * checagem é só pra nem mostrar a tela.
 */
export function AdminFinanceiroTransferenciaScreen(): JSX.Element {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [valor, setValor] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [tipoChavePix, setTipoChavePix] = useState<PixKeyType>("EMAIL");
  const [descricao, setDescricao] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const createTransfer = useCreateAdminTransfer();

  if ((user?.adminPapel ?? "GERAL") !== "GERAL") {
    return (
      <VehicleScreen>
        <Text style={{ color: theme.colors.danger }}>
          Transferências são restritas ao papel Geral.
        </Text>
      </VehicleScreen>
    );
  }

  const valorCentavos = Math.round(Number(valor.replace(",", ".")) * 100);
  const formularioValido =
    Number.isFinite(valorCentavos) && valorCentavos > 0 && chavePix.trim().length > 0;

  function handleIniciar(): void {
    setSuccess(null);
    if (!formularioValido) {
      setError("Informe um valor maior que zero e a chave Pix de destino.");
      return;
    }
    setError(null);
    setConfirmando(true);
  }

  function handleConfirmar(): void {
    createTransfer.mutate(
      { valorCentavos, chavePix: chavePix.trim(), tipoChavePix, descricao: descricao || undefined },
      {
        onSuccess: (transfer) => {
          setConfirmando(false);
          setValor("");
          setChavePix("");
          setDescricao("");
          setSuccess(
            `Transferência de ${centsToBRL(valorCentavos)} criada (status: ${transfer.status}). A confirmação final chega por webhook — pode levar alguns minutos.`,
          );
        },
        onError: (err) => {
          setConfirmando(false);
          setError(errorMessage(err, "Não foi possível criar a transferência. Tente novamente."));
        },
      },
    );
  }

  if (confirmando) {
    return (
      <VehicleScreen>
        <VehicleCard>
          <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
            Confirmar transferência de {centsToBRL(valorCentavos)} para a chave{" "}
            {PIX_KEY_TYPE_LABEL[tipoChavePix].toLowerCase()} {chavePix}?
          </Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            Essa ação move dinheiro de verdade pra fora da conta da Rotta e fica registrada na
            Auditoria.
          </Text>
        </VehicleCard>
        <VehicleButton
          label="Confirmar e transferir"
          isLoading={createTransfer.isPending}
          onPress={handleConfirmar}
        />
        <VehicleButton
          label="Cancelar"
          variant="secondary"
          disabled={createTransfer.isPending}
          onPress={() => setConfirmando(false)}
        />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <VehicleTextField
        label="Valor (R$)"
        keyboardType="decimal-pad"
        value={valor}
        onChangeText={(v) => setValor(v.replace(/[^\d,.]/g, ""))}
        placeholder="0,00"
      />
      <VehicleTextField
        label="Chave Pix de destino"
        value={chavePix}
        onChangeText={setChavePix}
        placeholder="e-mail, CPF/CNPJ, telefone..."
        autoCapitalize="none"
      />

      <View style={styles.chipsContainer}>
        <Text style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: "600" }}>
          Tipo de chave
        </Text>
        <View style={styles.chips}>
          {TIPOS.map((tipo) => {
            const selecionado = tipo === tipoChavePix;
            return (
              <Pressable
                key={tipo}
                onPress={() => setTipoChavePix(tipo)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selecionado
                      ? theme.colors.primary
                      : theme.colors.surfaceElevated,
                    borderColor: selecionado ? theme.colors.primary : theme.colors.border,
                  },
                ]}
              >
                <Text style={{ color: selecionado ? "#FFFFFF" : theme.colors.text, fontSize: 12 }}>
                  {PIX_KEY_TYPE_LABEL[tipo]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <VehicleTextField
        label="Descrição (opcional)"
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Motivo da transferência"
      />

      {error ? <Text style={{ color: theme.colors.danger, fontSize: 12 }}>{error}</Text> : null}
      {success ? (
        <Text style={{ color: theme.colors.success, fontSize: 12 }}>{success}</Text>
      ) : null}

      <VehicleButton label="Transferir" onPress={handleIniciar} />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipsContainer: { gap: 6 },
});
