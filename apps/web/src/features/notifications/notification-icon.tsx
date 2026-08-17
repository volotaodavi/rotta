import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Bus,
  CheckCircle,
  Clock,
  FileText,
  GraduationCap,
  MapPin,
  RefreshCw,
  UserPlus,
  UserX,
  XCircle,
} from "@rotta/icons";

import type { NotificationEventType } from "@rotta/api-client";

/**
 * Ícone colorido por tipo de notificação (modelo de referência do
 * Responsável anexado pelo usuário — lista com um ícone colorido por
 * item, não só texto). Mesma ideia já usada em `EVENT_ICON`
 * (`alunos/[id]/mapa/page.tsx`), agora estendida às 22 categorias reais
 * de `NotificationEventType` — cada cor já é um token semântico
 * existente (success/primary/warning/danger/info), nunca uma cor nova
 * inventada pra isso.
 */
const NOTIFICATION_TYPE_ICON: Record<NotificationEventType, JSX.Element> = {
  VIAGEM_INICIADA: <Bus size={18} className="text-primary" />,
  VIAGEM_ENCERRADA: <Bus size={18} className="text-text-muted" />,
  ALUNO_EMBARCOU: <ArrowUpCircle size={18} className="text-success" />,
  ALUNO_DESEMBARCOU: <ArrowDownCircle size={18} className="text-primary" />,
  ALUNO_AUSENTE: <UserX size={18} className="text-danger" />,
  VEICULO_PROXIMO: <MapPin size={18} className="text-primary" />,
  MOTORISTA_ALTERADO: <RefreshCw size={18} className="text-info" />,
  MONITOR_ALTERADO: <RefreshCw size={18} className="text-info" />,
  VEICULO_ALTERADO: <RefreshCw size={18} className="text-info" />,
  ROTA_ALTERADA: <RefreshCw size={18} className="text-info" />,
  OCORRENCIA: <AlertTriangle size={18} className="text-warning" />,
  EMERGENCIA: <AlertTriangle size={18} className="text-danger" />,
  NOVO_CONTRATO: <FileText size={18} className="text-info" />,
  CONTRATO_ASSINADO: <FileText size={18} className="text-success" />,
  CNH_VENCENDO: <AlertTriangle size={18} className="text-warning" />,
  DOCUMENTO_VENCENDO: <AlertTriangle size={18} className="text-warning" />,
  PAGAMENTO_APROVADO: <CheckCircle size={18} className="text-success" />,
  PAGAMENTO_RECUSADO: <XCircle size={18} className="text-danger" />,
  PAGAMENTO_PENDENTE: <Clock size={18} className="text-warning" />,
  NOVA_ESCOLA: <GraduationCap size={18} className="text-info" />,
  NOVO_ALUNO: <UserPlus size={18} className="text-info" />,
  NOVO_RESPONSAVEL: <UserPlus size={18} className="text-info" />,
};

/** Fundo suave (mesma cor do ícone, em tinta mínima) atrás do círculo do ícone — mesmo padrão de `bg-primary-muted`/`text-primary` já usado em cartões de ícone no resto do produto. */
const NOTIFICATION_TYPE_BG: Record<NotificationEventType, string> = {
  VIAGEM_INICIADA: "bg-primary-muted",
  VIAGEM_ENCERRADA: "bg-muted",
  ALUNO_EMBARCOU: "bg-success/15",
  ALUNO_DESEMBARCOU: "bg-primary-muted",
  ALUNO_AUSENTE: "bg-danger/15",
  VEICULO_PROXIMO: "bg-primary-muted",
  MOTORISTA_ALTERADO: "bg-info/15",
  MONITOR_ALTERADO: "bg-info/15",
  VEICULO_ALTERADO: "bg-info/15",
  ROTA_ALTERADA: "bg-info/15",
  OCORRENCIA: "bg-warning/15",
  EMERGENCIA: "bg-danger/15",
  NOVO_CONTRATO: "bg-info/15",
  CONTRATO_ASSINADO: "bg-success/15",
  CNH_VENCENDO: "bg-warning/15",
  DOCUMENTO_VENCENDO: "bg-warning/15",
  PAGAMENTO_APROVADO: "bg-success/15",
  PAGAMENTO_RECUSADO: "bg-danger/15",
  PAGAMENTO_PENDENTE: "bg-warning/15",
  NOVA_ESCOLA: "bg-info/15",
  NOVO_ALUNO: "bg-info/15",
  NOVO_RESPONSAVEL: "bg-info/15",
};

export function NotificationTypeIcon({ tipo }: { tipo: NotificationEventType }): JSX.Element {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${NOTIFICATION_TYPE_BG[tipo]}`}
    >
      {NOTIFICATION_TYPE_ICON[tipo]}
    </div>
  );
}
