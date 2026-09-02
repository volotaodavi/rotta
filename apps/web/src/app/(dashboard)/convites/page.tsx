"use client";

import { ApiError } from "@rotta/api-client";
import { X } from "@rotta/icons";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  Select,
  Spinner,
  Typography,
} from "@rotta/ui/web";
import { useState, type FormEvent } from "react";


import type {
  CompanyJoinPreRegistrationStatus,
  CreateCompanyJoinPreRegistrationInput,
  Role,
} from "@rotta/api-client";
import type { BadgeVariant } from "@rotta/ui/web";

import {
  useCancelJoinPreRegistration,
  useCreateJoinPreRegistration,
  useJoinPreRegistrations,
} from "@/features/team/hooks/use-join-pre-registrations";

const STATUS_LABEL: Record<CompanyJoinPreRegistrationStatus, string> = {
  PENDENTE: "Aguardando a pessoa entrar",
  VINCULADO: "Já entrou (vínculo automático)",
  CANCELADO: "Cancelado",
};

const STATUS_VARIANT: Record<CompanyJoinPreRegistrationStatus, BadgeVariant> = {
  PENDENTE: "neutral",
  VINCULADO: "success",
  CANCELADO: "danger",
};

const PAPEL_LABEL: Record<string, string> = {
  motorista: "Motorista",
  monitor: "Monitor",
};

const INITIAL_FORM: CreateCompanyJoinPreRegistrationInput = {
  role: "motorista" as Role,
  nome: "",
  celular: "",
};

/**
 * "Convites" (pedido do usuário 02/09/2026: "Não deve ser automático
 * [o acesso]... aparecerá no painel de gestão da transportadora em
 * questão o pedido de credenciamento (caso os dados dela já não
 * estejam pré-preenchidos). Caso o gestor já tenha pré-preenchido
 * (número de celular, nome ou alguma outra informação)... ele será
 * aceito automaticamente"). O gestor pré-cadastra o celular e/ou o
 * nome de quem já sabe que vai contratar — quando essa pessoa informar
 * o código da empresa (mesmo fluxo de sempre, "Informar código da
 * transportadora"), o vínculo é criado na hora, sem passar pelos
 * "Pedidos de vínculo pendentes" de "Equipe". Sem pré-cadastro
 * batendo, cai no fluxo manual de sempre.
 */
export default function ConvitesPage(): JSX.Element {
  const { data: items, isLoading, isError, refetch, isFetching } = useJoinPreRegistrations();
  const createPreRegistration = useCreateJoinPreRegistration();
  const cancelPreRegistration = useCancelJoinPreRegistration();

  const [form, setForm] = useState<CreateCompanyJoinPreRegistrationInput>(INITIAL_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateField<K extends keyof CreateCompanyJoinPreRegistrationInput>(
    key: K,
    value: CreateCompanyJoinPreRegistrationInput[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    if (!form.nome?.trim() && !form.celular?.trim()) {
      setErrorMessage("Informe ao menos o nome ou o celular da pessoa.");
      return;
    }
    try {
      await createPreRegistration.mutateAsync(form);
      setForm(INITIAL_FORM);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao criar o convite.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography variant="title">Convites</Typography>
        <Typography variant="bodySmall" color="muted">
          Pré-cadastre o celular e/ou o nome de um motorista ou monitor que você já sabe que vai
          contratar. Quando essa pessoa informar o código da sua empresa pra entrar, o vínculo é
          liberado automaticamente, sem precisar aprovar manualmente. Sem pré-cadastro, o pedido cai
          em &ldquo;Pedidos de vínculo pendentes&rdquo; na tela Equipe, como sempre.
        </Typography>
      </div>

      <Card>
        <Card.Header title="Novo convite" />
        <form onSubmit={(event) => void handleSubmit(event)}>
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Papel" isRequired>
              <Select
                value={form.role}
                onChange={(event) => updateField("role", event.target.value as Role)}
              >
                <option value="motorista">Motorista</option>
                <option value="monitor">Monitor</option>
              </Select>
            </FormField>
            <FormField label="Nome" helperText="Pelo menos um: nome ou celular">
              <Input
                value={form.nome}
                onChange={(event) => updateField("nome", event.target.value)}
              />
            </FormField>
            <FormField label="Celular" helperText="Pelo menos um: nome ou celular">
              <Input
                placeholder="(11) 98888-7777"
                value={form.celular}
                onChange={(event) => updateField("celular", event.target.value)}
              />
            </FormField>
          </Card.Body>
          <Card.Footer>
            {errorMessage ? (
              <Typography variant="bodySmall" color="danger" className="mr-auto">
                {errorMessage}
              </Typography>
            ) : null}
            <Button type="submit" variant="primary" isLoading={createPreRegistration.isPending}>
              Criar convite
            </Button>
          </Card.Footer>
        </form>
      </Card>

      <Card>
        <Card.Body>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : isError ? (
            <ErrorState
              message="Não foi possível carregar os convites."
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          ) : !items || items.length === 0 ? (
            <Typography variant="body" color="muted">
              Nenhum convite ainda.
            </Typography>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <Typography variant="bodySmall" className="font-semibold">
                      {item.nome || "Sem nome informado"}
                    </Typography>
                    <Typography variant="caption" color="muted">
                      {PAPEL_LABEL[item.role] ?? item.role}
                      {item.celular ? ` · ${item.celular}` : ""}
                    </Typography>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                    {item.status === "PENDENTE" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        iconLeft={<X className="h-4 w-4" />}
                        isLoading={
                          cancelPreRegistration.isPending &&
                          cancelPreRegistration.variables === item.id
                        }
                        onClick={() => cancelPreRegistration.mutate(item.id)}
                      >
                        Cancelar
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
