import { registerAs } from "@nestjs/config";

export interface TrackersConfig {
  /**
   * Segredo compartilhado com o receptor (Traccar) que encaminha as
   * posições dos rastreadores para cá.
   *
   * É um BEARER SECRET, não uma assinatura — e a diferença importa.
   * O `QstashSignatureGuard` valida uma assinatura HMAC do corpo, o que
   * prova também que o corpo não foi alterado. O Traccar não assina o
   * que encaminha: ele só sabe mandar um cabeçalho fixo
   * (`forward.header`). Então aqui o que se prova é "quem mandou
   * conhece o segredo", nada além disso.
   *
   * Consequências assumidas, e o que as compensa:
   *  - O tráfego Traccar → API tem de ser HTTPS, senão o segredo viaja
   *    em claro. É o que o `apiPublicUrl` já garante em produção.
   *  - Quem tiver o segredo consegue gravar posição de QUALQUER ônibus.
   *    Por isso ele nunca é o mesmo segredo de nenhuma outra coisa e
   *    vive só em variável de ambiente, nunca no repositório.
   *
   * Vazio = ingestão de rastreador DESLIGADA (o guard recusa tudo), que
   * é o estado certo enquanto ninguém configurou o receptor — melhor
   * recusar do que aceitar posição de origem desconhecida.
   */
  ingestSecret: string;

  /**
   * Minutos sem nenhuma posição antes de considerar a viagem encerrada
   * sozinha.
   *
   * Existe porque nem todo desligamento chega: o aparelho pode perder
   * sinal ao entrar na garagem, ou o pacote de "ignição desligada" pode
   * simplesmente se perder. Sem esta rede de segurança, a viagem ficaria
   * EM_ANDAMENTO para sempre e o pai veria o ônibus parado no mesmo
   * ponto a noite inteira.
   *
   * 20 minutos é folgado de propósito: um ônibus parado num semáforo
   * longo, num pátio de escola ou numa área sem cobertura não pode ter
   * a viagem encerrada por baixo dele.
   */
  minutosSemSinalParaEncerrar: number;
}

export default registerAs("trackers", (): TrackersConfig => ({
  ingestSecret: process.env.TRACKER_INGEST_SECRET ?? "",
  minutosSemSinalParaEncerrar: Number(process.env.TRACKER_TIMEOUT_MINUTOS ?? 20),
}));
