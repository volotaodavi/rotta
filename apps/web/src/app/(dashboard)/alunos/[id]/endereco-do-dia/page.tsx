"use client";

import { ApiError } from "@rotta/api-client";
import { ChevronLeft, ChevronRight, MapPin, Trash2 } from "@rotta/icons";
import {
  Button,
  Card,
  FormField,
  Input,
  Modal,
  Select,
  Spinner,
  Typography,
  useToast,
} from "@rotta/ui/web";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import type { StudentAddressOverride, StudentAddressOverrideTrecho } from "@rotta/api-client";

import {
  useRemoveStudentAddressOverride,
  useStudent,
  useStudentAddressOverrides,
  useUpsertStudentAddressOverride,
} from "@/features/students/hooks/use-students";
import { useCepLookup } from "@/hooks/use-cep-lookup";
import { geoApi } from "@/lib/api-client";

const TRECHO_LABEL: Record<StudentAddressOverrideTrecho, string> = {
  EMBARQUE: "Só na ida (embarque)",
  DESEMBARQUE: "Só na volta (desembarque)",
  AMBOS: "Na ida e na volta",
};

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isPast(isoDate: string): boolean {
  return isoDate < toIsoDate(new Date());
}

const MES_LABEL = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

/**
 * Calendário "Endereço do dia" — pedido do usuário: "Os responsáveis
 * (TODOS) deverão ter acesso a um calendário em sua conta... e um
 * painel, onde ali o responsável pode informar se algum dia ele irá
 * para outro endereço (na ida, na volta ou ambos). Isso pode ser feito
 * até antes da van iniciar o novo serviço." Um por aluno (cada filho
 * pode ter endereços diferentes no mesmo dia) — acessível a partir da
 * ficha do aluno.
 *
 * O backend (`StudentsService.assertDiaAindaNaoIniciado`) já bloqueia
 * criar/editar/remover um desvio depois que a viagem daquele dia
 * começa — este calendário só impede visualmente dias já passados;
 * qualquer outra rejeição chega como uma mensagem clara do próprio
 * `ApiError`, nunca uma falha silenciosa.
 */
