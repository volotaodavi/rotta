import { Injectable } from "@nestjs/common";

export interface PersonalizedMessage {
  titulo: string;
  corpo: string;
}

/**
 * Message Personalization AI (briefing "AGENTE 04" — "Personalizar
 * mensagens (ex. 'Bom dia, João.' 'O Pedro acabou de embarcar.' 'Nossa
 * previsão de chegada é às 07:18.'). Nunca utilizar mensagens genéricas
 * quando houver dados disponíveis"). Um método por
 * `NotificationEventType` — cada um EXIGE os dados reais do evento como
 * parâmetro (nunca um texto fixo), forçando o módulo de origem (o único
 * que conhece o aluno/motorista/valor real) a sempre passar dado
 * concreto. `NotificationsService.notify` continua recebendo
 * `titulo`/`corpo` já prontos (nunca resolve um template genérico
 * sozinho) — este serviço é o ponto único que os módulos de domínio
 * chamam ANTES de `notify()` para nunca duplicar a mesma interpolação
 * de string em 15+ lugares diferentes.
 */
@Injectable()
export class MessagePersonalizationService {
  /** "Bom dia, João." / "Boa tarde, ..." / "Boa noite, ..." conforme o horário — usado pelos templates que abrem com saudação. */
  saudacao(nome: string, agora: Date = new Date()): string {
    const hora = agora.getHours();
    const periodo = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
    return `${periodo}, ${nome}.`;
  }

  /** "João Pedro da Silva" → "João" — os avisos de vez/embarque do aluno usam só o primeiro nome (pedido do usuário), nunca o nome completo. */
  private primeiroNome(nomeCompleto: string): string {
    return nomeCompleto.trim().split(/\s+/)[0] ?? nomeCompleto;
  }

  /**
   * "A van está em serviço" (pedido do usuário, texto literal): dispara
   * pra TODOS os responsáveis da rota assim que a viagem começa,
   * independente de qual aluno está na vez. `nomeTransportador` é o
   * `nomeFantasia` da empresa (ou o nome do próprio motorista quando é
   * autônomo/MEI sem nome fantasia próprio de transporte) — quem
   * chama decide qual dos dois faz mais sentido passar.
   */
  viagemIniciada(nomeTransportador: string): PersonalizedMessage {
    return {
      titulo: "Van em serviço",
      corpo: `A van ${nomeTransportador} está em serviço! Em breve o seu filho estará retornando para o endereço informado.`,
    };
  }

  viagemEncerrada(nomeResponsavel: string, nomeAluno: string): PersonalizedMessage {
    return {
      titulo: "Viagem encerrada",
      corpo: `${this.saudacao(nomeResponsavel)} A viagem de ${nomeAluno} chegou ao fim.`,
    };
  }

  /** Texto literal pedido pelo usuário — dispara quando o checklist marca o aluno como EMBARCOU. */
  alunoEmbarcou(nomeAluno: string): PersonalizedMessage {
    return {
      titulo: "Embarque confirmado",
      corpo: `O aluno ${this.primeiroNome(nomeAluno)} embarcou na van e em breve estará na rota para retornar ao endereço informado.`,
    };
  }

  alunoDesembarcou(nomeAluno: string): PersonalizedMessage {
    return { titulo: "Desembarque confirmado", corpo: `O ${nomeAluno} acabou de desembarcar.` };
  }

  alunoAusente(nomeAluno: string): PersonalizedMessage {
    return {
      titulo: "Aluno ausente",
      corpo: `O ${nomeAluno} não foi encontrado no ponto de embarque combinado.`,
    };
  }

  /**
   * "Chegou a vez do aluno" (pedido do usuário, texto literal) —
   * dispara quando a parada de EMBARQUE do aluno vira a próxima da fila
   * (`ALUNO_VEZ_EMBARQUE`), diferente de `veiculoProximo` (que depende
   * de proximidade real por GPS): aqui o aviso é por TRANSIÇÃO de
   * estado, inclusive no instante em que a viagem começa.
   */
  alunoVezEmbarque(nomeAluno: string): PersonalizedMessage {
    return {
      titulo: "Está quase na hora",
      corpo: `Boas notícias! O aluno ${this.primeiroNome(nomeAluno)} está na rota para ser buscado🤗`,
    };
  }

  /** Mesma mecânica de `alunoVezEmbarque`, para quando a parada de DESEMBARQUE vira a próxima da fila (`ALUNO_VEZ_DESEMBARQUE`). */
  alunoVezDesembarque(nomeAluno: string): PersonalizedMessage {
    return {
      titulo: "Ele já está a caminho de casa",
      corpo: `Boas notícias! O aluno ${this.primeiroNome(nomeAluno)} está na rota para retornar ao endereço informado. Fique de olho👀.`,
    };
  }

