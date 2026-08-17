"use client";

import { Badge, Button, Card, Spinner, Table, Typography, buttonVariants } from "@rotta/ui/web";
import Link from "next/link";
import { useState } from "react";

import type { ListRoutesParams, Route } from "@rotta/api-client";

import { useRoutesList } from "@/features/routes/hooks/use-routes";
import {
  ROUTE_STATUS_LABEL,
  ROUTE_STATUS_VARIANT,
  ROUTE_WEEKDAY_LABEL,
} from "@/features/routes/labels";
import { SCHOOL_SHIFT_LABEL } from "@/features/schools/labels";
import { useMyTeam } from "@/features/team/hooks/use-team";


/**
 * Listagem de Rotas (Empresa/Gestor) — achado da auditoria (pedido do
 * usuário: "o responsável... deverá mostrar qual motorista está se
 * credenciando... mostrando a rota em tempo real"): a API de Rotas
 * sempre existiu completa (Frente #92-108), mas nenhuma tela em nenhuma
 * plataforma jamais chamou `POST /routes` — só a operação do motorista
 * (`/minha-rota`, leitura). Sem uma Rota de verdade com motorista
 * atribuído, nenhum aluno credenciado (`Contract` ATIVO) conseguia
 * aparecer em tempo real pra ninguém, e o próprio motorista nunca via o
 * botão de iniciar viagem (`/minha-rota` mostra "Nenhuma rota
 * atribuída" quando a lista vem vazia — não é um bug de UI, é a
 * consequência direta deste gap).
 */
export default function RotasPage(): JSX.Element {
  const params: ListRoutesParams = { page: 1, pageSize: 100 };
  const { data, isLoading } = useRoutesList(params);
  const { data: team } = useMyTeam();
  const [showAll, setShowAll] = useState(false);

  const motoristaNome = (id: string | null): string => {
    if (!id) return "Nenhum motorista atribuído";
    return team?.find((member) => member.userId === id)?.nome ?? "Motorista";
  };

  const items = showAll ? data?.items : data?.items.filter((route) => route.status === "ATIVA");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="title">Rotas</Typography>
          <Typography variant="bodySmall" color="muted">
            Crie a rota, atribua um motorista/veículo e adicione os alunos já credenciados — é isso
            que faz a rota aparecer em tempo real para o motorista e para os responsáveis.
          </Typography>
        </div>
        <Link href="/rotas/novo" className={buttonVariants({ variant: "primary" })}>
          Nova rota
        </Link>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAll((current) => !current)}>
              {showAll ? "Mostrar só ativas" : "Mostrar pausadas também"}
            </Button>
          </div>

          {isLoading || !items ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : items.length === 0 ? (
            <Typography variant="body" color="muted">
              Nenhuma rota ainda. Crie a primeira para começar a atender os alunos já credenciados.
            </Typography>
          ) : (
            <Table<Route>
              columns={[
                { key: "nome", header: "Rota", render: (route) => route.nome },
                {
                  key: "turno",
                  header: "Turno",
                  render: (route) => SCHOOL_SHIFT_LABEL[route.turno],
                },
                {
                  key: "dias",
                  header: "Dias",
                  render: (route) =>
                    route.diasSemana.map((dia) => ROUTE_WEEKDAY_LABEL[dia].slice(0, 3)).join(", "),
                },
                {
                  key: "motorista",
                  header: "Motorista",
                  render: (route) => motoristaNome(route.motoristaPadraoId),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (route) => (
                    <Badge variant={ROUTE_STATUS_VARIANT[route.status]}>
                      {ROUTE_STATUS_LABEL[route.status]}
                    </Badge>
                  ),
                },
              ]}
              rows={items}
              keyExtractor={(route) => route.id}
              onRowClick={(route) => {
                window.location.href = `/rotas/${route.id}`;
              }}
            />
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
