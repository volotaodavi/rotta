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

  viagemIniciada(nomeResponsavel: string, nomeAluno: string): PersonalizedMessage {
    return {
      titulo: "Viagem iniciada",
      corpo: `${this.saudacao(nomeResponsavel)} A viagem de ${nomeAluno} começou.`,
    };
  }

  viagemEncerrada(nomeResponsavel: string, nomeAluno: string): PersonalizedMessage {
    return {
      titulo: "Viagem encerrada",
      corpo: `${this.saudacao(nomeResponsavel)} A viagem de ${nomeAluno} chegou ao fim.`,
    };
  }

  alunoEmbarcou(nomeAluno: string): PersonalizedMessage {
    return { titulo: "Embarque confirmado", corpo: `O ${nomeAluno} acabou de embarcar.` };
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
}