  /** `horarioPrevisto` no formato "HH:mm" (ex. "07:18") — exatamente o exemplo do briefing. */
  veiculoProximo(nomeAluno: string, horarioPrevisto: string): PersonalizedMessage {
    return {
      titulo: "Veículo chegando",
      corpo: `O transporte de ${nomeAluno} está chegando. Nossa previsão de chegada é às ${horarioPrevisto}.`,
    };
  }

  motoristaAlterado(nomeAluno: string, nomeNovoMotorista: string): PersonalizedMessage {
    return {
      titulo: "Motorista alterado",
      corpo: `${nomeNovoMotorista} passou a ser o motorista responsável pelo transporte de ${nomeAluno}.`,
    };
  }

  monitorAlterado(nomeAluno: string, nomeNovoMonitor: string): PersonalizedMessage {
    return {
      titulo: "Monitor alterado",
      corpo: `${nomeNovoMonitor} passou a ser o monitor responsável pelo transporte de ${nomeAluno}.`,
    };
  }

  veiculoAlterado(nomeAluno: string, placaVeiculo: string): PersonalizedMessage {
    return {
      titulo: "Veículo alterado",
      corpo: `O transporte de ${nomeAluno} passou a usar o veículo placa ${placaVeiculo}.`,
    };
  }

  rotaAlterada(nomeAluno: string): PersonalizedMessage {
    return {
      titulo: "Rota alterada",
      corpo: `A rota do transporte de ${nomeAluno} foi atualizada.`,
    };
  }

  ocorrencia(nomeAluno: string, descricao: string): PersonalizedMessage {
    return {
      titulo: "Ocorrência registrada",
      corpo: `Uma ocorrência foi registrada no transporte de ${nomeAluno}: ${descricao}`,
    };
  }

  emergencia(descricao: string): PersonalizedMessage {
    return { titulo: "Emergência", corpo: `Emergência na rota: ${descricao}` };
  }

  novoContrato(nomeEmpresa: string): PersonalizedMessage {
    return {
      titulo: "Novo contrato",
      corpo: `Um novo contrato foi criado com ${nomeEmpresa}, aguardando assinatura.`,
    };
  }

  contratoAssinado(nomeEmpresa: string): PersonalizedMessage {
    return { titulo: "Contrato assinado", corpo: `O contrato com ${nomeEmpresa} foi assinado.` };
  }

  /** Credenciamento pelo "código do transporte" (`StudentCredentialedListener`) — reaproveita `NOVO_CONTRATO` (é um `Contract` de verdade nascendo), com texto próprio pra não dizer "aguardando assinatura" de algo que já nasce ativo. */
  termoCienciaGerado(nomeEmpresa: string): PersonalizedMessage {
    return {
      titulo: "Transporte credenciado",
      corpo: `O transporte com ${nomeEmpresa} foi credenciado. Confira o termo de ciência no app.`,
    };
  }

  cnhVencendo(nomeMotorista: string, diasRestantes: number): PersonalizedMessage {
    return {
      titulo: "CNH vencendo",
      corpo: `A CNH de ${nomeMotorista} vence em ${diasRestantes} dia(s) — regularize para continuar dirigindo.`,
    };
  }

  documentoVencendo(nomeDocumento: string, diasRestantes: number): PersonalizedMessage {
    return {
      titulo: "Documento vencendo",
      corpo: `O documento "${nomeDocumento}" vence em ${diasRestantes} dia(s).`,
    };
  }

  pagamentoAprovado(valorFormatado: string): PersonalizedMessage {
    return {
      titulo: "Pagamento aprovado",
      corpo: `Seu pagamento de ${valorFormatado} foi aprovado.`,
    };
  }

  pagamentoRecusado(valorFormatado: string): PersonalizedMessage {
    return {
      titulo: "Pagamento recusado",
      corpo: `Seu pagamento de ${valorFormatado} foi recusado — verifique os dados e tente novamente.`,
    };
  }

  pagamentoPendente(valorFormatado: string): PersonalizedMessage {
    return {
      titulo: "Pagamento pendente",
      corpo: `Seu pagamento de ${valorFormatado} ainda está pendente.`,
    };
  }

  novaEscola(nomeEscola: string): PersonalizedMessage {
    return { titulo: "Nova escola cadastrada", corpo: `A escola ${nomeEscola} foi cadastrada.` };
  }

  novoAluno(nomeAluno: string): PersonalizedMessage {
    return { titulo: "Novo aluno", corpo: `${nomeAluno} foi cadastrado como aluno.` };
  }

