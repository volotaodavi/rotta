import type { TripStudentEvent } from "@rotta/api-client";

/**
 * `EMB-01` — avisar antes de encerrar a viagem com aluno sem
 * desembarque registrado.
 *
 * Achado da auditoria de 18/09/2026: "Deslize para encerrar" finalizava
 * a viagem sem olhar o checklist. Um aluno marcado como EMBARCADO e
 * nunca desembarcado ficava assim para sempre no histórico — e o
 * histórico é justamente o documento a que a família e a escola
 * recorrem quando perguntam onde a criança desceu.
 *
 * Isso AVISA, não bloqueia. Duas razões:
 *
 *  1. O registro que falta pode ser só um toque esquecido, com a
 *     criança em casa há meia hora. Travar o encerramento obrigaria o
 *     motorista a inventar um desembarque — trocaria um dado faltando
 *     por um dado FALSO, que é pior.
 *  2. Quem está do outro lado da tela está dirigindo. Um app que se
 *     recusa a terminar vira um app que é usado com o veículo andando.
 *
 * A lógica mora aqui, separada da tela, porque o que conta como
 * pendência é uma regra de segurança — precisa ser testável sem
 * simulador.
 */

/**
 * O mínimo para apurar pendência: quem é e como se chama.
 *
 * Aceita tanto `RouteStudent` quanto `RouteStudentDetalhado` — a tela
 * tem as duas listas na mão, e exigir a detalhada obrigaria a esperar
 * uma requisição a mais só para poder avisar.
 */
export interface AlunoDaViagem {
  studentId: string;
  studentNome?: string;
}

export interface PendenciasDeEncerramento {
  /** Embarcou e nunca desembarcou: pelo registro, ainda está no veículo. */
  aindaABordo: string[];
  /** Nenhum evento: nem embarque, nem desembarque, nem ausência. */
  semRegistro: string[];
}

const SEM_NOME = "Aluno sem nome cadastrado";

/**
 * O que ficou em aberto no checklist desta viagem.
 *
 * `AUSENTE` encerra o assunto do aluno: quem não veio não embarca nem
 * desembarca, e cobrar um desembarque nesse caso seria alarme falso —
 * o tipo de aviso que ensina a pessoa a ignorar avisos.
 */
export function pendenciasDeEncerramento(
  alunos: AlunoDaViagem[],
  eventos: TripStudentEvent[],
): PendenciasDeEncerramento {
  const aindaABordo: string[] = [];
  const semRegistro: string[] = [];

  for (const aluno of alunos) {
    const doAluno = eventos.filter((evento) => evento.studentId === aluno.studentId);
    const nome = aluno.studentNome?.trim() || SEM_NOME;

    if (doAluno.some((evento) => evento.tipo === "AUSENTE")) {
      continue;
    }
    if (doAluno.some((evento) => evento.tipo === "DESEMBARCOU")) {
      continue;
    }
    if (doAluno.some((evento) => evento.tipo === "EMBARCOU")) {
      aindaABordo.push(nome);
      continue;
    }
    semRegistro.push(nome);
  }

  return { aindaABordo, semRegistro };
}

export function temPendencia(pendencias: PendenciasDeEncerramento): boolean {
  return pendencias.aindaABordo.length > 0 || pendencias.semRegistro.length > 0;
}

/** Quantos nomes cabem no aviso antes de virar parede de texto. */
const NOMES_NO_AVISO = 5;

function listarNomes(nomes: string[]): string {
  if (nomes.length <= NOMES_NO_AVISO) {
    return nomes.join(", ");
  }
  const restantes = nomes.length - NOMES_NO_AVISO;
  return `${nomes.slice(0, NOMES_NO_AVISO).join(", ")} e mais ${restantes}`;
}

/**
 * Texto do aviso, ou `null` quando não há nada a avisar.
 *
 * Nomes, não contagens: "2 alunos pendentes" obriga o motorista a
 * fechar o aviso e ir procurar quem são. Ele está dirigindo.
 */
export function textoDoAviso(pendencias: PendenciasDeEncerramento): string | null {
  if (!temPendencia(pendencias)) {
    return null;
  }

  const partes: string[] = [];

  if (pendencias.aindaABordo.length > 0) {
    const plural = pendencias.aindaABordo.length > 1;
    partes.push(
      `Pelo registro, ${plural ? "ainda estão" : "ainda está"} no veículo: ${listarNomes(
        pendencias.aindaABordo,
      )}.`,
    );
  }

  if (pendencias.semRegistro.length > 0) {
    const plural = pendencias.semRegistro.length > 1;
    partes.push(
      `Sem nenhum registro hoje: ${listarNomes(pendencias.semRegistro)} — ${
        plural ? "eles não constam" : "ele não consta"
      } nem como embarque, nem como ausência.`,
    );
  }

  partes.push("Encerrando agora, é assim que a viagem fica no histórico.");

  return partes.join("\n\n");
}
