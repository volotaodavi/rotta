"use client";

import { Badge, Button, Card, FormField, Input, Table, Typography, useToast } from "@rotta/ui/web";
import { useState } from "react";

import type { ContractInvoiceStatus } from "@rotta/api-client";

import { ContaDeRecebimentoCard } from "@/features/family-billing/components/conta-de-recebimento-card";
import {
  useContaDeRecebimento,
  useCriarSubcontaAsaas,
  useFaturasDaEmpresa,
  useSalvarContaDeRecebimento,
} from "@/features/family-billing/hooks/use-family-billing";

const ROTULO_DO_STATUS: Record<ContractInvoiceStatus, string> = {
  A_VENCER: "A vencer",
  PAGA: "Paga",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
  ESTORNADA: "Estornada",
};

const TOM_DO_STATUS: Record<ContractInvoiceStatus, "success" | "warning" | "danger" | "neutral"> = {
  A_VENCER: "warning",
  PAGA: "success",
  VENCIDA: "danger",
  CANCELADA: "neutral",
  ESTORNADA: "neutral",
};

const FILTROS: Array<{ id: ContractInvoiceStatus | "TODAS"; label: string }> = [
  { id: "TODAS", label: "Todas" },
  { id: "A_VENCER", label: "A vencer" },
  { id: "VENCIDA", label: "Vencidas" },
  { id: "PAGA", label: "Pagas" },
];

/** `AAAA-MM-DD` -> `DD/MM/AAAA`, sem passar por `new Date` (é um dia, não um instante). */
function diaBrasileiro(dia: string): string {
  return dia.split("-").reverse().join("/");
}

/**
 * Mensalidades das famílias — as contas a receber da transportadora.
 *
 * É o outro lado da mesma fatura que o Responsável vê no app. Não
 * confundir com `/assinatura`, que é a transportadora pagando a Rotta
 * pela plataforma: aqui quem paga é a família, e quem recebe é a
 * transportadora.
 *
 * O repasse acontece de dois jeitos, e a página diz qual está valendo em
 * vez de deixar implícito: com a subconta Asaas cadastrada, o dinheiro
 * cai direto na conta da transportadora (split); sem ela, cai na conta
 * da Rotta e vira saldo no Rotta Pay, que a transportadora saca.
 */
export default function MensalidadesPage(): JSX.Element {
  const toast = useToast();
  const [filtro, setFiltro] = useState<ContractInvoiceStatus | "TODAS">("TODAS");
  const { data, isLoading } = useFaturasDaEmpresa({
    status: filtro === "TODAS" ? undefined : filtro,
  });
  const { data: conta, isLoading: contaCarregando } = useContaDeRecebimento();
  const salvarConta = useSalvarContaDeRecebimento();
  const criarSubconta = useCriarSubcontaAsaas();
  const [chavePix, setChavePix] = useState("");

  function salvar(): void {
    if (!chavePix.trim()) {
      toast.error("Informe a chave Pix.");
      return;
    }
    salvarConta.mutate(
      { chavePix: chavePix.trim() },
      {
        onSuccess: () => toast.success("Chave Pix salva."),
        onError: () => toast.error("Não foi possível salvar a chave Pix."),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography variant="headline">Mensalidades</Typography>
        <Typography variant="bodySmall" color="muted">
          O que as famílias devem pelo transporte. Quem cobra é a sua transportadora: a Rotta só
          emite e acompanha.
        </Typography>
      </div>

      <ContaDeRecebimentoCard
        conta={conta}
        isLoading={contaCarregando}
        isAbrindoConta={criarSubconta.isPending}
        onAbrirConta={async (input) => {
          const aberta = await criarSubconta.mutateAsync(input);
          toast.success("Conta aberta. A análise costuma levar até dois dias úteis.");
          return aberta;
        }}
      />

      <Card>
        <Card.Header title="Chave Pix para saque" />
        <Card.Body className="flex flex-col gap-4">
          {/* Continua valendo com a conta de recebimento aberta: é por
              aqui que sai o saldo que já entrou no Rotta Pay antes
              dela, e o que entrar se o repasse direto for desligado. */}
          <Typography variant="bodySmall" color="muted">
            Para onde o saldo do seu Rotta Pay é transferido quando você pede saque.
          </Typography>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <FormField label="Chave Pix">
                <Input
                  value={chavePix}
                  onChange={(event) => setChavePix(event.target.value)}
                  placeholder={conta?.chavePix ?? "CPF, CNPJ, e-mail, telefone ou chave aleatória"}
                />
              </FormField>
            </div>
            <Button onClick={salvar} isLoading={salvarConta.isPending}>
              Salvar
            </Button>
          </div>
        </Card.Body>
      </Card>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            onClick={() => setFiltro(opcao.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filtro === opcao.id
                ? "bg-primary text-white"
                : "bg-muted text-text-muted hover:text-text"
            }`}
          >
            {opcao.label}
          </button>
        ))}
      </div>

      <Table
        columns={[
          { key: "aluno", header: "Aluno", render: (fatura) => fatura.studentNome },
          {
            key: "competencia",
            header: "Competência",
            render: (fatura) => fatura.competenciaRotulo,
          },
          {
            key: "vencimento",
            header: "Vencimento",
            render: (fatura) => diaBrasileiro(fatura.vencimento),
          },
          { key: "valor", header: "Valor", render: (fatura) => fatura.valorFormatado },
          {
            key: "status",
            header: "Situação",
            render: (fatura) => (
              <Badge variant={TOM_DO_STATUS[fatura.status]}>
                {ROTULO_DO_STATUS[fatura.status]}
              </Badge>
            ),
          },
          {
            key: "pago",
            header: "Pago em",
            render: (fatura) =>
              fatura.pagoEm ? new Date(fatura.pagoEm).toLocaleDateString("pt-BR") : "—",
          },
        ]}
        rows={data?.items ?? []}
        keyExtractor={(fatura) => fatura.id}
        emptyMessage={
          isLoading
            ? "Carregando…"
            : "Nenhuma mensalidade emitida ainda. As faturas são geradas no começo de cada mês, a partir dos contratos ativos."
        }
      />
    </div>
  );
}
