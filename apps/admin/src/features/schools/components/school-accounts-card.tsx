"use client";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  Spinner,
  Table,
  Typography,
} from "@rotta/ui/web";
import { useState } from "react";

import type { ContaDaEscola, SchoolAdministrativeDependency } from "@rotta/api-client";

import {
  useCreateSchoolAccount,
  useSchoolAccounts,
  useSetSchoolAccountStatus,
} from "@/features/schools/hooks/use-school-accounts";

/**
 * Acesso da escola ao Portal (fluxo público, 24/09/2026).
 *
 * Pedido do usuário: "não irei criar escolas, irei pegar escolas
 * existentes na planilha e irei fazer com que as escolas tenham o
 * devido painel... só terminar o quesito de e-mail e senha".
 *
 * ## O Admin cria UM diretor, não a escola inteira
 *
 * Daqui sai a conta do diretor. É ele quem, dentro do painel da própria
 * escola, abre acesso para coordenador e ajudante. Numa rede com 40
 * escolas e 3 pessoas cada seriam 120 contas — passar todas pelo Admin
 * faria do cadastro o gargalo da adoção.
 *
 * ## Telefone além de e-mail e senha
 *
 * `User.telefone` é único e obrigatório no banco desde sempre: é um dos
 * três identificadores de login, junto de e-mail e CPF. Afrouxar isso
 * mexeria no login de todos os papéis, bem além deste pedido. São 4
 * campos em vez de 2, e a tela diz por quê.
 */
export function SchoolAccountsCard({
  escolaId,
  escolaNome,
  dependenciaAdministrativa,
}: {
  escolaId: string;
  escolaNome: string;
  dependenciaAdministrativa: SchoolAdministrativeDependency;
}): JSX.Element {
  // O Portal da Escola é só da rede PÚBLICA (25/09/2026: "portal da
  // escola quero apenas das públicas"). O backend recusa, mas deixar o
  // formulário à mostra faria o Admin preencher nome, e-mail e senha
  // para só então descobrir — e desconfiar do sistema, não da regra.
  //
  // A decisão fica NESTE componente e o conteúdo real vive em outro, em
  // vez de um `if` antes dos hooks: hook não pode ser condicional, e um
  // early return aqui dentro mudaria a ordem deles entre renders. De
  // quebra, a escola particular não dispara a busca das contas — que
  // viria vazia de qualquer jeito.
  if (!REDES_PUBLICAS.includes(dependenciaAdministrativa)) {
    return (
      <Card>
        <Card.Header title="Acesso da escola" />
        <Card.Body>
          <EmptyState
            title="Portal da Escola indisponível nesta rede"
            description="O Portal da Escola existe apenas para escolas das redes federal, estadual e municipal. Nas particulares, as famílias acompanham o transporte pelo app do responsável."
          />
        </Card.Body>
      </Card>
    );
  }

  return <ContasDaEscola escolaId={escolaId} escolaNome={escolaNome} />;
}

