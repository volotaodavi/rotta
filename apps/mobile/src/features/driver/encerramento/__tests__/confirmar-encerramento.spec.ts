import { Alert } from "react-native";

import { confirmarEncerramento } from "../confirmar-encerramento";

import type { TripStudentEvent } from "@rotta/api-client";

/**
 * `EMB-01` — o gesto de encerrar. A regra de negócio está testada em
 * `pendencias-de-encerramento.spec.ts`; aqui o que importa é que
 * encerrar AVISA e não BLOQUEIA: a viagem sempre pode terminar, só não
 * sem a pessoa saber o que está deixando para trás.
 */

const evento = (studentId: string, tipo: TripStudentEvent["tipo"]): TripStudentEvent =>
  ({ studentId, tipo }) as TripStudentEvent;

const alunos = [{ studentId: "s1", studentNome: "Ana" }];

beforeEach(() => {
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("encerra na hora quando o checklist está completo", () => {
  const onEncerrar = jest.fn();

  confirmarEncerramento({
    alunos,
    eventos: [evento("s1", "EMBARCOU"), evento("s1", "DESEMBARCOU")],
    onEncerrar,
  });

  expect(onEncerrar).toHaveBeenCalledTimes(1);
  expect(Alert.alert).not.toHaveBeenCalled();
});

it("pergunta antes quando falta registro", () => {
  const onEncerrar = jest.fn();

  confirmarEncerramento({ alunos, eventos: [evento("s1", "EMBARCOU")], onEncerrar });

  expect(onEncerrar).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenCalled();
});

it("NUNCA bloqueia — confirmar encerra", () => {
  // Travar o encerramento obrigaria o motorista a inventar um
  // desembarque: trocaria um dado faltando por um dado FALSO.
  const onEncerrar = jest.fn();
  confirmarEncerramento({ alunos, eventos: [evento("s1", "EMBARCOU")], onEncerrar });

  const botoes = (Alert.alert as jest.Mock).mock.calls[0][2] as {
    text: string;
    onPress?: () => void;
  }[];
  botoes.find((b) => b.text === "Encerrar mesmo assim")?.onPress?.();

  expect(onEncerrar).toHaveBeenCalledTimes(1);
});

it("a saída sugerida é revisar, não encerrar", () => {
  confirmarEncerramento({ alunos, eventos: [], onEncerrar: jest.fn() });

  const botoes = (Alert.alert as jest.Mock).mock.calls[0][2] as { text: string; style?: string }[];
  expect(botoes[0]?.text).toBe("Revisar alunos");
  expect(botoes[0]?.style).toBe("cancel");
});
