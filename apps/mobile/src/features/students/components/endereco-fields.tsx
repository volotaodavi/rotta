import { VehicleTextField } from "@/features/vehicles/components";

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
 */
export function EnderecoFields({
  value,
  onChange,
}: {
  value: EnderecoForm;
  onChange: (value: EnderecoForm) => void;
}): JSX.Element {
  function setField(field: keyof EnderecoForm, text: string): void {
    onChange({ ...value, [field]: text });
  }

  return (
    <>
      <VehicleTextField
        label="CEP"
        value={value.cep}
        onChangeText={(text) => setField("cep", text)}
        keyboardType="numeric"
      />
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
