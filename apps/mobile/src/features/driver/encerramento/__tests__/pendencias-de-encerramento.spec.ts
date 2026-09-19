import {
  pendenciasDeEncerramento,
  temPendencia,
  textoDoAviso,
} from "../pendencias-de-encerramento";

import type { AlunoDaViagem } from "../pendencias-de-encerramento";
import type { TripStudentEvent } from "@rotta/api-client";

/**
 * `EMB-01` — encerrar a viagem com aluno sem desembarque registrado.
 *
 * O caso que dá nome a tudo isto: um aluno marcado como EMBARCADO e
 * nunca desembarcado fica assim para sempre no histórico — e é o
 * histórico que a família e a escola consultam quando perguntam onde a
 * criança desceu.
 */

const aluno = (studentId: string, studentNome?: string): AlunoDaViagem => ({
  studentId,
  studentNome,
});

const evento = (studentId: string, tipo: TripStudentEvent["tipo"]): TripStudentEvent =>
  ({ studentId, tipo }) as TripStudentEvent;

describe("pendenciasDeEncerramento", () => {
  it("aponta quem embarcou e não desembarcou", () => {
    const pendencias = pendenciasDeEncerramento(
      [aluno("s1", "Ana"), aluno("s2", "Bruno")],
      [evento("s1", "EMBARCOU"), evento("s2", "EMBARCOU"), evento("s2", "DESEMBARCOU")],
    );

    expect(pendencias.aindaABordo).toEqual(["Ana"]);
    expect(pendencias.semRegistro).toEqual([]);
  });

  it("aponta quem não tem registro nenhum", () => {
    const pendencias = pendenciasDeEncerramento([aluno("s1", "Ana")], []);

    expect(pendencias.aindaABordo).toEqual([]);
    expect(pendencias.semRegistro).toEqual(["Ana"]);
  });

  it("AUSENTE encerra o assunto do aluno", () => {
    // Quem não veio não embarca nem desembarca. Cobrar desembarque aqui
    // seria alarme falso — o tipo de aviso que ensina a pessoa a
    // ignorar avisos.
    const pendencias = pendenciasDeEncerramento([aluno("s1", "Ana")], [evento("s1", "AUSENTE")]);

    expect(temPendencia(pendencias)).toBe(false);
  });

  it("desembarque resolve mesmo sem embarque registrado", () => {
    // Acontece de verdade: o motorista esquece o embarque e só marca a
    // descida. O aluno chegou em casa — não é isto que o aviso existe
    // para pegar.
    const pendencias = pendenciasDeEncerramento(
      [aluno("s1", "Ana")],
      [evento("s1", "DESEMBARCOU")],
    );

    expect(temPendencia(pendencias)).toBe(false);
  });

  it("viagem com checklist completo não tem pendência", () => {
    const pendencias = pendenciasDeEncerramento(
      [aluno("s1", "Ana"), aluno("s2", "Bruno")],
      [evento("s1", "EMBARCOU"), evento("s1", "DESEMBARCOU"), evento("s2", "AUSENTE")],
    );

    expect(temPendencia(pendencias)).toBe(false);
  });

  it("rota sem aluno nenhum não tem pendência", () => {
    expect(temPendencia(pendenciasDeEncerramento([], []))).toBe(false);
  });

  it("ignora evento de outra viagem/aluno", () => {
    const pendencias = pendenciasDeEncerramento(
      [aluno("s1", "Ana")],
      [evento("s9", "DESEMBARCOU")],
    );

    expect(pendencias.semRegistro).toEqual(["Ana"]);
  });

  it("aluno sem nome não vira linha em branco no aviso", () => {
    const pendencias = pendenciasDeEncerramento([aluno("s1", "  ")], []);

    expect(pendencias.semRegistro).toEqual(["Aluno sem nome cadastrado"]);
  });
});

describe("textoDoAviso", () => {
  it("devolve null quando não há nada a avisar", () => {
    expect(textoDoAviso({ aindaABordo: [], semRegistro: [] })).toBeNull();
  });

  it("diz os NOMES, não a contagem", () => {
    // "2 alunos pendentes" obriga o motorista a fechar o aviso e ir
    // procurar quem são. Ele está dirigindo.
    const texto = textoDoAviso({ aindaABordo: ["Ana", "Bruno"], semRegistro: [] });

    expect(texto).toContain("Ana");
    expect(texto).toContain("Bruno");
  });

  it("concorda no singular com um aluno só", () => {
    expect(textoDoAviso({ aindaABordo: ["Ana"], semRegistro: [] })).toContain("ainda está");
  });

  it("corta a lista longa em vez de virar parede de texto", () => {
    const muitos = ["A", "B", "C", "D", "E", "F", "G"];

    expect(textoDoAviso({ aindaABordo: muitos, semRegistro: [] })).toContain("e mais 2");
  });

  it("junta os dois tipos de pendência num aviso só", () => {
    const texto = textoDoAviso({ aindaABordo: ["Ana"], semRegistro: ["Bruno"] });

    expect(texto).toContain("Ana");
    expect(texto).toContain("Bruno");
    expect(texto).toContain("histórico");
  });
});
