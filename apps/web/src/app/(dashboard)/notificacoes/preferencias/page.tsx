"use client";

import { Button, Card, Spinner, Typography, buttonVariants } from "@rotta/ui/web";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  useNotificationPreference,
  useUpdateNotificationPreference,
} from "@/features/notifications/hooks/use-notifications";
import { usePushRegistration } from "@/features/notifications/hooks/use-push-registration";

interface FormState {
  receberPush: boolean;
  receberWhatsapp: boolean;
  receberSms: boolean;
  receberEmail: boolean;
  silenciarFinsDeSemana: boolean;
  quietHoursInicio: string;
  quietHoursFim: string;
}

const CANAIS: {
  key: "receberPush" | "receberWhatsapp" | "receberSms" | "receberEmail";
  label: string;
}[] = [
  { key: "receberPush", label: "Push" },
  { key: "receberWhatsapp", label: "WhatsApp" },
  { key: "receberSms", label: "SMS" },
  { key: "receberEmail", label: "E-mail" },
];

/**
 * Preferências de canal + Quiet Hours (Painel Web) — mesma experiência
 * de `apps/mobile/.../preferencias-screen.tsx`. Notificações de
 * prioridade `EMERGENCIA` sempre ignoram estas preferências (RN-17,
 * aplicado no backend).
 */
export default function NotificacoesPreferenciasPage(): JSX.Element {
  const { data: preference, isLoading } = useNotificationPreference();
  const updatePreference = useUpdateNotificationPreference();
  const pushBrowser = usePushRegistration();

  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (preference && form === null) {
      setForm({
        receberPush: preference.receberPush,
        receberWhatsapp: preference.receberWhatsapp,
        receberSms: preference.receberSms,
        receberEmail: preference.receberEmail,
        silenciarFinsDeSemana: preference.silenciarFinsDeSemana,
        quietHoursInicio: preference.quietHoursInicio ?? "",
        quietHoursFim: preference.quietHoursFim ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preference]);

  function handleSalvar(): void {
    if (!form) return;
    updatePreference.mutate({
      receberPush: form.receberPush,
      receberWhatsapp: form.receberWhatsapp,
      receberSms: form.receberSms,
      receberEmail: form.receberEmail,
      silenciarFinsDeSemana: form.silenciarFinsDeSemana,
      quietHoursInicio: form.quietHoursInicio || null,
      quietHoursFim: form.quietHoursFim || null,
    });
  }

  if (isLoading || !form) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Typography variant="title">Preferências de notificação</Typography>
        <Link href="/notificacoes" className={buttonVariants({ variant: "ghost" })}>
          Voltar
        </Link>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <Typography variant="subtitle">Canais de recebimento</Typography>
          {CANAIS.map((canal) => (
            <label key={canal.key} className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={form[canal.key]}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, [canal.key]: event.target.checked } : current,
                  )
                }
              />
              {canal.label}
            </label>
          ))}
        </Card.Body>
      </Card>

      {pushBrowser.disponivel && (
        <Card>
          <Card.Body className="flex flex-col gap-3">
            <Typography variant="subtitle">Push no navegador</Typography>
            <Typography variant="caption" color="muted">
              Ative para receber os avisos da Rotta como notificação do sistema, mesmo com esta aba
              fechada — precisa ser feito uma vez em cada navegador/dispositivo.
            </Typography>
            <div>
              <Button
                variant="secondary"
                isLoading={pushBrowser.status === "ativando"}
                disabled={pushBrowser.status === "ativado"}
                onClick={() => void pushBrowser.ativarPushNoNavegador()}
              >
                {pushBrowser.status === "ativado" ? "Push ativado" : "Ativar push no navegador"}
              </Button>
            </div>
            {pushBrowser.status === "negado" && (
              <Typography variant="caption" color="danger">
                Permissão negada — libere notificações para este site nas configurações do navegador
                e tente de novo.
              </Typography>
            )}
            {pushBrowser.status === "erro" && (
              <Typography variant="caption" color="danger">
                Não foi possível ativar agora. Tente novamente em instantes.
              </Typography>
            )}
          </Card.Body>
        </Card>
      )}

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <Typography variant="subtitle">Quiet Hours</Typography>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={form.silenciarFinsDeSemana}
              onChange={(event) =>
                setForm((current) =>
                  current ? { ...current, silenciarFinsDeSemana: event.target.checked } : current,
                )
              }
            />
            Silenciar aos fins de semana
          </label>
          <Typography variant="caption" color="muted">
            Deixe os dois horários em branco para desativar o silêncio noturno. Notificações de
            emergência nunca são silenciadas.
          </Typography>
          <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-text">
              Início
              <input
                type="time"
                value={form.quietHoursInicio}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, quietHoursInicio: event.target.value } : current,
                  )
                }
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-text">
              Fim
              <input
                type="time"
                value={form.quietHoursFim}
                onChange={(event) =>
                  setForm((current) =>
                    current ? { ...current, quietHoursFim: event.target.value } : current,
                  )
                }
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
              />
            </label>
          </div>
        </Card.Body>
      </Card>

      <div>
        <Button isLoading={updatePreference.isPending} onClick={handleSalvar}>
          Salvar preferências
        </Button>
      </div>
    </div>
  );
}
