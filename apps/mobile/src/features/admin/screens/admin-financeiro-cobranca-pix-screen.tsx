import { ApiError } from "@rotta/api-client";
import { useState } from "react";
import { Image, StyleSheet, Text } from "react-native";

import { useAdminPixChargeStatus, useCreateAdminPixCharge } from "../hooks/use-admin-billing";
import { PIX_CHARGE_STATUS_LABEL } from "../labels";

import {
  StatusPill,
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

function PixChargeResult({
  chargeId,
  onNova,
}: {
  chargeId: string;
  onNova: () => void;
}): JSX.Element {
  const { theme } = useTheme();
  const { data: status } = useAdminPixChargeStatus(chargeId, true);

  if (!status) {
    return <Text style={{ color: theme.colors.textMuted }}>Carregando QR Code…</Text>;
  }

  const imagemQrCode = status.brCodeBase64.startsWith("data:")
    ? status.brCodeBase64
    : `data:image/png;base64,${status.brCodeBase64}`;

  return (
    <VehicleCard style={styles.qrCard}>
      <StatusPill
        label={PIX_CHARGE_STATUS_LABEL[status.status] ?? status.status}
        tone={status.status === "PAID" ? "success" : "neutral"}
      />
      <Image source={{ uri: imagemQrCode }} style={styles.qrImage} />
      <Text style={[styles.valorGrande, { color: theme.colors.text }]}>
        {centsToBRL(status.amount)}
      </Text>
      <Text style={{ color: theme.colors.textMuted, fontSize: 12, textAlign: "center" }}>
        Código copia-e-cola (toque e segure pra selecionar e copiar):
      </Text>
      <Text
        selectable
        style={[styles.codigoPix, { color: theme.colors.text, borderColor: theme.colors.border }]}
      >
        {status.brCode}
      </Text>
      <VehicleButton label="Gerar outra cobrança" variant="secondary" onPress={onNova} />
    </VehicleCard>
  );
}

/**
 * Cobrança Pix avulsa gerada pelo Admin (pedido do usuário 05/09/2026:
 * "financeiro completo" — espelha `PixChargeCard`, apps/admin). Sem
 * vínculo com mensalidade de nenhuma empresa; GERAL e FINANCEIRO
 * acionam (é um recebível, nunca dinheiro saindo — diferente da
 * Transferência). QR Code renderizado via `data:` URI direto no
 * `Image` (RN aceita nativamente) — sem copiar pro clipboard (nenhuma
 * dependência nova só por isso); o texto é selecionável.
 */
export function AdminFinanceiroCobrancaPixScreen(): JSX.Element {
  const { theme } = useTheme();
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [nomePagador, setNomePagador] = useState("");
  const [cpfCnpjPagador, setCpfCnpjPagador] = useState("");
  const [emailPagador, setEmailPagador] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [chargeId, setChargeId] = useState<string | null>(null);

  const createCharge = useCreateAdminPixCharge();

  const valorCentavos = Math.round(Number(valor.replace(",", ".")) * 100);
  const formularioValido =
    Number.isFinite(valorCentavos) &&
    valorCentavos > 0 &&
    nomePagador.trim().length > 0 &&
    cpfCnpjPagador.trim().length > 0;

  function handleGerar(): void {
    if (!formularioValido) {
      setError("Informe um valor maior que zero, o nome e o CPF/CNPJ de quem vai pagar.");
      return;
    }
    setError(null);
    createCharge.mutate(
      {
        valorCentavos,
        descricao: descricao || undefined,
        nomePagador: nomePagador.trim(),
        cpfCnpjPagador: cpfCnpjPagador.trim(),
        emailPagador: emailPagador.trim() || undefined,
      },
      {
        onSuccess: (checkout) => setChargeId(checkout.id),
        onError: (err) =>
          setError(errorMessage(err, "Não foi possível gerar a cobrança. Tente novamente.")),
      },
    );
  }

  function handleNova(): void {
    setChargeId(null);
    setValor("");
    setDescricao("");
    setNomePagador("");
    setCpfCnpjPagador("");
    setEmailPagador("");
  }

  if (chargeId) {
    return (
      <VehicleScreen>
        <PixChargeResult chargeId={chargeId} onNova={handleNova} />
      </VehicleScreen>
    );
  }

  return (
    <VehicleScreen>
      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
        Cobrança avulsa, não vinculada à mensalidade de nenhuma empresa — pra receber qualquer valor
        por Pix direto na conta Asaas da Rotta.
      </Text>

      <VehicleTextField
        label="Valor (R$)"
        keyboardType="decimal-pad"
        value={valor}
        onChangeText={(v) => setValor(v.replace(/[^\d,.]/g, ""))}
        placeholder="0,00"
      />
      <VehicleTextField
        label="Nome do pagador"
        value={nomePagador}
        onChangeText={setNomePagador}
        placeholder="Nome completo"
      />
      <VehicleTextField
        label="CPF/CNPJ do pagador"
        value={cpfCnpjPagador}
        onChangeText={setCpfCnpjPagador}
        placeholder="Só números"
        keyboardType="number-pad"
      />
      <VehicleTextField
        label="E-mail (opcional)"
        value={emailPagador}
        onChangeText={setEmailPagador}
        placeholder="pagador@exemplo.com"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <VehicleTextField
        label="Descrição (opcional)"
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Motivo da cobrança"
      />

      {error ? <Text style={{ color: theme.colors.danger, fontSize: 12 }}>{error}</Text> : null}

      <VehicleButton
        label="Gerar cobrança"
        isLoading={createCharge.isPending}
        onPress={handleGerar}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  codigoPix: { borderRadius: 8, borderWidth: 1, fontSize: 11, padding: 10, width: "100%" },
  qrCard: { alignItems: "center", gap: 10 },
  qrImage: { borderRadius: 8, height: 200, width: 200 },
  valorGrande: { fontSize: 22, fontWeight: "700" },
});
