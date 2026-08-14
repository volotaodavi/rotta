"use client";

import { ApiError } from "@rotta/api-client";
import { Button, Card, FormField, Input, Select, Typography } from "@rotta/ui/web";
import { isValidPlate } from "@rotta/validators";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import type { CreateVehicleInput } from "@rotta/api-client";

import { useCreateVehicle, useLookupVehicleByPlate } from "@/features/vehicles/hooks/use-vehicles";
import { VEHICLE_CATEGORY_LABEL, VEHICLE_TYPE_LABEL } from "@/features/vehicles/labels";

const INITIAL_STATE: CreateVehicleInput = {
  placa: "",
  modelo: "",
  marca: "",
  cor: "",
  capacidadePassageiros: 16,
  tipo: "VAN",
  categoria: "ESCOLAR",
  observacoes: "",
};

/** Cadastro de Veículo (briefing "CADASTRO") — sempre no tenant da Empresa/Gestor autenticado. */
export default function NovoVeiculoPage(): JSX.Element {
  const router = useRouter();
  const createVehicle = useCreateVehicle();
  const lookupByPlate = useLookupVehicleByPlate();
  const [form, setForm] = useState<CreateVehicleInput>(INITIAL_STATE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [plateLookupMessage, setPlateLookupMessage] = useState<string | null>(null);
  /** Última placa já buscada (normalizada) — evita disparar a mesma busca de novo a cada tecla enquanto o usuário continua digitando outra coisa no campo. */
  const lastLookedUpPlate = useRef<string | null>(null);

  function updateField<K extends keyof CreateVehicleInput>(
    key: K,
    value: CreateVehicleInput[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  /**
   * "Tire o botão de 'buscar placa', deixe automático. Colocou a placa,
   * já salvou." (pedido do usuário) — sem botão nenhum: assim que a
   * placa digitada forma um formato válido (`isValidPlate`,
   * `@rotta/validators` — o mesmo validador usado no backend), dispara a
   * busca sozinha depois de um debounce de 500ms (dá tempo da pessoa
   * terminar de digitar o último caractere sem disparar uma chamada por
   * tecla). Nunca sobrescreve o que a empresa já digitou (só preenche
   * campo vazio), e nunca bloqueia o cadastro quando o provedor não está
   * configurado neste ambiente (`VehiclePlateLookupService`, backend) —
   * a mensagem deixa isso explícito em vez de fingir que a busca
   * simplesmente não achou nada.
   */
  useEffect(() => {
    const placa = form.placa.trim().toUpperCase();
    if (!isValidPlate(placa) || placa === lastLookedUpPlate.current) return;

    const timer = setTimeout(() => {
      lastLookedUpPlate.current = placa;
      setPlateLookupMessage(null);
      lookupByPlate
        .mutateAsync(placa)
        .then((result) => {
          setForm((current) => ({
            ...current,
            marca: current.marca || result.marca || current.marca,
            modelo: current.modelo || result.modelo || current.modelo,
            cor: current.cor || result.cor || current.cor,
            ano: current.ano ?? result.ano ?? current.ano,
          }));
          if (!result.marca && !result.modelo && !result.ano && !result.cor) {
            setPlateLookupMessage("O provedor não devolveu dados pra essa placa.");
          }
        })
        .catch((error: unknown) => {
          setPlateLookupMessage(
            error instanceof ApiError
              ? error.message
              : "Não foi possível buscar a placa agora. Preencha os dados manualmente.",
          );
        });
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `lookupByPlate` é uma mutation do react-query (identidade nova a cada render); incluí-la reiniciaria o debounce a cada tecla.
  }, [form.placa]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const vehicle = await createVehicle.mutateAsync(form);
      router.replace(`/veiculos/${vehicle.id}`);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao cadastrar veículo.",
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Typography variant="title">Novo veículo</Typography>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
        <Card>
          <Card.Header title="Dados do veículo" />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Placa"
              isRequired
              helperText={
                plateLookupMessage ??
                (lookupByPlate.isPending ? "Buscando dados da placa…" : undefined)
              }
            >
              <Input
                required
                placeholder="ABC1D23"
                value={form.placa}
                onChange={(event) => updateField("placa", event.target.value.toUpperCase())}
              />
            </FormField>
            <FormField label="Modelo" isRequired>
              <Input
                required
                value={form.modelo}
                onChange={(event) => updateField("modelo", event.target.value)}
              />
            </FormField>
            <FormField label="Marca">
              <Input
                value={form.marca}
                onChange={(event) => updateField("marca", event.target.value)}
              />
            </FormField>
            <FormField label="Ano">
              <Input
                type="number"
                value={form.ano ?? ""}
                onChange={(event) =>
                  updateField("ano", event.target.value ? Number(event.target.value) : undefined)
                }
              />
            </FormField>
            <FormField label="Cor">
              <Input
                value={form.cor}
                onChange={(event) => updateField("cor", event.target.value)}
              />
            </FormField>
            <FormField label="RENAVAM">
              <Input
                value={form.renavam ?? ""}
                onChange={(event) => updateField("renavam", event.target.value)}
              />
            </FormField>
            <FormField label="Chassi">
              <Input
                value={form.chassi ?? ""}
                onChange={(event) => updateField("chassi", event.target.value)}
              />
            </FormField>
            <FormField label="Tipo" isRequired>
              <Select
                required
                value={form.tipo}
                onChange={(event) =>
                  updateField("tipo", event.target.value as CreateVehicleInput["tipo"])
                }
              >
                {Object.entries(VEHICLE_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Categoria">
              <Select
                value={form.categoria}
                onChange={(event) =>
                  updateField("categoria", event.target.value as CreateVehicleInput["categoria"])
                }
              >
                {Object.entries(VEHICLE_CATEGORY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Capacidade de passageiros"
              isRequired
              helperText="Validada automaticamente contra a faixa esperada do tipo escolhido."
            >
              <Input
                type="number"
                required
                min={1}
                max={90}
                value={form.capacidadePassageiros}
                onChange={(event) =>
                  updateField("capacidadePassageiros", Number(event.target.value))
                }
              />
            </FormField>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header title="Observações" />
          <Card.Body>
            <FormField label="Observações">
              <Input
                value={form.observacoes ?? ""}
                onChange={(event) => updateField("observacoes", event.target.value)}
              />
            </FormField>
          </Card.Body>
          <Card.Footer>
            {errorMessage && (
              <Typography variant="bodySmall" color="danger" className="mr-auto">
                {errorMessage}
              </Typography>
            )}
            <Button type="submit" variant="primary" isLoading={createVehicle.isPending}>
              Cadastrar veículo
            </Button>
          </Card.Footer>
        </Card>
      </form>
    </div>
  );
}
