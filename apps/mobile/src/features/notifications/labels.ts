import {
  AlarmClock,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Backpack,
  BadgeCheck,
  BadgeX,
  Bell,
  Building2,
  Bus,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  FileBarChart,
  FileText,
  Flag,
  Hourglass,
  IdCard,
  LifeBuoy,
  Lock,
  MapPin,
  Handshake,
  MapPinned,
  Megaphone,
  MessageCircle,
  MessageSquare,
  School,
  ShieldCheck,
  ShieldX,
  Siren,
  TrendingUp,
  UserCheck,
  UserCog,
  UserRoundX,
  Users,
  XCircle,
  type LucideIcon,
} from "@rotta/icons/native";

import type { StatusPillTone } from "../vehicles/components";
import type {
  CommunicationChannel,
  NotificationEventType,
  NotificationPriorityLevel,
} from "@rotta/api-client";

/**
 * Rótulos/ícones da Central de Notificações Internas (Dossiê 11 §4.4:
 * "ícone por tipo"). Até o Dossiê 36 (Prompt 26) usava emoji simples —
 * gap documentado ali mesmo (Seção 2.2/6: "sem biblioteca de ícones
 * nativa no monorepo ainda"), fechado nesta entrega com
 * `@rotta/icons/native` (`lucide-react-native`), mesmo catálogo de
 * nomes que o Design System web.
 */
export const NOTIFICATION_TYPE_ICON: Record<NotificationEventType, LucideIcon> = {
  VIAGEM_INICIADA: Bus,
  VIAGEM_ENCERRADA: Flag,
  ALUNO_EMBARCOU: Backpack,
  ALUNO_DESEMBARCOU: School,
  ALUNO_AUSENTE: UserRoundX,
  VEICULO_PROXIMO: MapPin,
  MOTORISTA_ALTERADO: UserCog,
  MONITOR_ALTERADO: UserCog,
  VEICULO_ALTERADO: Car,
  ROTA_ALTERADA: MapPinned,
  OCORRENCIA: AlertTriangle,
  EMERGENCIA: Siren,
  NOVO_CONTRATO: FileText,
  CONTRATO_ASSINADO: CheckCircle2,
  CNH_VENCENDO: IdCard,
  DOCUMENTO_VENCENDO: FileText,
  PAGAMENTO_APROVADO: CreditCard,
  PAGAMENTO_RECUSADO: XCircle,
  PAGAMENTO_PENDENTE: Clock,
  NOVA_ESCOLA: School,
  NOVO_ALUNO: Backpack,
  NOVO_RESPONSAVEL: Users,
  // Avisos por cargo (15/09/2026). Cada ícone é o do ASSUNTO, não o do
  // destinatário — quem lê reconhece o tema antes de ler o texto.
  NOVA_SOLICITACAO_TRANSPORTE: Handshake,
  ALUNO_NAO_VAI_HOJE: Backpack,
  ENDERECO_DO_DIA_ALTERADO: MapPinned,
  ESCALA_ALTERADA: UserCog,
  /*
    Os dezenove abaixo entraram em 08/10/2026. Eles existiam no banco
    desde sempre e NUNCA estiveram aqui: a Central de Notificações
    resolvia o ícone por `NOTIFICATION_TYPE_ICON[tipo]` e renderizava o
    resultado direto, então qualquer um deles chegando devolvia
    `undefined` e derrubava a tela com "Element type is invalid ... but
    got: undefined". Foi o que aconteceu com um usuário em 07/10/2026.
    `CADASTRO_CONCLUIDO` e `IDENTIDADE_APROVADA` estão nesta lista, e
    são das primeiras notificações que qualquer conta nova recebe.
  */
  TRIAL_EXPIRANDO: Hourglass,
  TRIAL_VENCE_HOJE: AlarmClock,
  TRIAL_BLOQUEADO: Lock,
  SUPORTE_TICKET_ABERTO: LifeBuoy,
  SUPORTE_NOVA_MENSAGEM: MessageCircle,
  SUPORTE_TICKET_ENCERRADO: CheckCircle2,
  AVISO_GERAL: Megaphone,
  // Seta para cima é entrar na van, para baixo é descer dela. O aviso é
  // por transição de parada, não por GPS — `VEICULO_PROXIMO` é o de
  // distância e continua com `MapPin`.
  ALUNO_VEZ_EMBARQUE: ArrowUpCircle,
  ALUNO_VEZ_DESEMBARQUE: ArrowDownCircle,
  VEICULO_REVISAO_APROVADA: BadgeCheck,
  VEICULO_REVISAO_REPROVADA: BadgeX,
  CONVERSA_NOVA_MENSAGEM: MessageSquare,
  CADASTRO_CONCLUIDO: UserCheck,
  IDENTIDADE_APROVADA: ShieldCheck,
  IDENTIDADE_REPROVADA: ShieldX,
  NOVO_CLIENTE_CADASTRADO: Building2,
  PLANO_NOVA_ASSINATURA: TrendingUp,
  RELATORIO_SEMANAL: FileBarChart,
  RELATORIO_MENSAL: FileBarChart,
};

