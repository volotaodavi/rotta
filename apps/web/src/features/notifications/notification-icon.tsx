import {
  AlarmClock,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeCheck,
  BadgeX,
  Bell,
  Building2,
  Bus,
  CheckCircle,
  Clock,
  FileBarChart,
  FileText,
  GraduationCap,
  Handshake,
  Hourglass,
  LifeBuoy,
  Lock,
  MapPin,
  MapPinned,
  Megaphone,
  MessageCircle,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  ShieldX,
  TrendingUp,
  UserCheck,
  UserCog,
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
  NOVA_SOLICITACAO_TRANSPORTE: <Handshake size={18} className="text-primary" />,
  ALUNO_NAO_VAI_HOJE: <UserX size={18} className="text-warning" />,
  ENDERECO_DO_DIA_ALTERADO: <MapPinned size={18} className="text-warning" />,
  ESCALA_ALTERADA: <UserCog size={18} className="text-warning" />,
  TRIAL_EXPIRANDO: <Hourglass size={18} className="text-warning" />,
  TRIAL_VENCE_HOJE: <AlarmClock size={18} className="text-danger" />,
  TRIAL_BLOQUEADO: <Lock size={18} className="text-danger" />,
  SUPORTE_TICKET_ABERTO: <LifeBuoy size={18} className="text-info" />,
  SUPORTE_NOVA_MENSAGEM: <MessageCircle size={18} className="text-info" />,
  SUPORTE_TICKET_ENCERRADO: <CheckCircle size={18} className="text-text-muted" />,
  AVISO_GERAL: <Megaphone size={18} className="text-info" />,
  ALUNO_VEZ_EMBARQUE: <ArrowUpCircle size={18} className="text-primary" />,
  ALUNO_VEZ_DESEMBARQUE: <ArrowDownCircle size={18} className="text-primary" />,
  VEICULO_REVISAO_APROVADA: <BadgeCheck size={18} className="text-success" />,
  VEICULO_REVISAO_REPROVADA: <BadgeX size={18} className="text-danger" />,
  CONVERSA_NOVA_MENSAGEM: <MessageSquare size={18} className="text-info" />,
  CADASTRO_CONCLUIDO: <UserCheck size={18} className="text-success" />,
  IDENTIDADE_APROVADA: <ShieldCheck size={18} className="text-success" />,
  IDENTIDADE_REPROVADA: <ShieldX size={18} className="text-danger" />,
  NOVO_CLIENTE_CADASTRADO: <Building2 size={18} className="text-info" />,
  PLANO_NOVA_ASSINATURA: <TrendingUp size={18} className="text-success" />,
  RELATORIO_SEMANAL: <FileBarChart size={18} className="text-text-muted" />,
  RELATORIO_MENSAL: <FileBarChart size={18} className="text-text-muted" />,
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
  NOVA_SOLICITACAO_TRANSPORTE: "bg-primary/15",
  ALUNO_NAO_VAI_HOJE: "bg-warning/15",
  ENDERECO_DO_DIA_ALTERADO: "bg-warning/15",
  ESCALA_ALTERADA: "bg-warning/15",
  TRIAL_EXPIRANDO: "bg-warning/15",
  TRIAL_VENCE_HOJE: "bg-danger/15",
  TRIAL_BLOQUEADO: "bg-danger/15",
  SUPORTE_TICKET_ABERTO: "bg-info/15",
  SUPORTE_NOVA_MENSAGEM: "bg-info/15",
  SUPORTE_TICKET_ENCERRADO: "bg-muted",
  AVISO_GERAL: "bg-info/15",
  ALUNO_VEZ_EMBARQUE: "bg-primary-muted",
  ALUNO_VEZ_DESEMBARQUE: "bg-primary-muted",
  VEICULO_REVISAO_APROVADA: "bg-success/15",
  VEICULO_REVISAO_REPROVADA: "bg-danger/15",
  CONVERSA_NOVA_MENSAGEM: "bg-info/15",
  CADASTRO_CONCLUIDO: "bg-success/15",
  IDENTIDADE_APROVADA: "bg-success/15",
  IDENTIDADE_REPROVADA: "bg-danger/15",
  NOVO_CLIENTE_CADASTRADO: "bg-info/15",
  PLANO_NOVA_ASSINATURA: "bg-success/15",
  RELATORIO_SEMANAL: "bg-muted",
  RELATORIO_MENSAL: "bg-muted",
};

/**
 * O `??` não é defensividade decorativa: os mapas acima cobrem a união
 * de hoje, e o navegador pode estar com um pacote servido antes do
 * último deploy da API. Chegando um tipo que este código não conhece, o
 * certo é um sino cinza, nunca um círculo vazio sem explicação.
 */
export function NotificationTypeIcon({ tipo }: { tipo: NotificationEventType }): JSX.Element {
  const fundo = NOTIFICATION_TYPE_BG[tipo] ?? "bg-muted";
  const icone = NOTIFICATION_TYPE_ICON[tipo] ?? <Bell size={18} className="text-text-muted" />;

  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${fundo}`}>
      {icone}
    </div>
  );
}
