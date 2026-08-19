"use client";

import { AlertTriangle, ArrowLeft } from "@rotta/icons";
import { Button, Card, FormField, Input, Select, Typography } from "@rotta/ui/web";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import type { VehicleOccurrenceSeverity } from "@rotta/api-client";

import { useCreateVehicleOccurrence } from "@/features/vehicles/hooks/use-vehicles";

const OCORRENCIA_SEVERIDADE_LABEL: Record<VehicleOccurrenceSeverity, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
};

/**
 * "Ocorrência" — página cheia dedicada (Frente 302/303, 3 imagens de
 * referência anexadas pelo usuário — Responsável/Motorista/Monitor,
 * pedido explícito "quero o mesmo design, idêntico"). Antes era um
 * `Modal` aberto por cima da viagem ativa em `minha-rota/page.tsx`
 * (ver histórico do componente `RegistrarOcorrenciaButton` ali); a
 * referência do Monitor mostra "Ocorrência" como uma TELA própria, não
 * uma janela flutuante — mesmo endpoint real por trás (`POST
 * /vehicles/:id/occurrences`, já libera MOTORISTA/MONITOR no backend),
 * só a apresentação mudou. `veiculoId` chega pela URL (`?veiculoId=`,
 * o mesmo veículo da viagem de hoje) — sem ele, a tela avisa em vez de
 * deixar o formulário quebrado/sem destino.
 */
export default function OcorrenciaPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const veiculoId = searchParams.get("veiculoId") ?? "";

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [severidade, setSeveridade] = useState<VehicleOccurrenceSeverity>("BAIXA");
  const createOccurrence = useCreateVehicleOccurrence(veiculoId);

  function handleVoltar(): void {
    router.push("/minha-rota");
  }

  if (!veiculoId) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <button
          type="button"
          onClick={handleVoltar}
          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <Typography variant="bodySmall" color="muted">
          Nenhum veículo associado à viagem atual. Volte para &ldquo;Minha Rota&rdquo; e tente
          novamente.
        </Typography>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <button
        type="button"
        onClick={handleVoltar}
        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
          <AlertTriangle size={20} />
        </div>
        <Typography variant="title">Ocorrência</Typography>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <FormField label="Título" isRequired>
            <Input
              required
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Ex.: Pneu furado, aluno passou mal…"
            />
          </FormField>
          <FormField label="Descrição" isRequired>
            <Input
              required
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="Descreva o que aconteceu"
            />
          </FormField>
          <FormField label="Severidade">
            <Select
              value={severidade}
              onChange={(event) => setSeveridade(event.target.value as VehicleOccurrenceSeverity)}
            >
              {Object.entries(OCORRENCIA_SEVERIDADE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>
        </Card.Body>
      </Card>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        isLoading={createOccurrence.isPending}
        onClick={() => {
          if (!titulo || !descricao) return;
          createOccurrence.mutate({ titulo, descricao, severidade }, { onSuccess: handleVoltar });
        }}
      >
        Reportar ocorrência
      </Button>
      <Button variant="secondary" size="lg" fullWidth onClick={handleVoltar}>
        Cancelar
      </Button>
    </div>
  );
}
