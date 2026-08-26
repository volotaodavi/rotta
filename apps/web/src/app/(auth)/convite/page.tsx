"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import {
  Button,
  FormField,
  Input,
  PhoneInput,
  Spinner,
  Typography,
  isCompleteBrazilianCellphone,
} from "@rotta/ui/web";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { TermsAcceptanceCheckbox } from "@/components/terms-acceptance-checkbox";
import { authApi } from "@/lib/api-client";
import { defaultRouteForRole } from "@/lib/default-route";

const ROLE_LABEL: Record<string, string> = {
  gestor: "Gestor",
  motorista: "Motorista",
  monitor: "Monitor",
  responsavel: "Responsável",
  escola: "Escola",
};

/**
 * "Inserir código de convite" + resgate (Dossiê 15, `AUTH-01-A1`) — as
 * duas etapas ("digitar o código" e "completar o cadastro com o
 * código") viviam em duas páginas: esta (estática, `?codigo=` ausente)
 * e `/convite/[codigo]` (segmento dinâmico). Unificadas aqui numa
 * ÚNICA rota estática que lê `codigo` da query string em vez do path —
 * pedido do usuário: "quando vão convidar um novo motorista para fazer
 * cadastro aparece aquela mesma tela de erro que estávamos sofrendo...
 * para não cair nessa tela dnv".
 *
 * CAUSA REAL: o próprio `next.config.mjs` já documentava que
 * `/convite/[codigo]` era uma das rotas que reproduziam o "Server
 * Components render" indeterminístico em produção (junto com
 * `/rotas/[id]`/`/veiculos/[id]`) — mas ao contrário delas (visitadas
 * várias vezes depois de criadas, então só o PRIMEIRO acesso corre
 * risco), TODO convite de motorista/monitor gera um código único nunca
 * visto antes, então TODA vez que alguém abre o link de convite é,
 * necessariamente, "o primeiro acesso a esse segmento dinâmico exato,
 * nunca renderizado antes neste deploy" — o gatilho exato do bug, sem
 * exceção. Uma página ESTÁTICA nunca reproduziu o incidente (mesma
 * nota do `next.config.mjs`) — sem nenhum segmento `[dinâmico]`
 * envolvido, o motor de Server Components/Suspense implicado no
 * incidente nunca entra em jogo. Links antigos (`/convite/CODIGO`,
 * já enviados por WhatsApp antes desta correção) continuam funcionando
 * via redirect em `next.config.mjs` (`/convite/:codigo` →
 * `/convite?codigo=:codigo`) — resolvido pela camada de roteamento do
 * Next ANTES de qualquer render de página, nunca mais cai no segmento
 * dinâmico antigo (removido).
 */
export default function ConvitePage(): JSX.Element {
  const searchParams = useSearchParams();
  const codigo = searchParams.get("codigo")?.trim().toUpperCase() ?? "";

  return codigo ? <ResgatarConvite codigo={codigo} /> : <InserirCodigo />;
}

/** Sem `?codigo=` na URL — quem foi convidado mas só tem o código em mãos (não o link) digita aqui. */
function InserirCodigo(): JSX.Element {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const valor = codigo.trim();
    if (!valor) return;
    // Só troca a query string da MESMA página estática — nunca navega
    // pra um segmento dinâmico novo, então não reproduz o incidente.
    router.push(`/convite?codigo=${encodeURIComponent(valor.toUpperCase())}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Typography variant="title">Inserir código de convite</Typography>
        <Typography variant="bodySmall" color="muted">
          Ex.: M586PO
        </Typography>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Código do convite" isRequired>
          <Input
            required
            autoCapitalize="characters"
            value={codigo}
            onChange={(event) => setCodigo(event.target.value)}
          />
        </FormField>
        <Button type="submit" variant="primary" fullWidth>
          Confirmar
        </Button>
      </form>

      <Typography variant="caption" color="muted" className="text-center">
        É responsável e recebeu um código da transportadora (não um convite de equipe)?{" "}
        <a href="/convite/transportadora" className="text-primary hover:underline">
          Cadastre seu filho por aqui
        </a>
      </Typography>
    </div>
  );
}

/**
 * Resgate de convite — "Confirmar identidade -> Completar cadastro ->
 * Entrar normalmente". Nunca cria uma nova empresa: o vínculo é
 * anexado ao tenant que já existe. Porta do antigo `InviteClient`
 * (`/convite/[codigo]`, removido) — `codigo` chega como `string` já
 * normalizada pela página estática acima, nunca de um `params`
 * dinâmico.
 */
function ResgatarConvite({ codigo }: { codigo: string }): JSX.Element {
  const router = useRouter();
  const { redeemInvite } = useAuth();

  const {
    data: preview,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["invite-preview", codigo],
    queryFn: () => authApi.previewInvite(codigo),
    retry: false,
  });

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    if (!isCompleteBrazilianCellphone(telefone)) {
      setErrorMessage("Telefone incompleto: digite o DDD e os 9 dígitos do celular.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await redeemInvite({
        codigo,
        nome,
        email,
        telefone,
        cpf,
        senha,
        aceiteTermos: true,
      });
      // Antes, ia sempre pra "/empresa" — quebrava um convite de
      // Motorista/Monitor (ele nem enxerga esse item no menu, ver
      // `defaultRouteForRole`). Mesma decisão do login normal.
      router.replace(defaultRouteForRole(user.role));
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao completar o cadastro.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !preview) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-2 text-center">
        <Typography variant="title">Convite inválido</Typography>
        <Typography variant="body" color="muted">
          Este código não existe, expirou ou já foi utilizado. Peça um novo convite.
        </Typography>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Typography variant="title">Complete seu cadastro</Typography>
        <Typography variant="bodySmall" color="muted">
          Convite de <strong>{preview.companyName}</strong> para atuar como{" "}
          {ROLE_LABEL[preview.role] ?? preview.role}.
        </Typography>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
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
          label="Senha"
          isRequired
          helperText="Se você já tem uma conta Rotta, informe a senha dela para vincular este convite."
        >
          <Input
            type="password"
            required
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
          />
        </FormField>

        <TermsAcceptanceCheckbox checked={aceitouTermos} onChange={setAceitouTermos} />

        {errorMessage && (
          <Typography variant="bodySmall" color="danger">
            {errorMessage}
          </Typography>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={isSubmitting}
          disabled={!aceitouTermos}
        >
          Entrar
        </Button>
      </form>
    </div>
  );
}
