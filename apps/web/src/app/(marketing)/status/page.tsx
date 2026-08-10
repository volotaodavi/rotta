import { Typography } from "@rotta/ui/web";

import { StatusChecker } from "./status-checker";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Status do sistema",
  description: "Situação atual da API e dos serviços essenciais da Rotta, em tempo real.",
  alternates: { canonical: "/status" },
};

/**
 * Página pública de status (Dossiê 33 — Prompt 23). Consulta
 * `GET /health/ready` (Dossiê 12 §10.1 — já existente, endpoint
 * `@Public()`) ao vivo, no navegador (`StatusChecker`, client component).
 *
 * Limitação honesta, documentada em vez de escondida: esta página é
 * servida pela MESMA infraestrutura (Vercel) que hospeda o resto do
 * site — se a Vercel como um todo cair, a própria página de status
 * fica inacessível junto. Um status page "de verdade" roda em
 * infraestrutura independente da monitorada (ex. um provedor dedicado
 * como Better Stack/UptimeRobot/status.io) — não implementado aqui por
 * exigir uma conta externa que este código não pode provisionar
 * sozinho; ver Dossiê 33 para o runbook de migração quando fizer
 * sentido.
 */
export default function StatusPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-20">
      <Typography variant="headline" as="h1" className="text-center">
        Status do sistema
      </Typography>
      <Typography variant="body" className="text-center text-text-muted">
        Verificação em tempo real da API da Rotta (banco de dados e cache).
      </Typography>
      <StatusChecker />
    </div>
  );
}
