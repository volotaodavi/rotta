import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/native";
import { FilterTabs, SectionHeader } from "@rotta/ui/native";
import { formatarCentavos, reaisParaCentavos } from "@rotta/utils";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useCreateAdminTransfer } from "../hooks/use-admin-billing";
import { PIX_KEY_TYPE_LABEL } from "../labels";

import type { PixKeyType } from "@rotta/api-client";

import { Texto } from "@/components/texto";
import {
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

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
 *
 * ## O que mudou em 16/10/2026
 *
 * Os cinco chips de tipo de chave Pix eram `Pressable` cru, sem
 * `accessibilityRole` nem `accessibilityState`: para o leitor de tela,
 * cinco textos soltos, sem dizer qual estava escolhido, numa tela que
 * move dinheiro de verdade. Agora são `FilterTabs`, o mesmo componente
 * das abas de fatura do responsável.
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
        <Texto style={{ color: theme.colors.danger }}>
          Transferências são restritas ao papel Geral.
        </Texto>
      </VehicleScreen>
    );
  }

  /* `reaisParaCentavos` e não `Number(valor.replace(",", "."))`:
     `replace` com string troca só a primeira ocorrência, e em
     notação brasileira o ponto é separador de milhar. "1.234"
     virava 1,234 reais e depois 123 centavos. */
  const valorCentavos = reaisParaCentavos(valor);
  const formularioValido =
    valorCentavos !== null && valorCentavos > 0 && chavePix.trim().length > 0;

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
    /* `formularioValido` já garante isto, mas o tipo não atravessa a
       fronteira da função, e um `!` aqui seria a mesma afirmação sem a
       checagem. Numa tela que move dinheiro, a checagem fica. */
    if (valorCentavos === null) return;
    createTransfer.mutate(
      { valorCentavos, chavePix: chavePix.trim(), tipoChavePix, descricao: descricao || undefined },
      {
        onSuccess: (transfer) => {
          setConfirmando(false);
          setValor("");
          setChavePix("");
          setDescricao("");
          setSuccess(
            `Transferência de ${formatarCentavos(valorCentavos)} criada (status: ${transfer.status}). A confirmação final chega por webhook e pode levar alguns minutos.`,
          );
        },
        onError: (err) => {
          setConfirmando(false);
          setError(errorMessage(err, "Não foi possível criar a transferência. Tente novamente."));
        },
      },
    );
  }

  if (confirmando && valorCentavos !== null) {
    return (
      <VehicleScreen>
        <SectionHeader title="Confirmar transferência" theme={theme} />
        <VehicleCard>
          <Texto style={{ color: theme.colors.text, fontWeight: "600" }}>
            Confirmar transferência de {formatarCentavos(valorCentavos)} para a chave{" "}
            {PIX_KEY_TYPE_LABEL[tipoChavePix].toLowerCase()} {chavePix}?
          </Texto>
          <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            Essa ação move dinheiro de verdade pra fora da conta da Rotta e fica registrada na
            Auditoria.
          </Texto>
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

      {/*
        Os chips desenhados à mão aqui viraram `FilterTabs`: é a mesma
        escolha de um entre poucos, com o mesmo desenho das abas de
        fatura do responsável, e um `Pressable` sem `accessibilityRole`
        nem `accessibilityState` não dizia ao leitor de tela qual tipo
        de chave estava selecionado.
      */}
      <View style={styles.chipsContainer}>
        <Texto style={{ color: theme.colors.textMuted, fontSize: 12, fontWeight: "600" }}>
          Tipo de chave
        </Texto>
        <FilterTabs
          options={TIPOS.map((tipo) => ({ key: tipo, label: PIX_KEY_TYPE_LABEL[tipo] }))}
          value={tipoChavePix}
          onChange={(chave) => setTipoChavePix(chave as PixKeyType)}
          theme={theme}
        />
      </View>

      <VehicleTextField
        label="Descrição (opcional)"
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Motivo da transferência"
      />

      {error ? <Texto style={{ color: theme.colors.danger, fontSize: 12 }}>{error}</Texto> : null}
      {success ? (
        <Texto style={{ color: theme.colors.success, fontSize: 12 }}>{success}</Texto>
      ) : null}

      <VehicleButton label="Transferir" onPress={handleIniciar} />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  chipsContainer: { gap: 6 },
});
