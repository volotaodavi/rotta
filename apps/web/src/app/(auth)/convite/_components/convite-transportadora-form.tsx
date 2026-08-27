"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import {
  Button,
  FormField,
  Input,
  PhoneInput,
  Typography,
  isCompleteBrazilianCellphone,
} from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { TermsAcceptanceCheckbox } from "@/components/terms-acceptance-checkbox";
import { studentPreRegistrationsApi } from "@/lib/api-client";

/**
 * Cadastro direto do Responsável via "código da transportadora" (pedido
 * do usuário: "o responsável recebe o código da transportadora... vai
 * digitar o código... vai aparecer a transportadora que ela está se
 * credenciando e vai preencher as informações que precisam... caso já
 * tenha um pré-cadastro... vai ter lá o cadastro confirmado do aluno
 * pré-cadastro... caso não tenha, fazer o cadastro normal... a rota vai
 * pedir para que forme uma senha, pra poder acessar o app").
 *
 * `Company.codigoInterno` é outro conceito de `Invite` (o "código de
 * convite" de equipe é um código de uso único gerado pela empresa pra
 * UMA pessoa) — aqui é o código público permanente da transportadora,
 * o mesmo já usado em `/vincular-transporte` e no Marketplace. Nunca
 * cria uma conta sem senha: o cadastro tradicional (`/criar-conta`)
 * continua existindo exatamente como está — este é só um segundo
 * caminho, mais rápido, pra quem já tem o código em mãos.
 *
 * Duas etapas: (1) código + celular → mostra a transportadora e, se
 * houver, o pré-cadastro batendo; (2) dados do responsável + senha →
 * cria a conta já reivindicando o pré-cadastro (se houver) e entra
 * direto no cadastro completo do aluno em `/alunos/novo` (mesmo destino
 * de `/vincular-transporte`), prefilled quando possível.
 *
 * Vive fora de qualquer `page.tsx` (Next.js só aceita exports
 * específicos — `default`, `metadata` etc. — num arquivo de página) já
 * que é usado em DOIS lugares (Dossiê 26 — "usar a mesma aba, porém
 * para segmentos diferentes"): a rota própria `/convite/transportadora`
 * (compatibilidade com links já enviados) e a aba "Sou responsável" da
 * página unificada `/convite`.
 */
export function ConviteTransportadoraForm(): JSX.Element {
  const router = useRouter();
  const { registerPessoal } = useAuth();

  const [etapa, setEtapa] = useState<"codigo" | "dados">("codigo");
  const [codigoInterno, setCodigoInterno] = useState("");
  const [celular, setCelular] = useState("");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [match, setMatch] = useState<{
    id: string;
    nomeAluno: string;
    nomeResponsavel: string;
  } | null>(null);

  const [isBuscando, setIsBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
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
      setErroBusca("Informe o código da transportadora.");
      return;
    }
    if (!isCompleteBrazilianCellphone(celular)) {
      setErroBusca("Telefone incompleto: digite o DDD e os 9 dígitos do celular.");
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

      const found = await studentPreRegistrationsApi.lookup(codigo, celular);
      if (found) {
        setMatch({
          id: found.id,
          nomeAluno: found.nomeAluno,
          nomeResponsavel: found.nomeResponsavel,
        });
        setNome(found.nomeResponsavel);
      } else {
        setMatch(null);
      }
      setEtapa("dados");
    } catch {
      setErroBusca("Não foi possível verificar esse código agora. Tente novamente.");
    } finally {
      setIsBuscando(false);
    }
  }

  async function handleCadastrar(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErroCadastro(null);
    setIsSubmitting(true);
    try {
      await registerPessoal({
        nome,
        email,
        telefone: celular,
        cpf,
        senha,
        aceiteTermos: true,
        preRegistrationId: match?.id,
      });
      const params = new URLSearchParams();
      if (match) {
        params.set("preRegistrationId", match.id);
        params.set("nomeAluno", match.nomeAluno);
      }
      const query = params.toString();
      router.replace(query ? `/alunos/novo?${query}` : "/alunos/novo");
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
          <Typography variant="title">Entrar com o código da transportadora</Typography>
          <Typography variant="bodySmall" color="muted">
            Recebeu um código da transportadora do seu filho? Digite ele aqui pra começar o cadastro
            rapidinho.
          </Typography>
        </div>

        <form onSubmit={(event) => void handleBuscar(event)} className="flex flex-col gap-4">
          <FormField label="Código da transportadora" isRequired>
            <Input
              required
              autoCapitalize="characters"
              placeholder="Ex.: TRN-000001"
              value={codigoInterno}
              onChange={(event) => setCodigoInterno(event.target.value)}
            />
          </FormField>
          <FormField
            label="Seu celular"
            isRequired
            helperText="Só DDD + celular, ex. (11) 98765-4321"
          >
            <PhoneInput required value={celular} onValueChange={setCelular} />
          </FormField>

          {erroBusca && (
            <Typography variant="bodySmall" color="danger">
              {erroBusca}
            </Typography>
          )}

          <Button type="submit" variant="primary" fullWidth isLoading={isBuscando}>
            Continuar
          </Button>
        </form>

        <Typography variant="caption" color="muted" className="text-center">
          Prefere criar uma conta do jeito tradicional?{" "}
          <a href="/criar-conta" className="text-primary hover:underline">
            Criar conta
          </a>
        </Typography>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <Typography variant="title">Complete seu cadastro</Typography>
        <Typography variant="bodySmall" color="muted">
          Transportadora <strong>{companyName}</strong>
          {match ? (
            <>
              {" "}
              · aluno <strong>{match.nomeAluno}</strong> já pré-cadastrado. Confirme seus dados pra
              concluir.
            </>
          ) : (
            " · não encontramos um pré-cadastro com esse celular, então vamos fazer o cadastro completo do zero."
          )}
        </Typography>
      </div>

      <form onSubmit={(event) => void handleCadastrar(event)} className="flex flex-col gap-4">
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
        <FormField label="CPF" isRequired>
          <Input required value={cpf} onChange={(event) => setCpf(event.target.value)} />
        </FormField>
        <FormField
          label="Crie uma senha"
          isRequired
          helperText="Você vai usar essa senha pra acessar tanto o site quanto o app."
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
          Concluir cadastro
        </Button>
        <Button type="button" variant="secondary" fullWidth onClick={() => setEtapa("codigo")}>
          Voltar
        </Button>
      </form>
    </div>
  );
}
