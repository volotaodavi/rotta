"use client";

import { ApiError } from "@rotta/api-client";
import { MapPin, Trash2 } from "@rotta/icons";
import {
  Button,
  Card,
  ErrorState,
  FormField,
  Input,
  Select,
  Spinner,
  Typography,
  buttonVariants,
} from "@rotta/ui/web";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import type { SchoolShift, StudentSex, UpdateStudentInput } from "@rotta/api-client";

import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import {
  useDeleteStudent,
  useStudent,
  useUpdateStudent,
} from "@/features/students/hooks/use-students";
import { STUDENT_SEX_LABEL } from "@/features/students/labels";

/**
 * Detalhes/edição de um Aluno. Endereços de embarque/desembarque são
 * mostrados como referência (mudam raramente e reaproveitar o form
 * completo de `/alunos/novo` aqui dobraria o tamanho desta tela sem um
 * pedido real por isso) — os campos que realmente mudam com frequência
 * (turno, observações de saúde) são editáveis diretamente.
 */
export default function AlunoDetalhePage(): JSX.Element {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const studentId = params.id;
  const { data: student, isLoading, isError, refetch, isFetching } = useStudent(studentId);
  const updateStudent = useUpdateStudent(studentId);
  const deleteStudent = useDeleteStudent();

  const [form, setForm] = useState<UpdateStudentInput>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!student) return;
    setForm({
      nome: student.nome,
      dataNascimento: student.dataNascimento.slice(0, 10),
      sexo: student.sexo,
      turno: student.turno,
      necessidadesEspeciais: student.necessidadesEspeciais ?? "",
      medicamentos: student.medicamentos ?? "",
      observacoes: student.observacoes ?? "",
    });
  }, [student]);

  function updateField<K extends keyof UpdateStudentInput>(
    key: K,
    value: UpdateStudentInput[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await updateStudent.mutateAsync(form);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao salvar as alterações.",
      );
    }
  }

  async function handleDelete(): Promise<void> {
    try {
      await deleteStudent.mutateAsync(studentId);
      router.replace("/alunos");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao remover o aluno.",
      );
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  /** Achado real (auditoria "tá dando erro"): sem isso, uma falha na busca deixava a tela presa num spinner infinito, sem erro visível nem botão de tentar de novo. */
  if (isError || !student) {
    return (
      <ErrorState
        message="Não foi possível carregar este aluno."
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Typography variant="title">{student.nome}</Typography>
        <Link href={`/alunos/${studentId}/mapa`} className={buttonVariants({ variant: "primary" })}>
          <MapPin className="h-4 w-4" />
          Ver localização ao vivo
        </Link>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
        <Card>
          <Card.Header title="Dados do aluno" />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField label="Nome completo" isRequired>
                <Input
                  required
                  value={form.nome ?? ""}
                  onChange={(event) => updateField("nome", event.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Data de nascimento" isRequired>
              <Input
                required
                type="date"
                value={form.dataNascimento ?? ""}
                onChange={(event) => updateField("dataNascimento", event.target.value)}
              />
            </FormField>
            <FormField label="Sexo" isRequired>
              <Select
                required
                value={form.sexo}
                onChange={(event) => updateField("sexo", event.target.value as StudentSex)}
              >
                {Object.entries(STUDENT_SEX_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Turno" isRequired>
              <Select
                required
                value={form.turno}
                onChange={(event) => updateField("turno", event.target.value as SchoolShift)}
              >
                {Object.entries(SCHOOL_SHIFT_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header title="Endereços" />
          <Card.Body className="flex flex-col gap-2">
            <Typography variant="bodySmall" color="muted">
              Embarque: {student.embarqueLogradouro}, {student.embarqueNumero},{" "}
              {student.embarqueBairro}, {student.embarqueCidade}/{student.embarqueEstado}
            </Typography>
            <Typography variant="bodySmall" color="muted">
              Desembarque: {student.desembarqueLogradouro}, {student.desembarqueNumero},{" "}
              {student.desembarqueBairro}, {student.desembarqueCidade}/{student.desembarqueEstado}
            </Typography>
            <Typography variant="caption" color="muted">
              Para alterar um endereço, fale com o suporte pelos Chamados.
            </Typography>
            <Link
              href={`/alunos/${studentId}/endereco-do-dia`}
              className="mt-1 text-sm font-medium text-primary hover:underline"
            >
              Vai levar ou buscar num endereço diferente algum dia? Marque no calendário →
            </Link>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header title="Informações adicionais" />
          <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Necessidades especiais">
              <Input
                value={form.necessidadesEspeciais ?? ""}
                onChange={(event) => updateField("necessidadesEspeciais", event.target.value)}
              />
            </FormField>
            <FormField label="Medicamentos">
              <Input
                value={form.medicamentos ?? ""}
                onChange={(event) => updateField("medicamentos", event.target.value)}
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Observações">
                <Input
                  value={form.observacoes ?? ""}
                  onChange={(event) => updateField("observacoes", event.target.value)}
                />
              </FormField>
            </div>
          </Card.Body>
          <Card.Footer>
            {errorMessage && (
              <Typography variant="bodySmall" color="danger" className="mr-auto">
                {errorMessage}
              </Typography>
            )}
            <Button type="submit" variant="primary" isLoading={updateStudent.isPending}>
              Salvar alterações
            </Button>
          </Card.Footer>
        </Card>
      </form>

      <Card className="border-danger/30">
        <Card.Body className="flex items-center justify-between gap-4">
          <div>
            <Typography variant="bodySmall" className="font-semibold text-danger">
              Remover aluno
            </Typography>
            <Typography variant="caption" color="muted">
              Essa ação não pode ser desfeita.
            </Typography>
          </div>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={deleteStudent.isPending}
                onClick={() => void handleDelete()}
              >
                Confirmar remoção
              </Button>
            </div>
          ) : (
            <Button
              variant="danger"
              size="sm"
              iconLeft={<Trash2 className="h-4 w-4" />}
              onClick={() => setConfirmDelete(true)}
            >
              Remover
            </Button>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
