import { Text } from "react-native";

import { VehicleTextField } from "@/features/vehicles/components";
import { useCepLookup } from "@/hooks/use-cep-lookup";
import { useTheme } from "@/providers/theme-provider";

export interface EnderecoForm {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export const ENDERECO_VAZIO: EnderecoForm = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

export function enderecoCompleto(endereco: EnderecoForm): boolean {
  return (
    endereco.cep.trim().length > 0 &&
    endereco.logradouro.trim().length > 0 &&
    endereco.numero.trim().length > 0 &&
    endereco.bairro.trim().length > 0 &&
    endereco.cidade.trim().length > 0 &&
    endereco.estado.trim().length > 0
  );
}

/** Concatena um `EnderecoForm` completo pra geocodificação (`useGeocodeAddress`) — `null` se ainda incompleto. */
export function enderecoParaGeocodificar(endereco: EnderecoForm): string | null {
  return enderecoCompleto(endereco)
    ? `${endereco.logradouro}, ${endereco.numero}, ${endereco.bairro}, ${endereco.cidade}, ${endereco.estado}, ${endereco.cep}`
    : null;
}

/**
 * Campos de endereço (CEP/rua/número/complemento/bairro/cidade/UF) —
 * extraído de `solicitar-transporte-screen.tsx` (Frente 2, "Meus
 * Alunos" completo) pra ser reaproveitado também no cadastro de aluno
 * isolado (`aluno-novo-screen.tsx`) e no "Endereço do dia"
 * (`aluno-endereco-do-dia-screen.tsx`) — mesmos campos, sem duplicar.
 *
 * Preenchimento pelo CEP (15/09/2026, pedido do usuário: "colocando o
 * CEP, a IA ia saber onde é e colocar a informação no mapa") — assim que
 * o CEP fica com 8 dígitos, ViaCEP preenche rua/bairro/cidade/UF
 * sozinho, e só resta digitar o número. A Web e o Admin já faziam isso
 * (`use-cep-lookup.ts`); o app não, e quem cadastrava pelo celular
 * digitava esses 4 campos à mão DUAS vezes (embarque e desembarque).
 *
 * Esta é a primeira metade do caminho até o mapa. A segunda é a
 * geocodificação (`useGeocodeAddress` -> `POST /geo/geocode`, Rotta Geo
 * Engine/Nominatim no servidor), que a tela de cadastro já chama ao
 * salvar: é ela que transforma o endereço em latitude/longitude e faz a
 * parada aparecer no mapa e na lista do motorista.
 */
export function EnderecoFields({
  value,
  onChange,
}: {
  value: EnderecoForm;
  onChange: (value: EnderecoForm) => void;
}): JSX.Element {
  const { theme } = useTheme();
  const { lookup, isLoading, notFound } = useCepLookup();

  function setField(field: keyof EnderecoForm, text: string): void {
    onChange({ ...value, [field]: text });
  }

  async function handleCepChange(text: string): Promise<void> {
    const proximo = { ...value, cep: text };
    onChange(proximo);

    // Só consulta com o CEP completo — evita uma requisição por tecla.
    if (text.replace(/\D/g, "").length !== 8) return;

    const encontrado = await lookup(text);
    if (!encontrado) return;

    // Mantém o que a pessoa já digitou: o CEP preenche o que está vazio,
    // nunca sobrescreve uma correção feita à mão. `numero` e
    // `complemento` o ViaCEP não tem como saber.
    onChange({
      ...proximo,
      logradouro: proximo.logradouro || encontrado.endereco,
      bairro: proximo.bairro || encontrado.bairro,
      cidade: proximo.cidade || encontrado.cidade,
      estado: proximo.estado || encontrado.estado,
    });
  }

  return (
    <>
      <VehicleTextField
        label="CEP"
        value={value.cep}
        onChangeText={(text) => void handleCepChange(text)}
        keyboardType="numeric"
      />
      {isLoading ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Buscando endereço…</Text>
      ) : null}
      {notFound ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
          CEP não encontrado. Preencha o endereço à mão.
        </Text>
      ) : null}
      <VehicleTextField
        label="Rua"
        value={value.logradouro}
        onChangeText={(text) => setField("logradouro", text)}
      />
      <VehicleTextField
        label="Número"
        value={value.numero}
        onChangeText={(text) => setField("numero", text)}
        keyboardType="numeric"
      />
      <VehicleTextField
        label="Complemento (opcional)"
        value={value.complemento}
        onChangeText={(text) => setField("complemento", text)}
      />
      <VehicleTextField
        label="Bairro"
        value={value.bairro}
        onChangeText={(text) => setField("bairro", text)}
      />
      <VehicleTextField
        label="Cidade"
        value={value.cidade}
        onChangeText={(text) => setField("cidade", text)}
      />
      <VehicleTextField
        label="Estado (UF)"
        value={value.estado}
        onChangeText={(text) => setField("estado", text)}
        maxLength={2}
      />
    </>
  );
}
