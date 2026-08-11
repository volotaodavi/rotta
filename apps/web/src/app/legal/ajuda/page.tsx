import { Card, Typography } from "@rotta/ui/web";
import Link from "next/link";

import type { Metadata } from "next";

import { LegalDocumentShell, LegalSection } from "@/components/legal/legal-document-shell";
import { getLegalDocumentMeta } from "@/features/legal/documents";


export const metadata: Metadata = {
  title: "Central de Ajuda / Transparência",
  description: "Onde tirar dúvidas, reportar problemas e acompanhar se a Rotta está no ar.",
  alternates: { canonical: "/legal/ajuda" },
};

const meta = getLegalDocumentMeta("ajuda")!;

/**
 * Central de Ajuda / Transparência (Dossiê 45, prompt §10) — índice que
 * aponta para os canais reais já existentes (`/suporte`, `/status`,
 * `/faq`, `/contato`) e para o canal de vulnerabilidade em
 * `/legal/seguranca`, em vez de duplicar esses fluxos aqui.
 */
export default function AjudaPage(): JSX.Element {
  return (
    <LegalDocumentShell meta={meta} toc={[]}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/suporte">
          <Card className="h-full transition-colors hover:border-primary">
            <Card.Body className="flex flex-col gap-2">
              <Typography variant="subtitle">Suporte</Typography>
              <Typography variant="bodySmall" color="muted">
                Já é cliente Rotta? Abra um chamado direto pelo painel. Ainda não é cliente? Fale
                com a gente por e-mail.
              </Typography>
            </Card.Body>
          </Card>
        </Link>
        <Link href="/faq">
          <Card className="h-full transition-colors hover:border-primary">
            <Card.Body className="flex flex-col gap-2">
              <Typography variant="subtitle">Perguntas frequentes</Typography>
              <Typography variant="bodySmall" color="muted">
                Respostas rápidas para as dúvidas mais comuns sobre a Rotta.
              </Typography>
            </Card.Body>
          </Card>
        </Link>
        <Link href="/status">
          <Card className="h-full transition-colors hover:border-primary">
            <Card.Body className="flex flex-col gap-2">
              <Typography variant="subtitle">Status da plataforma</Typography>
              <Typography variant="bodySmall" color="muted">
                Verificação ao vivo se a Rotta está no ar agora.
              </Typography>
            </Card.Body>
          </Card>
        </Link>
        <Link href="/contato">
          <Card className="h-full transition-colors hover:border-primary">
            <Card.Body className="flex flex-col gap-2">
              <Typography variant="subtitle">Contato</Typography>
              <Typography variant="bodySmall" color="muted">
                Fale diretamente com a Rotta por e-mail.
              </Typography>
            </Card.Body>
          </Card>
        </Link>
      </div>

      <LegalSection id="seguranca" title="Encontrou um problema de segurança?">
        Reportes de vulnerabilidade têm um canal próprio, descrito na{" "}
        <Link href="/legal/seguranca#vulnerabilidade">
          Segurança na Rotta, &ldquo;Encontrou uma vulnerabilidade?&rdquo;
        </Link>
        .
      </LegalSection>

      <LegalSection id="documentacao" title="Toda a documentação em um só lugar">
        Esta central reúne links para os canais de ajuda existentes — a documentação legal completa
        (privacidade, termos, segurança, comunidade, RottaPay, motoristas, marketplace, cookies,
        comunicações) fica na navegação lateral desta página.
      </LegalSection>
    </LegalDocumentShell>
  );
}
