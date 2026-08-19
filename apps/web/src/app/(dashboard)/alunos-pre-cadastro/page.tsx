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
  Spinner,
  Typography,
} from "@rotta/ui/web";
import { useState, type FormEvent } from "react";


import type {
  CreateStudentPreRegistrationInput,
  StudentPreRegistrationStatus,
} from "@rotta/api-client";
import type { BadgeVariant } from "@rotta/ui/web";

import {
  useCancelStudentPreRegistration,
  useCreateStudentPreRegistration,
  useStudentPreRegistrations,
} from "@/features/students/hooks/use-student-pre-registrations";

const STATUS_LABEL: Record<StudentPreRegistrationStatus, string> = {
  PENDENTE: "Aguardando o responsável",
  RECLAMADO: "Responsável já iniciou o cadastro",
  CONCLUIDO: "Cadastro concluído",
  CANCELADO: "Cancelado",
};

const STATUS_VARIANT: Record<StudentPreRegistrationStatus, BadgeVariant> = {
  PENDENTE: "neutral",
  RECLAMADO: "info",
  CONCLUIDO: "success",
  CANCELADO: "danger",
};

const INITIAL_FORM: CreateStudentPreRegistrationInput = {
  nomeAluno: "",
  nomeResponsavel: "",
  celularResponsavel: "",
};

/**
 * Pré-cadastro de aluno + responsável pela transportadora (pedido do
 * usuário: "no painel do admin deverá ter essa opção de cadastrar
 * alunos por transporte + responsável (nome do aluno, nome do
 * responsável + número do celular responsável)"). O Responsável
 * completa o cadastro depois, no próprio app/web dele, informando o
 * código da transportadora (`Company.codigoInterno`, já mostrado em
 * "Minha Empresa") + o mesmo celular — ver `/vincular-transporte`.
 */
export default function AlunosPreCadastroPage(): JSX.Element {
  const { data: items, isLoading, isError, refetch, isFetching } = useStudentPreRegistrations();
  const createPreRegistration = useCreateStudentPreRegistration();
  const cancelPreRegistration = useCancelStudentPreRegistration();

  const [form, setForm] = useState<CreateStudentPreRegistrationInput>(INITIAL_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function updateField<K extends keyof CreateStudentPreRegistrationInput>(
    key: K,
    value: CreateStudentPreRegistrationInput[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createPreRegistration.mutateAsync(form);
      setForm(INITIAL_FORM);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao pré-cadastrar o aluno.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography variant="title">Pré-cadastro de alunos</Typography>
        <Typography variant="bodySmall" color="muted">
          Cadastre o nome do aluno e o nome/celular do responsável antes mesmo de ele ter conta na
          Rotta. Quando o responsável informar o código da sua empresa + o mesmo celular, o cadastro
          dele já aparece com o nome do aluno preenchido.
        </Typography>
      </div>

      <Card>
        <Card.Header title="Novo pré-cadastro" />
        <form onSubmit={(event) => void handleSubmit(event)}>
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Nome do aluno" isRequired>
              <Input
                required
                value={form.nomeAluno}
                onChange={(event) => updateField("nomeAluno", event.target.value)}
              />
            </FormField>
            <FormField label="Nome do responsável" isRequired>
              <Input
                required
                value={form.nomeResponsavel}
                onChange={(event) => updateField("nomeResponsavel", event.target.value)}
              />
            </FormField>
            <FormField label="Celular do responsável" isRequired>
              <Input
                required
                placeholder="(11) 98888-7777"
                value={form.celularResponsavel}
                onChange={(event) => updateField("celularResponsavel", event.target.value)}
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
              Pré-cadastrar
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
              message="Não foi possível carregar os pré-cadastros."
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          ) : !items || items.length === 0 ? (
            <Typography variant="body" color="muted">
              Nenhum pré-cadastro ainda.
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
                      {item.nomeAluno}
                    </Typography>
                    <Typography variant="caption" color="muted">
                      Responsável: {item.nomeResponsavel} · {item.celularResponsavel}
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