export default function EnderecoDoDiaPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const studentId = params.id;
  const { data: student } = useStudent(studentId);

  const hoje = useMemo(() => new Date(), []);
  const [mesAtual, setMesAtual] = useState(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  const primeiroDiaDoMes = mesAtual;
  const ultimoDiaDoMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0);
  const from = toIsoDate(primeiroDiaDoMes);
  const to = toIsoDate(ultimoDiaDoMes);

  const { data: overrides, isLoading } = useStudentAddressOverrides(studentId, { from, to });
  const overridesPorDia = useMemo(() => {
    const mapa = new Map<string, StudentAddressOverride>();
    for (const override of overrides ?? []) mapa.set(override.data, override);
    return mapa;
  }, [overrides]);

  const diasDoMes: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaDoMes.getDay(); i += 1) diasDoMes.push(null);
  for (let dia = 1; dia <= ultimoDiaDoMes.getDate(); dia += 1) diasDoMes.push(dia);

  function mudarMes(delta: number): void {
    setMesAtual((atual) => new Date(atual.getFullYear(), atual.getMonth() + delta, 1));
  }

  const overrideSelecionado = diaSelecionado ? (overridesPorDia.get(diaSelecionado) ?? null) : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link href={`/alunos/${studentId}`} className="text-sm text-primary hover:underline">
          ← {student?.nome ?? "Aluno"}
        </Link>
        <Typography variant="title">Endereço do dia</Typography>
        <Typography variant="bodySmall" color="muted">
          Vai levar ou buscar {student?.nome ?? "seu filho"} num endereço diferente algum dia?
          Marque o dia no calendário e informe onde. Só dá pra fazer antes da van começar o serviço
          naquele dia — depois disso o dia fica travado.
        </Typography>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => mudarMes(-1)}
              aria-label="Mês anterior"
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-muted hover:text-text"
            >
              <ChevronLeft size={18} />
            </button>
            <Typography variant="subtitle" className="capitalize">
              {MES_LABEL.format(mesAtual)}
            </Typography>
            <button
              type="button"
              onClick={() => mudarMes(1)}
              aria-label="Próximo mês"
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-muted hover:text-text"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {DIAS_SEMANA.map((letra, index) => (
                <Typography
                  key={index}
                  variant="caption"
                  color="muted"
                  className="py-1 text-center font-semibold"
                >
                  {letra}
                </Typography>
              ))}
              {diasDoMes.map((dia, index) => {
                if (dia === null) return <div key={`vazio-${index}`} />;
                const iso = toIsoDate(new Date(mesAtual.getFullYear(), mesAtual.getMonth(), dia));
                const temDesvio = overridesPorDia.has(iso);
                const passado = isPast(iso);
                const ehHoje = iso === toIsoDate(hoje);
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={passado}
                    onClick={() => setDiaSelecionado(iso)}
                    className={`relative flex h-11 flex-col items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                      passado ? "cursor-not-allowed text-text-muted/40" : "text-text hover:bg-muted"
                    } ${ehHoje ? "ring-1 ring-inset ring-primary" : ""}`}
                  >
                    {dia}
                    {temDesvio ? (
                      <span className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-border pt-3">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <Typography variant="caption" color="muted">
              Dias com um endereço diferente já marcado
            </Typography>
          </div>
        </Card.Body>
      </Card>

      {diaSelecionado ? (
        <EnderecoDoDiaModal
          studentId={studentId}
          data={diaSelecionado}
          overrideExistente={overrideSelecionado}
          onClose={() => setDiaSelecionado(null)}
        />
      ) : null}
    </div>
  );
}

interface EnderecoForm {
  trecho: StudentAddressOverrideTrecho;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  observacao: string;
}

function overrideParaForm(override: StudentAddressOverride | null): EnderecoForm {
  return {
    trecho: override?.trecho ?? "AMBOS",
    cep: override?.cep ?? "",
    logradouro: override?.logradouro ?? "",
    numero: override?.numero ?? "",
    complemento: override?.complemento ?? "",
    bairro: override?.bairro ?? "",
    cidade: override?.cidade ?? "",
    estado: override?.estado ?? "",
    observacao: override?.observacao ?? "",
  };
}

/** "26 de agosto de 2026" — mesmo formato usado nos cartões de histórico do app. */
function formatarDataLonga(iso: string): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(Date.UTC(ano!, mes! - 1, dia!)).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function EnderecoDoDiaModal({
  studentId,
  data,
  overrideExistente,
  onClose,
}: {
  studentId: string;
  data: string;
  overrideExistente: StudentAddressOverride | null;
  onClose: () => void;
}): JSX.Element {
  const toast = useToast();
  const cepLookup = useCepLookup();
  const upsert = useUpsertStudentAddressOverride(studentId);
  const remove = useRemoveStudentAddressOverride(studentId);

  const [form, setForm] = useState<EnderecoForm>(() => overrideParaForm(overrideExistente));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  function updateField<K extends keyof EnderecoForm>(key: K, value: EnderecoForm[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleCepBlur(): Promise<void> {
    const address = await cepLookup.lookup(form.cep);
    if (!address) return;
    setForm((current) => ({
      ...current,
      logradouro: address.endereco || current.logradouro,
      bairro: address.bairro || current.bairro,
      cidade: address.cidade || current.cidade,
      estado: address.estado || current.estado,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    const enderecoCompleto = `${form.logradouro}, ${form.numero} - ${form.bairro}, ${form.cidade} - ${form.estado}, ${form.cep}`;
    setIsGeocoding(true);
    let coordenada: { latitude: number; longitude: number };
    try {
      coordenada = await geoApi.geocodeAddress(enderecoCompleto);
    } catch {
      setIsGeocoding(false);
      setErrorMessage(
        "Não conseguimos localizar esse endereço no mapa. Confira o CEP e o número e tente de novo.",
      );
      return;
    }
    setIsGeocoding(false);

    try {
      await upsert.mutateAsync({
        data,
        trecho: form.trecho,
        cep: form.cep,
        logradouro: form.logradouro,
        numero: form.numero,
        complemento: form.complemento || undefined,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
        observacao: form.observacao || undefined,
        ...coordenada,
      });
      toast.success(`Endereço de ${formatarDataLonga(data)} salvo.`);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao salvar o endereço.",
      );
    }
  }

  async function handleRemove(): Promise<void> {
    if (!overrideExistente) return;
    setErrorMessage(null);
    try {
      await remove.mutateAsync(overrideExistente.id);
      toast.success(`Desvio de ${formatarDataLonga(data)} removido.`);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao remover o endereço.",
      );
    }
  }

  const isSaving = isGeocoding || upsert.isPending;

  return (
    <Modal isOpen onClose={onClose} ariaLabel="Endereço do dia">
      <Modal.Header onClose={onClose}>{formatarDataLonga(data)}</Modal.Header>
      <form onSubmit={(event) => void handleSubmit(event)}>
        <Modal.Body className="flex flex-col gap-4">
          <FormField label="Quando vale esse endereço" isRequired>
            <Select
              required
              value={form.trecho}
              onChange={(event) =>
                updateField("trecho", event.target.value as StudentAddressOverrideTrecho)
              }
            >
              {Object.entries(TRECHO_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="CEP" isRequired>
              <Input
                required
                value={form.cep}
                onChange={(event) => updateField("cep", event.target.value)}
                onBlur={() => void handleCepBlur()}
                placeholder="00000-000"
              />
            </FormField>
            <FormField label="Número" isRequired>
              <Input
                required
                value={form.numero}
                onChange={(event) => updateField("numero", event.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Logradouro" isRequired>
            <Input
              required
              value={form.logradouro}
              onChange={(event) => updateField("logradouro", event.target.value)}
            />
          </FormField>

          <FormField label="Complemento">
            <Input
              value={form.complemento}
              onChange={(event) => updateField("complemento", event.target.value)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Bairro" isRequired>
              <Input
                required
                value={form.bairro}
                onChange={(event) => updateField("bairro", event.target.value)}
              />
            </FormField>
            <FormField label="Cidade" isRequired>
              <Input
                required
                value={form.cidade}
                onChange={(event) => updateField("cidade", event.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Estado" isRequired>
            <Input
              required
              maxLength={2}
              value={form.estado}
              onChange={(event) => updateField("estado", event.target.value.toUpperCase())}
              placeholder="RJ"
            />
          </FormField>

          <FormField label="Observação (opcional)">
            <Input
              value={form.observacao}
              onChange={(event) => updateField("observacao", event.target.value)}
              placeholder="Ex.: vou buscar na casa da avó hoje"
            />
          </FormField>

          {errorMessage ? (
            <Typography variant="bodySmall" className="text-danger">
              {errorMessage}
            </Typography>
          ) : null}

          {overrideExistente ? (
            <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
              <MapPin size={16} className="shrink-0 text-text-muted" />
              <Typography variant="caption" color="muted" className="flex-1">
                Já existe um endereço marcado pra este dia — salvar substitui, ou remova abaixo.
              </Typography>
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          {overrideExistente ? (
            <Button
              type="button"
              variant="ghost"
              iconLeft={<Trash2 size={16} />}
              onClick={() => void handleRemove()}
              isLoading={remove.isPending}
              disabled={isSaving}
            >
              Remover
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isSaving} disabled={remove.isPending}>
            {isGeocoding ? "Localizando…" : "Salvar"}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
