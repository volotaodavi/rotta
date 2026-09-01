import { Injectable } from "@nestjs/common";
import { CommunicationChannel, NotificationEventType } from "@prisma/client";

const { PUSH, WHATSAPP, SMS, EMAIL } = CommunicationChannel;

/**
 * Rotta Communication AI (briefing "ROTTA COMMUNICATION AI" — "Escolher
 * automaticamente o melhor canal para cada situação"). Implementação
 * atual: motor de regras determinístico derivado 1:1 dos exemplos do
 * briefing ("Viagem iniciada→Push", "Veículo chegando→Push+WhatsApp",
 * "CNH vencendo→Push+E-mail", "Pagamento pendente→Push+E-mail+WhatsApp")
 * — uma decisão honesta e auditável desde já (nunca aleatória/oculta),
 * não um placeholder: já resolve corretamente todo evento do módulo.
 * Evoluir para um modelo estatístico/ML (ex. taxa de leitura por canal
 * por usuário) é uma extensão FUTURA deste mesmo serviço, nunca uma
 * reescrita do `NotificationsService` que o consome — apenas o corpo de
 * `selectChannels` muda.
 *
 * `IN_APP` nunca aparece aqui: o `NotificationsService` sempre adiciona
 * o canal interno ao conjunto final, independentemente da escolha desta
 * classe — toda notificação tem um registro no histórico da Central de
 * Notificações.
 */
@Injectable()
export class NotificationChannelSelectorService {
  private static readonly CANAIS_POR_EVENTO: Readonly<
    Record<NotificationEventType, readonly CommunicationChannel[]>
  > = {
    VIAGEM_INICIADA: [PUSH],
    VIAGEM_ENCERRADA: [PUSH],
    ALUNO_EMBARCOU: [PUSH],
    ALUNO_DESEMBARCOU: [PUSH],
    ALUNO_AUSENTE: [PUSH, WHATSAPP],
    VEICULO_PROXIMO: [PUSH, WHATSAPP],
    // Chegou a vez do aluno (pedido do usuário: pop-up + notificação no
    // instante em que a parada dele fica em primeiro na fila) — mesmo
    // canal de ALUNO_EMBARCOU/ALUNO_DESEMBARCOU, é o mesmo tipo de aviso
    // operacional do dia a dia, só que disparado por transição de
    // estado (não por proximidade de GPS).
    ALUNO_VEZ_EMBARQUE: [PUSH],
    ALUNO_VEZ_DESEMBARQUE: [PUSH],
    MOTORISTA_ALTERADO: [PUSH],
    MONITOR_ALTERADO: [PUSH],
    VEICULO_ALTERADO: [PUSH],
    ROTA_ALTERADA: [PUSH],
    OCORRENCIA: [PUSH, WHATSAPP],
    EMERGENCIA: [PUSH, WHATSAPP, SMS],
    NOVO_CONTRATO: [PUSH, EMAIL],
    CONTRATO_ASSINADO: [PUSH, EMAIL],
    CNH_VENCENDO: [PUSH, EMAIL],
    DOCUMENTO_VENCENDO: [PUSH, EMAIL],
    PAGAMENTO_APROVADO: [PUSH, EMAIL],
    PAGAMENTO_RECUSADO: [PUSH, EMAIL, WHATSAPP],
    PAGAMENTO_PENDENTE: [PUSH, EMAIL, WHATSAPP],
    NOVA_ESCOLA: [PUSH],
    NOVO_ALUNO: [PUSH],
    NOVO_RESPONSAVEL: [PUSH],
    // Trial de 15 dias grátis (pedido do usuário: avisos "pela web, push
    // notifications do próprio app e email") — web é o IN_APP que
    // `NotificationsService.notify()` já adiciona sozinho a todo evento.
    TRIAL_EXPIRANDO: [PUSH, EMAIL],
    TRIAL_VENCE_HOJE: [PUSH, EMAIL],
    // Bloqueado (dia 16+) ganha WHATSAPP a mais — mesmo padrão já usado
    // pra outros avisos de cobrança (PAGAMENTO_PENDENTE/RECUSADO acima),
    // é o momento de maior urgência de ação do usuário.
    TRIAL_BLOQUEADO: [PUSH, EMAIL, WHATSAPP],
    // Suporte (pedido do usuário: "esse fluxo deverá estar funcionando")
    // — mesmo padrão de `NOVO_CONTRATO` (evento administrativo, não
    // operacional de viagem). O e-mail pra caixa fixa da Rotta
    // (`SUPPORT_INBOX_EMAIL`) é enviado à parte, direto pelo
    // `SupportService` — este canal aqui é só o `EMAIL`
    // pessoal/individual de cada destinatário (Admin Rotta ou o
    // próprio tenant, dependendo do sentido).
    SUPORTE_TICKET_ABERTO: [PUSH, EMAIL],
    SUPORTE_NOVA_MENSAGEM: [PUSH, EMAIL],
    // Aviso/comunicado geral (pedido do usuário: "a cada comunicação
    // nova deverá ser um push notification, tanto na web quanto no
    // app") — só PUSH; o `IN_APP` (sino/Central) já é automático em
    // toda notificação, cobrindo o "aparecer no sino" sem duplicar.
    AVISO_GERAL: [PUSH],
    // Aprovação/reprovação de veículo pelo Admin Rotta (Epic A) — mesmo
    // canal de NOVO_CONTRATO/CONTRATO_ASSINADO: comunicado administrativo,
    // não operacional de viagem do dia a dia.
    VEICULO_REVISAO_APROVADA: [PUSH, EMAIL],
    VEICULO_REVISAO_REPROVADA: [PUSH, EMAIL],
    // Chat Responsável↔Motorista/Monitor (Frente 10(d)) — mesmo canal
    // de SUPORTE_NOVA_MENSAGEM (PUSH pra avisar na hora, sem WHATSAPP/SMS
    // pra não vazar conteúdo da conversa fora do app).
    CONVERSA_NOVA_MENSAGEM: [PUSH],
    // Boas-vindas (pedido do usuário 31/08/2026: "quero todos") — só
    // EMAIL, nenhum token de push ainda existe no instante exato em que
    // a conta termina de ser criada.
    CADASTRO_CONCLUIDO: [EMAIL],
    // Verificação de identidade (Didit) — mesmo canal de
    // VEICULO_REVISAO_APROVADA/REPROVADA (aprovação/reprovação
    // administrativa, o usuário precisa saber mesmo sem abrir o app).
    IDENTIDADE_APROVADA: [PUSH, EMAIL],
    IDENTIDADE_REPROVADA: [PUSH, EMAIL],
    // Informativos operacionais pro Admin Rotta (pedido do usuário
    // 01/09/2026: "quero como push notification também") — mesmo canal
    // de SUPORTE_TICKET_ABERTO/NOVO_CONTRATO, sem WHATSAPP/SMS (avisos
    // internos da própria equipe, não algo que precise interromper por
    // esses canais).
    NOVO_CLIENTE_CADASTRADO: [PUSH, EMAIL],
    PLANO_NOVA_ASSINATURA: [PUSH, EMAIL],
    SUPORTE_TICKET_ENCERRADO: [PUSH, EMAIL],
    RELATORIO_SEMANAL: [PUSH, EMAIL],
    RELATORIO_MENSAL: [PUSH, EMAIL],
  };

  selectChannels(tipo: NotificationEventType): CommunicationChannel[] {
    return [...NotificationChannelSelectorService.CANAIS_POR_EVENTO[tipo]];
  }
}
