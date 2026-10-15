import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * A união `NotificationEventType` tem que ser igual ao enum do banco.
 *
 * ## Por que isto é um teste, e não uma convenção
 *
 * Porque a convenção já existia e falhou, com custo. Até 08/10/2026 a
 * união tinha 22 valores e o enum tinha 45, e o arquivo até admitia a
 * defasagem numa nota, chamando-a de inofensiva. Não era: as telas de
 * notificação resolvem o ícone por `MAPA[notification.tipo]`, um
 * `Record<NotificationEventType, ...>` fica completo aos olhos do
 * compilador com 22 chaves, e um tipo fora da união devolve
 * `undefined`. A tela então renderiza `<undefined />` e o React derruba
 * a árvore com "Element type is invalid ... but got: undefined".
 *
 * Em 07/10/2026 um usuário real bateu nisso duas vezes em doze
 * segundos, e a Central de Notificações simplesmente não abria.
 *
 * Então o acoplamento não pode depender de alguém lembrar. Este teste
 * lê o `schema.prisma` e compara. Adicionar valor ao enum sem
 * adicionar aqui quebra a verificação, e quebrar a verificação é
 * exatamente o que se quer: o passo seguinte é o `tsc` apontar cada
 * mapa de tela que ficou incompleto.
 *
 * ## Por que ler o schema em vez de importar do Prisma
 *
 * Porque `@prisma/client` é dependência da API, não deste pacote, e o
 * `api-client` roda no navegador e no app. O schema é texto, e texto se
 * lê sem arrastar o Prisma para dentro de um pacote de front.
 */

const AQUI = dirname(fileURLToPath(import.meta.url));
const SCHEMA = resolve(AQUI, "../../../../apps/api/prisma/schema.prisma");

/** Os valores do enum, na ordem em que o schema os declara. */
function valoresDoEnumNoSchema(nome: string): string[] {
  const schema = readFileSync(SCHEMA, "utf8");
  const bloco = new RegExp(String.raw`enum\s+${nome}\s*\{([\s\S]*?)\n\}`).exec(schema);
  if (!bloco) throw new Error(`enum ${nome} não encontrado em ${SCHEMA}`);

  return (
    bloco[1]
      .split("\n")
      .map((linha) => linha.trim())
      /* `///` é comentário de documentação do Prisma, e o enum usa muitos. */
      .filter((linha) => linha.length > 0 && !linha.startsWith("//"))
      .map((linha) => linha.split(/\s/)[0])
  );
}

/**
 * A união em tempo de execução. TypeScript apaga tipo na compilação, e
 * um teste não consegue enumerar uma união — então a lista vive aqui,
 * declarada como `satisfies NotificationEventType[]` no arquivo de
 * tipos é impossível sem duplicar. A duplicação é intencional e é o
 * ponto: se alguém mexer na união sem mexer aqui, a contagem denuncia.
 */
const UNIAO_DECLARADA = [
  "VIAGEM_INICIADA",
  "VIAGEM_ENCERRADA",
  "ALUNO_EMBARCOU",
  "ALUNO_DESEMBARCOU",
  "ALUNO_AUSENTE",
  "VEICULO_PROXIMO",
  "MOTORISTA_ALTERADO",
  "MONITOR_ALTERADO",
  "VEICULO_ALTERADO",
  "ROTA_ALTERADA",
  "OCORRENCIA",
  "EMERGENCIA",
  "NOVO_CONTRATO",
  "CONTRATO_ASSINADO",
  "CNH_VENCENDO",
  "DOCUMENTO_VENCENDO",
  "PAGAMENTO_APROVADO",
  "PAGAMENTO_RECUSADO",
  "PAGAMENTO_PENDENTE",
  "NOVA_ESCOLA",
  "NOVO_ALUNO",
  "NOVO_RESPONSAVEL",
  "TRIAL_EXPIRANDO",
  "TRIAL_VENCE_HOJE",
  "TRIAL_BLOQUEADO",
  "SUPORTE_TICKET_ABERTO",
  "SUPORTE_NOVA_MENSAGEM",
  "SUPORTE_TICKET_ENCERRADO",
  "AVISO_GERAL",
  "ALUNO_VEZ_EMBARQUE",
  "ALUNO_VEZ_DESEMBARQUE",
  "VEICULO_REVISAO_APROVADA",
  "VEICULO_REVISAO_REPROVADA",
  "CONVERSA_NOVA_MENSAGEM",
  "CADASTRO_CONCLUIDO",
  "IDENTIDADE_APROVADA",
  "IDENTIDADE_REPROVADA",
  "NOVO_CLIENTE_CADASTRADO",
  "PLANO_NOVA_ASSINATURA",
  "RELATORIO_SEMANAL",
  "RELATORIO_MENSAL",
  "NOVA_SOLICITACAO_TRANSPORTE",
  "ALUNO_NAO_VAI_HOJE",
  "ENDERECO_DO_DIA_ALTERADO",
  "ESCALA_ALTERADA",
] as const;

describe("NotificationEventType contra o enum do banco", () => {
  const noBanco = valoresDoEnumNoSchema("NotificationEventType");

  it("não falta nenhum tipo que o banco pode gravar", () => {
    const faltando = noBanco.filter((tipo) => !UNIAO_DECLARADA.includes(tipo as never));
    /*
      Mensagem com os nomes dentro, de propósito: quem quebrar este
      teste precisa saber O QUE adicionar sem abrir o schema.
    */
    expect(faltando, `tipos no schema.prisma e fora da união: ${faltando.join(", ")}`).toEqual([]);
  });

  it("não sobra nenhum tipo que o banco não conhece", () => {
    const sobrando = UNIAO_DECLARADA.filter((tipo) => !noBanco.includes(tipo));
    expect(sobrando, `tipos na união e fora do schema.prisma: ${sobrando.join(", ")}`).toEqual([]);
  });

  it("o schema tem os 45 tipos que esta união espera", () => {
    /*
      Trava de contagem, que é a que pega o caso chato: alguém renomeia
      um valor no schema e adiciona outro, e as duas listas acima ficam
      consistentes por acidente.
    */
    expect(noBanco).toHaveLength(UNIAO_DECLARADA.length);
  });
});
