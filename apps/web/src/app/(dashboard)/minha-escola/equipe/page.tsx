"use client";

import { useAuth } from "@rotta/auth/web";
import {
  Badge,
  Button,
  Card,
  FormField,
  Input,
  Select,
  Spinner,
  Table,
  Typography,
  useToast,
} from "@rotta/ui/web";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import type { ContaDaEscola, SchoolStaffRole } from "@rotta/api-client";

import { schoolPortalContasApi } from "@/lib/api-client";

/**
 * Equipe da escola — o diretor abrindo acesso para os colegas
 * (24/09/2026).
 *
 * Existe por aritmética. Numa rede municipal com 40 escolas e três
 * pessoas por escola são 120 contas; se todas passassem pelo Admin da
 * Rotta, o cadastro viraria o gargalo da adoção. O Admin cria UM
 * diretor por escola, e daqui o diretor cria o resto.
 *
 * Duas regras vêm do backend e a tela apenas reflete:
 *
 * - O diretor **nunca escolhe a escola** — o `escolaId` sai do token
 *   dele. Por isso nem existe seletor de escola nesta tela.
 * - O diretor **nunca nomeia outro diretor** — senão o cargo que
 *   controla o acesso se autoconcederia. Por isso as opções são só
 *   coordenação e apoio.
 *
 * Quem enxerga O QUÊ não muda com o cargo: os três veem a mesma lista
 * de alunos, porque é a mesma pergunta que os três respondem no portão.
 */
export default function EquipeDaEscolaPage(): JSX.Element {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);

  const contas = useQuery({
    queryKey: ["school-portal", "contas"],
    queryFn: () => schoolPortalContasApi.listar(),
  });

  const criar = useMutation({
    mutationFn: schoolPortalContasApi.criar,
    onSuccess: (conta) => {
      void queryClient.invalidateQueries({ queryKey: ["school-portal", "contas"] });
      setAberto(false);
      toast.success(`Acesso criado para ${conta.nome}. Entregue o e-mail e a senha a ela.`);
    },
    onError: (erro: unknown) => {
      toast.error(
        erro instanceof Error && erro.message ? erro.message : "Não foi possível criar o acesso.",
        "Falha",
      );
    },
  });

  const alterarStatus = useMutation({
    mutationFn: ({ contaId, ativo }: { contaId: string; ativo: boolean }) =>
      schoolPortalContasApi.definirStatus(contaId, ativo),
    onSuccess: (_conta, { ativo }) => {
      void queryClient.invalidateQueries({ queryKey: ["school-portal", "contas"] });
      toast.success(ativo ? "Acesso reativado." : "Acesso desativado.");
    },
  });

  // Só a direção abre acesso. Coordenação e apoio veem a lista (saber
  // quem mais tem acesso à lista das crianças é legítimo), mas sem
  // botão nenhum.
  const ehDiretor = user?.escolaPapel === "DIRETOR";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Typography variant="title">Equipe da escola</Typography>
          <Typography variant="bodySmall" color="muted">
            Quem tem acesso à lista de alunos desta escola.
          </Typography>
        </div>
        <div className="flex gap-2">
          <Link href="/minha-escola">
            <Button variant="ghost" size="sm">
              ← Voltar
            </Button>
          </Link>
          {ehDiretor && (
            <Button variant="primary" size="sm" onClick={() => setAberto(!aberto)}>
              {aberto ? "Cancelar" : "Dar acesso a alguém"}
            </Button>
          )}
        </div>
      </div>

      {aberto && ehDiretor && (
        <Card>
          <Card.Header title="Novo acesso" />
          <Card.Body>
            <FormularioDeAcesso
              isPending={criar.isPending}
              onCriar={(input) => criar.mutate(input)}
            />
          </Card.Body>
        </Card>
      )}

      <Card>
        <Card.Body>
          {contas.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
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
                  render: (conta) =>
                    // Diretor não desativa outro diretor, nem a própria
                    // conta — o backend recusa, e a tela não oferece.
                    ehDiretor && conta.papel !== "DIRETOR" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={alterarStatus.isPending}
                        onClick={() =>
                          alterarStatus.mutate({
                            contaId: conta.id,
                            ativo: conta.status !== "ATIVO",
                          })
                        }
                      >
                        {conta.status === "ATIVO" ? "Desativar" : "Reativar"}
                      </Button>
                    ) : null,
                },
              ]}
              rows={contas.data ?? []}
              keyExtractor={(conta) => conta.id}
              emptyMessage="Nenhum acesso além do seu."
            />
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

function FormularioDeAcesso({
  isPending,
  onCriar,
}: {
  isPending: boolean;
  onCriar: (input: {
    nome: string;
    email: string;
    telefone: string;
    senha: string;
    papel: SchoolStaffRole;
  }) => void;
}): JSX.Element {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<SchoolStaffRole>("COORDENADOR");

  const completo =
    nome.length >= 3 && email.includes("@") && telefone.length >= 10 && senha.length >= 8;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Nome" isRequired>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </FormField>
        <FormField label="Cargo" isRequired>
          {/* Só coordenação e apoio: nomear diretor é do Admin da Rotta. */}
          <Select value={papel} onChange={(e) => setPapel(e.target.value as SchoolStaffRole)}>
            <option value="COORDENADOR">Coordenação</option>
            <option value="AJUDANTE">Apoio</option>
          </Select>
        </FormField>
        <FormField label="E-mail" isRequired>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField
          label="Celular"
          isRequired
          helperText="Vira o login da pessoa e o caminho para recuperar a senha."
        >
          <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
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
              papel,
            })
          }
        >
          {isPending ? "Criando…" : "Criar acesso"}
        </Button>
      </div>
    </div>
  );
}

const PAPEL_LABEL: Record<SchoolStaffRole, string> = {
  DIRETOR: "Direção",
  COORDENADOR: "Coordenação",
  AJUDANTE: "Apoio",
};
