"use client";

import { Mail } from "@rotta/icons";
import { Button } from "@rotta/ui/web";
import { useState, type ReactNode } from "react";

import { LeadContactModal, type AudienceOption } from "./lead-contact-modal";

import { GOVERNO_CONTACT_EMAIL } from "@/lib/site-config";


/**
 * Soluções da Rotta mais relevantes por tipo de órgão (pedido do
 * usuário: "veja quais soluções estamos oferecendo para cada opção").
 * Cada item é uma capacidade que a plataforma JÁ tem hoje (mesma lista
 * de `CAPACIDADES` em `governo/page.tsx`, só reorganizada por
 * relevância) — nunca uma promessa nova, mesma disciplina de honestidade
 * do resto da página.
 */
const AUDIENCE_OPTIONS_GOVERNO: AudienceOption[] = [
  {
    value: "prefeitura",
    label: "Prefeitura / Secretaria Municipal de Educação",
    solutions: [
      "GPS ao vivo de toda a frota escolar do município num painel só",
      "Notificação automática de embarque/desembarque pras famílias",
      "Trilha de auditoria pronta pra prestação de contas",
    ],
  },
  {
    value: "secretaria-estadual",
    label: "Secretaria Estadual de Educação",
    solutions: [
      "Visão consolidada de múltiplos municípios/transportadoras contratadas",
      "Verificação de motoristas e veículos antes de aparecerem como elegíveis",
      "Gestão de frota, rotas e escolas sem planilha paralela",
    ],
  },
  {
    value: "consorcio",
    label: "Consórcio Intermunicipal de Transporte Escolar",
    solutions: [
      "Gestão de frotas de vários municípios consorciados num painel único",
      "Rotas e alunos vinculados por município, sem misturar dados",
      "Trilha de auditoria por ação — útil na hora de prestar contas ao consórcio",
    ],
  },
  {
    value: "autarquia",
    label: "Autarquia ou órgão de trânsito escolar",
    solutions: [
      "Verificação de CNH, categoria, EAR e curso especializado do motorista",
      "Documentos de veículo (CRLV, seguro, vistoria) organizados num só lugar",
      "Alertas automáticos de documento vencendo",
    ],
  },
  {
    value: "outro",
    label: "Outro",
    solutions: [
      "GPS em tempo real, verificação de motoristas/veículos e trilha de auditoria",
      "A mesma plataforma usada hoje por transportadoras privadas, sem versão reduzida",
    ],
  },
];

const ASSUNTO_PADRAO = "Quero agendar uma reunião com a Rotta";

export interface GovernoContactButtonProps {
  variant?: "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
  showIcon?: boolean;
}

/** Botão de contato do `/governo` — abre o `LeadContactModal` no lugar do antigo `mailto:` estático. */
export function GovernoContactButton({
  variant = "primary",
  size = "lg",
  className,
  children,
  showIcon = false,
}: GovernoContactButtonProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        iconLeft={showIcon ? <Mail className="h-4 w-4" /> : undefined}
        onClick={() => setIsOpen(true)}
      >
        {children}
      </Button>
      <LeadContactModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        toEmail={GOVERNO_CONTACT_EMAIL}
        variant="governo"
        audienceOptions={AUDIENCE_OPTIONS_GOVERNO}
        defaultSubject={ASSUNTO_PADRAO}
        title="Marcar uma reunião com a Rotta"
        description="Preencha o essencial — a gente monta o e-mail pra você, já pronto pra enviar do seu cliente de e-mail."
      />
    </>
  );
}