  novoResponsavel(nomeResponsavel: string): PersonalizedMessage {
    return {
      titulo: "Novo responsável",
      corpo: `${nomeResponsavel} foi cadastrado como responsável.`,
    };
  }

  /**
   * Pedido do usuário: "quando as pessoas forem acionar o suporte,
   * esse fluxo deverá estar funcionando... aparecer no painel do
   * admin o chamado de suporte" — enviado a cada Admin Rotta quando um
   * tenant abre um chamado novo (`SupportService.createTicket`).
   */
  suporteTicketAberto(
    assunto: string,
    autorNome: string,
    empresaNome: string,
  ): PersonalizedMessage {
    return {
      titulo: "Novo chamado de suporte",
      corpo: `${autorNome} (${empresaNome}) abriu um chamado: "${assunto}".`,
    };
  }

  /**
   * Mesmo tipo, reaproveitado nos dois sentidos (`SupportService.
   * addMessage`): Admin Rotta responde → tenant é notificado; tenant
   * escreve de novo → todos os Admin Rotta são notificados. O texto
   * muda pelo `autorNome` recebido, nunca pelo tipo do evento.
   */
  suporteNovaMensagem(assunto: string, autorNome: string, previa: string): PersonalizedMessage {
    return {
      titulo: `Nova mensagem em "${assunto}"`,
      corpo: `${autorNome}: ${previa}`,
    };
  }

  /**
   * Frente 10(d) — chat direto Responsável ↔ Motorista/Monitor (pedido
   * do usuário: "suporte entre os responsáveis e motoristas/monitores").
   * Mesmo espírito de `suporteNovaMensagem` (reaproveitado nos dois
   * sentidos), mas o título nunca cita o conteúdo — só quem escreveu —
   * pra manter a prévia curta e não vazar dado sensível numa notificação
   * push que pode aparecer na tela bloqueada do celular.
   */
  novaMensagemConversa(autorNome: string, previa: string): PersonalizedMessage {
    return {
      titulo: `Nova mensagem de ${autorNome}`,
      corpo: previa,
    };
  }

  /**
   * Aviso/comunicado geral publicado pelo Admin Rotta (pedido do
   * usuário: "aba de criação de avisos, comunicados e notificações
   * gerais"). Título/corpo já vêm prontos do `CreateAnnouncementDto` —
   * este método só existe pra manter o mesmo ponto único de passagem
   * dos demais eventos (`AnnouncementsService` nunca monta o payload
   * do evento sozinho).
   */
  avisoGeral(titulo: string, corpo: string): PersonalizedMessage {
    return { titulo, corpo };
  }

  /**
   * Epic A (Aprovação de veículos pelo Admin Rotta) — `observacao` já
   * vem pronta do `ReviewVehicleDto` (o texto que o Admin Rotta
   * escreveu, um pra transportadora e outro pros responsáveis; ver
   * `VehiclesService.reviewVehicle`). Sem observação, um corpo padrão
   * ainda avisa a decisão — nunca dispara notificação vazia.
   */
  veiculoRevisaoAprovada(placa: string, observacao?: string): PersonalizedMessage {
    return {
      titulo: "Veículo aprovado",
      corpo:
        observacao?.trim() ||
        `O veículo placa ${placa} foi revisado e aprovado pela Rotta do Brasil.`,
    };
  }

  veiculoRevisaoReprovada(placa: string, observacao?: string): PersonalizedMessage {
    return {
      titulo: "Veículo reprovado",
      corpo:
        observacao?.trim() ||
        `O veículo placa ${placa} foi reprovado pela Rotta do Brasil e não pode mais ser credenciado numa rota.`,
    };
  }

  /**
   * Boas-vindas (pedido do usuário 31/08/2026: "quero todos") — dispara
   * pra QUALQUER papel logo que a conta termina de ser criada
   * (`AuthService.registerPessoal`/`registerAutonomo`,
   * `CompaniesService.create`). Texto genérico de propósito: não
   * distingue papel (Empresa/Motorista/Responsável) porque o "bem-vindo"
   * é o mesmo pra todo mundo — o que muda depois é o resto da
   * experiência dentro do app, não este e-mail.
   */
  cadastroConcluido(nome: string): PersonalizedMessage {
    return {
      titulo: "Bem-vindo à Rotta!",
      corpo: `${this.saudacao(nome)} Sua conta na Rotta foi criada com sucesso — já pode acessar a plataforma a partir de agora.`,
    };
  }

  /**
   * Verificação de identidade (Didit) aprovada —
   * `DiditWebhookController`/`IdentityVerificationService.applyDecisionToUser`.
   */
  identidadeAprovada(nome: string): PersonalizedMessage {
    return {
      titulo: "Identidade verificada",
      corpo: `${this.saudacao(nome)} Sua verificação de identidade foi aprovada.`,
    };
  }

