import type { Metadata } from "next";

import { LegalDocumentShell, LegalSection } from "@/components/legal/legal-document-shell";
import { getLegalDocumentMeta } from "@/features/legal/documents";

export const metadata: Metadata = {
  title: "Política de Comunicações",
  description: "Push, e-mail, WhatsApp e SMS: o que é transacional e o que é opcional.",
  alternates: { canonical: "/legal/comunicacoes" },
};

const meta = getLegalDocumentMeta("comunicacoes")!;

const TOC = [
  { id: "canais", label: "Canais utilizados" },
  { id: "transacional-marketing", label: "Transacional × Marketing" },
  { id: "preferencias", label: "Suas preferências" },
];

/**
 * Política de Comunicações (Dossiê 45, prompt §27) — baseada na
 * arquitetura real do Rotta Communication Engine (Dossiê 40): push
 * (FCM) e e-mail já operam de verdade; WhatsApp/SMS têm arquitetura
 * preparada mas dependem de provedor externo configurado — descrito
 * honestamente, não como "já ativo para todo mundo".
 */
export default function ComunicacoesPage(): JSX.Element {
  return (
    <LegalDocumentShell meta={meta} toc={TOC}>
      <LegalSection id="canais" title="1. Canais utilizados">
        A Rotta pode se comunicar com você por notificação push (dentro do aplicativo), e-mail e,
        quando configurado para a sua conta/plano, WhatsApp e SMS. Nem todo canal está disponível
        para toda conta: alguns dependem de um provedor específico estar habilitado.
      </LegalSection>

      <LegalSection id="transacional-marketing" title="2. Transacional × Marketing">
        Separamos dois tipos de comunicação. <strong>Transacional</strong>: essenciais para o
        funcionamento do serviço que você contratou: aviso de embarque/desembarque, atraso, mudança
        de rota, cobrança, alteração de conta. Essas comunicações não podem ser totalmente
        desativadas enquanto sua conta estiver ativa, porque fazem parte do próprio serviço.{" "}
        <strong>Marketing</strong>: novidades, dicas e conteúdo promocional, sempre opcional.
      </LegalSection>

      <LegalSection id="preferencias" title="3. Suas preferências">
        Você pode ajustar suas preferências de comunicação (quais canais recebe, e desativar
        comunicações de marketing) na Central de Notificações do app/painel, incluindo horários de
        silêncio (&ldquo;Quiet Hours&rdquo;) para comunicações não urgentes.
      </LegalSection>
    </LegalDocumentShell>
  );
}