/** O cartão de verdade — só montado para escola da rede pública. */
function ContasDaEscola({
  escolaId,
  escolaNome,
}: {
  escolaId: string;
  escolaNome: string;
}): JSX.Element {
  const { data: contas, isLoading } = useSchoolAccounts(escolaId);
  const criar = useCreateSchoolAccount(escolaId);
  const definirStatus = useSetSchoolAccountStatus(escolaId);
  const [aberto, setAberto] = useState(false);

  const temDiretor = (contas ?? []).some(
    (conta) => conta.papel === "DIRETOR" && conta.status === "ATIVO",
  );

  return (
    <Card>
      <Card.Header
        title="Acesso ao Portal da Escola"
        action={
          <Button
            variant={temDiretor ? "ghost" : "primary"}
            size="sm"
            onClick={() => setAberto(!aberto)}
          >
            {aberto ? "Cancelar" : "Criar acesso"}
          </Button>
        }
      />
      <Card.Body className="flex flex-col gap-4">
        <Typography variant="bodySmall" color="muted">
          Com esta conta, {escolaNome} vê quais alunos vão de ônibus hoje e se já embarcaram.
          Somente leitura — nada da operação das transportadoras.
        </Typography>

        {aberto && (
          <FormularioDeConta
            escolaId={escolaId}
            temDiretor={temDiretor}
            isPending={criar.isPending}
            onCriar={(input) => criar.mutate(input, { onSuccess: () => setAberto(false) })}
          />
        )}

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : (contas?.length ?? 0) === 0 ? (
          <Typography variant="bodySmall" color="muted">
            Nenhum acesso criado. Sem isso, a escola não consegue entrar no portal.
          </Typography>
        ) : (
          <Table<ContaDaEscola>
            columns={[
              {
                key: "pessoa",
                header: "Pessoa",
                render: (conta) => (
                  <span className="flex flex-col">
                    <span className="font-medium text-text">{conta.nome}</span>
                    <span className="text-xs text-text-muted">{conta.email}</span>
                  </span>
                ),
              },
              {
                key: "papel",
                header: "Cargo",
                render: (conta) => (
                  <Badge variant={conta.papel === "DIRETOR" ? "info" : "neutral"}>
                    {PAPEL_LABEL[conta.papel ?? "AJUDANTE"]}
                  </Badge>
                ),
              },
              {
                key: "status",
                header: "Situação",
                render: (conta) => (
                  <Badge variant={conta.status === "ATIVO" ? "success" : "neutral"}>
                    {conta.status === "ATIVO" ? "Ativo" : "Desativado"}
                  </Badge>
                ),
              },
              {
                key: "acao",
                header: "",
                render: (conta) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={definirStatus.isPending}
                    onClick={() =>
                      definirStatus.mutate({
                        contaId: conta.id,
                        ativo: conta.status !== "ATIVO",
                      })
                    }
                  >
                    {conta.status === "ATIVO" ? "Desativar" : "Reativar"}
                  </Button>
                ),
              },
            ]}
            rows={contas ?? []}
            keyExtractor={(conta) => conta.id}
          />
        )}
      </Card.Body>
    </Card>
  );
}

function FormularioDeConta({
  escolaId,
  temDiretor,
  isPending,
  onCriar,
}: {
  escolaId: string;
  temDiretor: boolean;
  isPending: boolean;
  onCriar: (input: {
    nome: string;
    email: string;
    telefone: string;
    senha: string;
    papel: "DIRETOR";
    escolaId: string;
  }) => void;
}): JSX.Element {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");

  const completo =
    nome.length >= 3 && email.includes("@") && telefone.length >= 10 && senha.length >= 8;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-4">
      {temDiretor && (
        <Typography variant="bodySmall" color="muted">
          Esta escola já tem diretor. Coordenador e ajudante são criados pelo próprio diretor, de
          dentro do painel dela.
        </Typography>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Nome" isRequired>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Maria da Silva"
          />
        </FormField>
        <FormField label="E-mail" isRequired>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="diretoria@escola.rj.gov.br"
          />
        </FormField>
        <FormField
          label="Celular"
          isRequired
          helperText="Vira identificador de login e canal de recuperação de senha."
        >
          <Input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(21) 99999-0000"
          />
        </FormField>
        <FormField
          label="Senha"
          isRequired
          helperText="Mínimo 8 caracteres. Entregue junto do e-mail."
        >
          <Input value={senha} onChange={(e) => setSenha(e.target.value)} />
        </FormField>
      </div>
      <div>
        <Button
          variant="primary"
          disabled={!completo || isPending}
          onClick={() =>
            onCriar({
              nome: nome.trim(),
              email: email.trim(),
              telefone: telefone.trim(),
              senha,
              papel: "DIRETOR",
              escolaId,
            })
          }
        >
          {isPending ? "Criando…" : "Criar acesso da direção"}
        </Button>
      </div>
    </div>
  );
}

const PAPEL_LABEL: Record<"DIRETOR" | "COORDENADOR" | "AJUDANTE", string> = {
  DIRETOR: "Direção",
  COORDENADOR: "Coordenação",
  AJUDANTE: "Apoio",
};

/**
 * As redes que a secretaria de educação trata como públicas — mesma
 * lista do backend (`school-portal.service.ts`).
 *
 * Filantrópica e comunitária caem junto com a privada: na prática são
 * a mesma coisa para quem opera o transporte, não é a prefeitura quem
 * manda nelas.
 */
const REDES_PUBLICAS: SchoolAdministrativeDependency[] = ["FEDERAL", "ESTADUAL", "MUNICIPAL"];
