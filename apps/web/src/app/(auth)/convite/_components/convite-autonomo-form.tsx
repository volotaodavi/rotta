"use client";

import { ApiError, type RegisterAutonomoInput } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import {
  Button,
  FormField,
  Input,
  PhoneInput,
  Typography,
  buttonVariants,
  isCompleteBrazilianCellphone,
} from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { TermsAcceptanceCheckbox } from "@/components/terms-acceptance-checkbox";
import { studentPreRegistrationsApi } from "@/lib/api-client";
import { defaultRouteForRole } from "@/lib/default-route";

type PapelAutonomo = RegisterAutonomoInput["role"];

/**
 * Cadastro self-service de Motorista/Monitor autônomo via "código da
 * transportadora" (Frente 9, auditoria 31/08/2026 — pedido do usuário:
 * "o fluxo deverá garantir isso... vale TANTO para os responsáveis,
 * quanto para as demais funções"). Mesmo padrão de 2 etapas de
 * `ConviteTransportadoraForm` (Responsável) — só troca `registerPessoal`/
 * `preRegistrationId` por `registerAutonomo`/`codigoInterno`. Web nunca
 * teve este fluxo antes (só existia no app mobile, em ordem invertida —
 * conta primeiro, código depois): esta é a versão web que faltava.
 *
 * O código continua OPCIONAL (o link "Pular por enquanto") — quem
 * prefere criar a conta solta e vincular depois continua podendo, pela
 * tela de bloqueio que aparece após entrar
 * (`VinculoPendenteBlockScreen`). A aprovação da empresa continua
 * manual — só a ORDEM do fluxo mudou.
 */
export function ConviteAutonomoForm(): JSX.Element {
  const router = useRouter();
  const { registerAutonomo } = useAuth();

  const [etapa, setEtapa] = useState<"codigo" | "dados">("codigo");
  const [codigoInterno, setCodigoInterno] = useState("");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isBuscando, setIsBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState<string | null>(null);

  const [papel, setPapel] = useState<PapelAutonomo>("motorista");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erroCadastro, setErroCadastro] = useState<string | null>(null);

  async function handleBuscar(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErroBusca(null);
    const codigo = codigoInterno.trim().toUpperCase();
    if (!codigo) {
      setEtapa("dados");
      return;
    }

    setIsBuscando(true);
    try {
      const company = await studentPreRegistrationsApi.previewCompany(codigo);
      if (!company) {
        setErroBusca("Código não encontrado. Confira o código com a transportadora.");
        return;
      }
      setCompanyName(company.companyName);
      setEtapa("dados");
    } catch {
      setErroBusca("Não foi possível verificar esse código agora. Tente novamente.");
    } finally {
      setIsBuscando(false);
    }
  }

  function handlePular(): void {
    setErroBusca(null);
    setCodigoInterno("");
    setCompanyName(null);
    setEtapa("dados");
  }

  async function handleCadastrar(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErroCadastro(null);

    if (!isCompleteBrazilianCellphone(telefone)) {
      setErroCadastro("Telefone incompleto: digite o DDD e os 9 dígitos do celular.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await registerAutonomo({
        nome,
        email,
        telefone,
        cpf,
        senha,
        role: papel,
        aceiteTermos: true,
        codigoInterno: codigoInterno.trim() ? codigoInterno.trim().toUpperCase() : undefined,
      });
      // `(dashboard)/layout.tsx` mostra `VinculoPendenteBlockScreen`
      // sozinho enquanto `!user.companyId` — nenhum destino especial
      // precisa ser calculado aqui, mesmo destino de sempre.
      router.replace(defaultRouteForRole(user.role));
    } catch (error) {
      setErroCadastro(
        error instanceof ApiError ? error.message : "Erro inesperado ao completar o cadastro.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (etapa === "codigo") {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          <Typography variant="title">Motorista ou monitor autônomo</Typography>
          <Typography variant="bodySmall" color="muted">
            Se já tem o código da transportadora, informe aqui pra pedir vínculo assim que sua conta
            for criada. Sem o código agora? Sem problema — dá pra informar depois.
          </Typography>
        </div>

        <form onSubmit={(event) => void handleBuscar(event)} className="flex flex-col gap-4">
          <FormField label="Código da transportadora (opcional)">
            <Input
              autoCapitalize="characters"
              placeholder="Ex.: TRN-000001"
              value={codigoInterno}
              onChange={(event) => setCodigoInterno(event.target.value)}
            />
          </FormField>

          {erroBusca && (
            <Typography variant="bodySmall" color="danger">
              {erroBusca}
            </Typography>
          )}

          <Button type="submit" variant="primary" fullWidth isLoading={isBuscando}>
            Continuar
          </Button>
          <Button type="button" variant="secondary" fullWidth onClick={handlePular}>
            Pular por enquanto
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Typography variant="title">Complete seu cadastro</Typography>
        <Typography variant="bodySmall" color="muted">
          {companyName
            ? `Transportadora ${companyName} · complete seus dados pra pedir o vínculo.`
            : "Crie sua conta — o código da transportadora pode ser informado depois."}
        </Typography>
      </div>

      <form onSubmit={(event) => void handleCadastrar(event)} className="flex flex-col gap-4">
        <FormField label="Você é" isRequired>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPapel("motorista")}
              className={
                buttonVariants({ variant: papel === "motorista" ? "primary" : "secondary" }) +
                " flex-1"
              }
            >
              Motorista
            </button>
            <button
              type="button"
              onClick={() => setPapel("monitor")}
              className={
                buttonVariants({ variant: papel === "monitor" ? "primary" : "secondary" }) +
                " flex-1"
              }
            >
              Monitor
            </button>
          </div>
        </FormField>

        <FormField label="Nome completo" isRequired>
          <Input required value={nome} onChange={(event) => setNome(event.target.value)} />
        </FormField>
        <FormField label="Email" isRequired>
          <Input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>
        <FormField label="Telefone" isRequired helperText="Só DDD + celular, ex. (11) 98765-4321">
          <PhoneInput required value={telefone} onValueChange={setTelefone} />
        </FormField>
        <FormField label="CPF" isRequired>
          <Input required value={cpf} onChange={(event) => setCpf(event.target.value)} />
        </FormField>
        <FormField
          label="Crie uma senha"
          isRequired
          helperText="Mínimo 8 caracteres, com ao menos 1 letra e 1 número."
        >
          <Input
            type="password"
            required
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
          />
        </FormField>

        <TermsAcceptanceCheckbox checked={aceitouTermos} onChange={setAceitouTermos} />

        {erroCadastro && (
          <Typography variant="bodySmall" color="danger">
            {erroCadastro}
          </Typography>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isSubmitting}
          disabled={!aceitouTermos}
        >
          Criar conta
        </Button>
        <Button type="button" variant="secondary" fullWidth onClick={() => setEtapa("codigo")}>
          Voltar
        </Button>
      </form>
    </div>
  );
}
