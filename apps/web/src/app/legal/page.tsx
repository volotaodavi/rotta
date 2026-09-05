import { Card, Typography } from "@rotta/ui/web";
import Link from "next/link";

import type { Metadata } from "next";

import { LEGAL_DOCUMENTS } from "@/features/legal/documents";

export const metadata: Metadata = {
  title: "Documentação Rotta",
  description:
    "Central de transparência da Rotta: privacidade, segurança, termos de uso, política da comunidade, RottaPay, diretrizes para motoristas e mais.",
  alternates: { canonical: "/legal" },
};

/**
 * Hub do Rotta Legal, Trust & Community Center (Dossiê 45) — porta de
 * entrada pública, sem login, linkada no rodapé de toda a plataforma
 * (prompt §2/§43).
 */
export default function LegalHubPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Typography variant="headline" as="h1">
          Documentação Rotta
        </Typography>
        <Typography variant="body" color="muted">
          Segurança, transparência e clareza sobre como a Rotta funciona: o que fazemos com seus
          dados, como a plataforma protege sua conta, como funciona a contratação e o pagamento, e
          quais são as regras da comunidade.
        </Typography>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {LEGAL_DOCUMENTS.map((doc) => (
          <Link key={doc.slug} href={doc.href}>
            <Card className="h-full transition-colors hover:border-primary">
              <Card.Body className="flex flex-col gap-2">
                <Typography variant="subtitle">{doc.titulo}</Typography>
                <Typography variant="bodySmall" color="muted">
                  {doc.resumo}
                </Typography>
                <Typography variant="caption" color="muted">
                  Versão {doc.versao} · Atualizado em {doc.atualizadoEm}
                </Typography>
              </Card.Body>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