export const NOTIFICATION_TYPE_LABEL: Record<NotificationEventType, string> = {
  VIAGEM_INICIADA: "Viagem iniciada",
  VIAGEM_ENCERRADA: "Viagem encerrada",
  ALUNO_EMBARCOU: "Embarque",
  ALUNO_DESEMBARCOU: "Desembarque",
  ALUNO_AUSENTE: "Ausência",
  VEICULO_PROXIMO: "Veículo próximo",
  MOTORISTA_ALTERADO: "Motorista alterado",
  MONITOR_ALTERADO: "Monitor alterado",
  VEICULO_ALTERADO: "Veículo alterado",
  ROTA_ALTERADA: "Rota alterada",
  OCORRENCIA: "Ocorrência",
  EMERGENCIA: "Emergência",
  NOVO_CONTRATO: "Novo contrato",
  CONTRATO_ASSINADO: "Contrato assinado",
  CNH_VENCENDO: "CNH vencendo",
  DOCUMENTO_VENCENDO: "Documento vencendo",
  PAGAMENTO_APROVADO: "Pagamento aprovado",
  PAGAMENTO_RECUSADO: "Pagamento recusado",
  PAGAMENTO_PENDENTE: "Pagamento pendente",
  NOVA_ESCOLA: "Nova escola",
  NOVO_ALUNO: "Novo aluno",
  NOVO_RESPONSAVEL: "Novo responsável",
  NOVA_SOLICITACAO_TRANSPORTE: "Nova solicitação",
  ALUNO_NAO_VAI_HOJE: "Aluno não vai hoje",
  ENDERECO_DO_DIA_ALTERADO: "Endereço de hoje",
  ESCALA_ALTERADA: "Escala alterada",
  TRIAL_EXPIRANDO: "Teste grátis acabando",
  TRIAL_VENCE_HOJE: "Teste grátis vence hoje",
  TRIAL_BLOQUEADO: "Teste grátis encerrado",
  SUPORTE_TICKET_ABERTO: "Chamado aberto",
  SUPORTE_NOVA_MENSAGEM: "Resposta do suporte",
  SUPORTE_TICKET_ENCERRADO: "Chamado encerrado",
  AVISO_GERAL: "Aviso da Rotta",
  ALUNO_VEZ_EMBARQUE: "Vez do embarque",
  ALUNO_VEZ_DESEMBARQUE: "Vez do desembarque",
  VEICULO_REVISAO_APROVADA: "Veículo aprovado",
  VEICULO_REVISAO_REPROVADA: "Veículo reprovado",
  CONVERSA_NOVA_MENSAGEM: "Nova mensagem",
  CADASTRO_CONCLUIDO: "Cadastro concluído",
  IDENTIDADE_APROVADA: "Identidade aprovada",
  IDENTIDADE_REPROVADA: "Identidade reprovada",
  NOVO_CLIENTE_CADASTRADO: "Novo cliente",
  PLANO_NOVA_ASSINATURA: "Nova assinatura",
  RELATORIO_SEMANAL: "Relatório semanal",
  RELATORIO_MENSAL: "Relatório mensal",
};

/**
 * Cor por tipo de notificação (3 imagens de referência anexadas pelo
 * usuário — tela do Responsável com um ícone COLORIDO por item, não só
 * cinza; paridade com `NotificationTypeIcon` do Painel Web,
 * `apps/web/src/features/notifications/notification-icon.tsx`). Cada
 * "tom" aqui é resolvido pra uma cor real de `theme.colors` no
 * componente (`CentralScreen`) — nunca uma cor solta, sempre um dos
 * tokens semânticos já existentes (success/warning/danger/info/primary).
 */
export type NotificationColorTone = "success" | "primary" | "warning" | "danger" | "info" | "muted";

