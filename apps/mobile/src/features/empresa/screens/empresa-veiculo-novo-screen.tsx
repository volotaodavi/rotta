import { isValidPlate } from "@rotta/validators";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useCreateVehicle, useLookupVehicleByPlate } from "../hooks/use-empresa-vehicles";

import type { EmpresaFrotaStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { VehicleType } from "@rotta/api-client";

import {
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { VEHICLE_TYPE_LABEL } from "@/features/vehicles/labels";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaFrotaStackParamList, "Novo">;

const TIPOS = Object.keys(VEHICLE_TYPE_LABEL) as VehicleType[];

/**
 * Frota — cadastro de veículo (Frente 3b) — espelha
 * `apps/web/.../veiculos/novo/page.tsx` em escopo reduzido: sem
 * RENAVAM/chassi/observações (fica na Web), sem campo de categoria
 * (mesma decisão da Web — a IA sugere sozinha a partir de tipo +
 * capacidade). Mesmo autofill por placa: debounce de 500ms, só
 * preenche campo vazio, nunca sobrescreve o que já foi digitado,
 * silencioso quando não encontra nada.
 */
export function EmpresaVeiculoNovoScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const createVehicle = useCreateVehicle();
  const lookupByPlate = useLookupVehicleByPlate();

  const [placa, setPlaca] = useState("");
  const [modelo, setModelo] = useState("");
  const [marca, setMarca] = useState("");
  const [ano, setAno] = useState("");
  const [cor, setCor] = useState("");
  const [tipo, setTipo] = useState<VehicleType>("VAN");
  const [capacidade, setCapacidade] = useState("16");
  const [error, setError] = useState<string | null>(null);
  const lastLookedUpPlate = useRef<string | null>(null);

  useEffect(() => {
    const placaNormalizada = placa.trim().toUpperCase();
    if (!isValidPlate(placaNormalizada) || placaNormalizada === lastLookedUpPlate.current) return;

    const timer = setTimeout(() => {
      lastLookedUpPlate.current = placaNormalizada;
      lookupByPlate
        .mutateAsync(placaNormalizada)
        .then((result) => {
          setMarca((atual) => atual || result.marca || atual);
          setModelo((atual) => atual || result.modelo || atual);
          setCor((atual) => atual || result.cor || atual);
          setAno((atual) => atual || (result.ano ? String(result.ano) : atual));
        })
        .catch(() => {
          // Silencioso de propósito — mesmo comportamento da Web.
        });
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `lookupByPlate` é uma mutation (identidade nova a cada render); incluí-la reiniciaria o debounce a cada tecla.
  }, [placa]);

  function handleSubmit(): void {
    const placaNormalizada = placa.trim().toUpperCase();
    const capacidadeNumero = Number(capacidade);
    if (
      !isValidPlate(placaNormalizada) ||
      modelo.trim().length < 1 ||
      marca.trim().length < 1 ||
      !Number.isFinite(capacidadeNumero) ||
      capacidadeNumero < 1
    ) {
      setError("Preencha placa, modelo, marca e uma capacidade válida.");
      return;
    }
    setError(null);
    createVehicle.mutate(
      {
        placa: placaNormalizada,
        modelo: modelo.trim(),
        marca: marca.trim(),
        cor: cor.trim() || undefined,
        ano: ano.trim() ? Number(ano) : undefined,
        tipo,
        capacidadePassageiros: capacidadeNumero,
      },
      {
        onSuccess: (vehicle) => {
          navigation.replace("Detalhe", { vehicleId: vehicle.id });
        },
        onError: () => {
          setError("Não foi possível cadastrar o veículo. Confira os dados e tente novamente.");
        },
      },
    );
  }

  return (
    <VehicleScreen>
      <VehicleTextField
        label="Placa"
        value={placa}
        onChangeText={(value) => setPlaca(value.toUpperCase())}
        placeholder="ABC1D23"
        autoCapitalize="characters"
      />
      <VehicleTextField label="Modelo" value={modelo} onChangeText={setModelo} />
      <VehicleTextField label="Marca" value={marca} onChangeText={setMarca} />
      <VehicleTextField label="Ano" value={ano} onChangeText={setAno} keyboardType="number-pad" />
      <VehicleTextField label="Cor" value={cor} onChangeText={setCor} />
      <VehicleTextField
        label="Capacidade de passageiros"
        value={capacidade}
        onChangeText={setCapacidade}
        keyboardType="number-pad"
      />

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 14 }}>Tipo</Text>
        <View style={styles.chips}>
          {TIPOS.map((value) => (
            <VehicleButton
              key={value}
              label={VEHICLE_TYPE_LABEL[value]}
              variant={tipo === value ? "primary" : "secondary"}
              onPress={() => setTipo(value)}
            />
          ))}
        </View>
      </VehicleCard>

      <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
        A categoria (Escolar, Fretamento ou Executivo) é sugerida automaticamente depois do
        cadastro, a partir do tipo e da capacidade. Dá pra conferir e trocar na tela do veículo.
      </Text>

      {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}

      <VehicleButton
        label="Cadastrar veículo"
        onPress={handleSubmit}
        isLoading={createVehicle.isPending}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