  /**
   * `motivo` é sempre o texto real (`User.identityVerificationMotivo`)
   * — pedido do usuário: "caso eu peça reenvio, eu posso dizer o
   * motivo". Nunca "reprovado, motivo desconhecido" por preguiça.
   */
  identidadeReprovada(nome: string, motivo: string): PersonalizedMessage {
    return {
      titulo: "Verificação de identidade não aprovada",
      corpo: `${this.saudacao(nome)} Sua verificação de identidade não foi aprovada. Motivo: ${motivo}. Você pode reenviar seus documentos a qualquer momento pelo app.`,
    };
  }

  /** Trial acabando (pedido do usuário 01/09/2026: "trial expirando") — 3 dias de antecedência (`TrialNotificationsService`). */
  trialExpirando(diasRestantes: number): PersonalizedMessage {
    return {
      titulo: "Seu trial está acabando",
      corpo: `Faltam ${diasRestantes} dia(s) pro fim do seu trial gratuito na Rotta. Assine um plano pra continuar usando sem interrupção.`,
    };
  }

  /** Trial vence HOJE — mesmo scheduler, um dia depois de `trialExpirando`. */
  trialVenceHoje(): PersonalizedMessage {
    return {
      titulo: "Seu trial vence hoje",
      corpo: `Seu trial gratuito na Rotta vence hoje. Assine um plano agora pra nunca perder acesso à plataforma.`,
    };
  }

  /** Trial vencido, ações de escrita já bloqueadas pelo `TrialGuard` (mesma regra de `resolveTrialBloqueioMotivo`). */
  trialBloqueado(): PersonalizedMessage {
    return {
      titulo: "Trial vencido",
      corpo: `Seu trial gratuito acabou e algumas ações estão bloqueadas até você assinar um plano. Assine agora pra voltar a usar a Rotta normalmente.`,
    };
  }

  /** Informativo pro Admin Rotta (pedido do usuário 01/09/2026) — `CompaniesService.create`. */
  novoClienteCadastrado(nomeFantasia: string, tipoLabel: string): PersonalizedMessage {
    return {
      titulo: "Novo cliente cadastrado",
      corpo: `${nomeFantasia} (${tipoLabel}) acabou de se cadastrar na Rotta.`,
    };
  }

  /** Informativo pro Admin Rotta — nova assinatura ativada/reativada (`BillingService`, ver nota no schema sobre a checagem de status). */
  planoNovaAssinatura(nomeFantasia: string): PersonalizedMessage {
    return {
      titulo: "Novo plano assinado",
      corpo: `${nomeFantasia} acabou de assinar (ou reativar) o plano da Rotta.`,
    };
  }

  /** Informativo pro Admin Rotta — espelha `suporteTicketAberto`, mas pro fechamento (`SupportService.closeTicket`). */
  suporteTicketEncerrado(assunto: string, empresaNome: string): PersonalizedMessage {
    return {
      titulo: "Chamado de suporte encerrado",
      corpo: `O chamado "${assunto}" (${empresaNome}) foi encerrado.`,
    };
  }

  /**
   * Resumo semanal/mensal pro Admin Rotta (`AdminDigestService`) —
   * `faturamentoCentavos`/`lucroLiquidoCentavos` chegam `null` quando a
   * Asaas não está configurada, ou a consulta falhou — vira
   * "indisponível", nunca "R$ 0,00" (stub honesto: dado ausente não é
   * dado zero).
   */
  relatorioAdmin(resumo: {
    label: string;
    novasEmpresas: number;
    novasAssinaturas: number;
    planosAtivosAgora: number;
    chamadosAbertos: number;
    chamadosEncerrados: number;
    faturamentoCentavos: number | null;
    lucroLiquidoCentavos: number | null;
  }): PersonalizedMessage {
    const formatar = (centavos: number | null): string =>
      centavos === null
        ? "indisponível"
        : (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    return {
      titulo: `Resumo ${resumo.label} da Rotta`,
      corpo: [
        `Novos clientes: ${resumo.novasEmpresas}.`,
        `Novas assinaturas: ${resumo.novasAssinaturas} (${resumo.planosAtivosAgora} planos ativos no total).`,
        `Chamados de suporte: ${resumo.chamadosAbertos} aberto(s), ${resumo.chamadosEncerrados} encerrado(s).`,
        `Faturamento: ${formatar(resumo.faturamentoCentavos)}.`,
        `Lucro líquido (após taxas): ${formatar(resumo.lucroLiquidoCentavos)}.`,
      ].join("\n"),
    };
  }
}
