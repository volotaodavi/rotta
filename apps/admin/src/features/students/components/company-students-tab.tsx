"use client";

import {
  Button,
  Card,
  Checkbox,
  ErrorState,
  FormField,
  Input,
  Modal,
  Select,
  Spinner,
  Typography,
} from "@rotta/ui/web";
import { useState } from "react";

import { useCreateStudentForCompany, useCompanyStudents } from "../hooks/use-students";

import type { CreateStudentForCompanyInput, School } from "@rotta/api-client";

import { useSchoolsList } from "@/features/schools/hooks/use-schools";
import { useCepLookup } from "@/hooks/use-cep-lookup";



const TURNOS = [
  { value: "MANHA", label: "Manhã" },
  { value: "TARDE", label: "Tarde" },
  { value: "INTEGRAL", label: "Integral" },
  { value: "NOITE", label: "Noite" },
  { value: "PERSONALIZADO", label: "Personalizado" },
] as const;

interface EnderecoForm {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

const ENDERECO_VAZIO: EnderecoForm = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
};

/**
 * "Empresas > Alunos > cadastramos os alunos... colocamos as escolas,
 * rotas/endereços residenciais... salvamos e pronto" (pedido do usuário
 * 02/09/2026) — o passo que faltava pra ninguém poder cadastrar aluno
 * a não ser o próprio Responsável (`StudentsService.createForCompany`,
 * gap real corrigido no backend). Ao salvar, o aluno já nasce
 * credenciado (Contract "termo de ciência" automático, mesmo mecanismo
 * do fluxo "código do transporte") — falta só vincular a uma `Route`
 * específica, que continua sendo uma decisão operacional separada (o
 * Admin ainda não tem uma tela de Rotas própria; usa o mesmo endpoint
 * que Empresa/Gestor já usam, `POST /routes/:id/students`, fora deste
 * formulário).
 */
export function CompanyStudentsTab({ companyId }: { companyId: string }): JSX.Element {
  const { data, isLoading, isError, refetch, isFetching } = useCompanyStudents(companyId);
  const [creating, setCreating] = useState(false);

  return (
    <Card>
      <Card.Header
        title="Alunos"
        action={
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            Novo aluno
          </Button>
        }
      />

      {isLoading ? (
        <Card.Body className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </Card.Body>
      ) : isError ? (
        <Card.Body>
          <ErrorState
            message="Não foi possível carregar os alunos desta empresa."
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        </Card.Body>
      ) : data && data.items.length === 0 ? (
        <Card.Body>
          <Typography variant="body" color="muted">
            Nenhum aluno cadastrado ainda — clique em &ldquo;Novo aluno&rdquo; pra começar.
          </Typography>
        </Card.Body>
      ) : (
        <div className="divide-y divide-border">
          {data?.items.map((student) => (
            <div key={student.id} className="flex flex-col gap-0.5 px-6 py-4">
              <Typography variant="body" className="font-semibold">
                {student.nome}
              </Typography>
              <Typography variant="caption" color="muted">
                {student.turno} · {student.embarqueBairro}, {student.embarqueCidade}
              </Typography>
            </div>
          ))}
        </div>
      )}

      {creating && <NewStudentModal companyId={companyId} onClose={() => setCreating(false)} />}
    </Card>
  );
}

type ResponsavelMode = "existente" | "novo";

