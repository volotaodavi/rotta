"use client";

import { ANNOUNCEMENT_AUDIENCE_LABEL } from "@rotta/api-client";
import { Badge, Button, Card, ErrorState, Select, Spinner, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { AnnouncementAudience } from "@rotta/api-client";

import { useAnnouncements, useCreateAnnouncement } from "@/features/announcements/hooks/use-announcements";

/**
 * Aba "Avisos" (pedido do usuário: "no painel do admin também deverá
 * ter uma aba de criação de avisos, comunicados e notificações
 * gerais. A cada comunicação nova deverá ser um push notification").
 * Exclusivo de Admin Rotta — o backend (`AnnouncementsController`) já
 * restringe via `@Roles(Role.ADMIN_ROTTA)`; esta tela não reimplementa
 * essa checagem, só assume que só chegou aqui quem tem acesso.
 */
export default function AvisosPage(): JSX.Element {
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [publico, setPublico] = useState<AnnouncementAudience>("TODOS");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const createAnnouncement = useCreateAnnouncement();
  const { data, isLoading, isError, refetch, isFetching } = useAnnouncements({
    page: 1,
    pageSize: 50,
  });

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Avisos</Typography>

      <Card className="max-w-2xl">
        <Card.Body className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text" htmlFor="titulo">
              Título
            </label>
            <input
              id="titulo"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Resuma o comunicado em poucas palavras"
              className="h-11 w-full rounded-md border border-border bg-surface px-4 text-sm text-text placeholder:text-placeholder outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text" htmlFor="publico">
              Público
            </label>
            <Select
              id="publico"
              value={publico}
              onChange={(event) => setPublico(event.target.value as AnnouncementAudience)}
            >
              {(Object.keys(ANNOUNCEMENT_AUDIENCE_LABEL) as AnnouncementAudience[]).map((valor) => (
                <option key={valor} value={valor}>
                  {ANNOUNCEMENT_AUDIENCE_LABEL[valor]}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text" htmlFor="corpo">
              Mensagem
            </label>
            <textarea
              id="corpo"
              value={corpo}
              onChange={(event) => setCorpo(event.target.value)}
              placeholder="Escreva o comunicado com o máximo de detalhes possível"
              rows={6}
              className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-placeholder outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>

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
          <Button
            variant="primary"
            isLoading={createAnnouncement.isPending}
            onClick={() => {
              if (titulo.trim().length < 3 || corpo.trim().length < 10) {
                setError("Informe um título e uma mensagem com mais detalhes.");
                setSuccess(null);
                return;
              }
              setError(null);
              createAnnouncement.mutate(
                { titulo, corpo, publico },
                {
                  onSuccess: (announcement) => {
                    setTitulo("");
                    setCorpo("");
                    setSuccess(
                      `Aviso publicado para ${announcement.destinatariosCount} ${
                        announcement.destinatariosCount === 1 ? "destinatário" : "destinatários"
                      }.`,
                    );
                  },
                  onError: () => {
                    setError("Não foi possível publicar o aviso. Tente novamente.");
                  },
                },
              );
            }}
          >
            Publicar aviso
          </Button>
        </Card.Footer>
      </Card>

      <Typography variant="subtitle">Publicados</Typography>

      <Card>
        {isLoading ? (
          <Card.Body className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </Card.Body>
        ) : isError ? (
          <Card.Body>
            <ErrorState
              message="Não foi possível carregar os avisos."
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          </Card.Body>
        ) : data && data.items.length === 0 ? (
          <Card.Body>
            <Typography variant="body" color="muted">
              Nenhum aviso publicado ainda.
            </Typography>
          </Card.Body>
        ) : (
          <div className="divide-y divide-border">
            {data?.items.map((announcement) => (
              <div key={announcement.id} className="flex flex-col gap-1 px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <Typography variant="body" className="font-semibold">
                    {announcement.titulo}
                  </Typography>
                  <Badge variant="info">{ANNOUNCEMENT_AUDIENCE_LABEL[announcement.publico]}</Badge>
                </div>
                <Typography variant="bodySmall" color="muted">
                  {announcement.corpo}
                </Typography>
                <Typography variant="caption" color="muted">
                  {announcement.criadoPorNome} ·{" "}
                  {new Date(announcement.createdAt).toLocaleDateString("pt-BR")} ·{" "}
                  {announcement.destinatariosCount}{" "}
                  {announcement.destinatariosCount === 1 ? "destinatário" : "destinatários"}
                </Typography>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