export const NOTIFICATION_TYPE_TONE: Record<NotificationEventType, NotificationColorTone> = {
  VIAGEM_INICIADA: "primary",
  VIAGEM_ENCERRADA: "muted",
  ALUNO_EMBARCOU: "success",
  ALUNO_DESEMBARCOU: "primary",
  ALUNO_AUSENTE: "danger",
  VEICULO_PROXIMO: "primary",
  MOTORISTA_ALTERADO: "info",
  MONITOR_ALTERADO: "info",
  VEICULO_ALTERADO: "info",
  ROTA_ALTERADA: "info",
  OCORRENCIA: "warning",
  EMERGENCIA: "danger",
  NOVO_CONTRATO: "info",
  CONTRATO_ASSINADO: "success",
  CNH_VENCENDO: "warning",
  DOCUMENTO_VENCENDO: "warning",
  PAGAMENTO_APROVADO: "success",
  PAGAMENTO_RECUSADO: "danger",
  PAGAMENTO_PENDENTE: "warning",
  NOVA_ESCOLA: "info",
  NOVO_ALUNO: "info",
  NOVO_RESPONSAVEL: "info",
  // Solicitação nova é oportunidade (primary); os outros três mudam o
  // plano do dia de quem dirige, então warning — chamam atenção sem o
  // peso de "algo deu errado" que `danger` carregaria.
  NOVA_SOLICITACAO_TRANSPORTE: "primary",
  ALUNO_NAO_VAI_HOJE: "warning",
  ENDERECO_DO_DIA_ALTERADO: "warning",
  ESCALA_ALTERADA: "warning",
  // O trial escala de aviso a bloqueio, e a cor acompanha.
  TRIAL_EXPIRANDO: "warning",
  TRIAL_VENCE_HOJE: "danger",
  TRIAL_BLOQUEADO: "danger",
  SUPORTE_TICKET_ABERTO: "info",
  SUPORTE_NOVA_MENSAGEM: "info",
  SUPORTE_TICKET_ENCERRADO: "muted",
  AVISO_GERAL: "info",
  // "Chegou a vez do seu filho" é boa notícia, não alerta.
  ALUNO_VEZ_EMBARQUE: "primary",
  ALUNO_VEZ_DESEMBARQUE: "primary",
  VEICULO_REVISAO_APROVADA: "success",
  // Reprovação tira o veículo de operação: é a mais grave das duas.
  VEICULO_REVISAO_REPROVADA: "danger",
  CONVERSA_NOVA_MENSAGEM: "info",
  CADASTRO_CONCLUIDO: "success",
  IDENTIDADE_APROVADA: "success",
  IDENTIDADE_REPROVADA: "danger",
  // Informativo interno da Rotta: nunca compete por atenção com um
  // aviso operacional na mesma lista.
  NOVO_CLIENTE_CADASTRADO: "info",
  PLANO_NOVA_ASSINATURA: "success",
  RELATORIO_SEMANAL: "muted",
  RELATORIO_MENSAL: "muted",
};

/**
 * Ícone, tom e rótulo de um tipo de notificação, com saída garantida
 * mesmo para um tipo que esta versão do app não conhece.
 *
 * ## Por que a busca direta no mapa não serve, mesmo com o mapa completo
 *
 * Porque o compilador garante que os mapas cobrem a união de HOJE, e o
 * aparelho não roda a versão de hoje. A API sobe sozinha, várias vezes
 * por semana; o aplicativo instalado só muda quando a pessoa atualiza
 * pela loja, e muita gente demora semanas. No instante em que alguém
 * adicionar o quadragésimo sexto valor ao
 * `enum NotificationEventType`, todo celular com a versão anterior
 * passa a receber um tipo fora dos mapas.
 *
 * Com busca direta, isso significava `undefined` virando componente e
 * a Central inteira caindo com "Element type is invalid ... but got:
 * undefined", que é exatamente o que aconteceu em 07/10/2026. Tipo
 * system nenhum alcança um binário já instalado: só um padrão de
 * leitura que não presume cobertura.
 *
 * Com estas funções, o pior caso é uma linha com sino cinza e a palavra
 * "Notificação" em vez do rótulo bonito. A pessoa continua lendo o
 * título e o corpo, que é o conteúdo de verdade, e abre a notificação
 * normalmente.
 */
export function iconeDoTipo(tipo: NotificationEventType): LucideIcon {
  return NOTIFICATION_TYPE_ICON[tipo] ?? Bell;
}

export function tomDoTipo(tipo: NotificationEventType): NotificationColorTone {
  return NOTIFICATION_TYPE_TONE[tipo] ?? "muted";
}

export function rotuloDoTipo(tipo: NotificationEventType): string {
  return NOTIFICATION_TYPE_LABEL[tipo] ?? "Notificação";
}

export const NOTIFICATION_PRIORITY_LABEL: Record<NotificationPriorityLevel, string> = {
  INFORMATIVA: "Informativa",
  IMPORTANTE: "Importante",
  URGENTE: "Urgente",
  CRITICA: "Crítica",
  EMERGENCIA: "Emergência",
};

export const NOTIFICATION_PRIORITY_TONE: Record<NotificationPriorityLevel, StatusPillTone> = {
  INFORMATIVA: "neutral",
  IMPORTANTE: "info",
  URGENTE: "warning",
  CRITICA: "danger",
  EMERGENCIA: "danger",
};

export const COMMUNICATION_CHANNEL_LABEL: Record<CommunicationChannel, string> = {
  PUSH: "Push",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  EMAIL: "E-mail",
  IN_APP: "Central de notificações",
};
