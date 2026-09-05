"use client";

import { ApiError } from "@rotta/api-client";
import { Badge, Button, Card, ErrorState, Select, Spinner, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { AdminAccount, AdminRottaPapel } from "@rotta/api-client";
import type { BadgeVariant } from "@rotta/ui/web";

import {
  useAdminAccountsList,
  useCreateAdminAccount,
  useUpdateAdminAccount,
} from "@/features/admin-accounts/hooks/use-admin-accounts";

const PAPEL_LABEL: Record<AdminRottaPapel, string> = {
  GERAL: "Geral (acesso total)",
  SUPORTE: "Suporte",
  FINANCEIRO: "Financeiro",
};

const PAPEL_DESCRICAO: Record<AdminRottaPapel, string> = {
  GERAL: "Vê e faz tudo — inclusive transferências na área financeira.",
  SUPORTE: "Só Suporte, Verificação de identidade e Veículos.",
  FINANCEIRO: "Só as áreas financeiras, sempre leitura — nunca transferências.",
};

const PAPEL_BADGE_VARIANT: Record<AdminRottaPapel, BadgeVariant> = {
  GERAL: "success",
  SUPORTE: "info",
  FINANCEIRO: "warning",
};

const CAMPO_CLASSNAME =
  "h-11 w-full rounded-md border border-border bg-surface px-4 text-sm text-text placeholder:text-placeholder outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30";

/** Extrai a mensagem de erro real da API (`ApiError.message`) — nunca "algo deu errado" genérico quando o backend já explicou o motivo (ex. "última conta com acesso Geral"). */
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

/**
 * "Contas Admin" (pedido do usuário 03/09/2026: "DEPOIS, crie outros
 * acessos para o painel do admin, porém com particularidades") — único
 * jeito de criar uma conta `isAdminRotta: true` nova; o backend
 * (`AdminAccountsController`) já restringe a `AdminRottaPapel.GERAL`
 * via `AdminAreaGuard` (rota sem `@AdminAreas` = GERAL-only por
 * padrão) — esta tela não reimplementa essa checagem, só assume que só
 * chegou aqui quem tem acesso (o próprio item da sidebar já some pra
 * quem não tem, ver `(admin)/layout.tsx`).
 */
export default function AdminContasPage(): JSX.Element {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<AdminRottaPapel>("SUPORTE");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const createAccount = useCreateAdminAccount();
  const updateAccount = useUpdateAdminAccount();
  const { data: accounts, isLoading, isError, refetch, isFetching } = useAdminAccountsList();

  function handleCreate(): void {
    if (nome.trim().length < 2 || !email.includes("@") || telefone.length < 10 || cpf.length < 11) {
      setError("Preencha nome, e-mail, telefone e CPF válidos.");
      setSuccess(null);
      return;
    }
    if (senha.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      setSuccess(null);
      return;
    }
    setError(null);
    createAccount.mutate(
      { nome, email, telefone, cpf, senha, papel },
      {
        onSuccess: (account) => {
          setNome("");
          setEmail("");
          setTelefone("");
          setCpf("");
          setSenha("");
          setPapel("SUPORTE");
          setSuccess(`Conta de ${account.nome} criada com acesso "${PAPEL_LABEL[account.papel]}".`);
        },
        onError: (err) => {
          setError(errorMessage(err, "Não foi possível criar a conta. Tente novamente."));
        },
      },
    );
  }

  function handleChangePapel(account: AdminAccount, novoPapel: AdminRottaPapel): void {
    setError(null);
    updateAccount.mutate(
      { id: account.id, input: { papel: novoPapel } },
      {
        onError: (err) => {
          setError(errorMessage(err, `Não foi possível mudar o acesso de ${account.nome}.`));
        },
      },
    );
  }

  function handleToggleStatus(account: AdminAccount): void {
    setError(null);
    updateAccount.mutate(
      { id: account.id, input: { status: account.status === "ATIVO" ? "INATIVO" : "ATIVO" } },
      {
        onError: (err) => {
          setError(errorMessage(err, `Não foi possível atualizar o status de ${account.nome}.`));
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography variant="title">Contas Admin</Typography>
        <Typography variant="bodySmall" color="muted">
          Só quem tem acesso Geral cria/gerencia outras contas do painel interno da Rotta.
        </Typography>
      </div>

      <Card className="max-w-2xl">
        <Card.Body className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text" htmlFor="nome">
                Nome
              </label>
              <input
                id="nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Nome completo"
                className={CAMPO_CLASSNAME}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="suporte@rottabr.com.br"
                className={CAMPO_CLASSNAME}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text" htmlFor="telefone">
                Telefone
              </label>
              <input
                id="telefone"
                value={telefone}
                onChange={(event) => setTelefone(event.target.value.replace(/\D/g, ""))}
                placeholder="11987654321"
                className={CAMPO_CLASSNAME}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text" htmlFor="cpf">
                CPF
              </label>
              <input
                id="cpf"
                value={cpf}
                onChange={(event) => setCpf(event.target.value.replace(/\D/g, ""))}
                placeholder="Só números"
                className={CAMPO_CLASSNAME}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text" htmlFor="senha">
                Senha provisória
              </label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                className={CAMPO_CLASSNAME}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text" htmlFor="papel">
                Acesso
              </label>
              <Select
                id="papel"
                value={papel}
                onChange={(event) => setPapel(event.target.value as AdminRottaPapel)}
              >
                {(Object.keys(PAPEL_LABEL) as AdminRottaPapel[]).map((valor) => (
                  <option key={valor} value={valor}>
                    {PAPEL_LABEL[valor]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <Typography variant="caption" color="muted">
            {PAPEL_DESCRICAO[papel]}
          </Typography>

          {error && (
            <Typography variant="bodySmall" color="danger">
              {error}
            </Typography>
          )}
          {success && (
            <Typography variant="bodySmall" color="success">
              {success}
            </Typography>
          )}
        </Card.Body>
        <Card.Footer>
          <Button variant="primary" isLoading={createAccount.isPending} onClick={handleCreate}>
            Criar conta
          </Button>
        </Card.Footer>
      </Card>

      <Typography variant="subtitle">Contas existentes</Typography>

      <Card>
        {isLoading ? (
          <Card.Body className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </Card.Body>
        ) : isError ? (
          <Card.Body>
            <ErrorState
              message="Não foi possível carregar as contas admin."
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          </Card.Body>
        ) : accounts && accounts.length === 0 ? (
          <Card.Body>
            <Typography variant="body" color="muted">
              Nenhuma conta admin encontrada.
            </Typography>
          </Card.Body>
        ) : (
          <div className="divide-y divide-border">
            {accounts?.map((account) => (
              <div
                key={account.id}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Typography variant="body" className="font-semibold">
                      {account.nome}
                    </Typography>
                    <Badge variant={PAPEL_BADGE_VARIANT[account.papel]}>
                      {PAPEL_LABEL[account.papel]}
                    </Badge>
                    <Badge variant={account.status === "ATIVO" ? "success" : "danger"}>
                      {account.status === "ATIVO" ? "Ativa" : "Desativada"}
                    </Badge>
                  </div>
                  <Typography variant="caption" color="muted">
                    {account.email} · {account.telefone}
                  </Typography>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={account.papel}
                    disabled={updateAccount.isPending}
                    onChange={(event) =>
                      handleChangePapel(account, event.target.value as AdminRottaPapel)
                    }
                    className="w-44"
                  >
                    {(Object.keys(PAPEL_LABEL) as AdminRottaPapel[]).map((valor) => (
                      <option key={valor} value={valor}>
                        {PAPEL_LABEL[valor]}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={updateAccount.isPending}
                    onClick={() => handleToggleStatus(account)}
                  >
                    {account.status === "ATIVO" ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