function NewStudentModal({
  companyId,
  onClose,
}: {
  companyId: string;
  onClose: () => void;
}): JSX.Element {
  const createStudent = useCreateStudentForCompany(companyId);
  const embarqueCep = useCepLookup();
  const desembarqueCep = useCepLookup();

  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState<"MASCULINO" | "FEMININO" | "OUTRO">("MASCULINO");
  const [turno, setTurno] = useState("MANHA");

  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const { data: schoolResults } = useSchoolsList({ search: schoolSearch, page: 1, pageSize: 6 });

  const [embarque, setEmbarque] = useState<EnderecoForm>(ENDERECO_VAZIO);
  const [mesmoEndereco, setMesmoEndereco] = useState(true);
  const [desembarque, setDesembarque] = useState<EnderecoForm>(ENDERECO_VAZIO);

  const [responsavelMode, setResponsavelMode] = useState<ResponsavelMode>("existente");
  const [responsavelId, setResponsavelId] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novoCpf, setNovoCpf] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleEmbarqueCepBlur(): Promise<void> {
    const address = await embarqueCep.lookup(embarque.cep);
    if (!address) return;
    setEmbarque((current) => ({
      ...current,
      logradouro: address.endereco || current.logradouro,
      bairro: address.bairro || current.bairro,
      cidade: address.cidade || current.cidade,
      estado: address.estado || current.estado,
    }));
  }

  async function handleDesembarqueCepBlur(): Promise<void> {
    const address = await desembarqueCep.lookup(desembarque.cep);
    if (!address) return;
    setDesembarque((current) => ({
      ...current,
      logradouro: address.endereco || current.logradouro,
      bairro: address.bairro || current.bairro,
      cidade: address.cidade || current.cidade,
      estado: address.estado || current.estado,
    }));
  }

  const enderecoDesembarque = mesmoEndereco ? embarque : desembarque;

  function handleSubmit(): void {
    setErrorMessage(null);
    if (!nome.trim() || !dataNascimento || !selectedSchool) {
      setErrorMessage("Preencha nome, data de nascimento e escola.");
      return;
    }
    if (responsavelMode === "existente" && !responsavelId.trim()) {
      setErrorMessage("Informe o ID do Responsável já cadastrado.");
      return;
    }
    if (
      responsavelMode === "novo" &&
      (!novoNome.trim() || !novoEmail.trim() || !novoTelefone.trim() || !novoCpf.trim())
    ) {
      setErrorMessage("Preencha todos os dados do novo Responsável.");
      return;
    }

    const input: Omit<CreateStudentForCompanyInput, "companyId"> = {
      nome: nome.trim(),
      dataNascimento,
      sexo,
      schoolId: selectedSchool.id,
      turno: turno as CreateStudentForCompanyInput["turno"],
      embarqueCep: embarque.cep,
      embarqueLogradouro: embarque.logradouro,
      embarqueNumero: embarque.numero,
      embarqueComplemento: embarque.complemento || undefined,
      embarqueBairro: embarque.bairro,
      embarqueCidade: embarque.cidade,
      embarqueEstado: embarque.estado,
      desembarqueCep: enderecoDesembarque.cep,
      desembarqueLogradouro: enderecoDesembarque.logradouro,
      desembarqueNumero: enderecoDesembarque.numero,
      desembarqueComplemento: enderecoDesembarque.complemento || undefined,
      desembarqueBairro: enderecoDesembarque.bairro,
      desembarqueCidade: enderecoDesembarque.cidade,
      desembarqueEstado: enderecoDesembarque.estado,
      ...(responsavelMode === "existente"
        ? { responsavelId: responsavelId.trim() }
        : {
            novoResponsavel: {
              nome: novoNome.trim(),
              email: novoEmail.trim(),
              telefone: novoTelefone.trim(),
              cpf: novoCpf.trim(),
            },
          }),
    };

    createStudent.mutate(input, {
      onSuccess: onClose,
      onError: (error) => {
        setErrorMessage(error instanceof Error ? error.message : "Erro ao cadastrar o aluno.");
      },
    });
  }

  return (
    <Modal isOpen onClose={onClose}>
      <Modal.Header onClose={onClose}>Novo aluno</Modal.Header>
      <Modal.Body className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Nome do aluno" isRequired>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </FormField>
          <FormField label="Data de nascimento" isRequired>
            <Input
              type="date"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
            />
          </FormField>
          <FormField label="Sexo">
            <Select value={sexo} onChange={(e) => setSexo(e.target.value as typeof sexo)}>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMININO">Feminino</option>
              <option value="OUTRO">Outro</option>
            </Select>
          </FormField>
          <FormField label="Turno">
            <Select value={turno} onChange={(e) => setTurno(e.target.value)}>
              {TURNOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="flex flex-col gap-1.5">
          <Typography variant="caption" className="font-semibold">
            Escola
          </Typography>
          {selectedSchool ? (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <Typography variant="bodySmall">{selectedSchool.nomeOficial}</Typography>
              <button
                type="button"
                className="text-xs text-primary underline"
                onClick={() => setSelectedSchool(null)}
              >
                Trocar
              </button>
            </div>
          ) : (
            <>
              <Input
                placeholder="Buscar escola pelo nome..."
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
              />
              {schoolSearch.trim().length >= 2 && (
                <div className="flex flex-col gap-1 rounded-lg border border-border p-2">
                  {(schoolResults?.items ?? []).map((school) => (
                    <button
                      key={school.id}
                      type="button"
                      className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-surface-muted"
                      onClick={() => {
                        setSelectedSchool(school);
                        setSchoolSearch("");
                      }}
                    >
                      {school.nomeOficial}
                    </button>
                  ))}
                  {schoolResults && schoolResults.items.length === 0 ? (
                    <Typography variant="caption" color="muted" className="px-2 py-1.5">
                      Nenhuma escola encontrada.
                    </Typography>
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Typography variant="caption" className="font-semibold">
            Endereço de embarque
          </Typography>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Input
              placeholder="CEP"
              value={embarque.cep}
              onChange={(e) => setEmbarque({ ...embarque, cep: e.target.value })}
              onBlur={() => void handleEmbarqueCepBlur()}
            />
            <Input
              placeholder="Logradouro"
              className="sm:col-span-2"
              value={embarque.logradouro}
              onChange={(e) => setEmbarque({ ...embarque, logradouro: e.target.value })}
            />
            <Input
              placeholder="Número"
              value={embarque.numero}
              onChange={(e) => setEmbarque({ ...embarque, numero: e.target.value })}
            />
            <Input
              placeholder="Bairro"
              value={embarque.bairro}
              onChange={(e) => setEmbarque({ ...embarque, bairro: e.target.value })}
            />
            <Input
              placeholder="Cidade"
              value={embarque.cidade}
              onChange={(e) => setEmbarque({ ...embarque, cidade: e.target.value })}
            />
            <Input
              placeholder="UF"
              maxLength={2}
              value={embarque.estado}
              onChange={(e) => setEmbarque({ ...embarque, estado: e.target.value.toUpperCase() })}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="mesmo-endereco"
            checked={mesmoEndereco}
            onChange={(e) => setMesmoEndereco(e.target.checked)}
          />
          <label htmlFor="mesmo-endereco" className="cursor-pointer">
            <Typography variant="bodySmall">
              Endereço de desembarque é o mesmo do embarque
            </Typography>
          </label>
        </div>

        {!mesmoEndereco && (
          <div className="flex flex-col gap-2">
            <Typography variant="caption" className="font-semibold">
              Endereço de desembarque
            </Typography>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Input
                placeholder="CEP"
                value={desembarque.cep}
                onChange={(e) => setDesembarque({ ...desembarque, cep: e.target.value })}
                onBlur={() => void handleDesembarqueCepBlur()}
              />
              <Input
                placeholder="Logradouro"
                className="sm:col-span-2"
                value={desembarque.logradouro}
                onChange={(e) => setDesembarque({ ...desembarque, logradouro: e.target.value })}
              />
              <Input
                placeholder="Número"
                value={desembarque.numero}
                onChange={(e) => setDesembarque({ ...desembarque, numero: e.target.value })}
              />
              <Input
                placeholder="Bairro"
                value={desembarque.bairro}
                onChange={(e) => setDesembarque({ ...desembarque, bairro: e.target.value })}
              />
              <Input
                placeholder="Cidade"
                value={desembarque.cidade}
                onChange={(e) => setDesembarque({ ...desembarque, cidade: e.target.value })}
              />
              <Input
                placeholder="UF"
                maxLength={2}
                value={desembarque.estado}
                onChange={(e) =>
                  setDesembarque({ ...desembarque, estado: e.target.value.toUpperCase() })
                }
              />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Typography variant="caption" className="font-semibold">
            Responsável pelo aluno
          </Typography>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                checked={responsavelMode === "existente"}
                onChange={() => setResponsavelMode("existente")}
              />
              Já tem conta na Rotta
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                checked={responsavelMode === "novo"}
                onChange={() => setResponsavelMode("novo")}
              />
              Criar conta agora
            </label>
          </div>

          {responsavelMode === "existente" ? (
            <FormField
              label="ID do Responsável"
              helperText="Peça pra família confirmar o e-mail cadastrado, ou busque em Usuários."
            >
              <Input value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} />
            </FormField>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                placeholder="Nome do responsável"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
              />
              <Input
                placeholder="E-mail"
                type="email"
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
              />
              <Input
                placeholder="Telefone (DDD + número)"
                value={novoTelefone}
                onChange={(e) => setNovoTelefone(e.target.value)}
              />
              <Input
                placeholder="CPF"
                value={novoCpf}
                onChange={(e) => setNovoCpf(e.target.value)}
              />
            </div>
          )}
          {responsavelMode === "novo" && (
            <Typography variant="caption" color="muted">
              A família recebe um e-mail pra escolher a própria senha — a conta não fica com senha
              provisória exposta.
            </Typography>
          )}
        </div>

        {errorMessage && (
          <Typography variant="caption" color="danger">
            {errorMessage}
          </Typography>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" isLoading={createStudent.isPending} onClick={handleSubmit}>
          Salvar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
