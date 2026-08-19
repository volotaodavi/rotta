import Link from "next/link";

import type { Metadata } from "next";

import { LegalDocumentShell, LegalSection } from "@/components/legal/legal-document-shell";
import { getLegalDocumentMeta } from "@/features/legal/documents";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description: "Como a sessão é mantida na Rotta e o que fazemos (e não fazemos) com cookies.",
  alternates: { canonical: "/legal/cookies" },
};

const meta = getLegalDocumentMeta("cookies")!;

const TOC = [
  { id: "estado-atual", label: "Estado atual: sem cookies de rastreamento" },
  { id: "sessao", label: "Como sua sessão é mantida" },
  { id: "futuro", label: "Se isso mudar" },
];

/**
 * Política de Cookies (Dossiê 45, prompt §28) — auditoria real (Dossiê
 * 45) não encontrou nenhum script de analytics/pixel/publicidade em
 * `apps/web`, e a sessão web usa `localStorage` + token em memória, não
 * cookie (ver `packages/auth/src/web/token-store.ts`). Este documento
 * reflete esse estado real — nunca descrever um cookie que não existe.
 */
export default function CookiesPage(): JSX.Element {
  return (
    <LegalDocumentShell
      meta={meta}
      toc={TOC}
      relacionados={[{ href: "/legal/privacidade", label: "Política de Privacidade / LGPD" }]}
    >
      <LegalSection id="estado-atual" title="1. Estado atual: sem cookies de rastreamento">
        Hoje, a Rotta{" "}
        <strong>
          não utiliza cookies de rastreamento, analytics de terceiros, pixels de publicidade nem
          ferramentas de tracking
        </strong>{" "}
        no site, painel ou aplicativo. Este documento existe de forma preventiva, por transparência:
        não porque exista algo a esconder, mas para que, no dia em que uma dessas tecnologias for
        adotada, já exista um lugar certo para explicá-la e um histórico de quando ela passou a
        valer.
      </LegalSection>

      <LegalSection id="sessao" title="2. Como sua sessão é mantida">
        A sessão da Rotta na web usa um token de acesso mantido em memória do navegador (perdido a
        cada recarregamento de página, por segurança) e um token de atualização guardado no
        armazenamento local do navegador (<code>localStorage</code>), não um cookie. Isso significa
        que a Rotta não usa cookie nenhum, nem para função essencial de sessão, hoje.
      </LegalSection>

      <LegalSection id="futuro" title="3. Se isso mudar">
        Se a Rotta passar a usar cookies (por exemplo, ao migrar a sessão para um formato mais
        seguro, ou ao adicionar uma ferramenta de análise de uso), esta página será atualizada com a
        finalidade de cada cookie e as opções de preferência disponíveis, e a mudança será refletida
        na versão deste documento (ver o selo de versão no topo desta página), nunca adicionada
        silenciosamente. Ver também{" "}
        <Link href="/legal/privacidade#cookies">
          Política de Privacidade, seção de cookies e tecnologias de rastreamento
        </Link>
        .
      </LegalSection>
    </LegalDocumentShell>
  );
}
